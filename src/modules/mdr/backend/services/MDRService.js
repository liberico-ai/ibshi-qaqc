import os from 'os';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import { mdrRepo } from '../repositories/MDRRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('mdr-service');

export class MDRService {
  /** Tạo dossier mới + seed 16 nhóm danh mục chuẩn từ catalog. */
  static async createDossier(data, userId) {
    const dossier = await mdrRepo.create({
      project_id:     data.project_id ?? null,
      name:           data.name,
      status:         'draft',
      completion_pct: 0,
      created_by:     userId ?? null,
    });

    const catalog = await mdrRepo.getCatalog();
    await mdrRepo.bulkInsertCategories(dossier.id, catalog);

    return mdrRepo.findDetail(dossier.id);
  }

  /**
   * Quét độ hoàn thiện: completion_pct = % nhóm bắt buộc có ít nhất 1 tài liệu 'present'.
   * Cập nhật status: draft → in_progress → ready (khi đạt 100%).
   */
  static async scanCompleteness(dossierId) {
    const detail = await mdrRepo.findDetail(dossierId);
    if (!detail) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');

    const requiredCats = detail.categories.filter((c) => c.required);
    const total = requiredCats.length || 1;

    const presentByCat = new Set(
      detail.documents.filter((d) => d.status === 'present').map((d) => d.category_id)
    );
    const satisfied = requiredCats.filter((c) => presentByCat.has(c.id)).length;
    const pct = Math.round((satisfied / total) * 10000) / 100;

    let status = detail.status;
    if (detail.status !== 'submitted') {
      if (pct >= 100) status = 'ready';
      else if (pct > 0) status = 'in_progress';
      else status = 'draft';
    }

    const updated = await mdrRepo.updateCompletion(dossierId, pct, status);
    const missing = await mdrRepo.missingDocuments(dossierId);
    return { dossier: updated, completion_pct: pct, missing };
  }

  static async listMissing(dossierId) {
    const exists = await mdrRepo.findOne(dossierId);
    if (!exists) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');
    return mdrRepo.missingDocuments(dossierId);
  }

  static async addDocument(dossierId, payload, userId) {
    const dossier = await mdrRepo.findOne(dossierId);
    if (!dossier) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');
    const doc = await mdrRepo.addDocument({ dossier_id: dossierId, ...payload });
    await this.scanCompleteness(dossierId);
    return doc;
  }

  static async updateDocument(dossierId, docId, fields) {
    const doc = await mdrRepo.findDocument(docId);
    if (!doc || doc.dossier_id !== dossierId) throw new AppError(404, 'Không tìm thấy tài liệu');
    // auto-flip status to present if a file_link is supplied without explicit status
    if (fields.file_link && fields.status === undefined) fields.status = 'present';
    const updated = await mdrRepo.updateDocument(docId, fields);
    await this.scanCompleteness(dossierId);
    return updated;
  }

  /**
   * Cảnh báo khi cấu kiện sắp bàn giao mà hồ sơ chưa đạt 100%.
   * Gọi bởi cronjob hoặc thủ công.
   */
  static async alertNearDelivery(dossierId, userIds = []) {
    const { dossier, completion_pct, missing } = await this.scanCompleteness(dossierId);
    if (completion_pct >= 100) return { alerted: false, completion_pct };

    await hooks.doAction('qaqc.notification.event', {
      eventType: 'mdr.incomplete',
      payload: {
        title: `Hồ sơ MDR chưa đầy đủ: ${dossier.name}`,
        message: `Hồ sơ "${dossier.name}" mới đạt ${completion_pct}%. Thiếu ${missing.length} nhóm bắt buộc trước khi bàn giao.`,
        dossierId, completion_pct, link: `/mdr/${dossierId}`,
      },
      userIds: [dossier.created_by, ...userIds].filter(Boolean),
    });

    return { alerted: true, completion_pct, missing };
  }

  /**
   * Phân giải `file_link` của 1 tài liệu thành đường dẫn local có thể đọc.
   * Hỗ trợ: đường dẫn tuyệt đối, file:// URI, và đường dẫn tương đối so với
   * thư mục upload (MDR_FILES_DIR / UPLOAD_DIR / cwd). Trả về null nếu không
   * có file_link hoặc không tìm thấy file đọc được.
   * @returns {string|null}
   */
  static _resolveLocalFile(fileLink) {
    if (!fileLink || typeof fileLink !== 'string') return null;
    let p = fileLink.trim();
    if (!p) return null;

    // Bỏ qua link http(s) — không phải file local.
    if (/^https?:\/\//i.test(p)) return null;

    // file:// URI → đường dẫn hệ thống.
    if (p.startsWith('file://')) {
      try { p = fileURLToPath(p); } catch { return null; }
    }

    const baseDirs = [
      process.env.MDR_FILES_DIR,
      process.env.UPLOAD_DIR,
      path.join(process.cwd(), 'uploads'),
      process.cwd(),
    ].filter(Boolean);

    const candidates = path.isAbsolute(p) ? [p] : baseDirs.map((b) => path.join(b, p));
    // Luôn thử thêm chính giá trị gốc (phòng khi đã là tuyệt đối hợp lệ).
    candidates.push(p);

    for (const c of candidates) {
      try {
        const st = fs.statSync(c);
        if (st.isFile() && st.size > 0) return c;
      } catch { /* thử ứng viên kế tiếp */ }
    }
    return null;
  }

  /** Đọc bytes file local an toàn; trả về null nếu lỗi. */
  static _safeReadFile(absPath) {
    try {
      return fs.readFileSync(absPath);
    } catch (e) {
      log.warn({ absPath, err: e?.message }, 'Không đọc được file nguồn MDR');
      return null;
    }
  }

  /** Kiểm tra magic bytes của PDF (%PDF-). */
  static _looksLikePdf(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 5 &&
      buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d;
  }

  /**
   * Biên dịch dossier thành 1 file PDF gộp (bìa + mục lục + nội dung thật).
   * Với mỗi tài liệu có `file_link` trỏ tới PDF local đọc được, nạp bằng pdf-lib
   * và copyPages vào bundle (sau trang ngăn cách nhóm). File thiếu/không đọc được/
   * không phải PDF → chèn trang placeholder "Thiếu tài liệu". Trả về đường dẫn temp.
   */
  static async compileBundle(dossierId) {
    const detail = await mdrRepo.findDetail(dossierId);
    if (!detail) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Theo dõi thực tế ghép file để phản ánh vào mục lục.
    let mergedCount = 0;
    let missingCount = 0;
    const docStatusByCat = new Map(); // category_id → { merged, missing }

    const A4 = [595, 842];

    // ── Cover page ──
    const cover = pdfDoc.addPage(A4);
    cover.drawText('MANUFACTURING DATA RECORD (MDR)', { x: 60, y: 760, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
    cover.drawText('Ho so chat luong ban giao', { x: 60, y: 735, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
    cover.drawText(`Dossier: ${this._ascii(detail.name)}`, { x: 60, y: 690, size: 12, font });
    cover.drawText(`Project: ${this._ascii(detail.project_code ?? '-')}`, { x: 60, y: 670, size: 12, font });
    cover.drawText(`Completion: ${detail.completion_pct}%`, { x: 60, y: 650, size: 12, font });
    cover.drawText(`Generated: ${new Date().toISOString().slice(0, 10)}`, { x: 60, y: 630, size: 12, font });
    cover.drawText('IBS Heavy Industry — QA/QC', { x: 60, y: 60, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

    // ── Table of contents (reserve trang; ghi nội dung sau khi biết kết quả ghép) ──
    const toc = pdfDoc.addPage(A4);

    // ── Nội dung: từng nhóm có trang ngăn cách, rồi PDF thật / placeholder ──
    for (const cat of detail.categories) {
      const docsInCat = detail.documents.filter((d) => d.category_id === cat.id);
      const stat = { merged: 0, missing: 0 };
      docStatusByCat.set(cat.id, stat);

      // Trang ngăn cách nhóm.
      const divider = pdfDoc.addPage(A4);
      divider.drawText(`${String(cat.order_no).padStart(2, '0')}. ${this._ascii(cat.name_vi)}`,
        { x: 60, y: 780, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
      divider.drawText(`Code: ${this._ascii(cat.code)}  |  ${cat.required ? 'Bat buoc' : 'Tuy chon'}`,
        { x: 60, y: 755, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
      divider.drawText(`So tai lieu: ${docsInCat.length}`, { x: 60, y: 735, size: 11, font });

      for (const doc of docsInCat) {
        const localPath = this._resolveLocalFile(doc.file_link);
        let embedded = false;

        if (localPath) {
          const buf = this._safeReadFile(localPath);
          if (buf && this._looksLikePdf(buf)) {
            try {
              const src = await PDFDocument.load(buf, { ignoreEncryption: true });
              const pages = await pdfDoc.copyPages(src, src.getPageIndices());
              pages.forEach((pg) => pdfDoc.addPage(pg));
              embedded = true;
              mergedCount++;
              stat.merged++;
            } catch (e) {
              // PDF hỏng / mã hoá không mở được → rơi xuống placeholder.
              log.warn({ docId: doc.id, err: e?.message }, 'Không nạp được PDF nguồn, dùng placeholder');
            }
          }
        }

        if (!embedded) {
          missingCount++;
          stat.missing++;
          const ph = pdfDoc.addPage(A4);
          ph.drawText('THIEU TAI LIEU', { x: 60, y: 780, size: 18, font: fontBold, color: rgb(0.7, 0.1, 0.1) });
          ph.drawText(`Tai lieu: ${this._ascii(doc.doc_name)}`, { x: 60, y: 745, size: 12, font });
          ph.drawText(`Nhom: ${this._ascii(cat.name_vi)}`, { x: 60, y: 725, size: 11, font });
          ph.drawText(`Trang thai: ${this._ascii(doc.status)}`, { x: 60, y: 705, size: 11, font });
          const reason = !doc.file_link
            ? 'Chua dinh kem file nguon'
            : (localPath ? 'File khong phai PDF hoac khong doc duoc' : 'Khong tim thay file local');
          ph.drawText(`Ly do: ${this._ascii(reason)}`, { x: 60, y: 685, size: 11, font, color: rgb(0.5, 0.5, 0.5) });
          if (doc.file_link) {
            ph.drawText(`Link: ${this._ascii(String(doc.file_link)).slice(0, 90)}`, { x: 60, y: 665, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
          }
        }
      }
    }

    // ── Ghi mục lục phản ánh thực tế merged vs missing (16 nhóm vừa 1 trang) ──
    toc.drawText('TABLE OF CONTENTS', { x: 60, y: 780, size: 16, font: fontBold });
    let tocPage = toc;
    let y = 745;
    for (const cat of detail.categories) {
      if (y < 60) { tocPage = pdfDoc.addPage(A4); y = 800; } // tràn trang nếu nhiều nhóm
      const stat = docStatusByCat.get(cat.id) ?? { merged: 0, missing: 0 };
      const totalDocs = stat.merged + stat.missing;
      const mark = cat.required ? (stat.merged > 0 ? '[OK]' : '[MISSING]') : '[OPT]';
      tocPage.drawText(
        `${String(cat.order_no).padStart(2, '0')}. ${this._ascii(cat.name_vi)}  ${mark}  (ghep ${stat.merged}/${totalDocs})`,
        { x: 60, y, size: 11, font }
      );
      y -= 22;
    }

    const bytes = await pdfDoc.save();
    const outPath = path.join(os.tmpdir(), `mdr_bundle_${dossierId}_${Date.now()}.pdf`);
    await fsp.writeFile(outPath, bytes);
    log.info({ dossierId, outPath, mergedCount, missingCount }, 'MDR bundle compiled');
    return {
      path: outPath,
      pages: pdfDoc.getPageCount(),
      merged: mergedCount,
      missing: missingCount,
      note: `PDF gồm bìa + mục lục + ${mergedCount} file thật, ${missingCount} placeholder thiếu`,
    };
  }

  /**
   * Đóng gói dossier thành .zip nộp khách hàng.
   * Gồm PDF bundle + manifest. File nguồn không có sẽ được liệt kê placeholder.
   */
  static async buildSubmission(dossierId, client) {
    const detail = await mdrRepo.findDetail(dossierId);
    if (!detail) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');

    const { default: archiver } = await import('archiver');
    const bundle = await this.compileBundle(dossierId);

    const outPath = path.join(os.tmpdir(), `mdr_submission_${dossierId}_${Date.now()}.zip`);
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const done = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });
    archive.pipe(output);

    // PDF bundle
    archive.file(bundle.path, { name: '00_MDR_Bundle.pdf' });

    // Manifest
    const manifest = {
      dossier: detail.name,
      project: detail.project_code ?? null,
      client: client ?? null,
      completion_pct: detail.completion_pct,
      generated_at: new Date().toISOString(),
      categories: detail.categories.map((c) => ({
        code: c.code,
        name_vi: c.name_vi,
        required: c.required,
        documents: detail.documents
          .filter((d) => d.category_id === c.id)
          .map((d) => {
            const resolved = this._resolveLocalFile(d.file_link);
            return {
              doc_name: d.doc_name,
              status: d.status,
              file_link: d.file_link,
              source_module: d.source_module,
              file_included: !!resolved,            // file thật đã đóng vào zip?
              resolved_path: resolved ?? null,
            };
          }),
      })),
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Document files thật khi có / placeholder text khi thiếu
    let includedFiles = 0;
    let missingFiles = 0;
    for (const doc of detail.documents) {
      const cat = detail.categories.find((c) => c.id === doc.category_id);
      const folder = cat ? `${String(cat.order_no).padStart(2, '0')}_${cat.code}` : 'misc';

      const localPath = this._resolveLocalFile(doc.file_link);
      const buf = localPath ? this._safeReadFile(localPath) : null;

      if (buf && buf.length > 0) {
        // Giữ đuôi file gốc (mặc định .pdf nếu không có).
        const ext = path.extname(localPath) || '.pdf';
        archive.append(buf, { name: `${folder}/${this._safe(doc.doc_name)}${ext}` });
        includedFiles++;
      } else {
        const reason = !doc.file_link
          ? 'Chua dinh kem file nguon'
          : (localPath ? 'Khong doc duoc file' : 'Khong tim thay file local');
        archive.append(
          `THIEU TAI LIEU (placeholder): ${doc.doc_name}\nTrang thai: ${doc.status}\nLy do: ${reason}\nLink: ${doc.file_link ?? '-'}\nModule: ${doc.source_module ?? '-'}\n`,
          { name: `${folder}/_MISSING_${this._safe(doc.doc_name)}.txt` }
        );
        missingFiles++;
      }
    }

    await archive.finalize();
    await done;

    // record a transmittal alongside the submission
    const transNo = await mdrRepo.nextTransmittalNo(dossierId);
    await mdrRepo.addTransmittal({
      dossier_id: dossierId, transmittal_no: transNo, client,
      purpose: 'Nộp hồ sơ MDR', doc_count: detail.documents.length,
      remarks: `Hoàn thiện ${detail.completion_pct}%`,
    });

    log.info({ dossierId, outPath, includedFiles, missingFiles }, 'MDR submission built');
    return {
      path: outPath,
      transmittal_no: transNo,
      doc_count: detail.documents.length,
      included_files: includedFiles,
      missing_files: missingFiles,
    };
  }

  static async createTransmittal(dossierId, payload, userId) {
    const detail = await mdrRepo.findDetail(dossierId);
    if (!detail) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');
    const transNo = await mdrRepo.nextTransmittalNo(dossierId);
    return mdrRepo.addTransmittal({
      dossier_id: dossierId,
      transmittal_no: transNo,
      client: payload.client,
      purpose: payload.purpose ?? null,
      doc_count: detail.documents.filter((d) => d.status === 'present').length,
      remarks: payload.remarks ?? null,
      issued_by: userId ?? null,
    });
  }

  static _ascii(s) {
    return String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  static _safe(s) {
    return this._ascii(s).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
  }
}
