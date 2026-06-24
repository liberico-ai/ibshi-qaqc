/**
 * import-qaqc-records.js
 * -----------------------------------------------------------------------------
 * Khung (skeleton) nhập dữ liệu chỉ mục (index) các bản ghi QA/QC từ Excel/CSV:
 *   - NCR (Non-Conformance Report)
 *   - Inspection (kết quả kiểm tra)
 *   - MDR (Manufacturing Data Report) index
 *
 * Script này được viết PHÒNG THỦ (defensive): mặc định chạy DRY-RUN, chỉ đọc và
 * in ra cấu trúc dữ liệu đã ánh xạ. Phần ghi DB cố tình để TRỐNG kèm chú thích
 * rõ ràng nơi cần điền mapping cột → cột DB, vì lược đồ NCR/MDR do các module
 * mới (đang phát triển song song) định nghĩa.
 *
 * Cách chạy:
 *   node --env-file=.env scripts/import-qaqc-records.js <type> "<đường dẫn file>"
 *     <type> = ncr | inspection | mdr
 *   Thêm cờ --commit để thực sự ghi DB (khi đã hoàn thiện phần INSERT).
 *
 * Quy ước: pool từ src/core/db.js, env nạp qua --env-file (giống seed.js).
 */
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('import-qaqc-records');

const SUPPORTED_TYPES = ['ncr', 'inspection', 'mdr'];

// ── Đọc file Excel HOẶC CSV (xlsx hỗ trợ cả hai) ────────────────────────────
function readRows(filePath) {
  const wb = xlsx.readFile(filePath); // xlsx đọc được cả .csv
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  log.info(`Đọc "${sheetName}": ${rows.length} dòng`);
  return rows;
}

function normalizeKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[String(k).trim().toLowerCase()] = v;
  }
  return out;
}

// ── Ánh xạ cho từng loại bản ghi ────────────────────────────────────────────
// LƯU Ý: đây là KHUNG. Hãy điền tên cột Excel thực tế ở vế phải khi triển khai.

/** NCR — ánh xạ 1 row → object chuẩn hoá. */
function mapNCR(nrow) {
  return {
    ncr_no:       nrow['ncr no'] ?? nrow['ncr_no'] ?? nrow['số ncr'] ?? null,
    project_code: nrow['project'] ?? nrow['project code'] ?? nrow['mã dự án'] ?? null,
    description:  nrow['description'] ?? nrow['mô tả'] ?? null,
    severity:     nrow['severity'] ?? nrow['mức độ'] ?? null,
    status:       nrow['status'] ?? nrow['trạng thái'] ?? null,
    raised_date:  nrow['date'] ?? nrow['raised date'] ?? nrow['ngày'] ?? null,
  };
  // TODO(mapping): khi module NCR sẵn sàng, INSERT vào bảng ncr_records.
  // Cột DB ↔ field ở trên cần khớp với migration của module NCR.
}

/** Inspection — ánh xạ 1 row → object chuẩn hoá. */
function mapInspection(nrow) {
  return {
    ip_code:      nrow['ip code'] ?? nrow['ip_code'] ?? nrow['mã ip'] ?? null,
    project_code: nrow['project'] ?? nrow['project code'] ?? nrow['mã dự án'] ?? null,
    result:       nrow['result'] ?? nrow['kết quả'] ?? null,
    inspector:    nrow['inspector'] ?? nrow['người kiểm tra'] ?? null,
    inspected_at: nrow['date'] ?? nrow['inspected date'] ?? nrow['ngày'] ?? null,
  };
  // TODO(mapping): INSERT vào qaqc_inspections (cần project_id/plan_id/item_id
  // — phải tra cứu UUID từ code trước khi chèn).
}

/** MDR index — ánh xạ 1 row → object chuẩn hoá. */
function mapMDR(nrow) {
  return {
    mdr_no:       nrow['mdr no'] ?? nrow['mdr_no'] ?? nrow['số mdr'] ?? null,
    project_code: nrow['project'] ?? nrow['project code'] ?? nrow['mã dự án'] ?? null,
    title:        nrow['title'] ?? nrow['tiêu đề'] ?? null,
    rev:          nrow['rev'] ?? nrow['revision'] ?? null,
    status:       nrow['status'] ?? nrow['trạng thái'] ?? null,
  };
  // TODO(mapping): INSERT vào bảng mdr_index khi module MDR sẵn sàng.
}

const MAPPERS = { ncr: mapNCR, inspection: mapInspection, mdr: mapMDR };

async function run() {
  const type = (process.argv[2] ?? '').toLowerCase();
  const filePath = process.argv[3];
  const commit = process.argv.includes('--commit');

  if (!SUPPORTED_TYPES.includes(type)) {
    log.error(`Loại không hợp lệ. Dùng: node --env-file=.env scripts/import-qaqc-records.js <${SUPPORTED_TYPES.join('|')}> "<file>"`);
    await pool.end();
    process.exit(1);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    log.warn(`Không tìm thấy file: ${filePath ?? '(trống)'} → DRY-RUN.`);
    log.info(`Khi có file, script sẽ đọc và ánh xạ cột cho loại "${type}".`);
    await pool.end();
    return;
  }

  const rows = readRows(filePath).map(normalizeKeys);
  const mapper = MAPPERS[type];
  const mapped = rows.map(mapper);

  log.info(`Đã ánh xạ ${mapped.length} bản ghi loại "${type}". Mẫu 3 dòng đầu:`);
  for (const m of mapped.slice(0, 3)) log.info(JSON.stringify(m));

  if (!commit) {
    log.warn('Chưa có cờ --commit → KHÔNG ghi DB (DRY-RUN).');
    log.warn('Phần INSERT cần được hoàn thiện theo lược đồ module tương ứng (xem các TODO trong file).');
    await pool.end();
    return;
  }

  // ── Phần ghi DB (để trống có chủ đích) ────────────────────────────────────
  // Khi các bảng đích (ncr_records / mdr_index / qaqc_inspections) đã có,
  // triển khai INSERT/upsert tham số hoá tại đây, ví dụ:
  //   for (const m of mapped) {
  //     await pool.query('INSERT INTO <bảng> (...) VALUES ($1,$2,...) ON CONFLICT ... ', [...]);
  //   }
  log.warn('--commit được bật nhưng phần ghi DB chưa được kích hoạt trong skeleton này.');
  log.warn('→ Hãy điền mapping & INSERT trước khi dùng --commit trên môi trường thật.');
  await pool.end();
}

run().catch(async (err) => {
  log.error(err, 'Lỗi import-qaqc-records');
  await pool.end();
  process.exit(1);
});
