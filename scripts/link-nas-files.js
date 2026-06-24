/**
 * link-nas-files.js
 * -----------------------------------------------------------------------------
 * Liên kết (link) file PDF/DOC trên NAS vào bản ghi QA/QC mà KHÔNG di chuyển hay
 * sao chép file. Script chỉ lưu METADATA + ĐƯỜNG DẪN (path/URL) vào bảng
 * sys_file_links (migration sys_021_file_links.sql).
 *
 * Hai cách dùng:
 *
 * 1) Liên kết 1 file trực tiếp qua tham số dòng lệnh:
 *    node --env-file=.env scripts/link-nas-files.js \
 *      --entity-type project --entity-id <id> \
 *      --nas-path "\\\\NAS\\QAQC\\IBS-2024-001\\procedure.pdf" \
 *      --file-name "procedure.pdf"
 *
 * 2) Liên kết hàng loạt từ file CSV/Excel (mỗi dòng 1 liên kết):
 *    node --env-file=.env scripts/link-nas-files.js --file "links.xlsx"
 *    Cột mong đợi: entity_type, entity_id, file_name, nas_path, mime_type (tuỳ chọn)
 *
 * Không truyền đủ tham số → chạy DRY-RUN, in hướng dẫn.
 *
 * Quy ước: pool từ src/core/db.js, env nạp qua --env-file (giống seed.js).
 */
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('link-nas-files');

// ── Parse cờ dạng --key value ───────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

function guessMime(fileName) {
  const ext = path.extname(String(fileName ?? '')).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? null;
}

/** Upsert 1 liên kết file (parameterized; ON CONFLICT theo entity+nas_path). */
async function linkFile({ entity_type, entity_id, file_name, nas_path, mime_type, linked_by }) {
  if (!entity_type || !entity_id || !nas_path) {
    throw new Error('Thiếu entity_type / entity_id / nas_path');
  }
  const fname = file_name ?? path.basename(String(nas_path));
  const mime = mime_type ?? guessMime(fname);
  await pool.query(
    `INSERT INTO sys_file_links (entity_type, entity_id, file_name, nas_path, mime_type, linked_at, linked_by)
       VALUES ($1, $2, $3, $4, $5, now(), $6)
     ON CONFLICT (entity_type, entity_id, nas_path) DO UPDATE
       SET file_name = EXCLUDED.file_name,
           mime_type = EXCLUDED.mime_type,
           linked_at = now()`,
    [entity_type, String(entity_id), fname, nas_path, mime, linked_by ?? null]
  );
  return { entity_type, entity_id, file_name: fname, nas_path };
}

function readRowsFromFile(filePath) {
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  return rows.map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[String(k).trim().toLowerCase()] = v;
    return {
      entity_type: o['entity_type'] ?? o['entity type'] ?? null,
      entity_id:   o['entity_id'] ?? o['entity id'] ?? null,
      file_name:   o['file_name'] ?? o['file name'] ?? null,
      nas_path:    o['nas_path'] ?? o['nas path'] ?? o['path'] ?? null,
      mime_type:   o['mime_type'] ?? o['mime'] ?? null,
    };
  });
}

async function run() {
  const args = parseArgs(process.argv);

  // Chế độ hàng loạt từ file
  if (args.file) {
    if (!fs.existsSync(args.file)) {
      log.warn(`Không tìm thấy file: ${args.file} → DRY-RUN.`);
      await pool.end();
      return;
    }
    const rows = readRowsFromFile(args.file);
    log.info(`Đọc ${rows.length} dòng liên kết từ ${args.file}`);
    let ok = 0, skip = 0;
    for (const r of rows) {
      if (!r.entity_type || !r.entity_id || !r.nas_path) { skip++; continue; }
      try { await linkFile(r); ok++; }
      catch (e) { log.warn({ err: e.message, row: r }, 'Bỏ qua 1 dòng lỗi'); skip++; }
    }
    log.info(`✅ Liên kết xong: ${ok} thành công, ${skip} bỏ qua.`);
    await pool.end();
    return;
  }

  // Chế độ liên kết 1 file qua tham số
  if (args['entity-type'] && args['entity-id'] && args['nas-path']) {
    try {
      const res = await linkFile({
        entity_type: args['entity-type'],
        entity_id: args['entity-id'],
        file_name: args['file-name'],
        nas_path: args['nas-path'],
        mime_type: args['mime-type'],
      });
      log.info(`✅ Đã liên kết: ${JSON.stringify(res)}`);
    } catch (e) {
      log.error(e, '❌ Lỗi liên kết file');
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
    return;
  }

  // DRY-RUN / hướng dẫn
  log.warn('Thiếu tham số → DRY-RUN.');
  log.info('Liên kết 1 file:');
  log.info('  node --env-file=.env scripts/link-nas-files.js --entity-type project --entity-id <id> --nas-path "<đường dẫn NAS>" --file-name "<tên file>"');
  log.info('Liên kết hàng loạt từ Excel/CSV (cột: entity_type, entity_id, file_name, nas_path, mime_type):');
  log.info('  node --env-file=.env scripts/link-nas-files.js --file "links.xlsx"');
  log.info('Lưu ý: script KHÔNG di chuyển/sao chép file — chỉ lưu đường dẫn vào bảng sys_file_links.');
  await pool.end();
}

run().catch(async (err) => {
  log.error(err, 'Lỗi link-nas-files');
  await pool.end();
  process.exit(1);
});
