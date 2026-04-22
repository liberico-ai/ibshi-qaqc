import { pool } from '../../../../core/db.js';
import { createQueue } from '../../../../core/queue.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('standards-import-service');
const QUEUE_NAME = 'standards-import';

let importQueue = null;
function getQueue() {
  if (!importQueue) importQueue = createQueue(QUEUE_NAME);
  return importQueue;
}

export class StandardsImportService {
  static async enqueueBatch(files, metadata, userId) {
    const jobs = [];
    for (const file of files) {
      const { rows } = await pool.query(
        `INSERT INTO qaqc_standards_import_jobs (filename, status, created_by)
         VALUES ($1, 'QUEUED', $2) RETURNING id`,
        [file.originalname, userId ?? null]
      );
      const jobId = rows[0].id;

      await getQueue().add(
        'import',
        {
          jobId,
          filename: file.originalname,
          fileBuffer: file.buffer.toString('base64'),
          metadata: {
            family: metadata?.family ?? null,
            year: metadata?.year ?? null,
            language: metadata?.language ?? 'EN',
          },
          standardId: metadata?.standardId ?? null,
        },
        { jobId, removeOnComplete: { age: 86400 }, removeOnFail: { age: 604800 } }
      );

      jobs.push({ jobId, filename: file.originalname });
    }
    return jobs;
  }

  static async listJobs({ limit = 20, offset = 0, status } = {}) {
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE j.status = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT j.id, j.filename, j.status, j.progress, j.error_msg,
              j.total_chunks, j.indexed_chunks, j.standard_id,
              j.created_at, j.updated_at,
              s.code AS standard_code, s.title AS standard_title
       FROM qaqc_standards_import_jobs j
       LEFT JOIN qaqc_standards s ON s.id = j.standard_id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const { rows: total } = await pool.query(
      `SELECT COUNT(*) FROM qaqc_standards_import_jobs ${where}`,
      status ? [status] : []
    );
    return { rows, total: parseInt(total[0].count, 10) };
  }

  static async getJobStatus(jobId) {
    const { rows } = await pool.query(
      `SELECT j.*, s.code AS standard_code, s.title AS standard_title
       FROM qaqc_standards_import_jobs j
       LEFT JOIN qaqc_standards s ON s.id = j.standard_id
       WHERE j.id = $1`,
      [jobId]
    );
    return rows[0] ?? null;
  }

  static async retryFailed(jobId) {
    const { rows } = await pool.query(
      'SELECT * FROM qaqc_standards_import_jobs WHERE id=$1 AND status=$2',
      [jobId, 'FAILED']
    );
    if (!rows[0]) throw new Error('Job không ở trạng thái FAILED hoặc không tồn tại');

    await pool.query(
      `UPDATE qaqc_standards_import_jobs
       SET status='QUEUED', progress=0, error_msg=NULL, updated_at=now()
       WHERE id=$1`,
      [jobId]
    );

    const job = rows[0];
    await getQueue().add(
      'import',
      {
        jobId,
        filename: job.filename,
        fileBuffer: null,
        metadata: {},
        standardId: job.standard_id ?? null,
        _retry: true,
      },
      { jobId: `${jobId}-retry-${Date.now()}` }
    );

    return { jobId, queued: true };
  }

  static async checkSupersede(code) {
    const { rows } = await pool.query(
      "SELECT id, code, title, version, status FROM qaqc_standards WHERE code=$1 AND status='ACTIVE'",
      [code]
    );
    return rows[0] ?? null;
  }

  static async supersede(oldStandardId, newStandardId, userId) {
    await pool.query(
      `UPDATE qaqc_standards SET status='SUPERSEDED', updated_at=now() WHERE id=$1`,
      [oldStandardId]
    );
    await pool.query(
      `UPDATE qaqc_standards SET supersedes_id=$1, updated_at=now() WHERE id=$2`,
      [oldStandardId, newStandardId]
    );
    log.info({ oldStandardId, newStandardId, userId }, 'Standard superseded');
  }
}
