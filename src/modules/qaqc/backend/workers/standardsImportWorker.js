import { PDFParse } from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../../../../core/db.js';
import { createWorker } from '../../../../core/queue.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('standards-import-worker');
const QUEUE_NAME = 'standards-import';

const SECTION_RE = /^(?:SECTION\s+\d+|Chapter\s+\d+|\d{1,3}\.\s+[A-Z]|[A-Z]{2,}\s+\d+\.?\s*[-—:]?\s*[A-Z])/m;
const MAX_CHUNK_CHARS = 1800;
const OVERLAP_CHARS = 150;
const EMBED_BATCH_SIZE = 10;

async function setJobStatus(jobId, status, extra = {}) {
  await pool.query(
    `UPDATE qaqc_standards_import_jobs
     SET status=$1, updated_at=now(),
         progress=COALESCE($2, progress),
         error_msg=COALESCE($3, error_msg),
         total_chunks=COALESCE($4, total_chunks),
         indexed_chunks=COALESCE($5, indexed_chunks)
     WHERE id=$6`,
    [status, extra.progress ?? null, extra.error_msg ?? null,
     extra.total_chunks ?? null, extra.indexed_chunks ?? null, jobId]
  );
}

function chunkText(text) {
  // Split by section headers first
  const sections = text.split(SECTION_RE).filter(s => s.trim().length > 50);
  const chunks = [];

  for (const section of sections) {
    if (section.length <= MAX_CHUNK_CHARS) {
      chunks.push(section.trim());
    } else {
      // Sliding window with overlap
      let start = 0;
      while (start < section.length) {
        const end = Math.min(start + MAX_CHUNK_CHARS, section.length);
        chunks.push(section.slice(start, end).trim());
        start += MAX_CHUNK_CHARS - OVERLAP_CHARS;
      }
    }
  }
  return chunks.filter(c => c.length > 30);
}

function extractMetadata(text, providedMeta) {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return {
    family: providedMeta.family ?? 'UNKNOWN',
    year: providedMeta.year ?? yearMatch?.[0] ?? null,
    language: providedMeta.language ?? 'EN',
  };
}

async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
  });
  return result.embedding.values;
}

async function rollbackChunks(standardId) {
  await pool.query('DELETE FROM qaqc_standard_chunks WHERE standard_id=$1', [standardId]);
}

async function processJob(job) {
  const { jobId, filename, fileBuffer: fileBufferB64, metadata: providedMeta, standardId: existingStandardId } = job.data;

  log.info({ jobId, filename }, 'Processing import job');

  try {
    // Step A: Decode and validate PDF
    await setJobStatus(jobId, 'EXTRACTING', { progress: 5 });
    const buffer = Buffer.from(fileBufferB64, 'base64');
    if (buffer.slice(0, 4).toString() !== '%PDF') {
      throw new Error('Tệp không phải PDF hợp lệ');
    }

    // Step B: Extract text
    const parser = new PDFParse({ data: buffer });
    let fullText;
    try {
      const pdfData = await parser.getText();
      fullText = pdfData.text;
    } finally {
      await parser.destroy();
    }
    if (!fullText || fullText.trim().length < 100) {
      throw new Error('PDF không có nội dung text — có thể là scan ảnh');
    }

    const meta = extractMetadata(fullText, providedMeta);
    await setJobStatus(jobId, 'EXTRACTING', { progress: 20 });

    // Update standard full_text if we have a standard record
    let standardId = existingStandardId;
    if (standardId) {
      await pool.query(
        'UPDATE qaqc_standards SET full_text=$1, updated_at=now() WHERE id=$2',
        [fullText.slice(0, 100000), standardId]
      );
    } else {
      // Create a placeholder standard record from filename
      const code = filename.replace(/\.pdf$/i, '').replace(/[_\s]+/g, '-').toUpperCase();
      const { rows } = await pool.query(
        `INSERT INTO qaqc_standards (code, title, grp, tier, version, status)
         VALUES ($1,$2,$3,1,$4,'ACTIVE')
         ON CONFLICT (code) DO UPDATE SET updated_at=now()
         RETURNING id`,
        [code, filename.replace(/\.pdf$/i, ''), meta.family, meta.year ?? null]
      );
      standardId = rows[0].id;
      await pool.query(
        'UPDATE qaqc_standards_import_jobs SET standard_id=$1 WHERE id=$2',
        [standardId, jobId]
      );
    }

    // Step C: Chunk
    await setJobStatus(jobId, 'CHUNKING', { progress: 30 });
    const chunks = chunkText(fullText);
    if (!chunks.length) throw new Error('Không thể trích xuất chunks từ PDF');
    await setJobStatus(jobId, 'CHUNKING', { progress: 40, total_chunks: chunks.length });

    // Step D+E: Embed and store in batches
    await setJobStatus(jobId, 'EMBEDDING', { progress: 45 });
    await rollbackChunks(standardId); // clean any partial previous run

    let indexed = 0;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      for (let j = 0; j < batch.length; j++) {
        const chunkIdx = i + j;
        const text = batch[j];
        let embedding = null;

        try {
          embedding = await generateEmbedding(text);
        } catch (e) {
          log.warn({ err: e }, 'Embedding failed for chunk, storing without vector');
        }

        await pool.query(
          `INSERT INTO qaqc_standard_chunks (standard_id, chunk_idx, text, embedding, metadata)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            standardId,
            chunkIdx,
            text,
            embedding ? `[${embedding.join(',')}]` : null,
            JSON.stringify({ language: meta.language, page_approx: Math.floor(chunkIdx / 3) + 1 }),
          ]
        );
        indexed++;
      }

      const progress = 45 + Math.round((indexed / chunks.length) * 50);
      await setJobStatus(jobId, 'EMBEDDING', { progress, indexed_chunks: indexed });
    }

    // Step F: Update standard status
    await pool.query(
      "UPDATE qaqc_standards SET status='INDEXED', updated_at=now() WHERE id=$1",
      [standardId]
    );

    // Step G: Done
    await setJobStatus(jobId, 'DONE', { progress: 100, indexed_chunks: indexed });
    log.info({ jobId, standardId, indexed }, 'Import job completed');

  } catch (err) {
    log.error({ err, jobId }, 'Import job failed');
    await setJobStatus(jobId, 'FAILED', { error_msg: err.message });
    throw err;
  }
}

let worker = null;

export function startStandardsImportWorker() {
  if (worker) return worker;
  worker = createWorker(QUEUE_NAME, processJob, { concurrency: 2 });
  worker.on('failed', (job, err) => log.error({ jobId: job?.data?.jobId, err }, 'BullMQ job failed'));
  log.info('Standards import worker started');
  return worker;
}

export function getImportQueueName() {
  return QUEUE_NAME;
}
