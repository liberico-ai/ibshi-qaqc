/**
 * migrate-nas-projects.js
 * -----------------------------------------------------------------------------
 * Di trú danh sách dự án từ file Excel "Project - Procedures status.xlsx" (lưu
 * trên NAS) vào bảng qaqc_projects.
 *
 * Cách chạy:
 *   node --env-file=.env scripts/migrate-nas-projects.js "/duong/dan/Project - Procedures status.xlsx"
 *
 * Nếu KHÔNG truyền đường dẫn, hoặc file không tồn tại → chạy chế độ DRY-RUN:
 * script chỉ in ra những gì SẼ làm mà không ghi vào DB.
 *
 * Quy ước: dùng pool từ src/core/db.js (giống seed.js / migrate.js) và biến môi
 * trường nạp qua --env-file.
 */
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('migrate-nas-projects');

// ── Ánh xạ cột Excel → cột DB ───────────────────────────────────────────────
// Đặt tên cột linh hoạt: chấp nhận nhiều biến thể tiêu đề (header) hay gặp.
// CHỈNH Ở ĐÂY nếu file Excel thực tế dùng tên cột khác.
const COLUMN_ALIASES = {
  code:     ['code', 'project code', 'project_code', 'ma du an', 'mã dự án', 'project no', 'job no'],
  name:     ['name', 'project name', 'project_name', 'ten du an', 'tên dự án', 'project'],
  customer: ['customer', 'client', 'khach hang', 'khách hàng', 'owner'],
  status:   ['status', 'trang thai', 'trạng thái', 'project status'],
};

function normalizeHeader(h) {
  return String(h ?? '').trim().toLowerCase();
}

/** Tìm giá trị của 1 trường logic từ 1 row, dựa trên danh sách alias header. */
function pickField(row, normalizedRow, field) {
  for (const alias of COLUMN_ALIASES[field]) {
    if (alias in normalizedRow && normalizedRow[alias] != null && String(normalizedRow[alias]).trim() !== '') {
      return String(normalizedRow[alias]).trim();
    }
  }
  return null;
}

/** Chuẩn hoá 1 row Excel → object project ({ code, name, customer, status }). */
function rowToProject(row) {
  const normalizedRow = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[normalizeHeader(k)] = v;
  }
  const code = pickField(row, normalizedRow, 'code');
  const name = pickField(row, normalizedRow, 'name') ?? code;
  if (!code) return null; // thiếu mã dự án → bỏ qua
  return {
    code,
    name,
    customer: pickField(row, normalizedRow, 'customer'),
    status: (pickField(row, normalizedRow, 'status') ?? 'ACTIVE').toUpperCase(),
  };
}

/** Đọc các project từ file Excel. */
function readProjectsFromExcel(filePath) {
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  log.info(`Đọc sheet "${sheetName}": ${rows.length} dòng`);
  const projects = [];
  for (const row of rows) {
    const p = rowToProject(row);
    if (p) projects.push(p);
  }
  return projects;
}

/** Upsert 1 project vào qaqc_projects (parameterized SQL, ON CONFLICT code). */
async function upsertProject(p) {
  const { rows } = await pool.query(
    `INSERT INTO qaqc_projects (code, name, customer, status, synced_at)
       VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           customer = COALESCE(EXCLUDED.customer, qaqc_projects.customer),
           status = EXCLUDED.status,
           synced_at = now(),
           updated_at = now()
     RETURNING (xmax = 0) AS inserted`,
    [p.code, p.name, p.customer, p.status]
  );
  return rows[0]?.inserted ? 'inserted' : 'updated';
}

async function run() {
  const filePath = process.argv[2];
  const exists = filePath && fs.existsSync(filePath);

  if (!exists) {
    log.warn(
      filePath
        ? `Không tìm thấy file: ${filePath}`
        : 'Không truyền đường dẫn file Excel.'
    );
    log.warn('→ Chạy chế độ DRY-RUN (không ghi DB).');
    log.info('Cách dùng: node --env-file=.env scripts/migrate-nas-projects.js "<đường dẫn Excel>"');
    log.info('Script sẽ: đọc sheet đầu tiên → ánh xạ cột (code/name/customer/status) → upsert vào qaqc_projects theo code.');
    await pool.end();
    return;
  }

  log.info(`Nguồn: ${path.resolve(filePath)}`);
  let projects = [];
  try {
    projects = readProjectsFromExcel(filePath);
  } catch (err) {
    log.error(err, 'Lỗi đọc file Excel');
    await pool.end();
    process.exit(1);
  }

  log.info(`Tổng số dự án hợp lệ (có mã): ${projects.length}`);

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    log.warn('Cờ --dry-run: chỉ in danh sách, không ghi DB.');
    for (const p of projects) log.info(`[DRY] ${p.code} | ${p.name} | ${p.customer ?? '-'} | ${p.status}`);
    await pool.end();
    return;
  }

  let inserted = 0, updated = 0;
  try {
    for (const p of projects) {
      const result = await upsertProject(p);
      if (result === 'inserted') inserted++; else updated++;
    }
    log.info(`✅ Hoàn tất: ${inserted} thêm mới, ${updated} cập nhật.`);
  } catch (err) {
    log.error(err, '❌ Lỗi khi upsert dự án');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
