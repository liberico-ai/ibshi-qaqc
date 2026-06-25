/**
 * import-standards-data.js — Nạp dữ liệu Standards Knowledge Base từ file xlsx
 * vào các bảng có cấu trúc: qaqc_standards + qaqc_chemical_specs +
 * qaqc_mechanical_specs + qaqc_standard_requirements.
 *
 * Phong cách: ESM, async/await, parameterized SQL, dùng `pool` từ src/core/db.js,
 * theo mẫu scripts/seed.js & scripts/migrate.js.
 *
 * Chạy:
 *   node --env-file=.env scripts/import-standards-data.js IBS_HI_Standards_Knowledge_Base_Phase1.xlsx
 *   (hoặc: npm run db:import-standards -- <đường_dẫn.xlsx>)
 *
 * DRY-RUN: nếu KHÔNG truyền đường dẫn file (hoặc file không tồn tại) → script chỉ
 * IN RA mapping cột→bảng dự kiến rồi exit 0, KHÔNG động vào DB.
 *
 * Idempotent:
 *   - qaqc_standards: UPSERT theo cột UNIQUE `code`.
 *   - qaqc_chemical_specs / qaqc_mechanical_specs: 2 bảng này KHÔNG có ràng buộc
 *     UNIQUE để ON CONFLICT, nên ta XOÁ theo (standard_id, grade) rồi INSERT lại
 *     → chạy nhiều lần không nhân bản.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COLUMN → TABLE MAPPING (xác nhận lại tên cột thật trong xlsx tại các TODO(map))
 * ─────────────────────────────────────────────────────────────────────────────
 * Sheet "Standards" (1 dòng = 1 tiêu chuẩn):
 *   code         → qaqc_standards.code         (UNIQUE, vd "ASTM A36")
 *   title/name   → qaqc_standards.title
 *   group/grp    → qaqc_standards.grp          (ASTM / EN / JIS / AWS / AS-NZS …)
 *   tier         → qaqc_standards.tier         (SMALLINT, default 1)
 *   version      → qaqc_standards.version
 *   issued_date  → qaqc_standards.issued_date
 *   status       → qaqc_standards.status       (default ACTIVE)
 *
 * Sheet "Chemical" (1 dòng = 1 nguyên tố của 1 grade):
 *   standard_code → join tới qaqc_standards.code để lấy standard_id
 *   grade         → qaqc_chemical_specs.grade
 *   element       → qaqc_chemical_specs.element  (C, Mn, P, S, Si, CEV …)
 *   min / max     → qaqc_chemical_specs.min_val / max_val (parse từ "≤0.26", "0.15-0.40")
 *   unit          → qaqc_chemical_specs.unit     (mặc định '%')
 *
 * Sheet "Mechanical" (1 dòng = 1 chỉ tiêu cơ tính của 1 grade):
 *   standard_code → join tới qaqc_standards.code
 *   grade         → qaqc_mechanical_specs.grade
 *   property      → qaqc_mechanical_specs.property (Yield, Tensile, Elongation, Impact …)
 *   min / max     → qaqc_mechanical_specs.min_val / max_val
 *   unit          → qaqc_mechanical_specs.unit     (MPa / % / J)
 *
 * Sheet "Requirements" (tuỳ chọn — yêu cầu dạng văn bản):
 *   standard_code → join tới qaqc_standards.code
 *   req_type      → qaqc_standard_requirements.req_type
 *   property      → qaqc_standard_requirements.property
 *   condition     → qaqc_standard_requirements.condition
 *   notes         → qaqc_standard_requirements.notes
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('import-standards');

// TODO(map): xác nhận lại tên sheet thật của file xlsx Phase1.
const SHEET_NAMES = {
  standards:    ['Standards', 'standards', 'STANDARDS', 'Standard'],
  chemical:     ['Chemical', 'chemical', 'Chemistry', 'ChemicalSpecs', 'Chemical Composition'],
  mechanical:   ['Mechanical', 'mechanical', 'MechanicalSpecs', 'Mechanical Properties'],
  requirements: ['Requirements', 'requirements', 'Reqs', 'Requirement'],
};

// TODO(map): xác nhận lại tên cột thật (header) trong từng sheet.
// Mỗi field map tới mảng alias chấp nhận được (so khớp không phân biệt hoa thường / khoảng trắng).
const COLS = {
  standards: {
    code:        ['code', 'standard_code', 'standard', 'std_code'],
    title:       ['title', 'name', 'standard_name', 'description'],
    grp:         ['grp', 'group', 'category', 'family'],
    tier:        ['tier', 'level'],
    version:     ['version', 'edition', 'revision'],
    issued_date: ['issued_date', 'issue_date', 'issued', 'date'],
    status:      ['status'],
    full_text:   ['full_text', 'fulltext', 'keywords', 'notes'],
  },
  chemical: {
    standard_code: ['standard_code', 'code', 'standard'],
    grade:         ['grade', 'grade_code'],
    element:       ['element', 'chemical_element', 'symbol'],
    min:           ['min', 'min_val', 'minimum', 'min_pct'],
    max:           ['max', 'max_val', 'maximum', 'max_pct'],
    value:         ['value', 'spec', 'limit', 'requirement'], // chuỗi "≤0.26" / "0.15-0.40"
    unit:          ['unit', 'uom'],
  },
  mechanical: {
    standard_code: ['standard_code', 'code', 'standard'],
    grade:         ['grade', 'grade_code'],
    property:      ['property', 'mechanical_property', 'parameter'],
    min:           ['min', 'min_val', 'minimum'],
    max:           ['max', 'max_val', 'maximum'],
    value:         ['value', 'spec', 'limit', 'requirement'],
    unit:          ['unit', 'uom'],
  },
  requirements: {
    standard_code: ['standard_code', 'code', 'standard'],
    req_type:      ['req_type', 'type'],
    property:      ['property', 'parameter'],
    condition:     ['condition', 'requirement', 'value'],
    notes:         ['notes', 'note', 'remark'],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Chuẩn hoá header: bỏ dấu cách thừa, hạ thường, đổi khoảng trắng → '_'. */
function normKey(k) {
  return String(k ?? '').trim().toLowerCase().replace(/\s+/g, '_');
}

/** Lấy giá trị 1 ô từ row (object keyed by header) theo danh sách alias. */
function pick(row, aliases) {
  const map = {};
  for (const [k, v] of Object.entries(row)) map[normKey(k)] = v;
  for (const a of aliases) {
    const v = map[normKey(a)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
}

/**
 * Parse 1 chuỗi spec thành { min, max }.
 * Hỗ trợ: "≤0.26" / "<=0.26" / "max 0.26"  → { min:null, max:0.26 }
 *         "≥0.10" / ">=0.10" / "min 0.10"  → { min:0.10, max:null }
 *         "0.15-0.40" / "400 to 550"       → { min:0.15, max:0.40 }
 *         "250"                            → { min:250,  max:null } (ngưỡng tối thiểu mặc định)
 * Bỏ ký tự đơn vị (%, MPa, J…) trước khi parse.
 */
function parseRange(raw) {
  if (raw === null || raw === undefined) return { min: null, max: null };
  let s = String(raw).trim();
  if (!s) return { min: null, max: null };

  const num = (t) => {
    const m = String(t).replace(/[^0-9.\-]/g, ' ').trim().match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  const lower = s.toLowerCase();

  if (/^(≤|<=|<|max)/.test(s) || lower.startsWith('max')) {
    return { min: null, max: num(s) };
  }
  if (/^(≥|>=|>|min)/.test(s) || lower.startsWith('min')) {
    return { min: num(s), max: null };
  }

  // Khoảng "a-b" hoặc "a to b" (cẩn thận dấu '-' không phải dấu trừ số âm).
  const rangeMatch = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to|~)\s*(-?\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  // Một số đơn → coi là ngưỡng tối thiểu (vd Yield "250 MPa").
  const single = num(s);
  return { min: single, max: null };
}

/** Parse min/max ưu tiên cột min/max rời, fallback sang cột value gộp. */
function resolveMinMax(row, colset) {
  const minRaw = pick(row, colset.min);
  const maxRaw = pick(row, colset.max);
  if (minRaw !== null || maxRaw !== null) {
    return {
      min: minRaw !== null ? parseRange(minRaw).min ?? parseRange(minRaw).max : null,
      max: maxRaw !== null ? parseRange(maxRaw).max ?? parseRange(maxRaw).min : null,
    };
  }
  return parseRange(pick(row, colset.value));
}

/** Lấy 1 sheet theo danh sách tên ưu tiên; trả về [] nếu không có. */
function readSheet(wb, names) {
  for (const n of names) {
    if (wb.SheetNames.includes(n)) {
      return xlsx.utils.sheet_to_json(wb.Sheets[n], { defval: null });
    }
  }
  return null;
}

// ── DRY-RUN ──────────────────────────────────────────────────────────────────
function printDryRun(reason) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' IMPORT STANDARDS — CHẾ ĐỘ DRY-RUN (không ghi DB)');
  console.log(' Lý do:', reason);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nCú pháp đầy đủ:');
  console.log('  node --env-file=.env scripts/import-standards-data.js <đường_dẫn.xlsx>\n');
  console.log('Mapping cột → bảng sẽ được thực hiện:\n');

  console.log('• Sheet Standards  → bảng qaqc_standards (UPSERT theo code)');
  console.log('    code,title,grp,tier,version,issued_date,status,full_text');
  console.log('• Sheet Chemical   → bảng qaqc_chemical_specs (xoá theo standard_id+grade rồi insert)');
  console.log('    standard_code(join)→standard_id, grade, element, min_val, max_val, unit');
  console.log('• Sheet Mechanical → bảng qaqc_mechanical_specs (xoá theo standard_id+grade rồi insert)');
  console.log('    standard_code(join)→standard_id, grade, property, min_val, max_val, unit');
  console.log('• Sheet Requirements (tuỳ chọn) → bảng qaqc_standard_requirements');
  console.log('    standard_code(join)→standard_id, req_type, property, condition, notes');
  console.log('\nGhi chú: TODO(map) trong file đánh dấu các tên sheet/cột cần đối chiếu');
  console.log('với header thật của file xlsx Phase1 (39 grades / 242 chemical / 181 mechanical).');
  console.log('═══════════════════════════════════════════════════════════════');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const filePath = process.argv[2];

  if (!filePath) {
    printDryRun('Không truyền đường dẫn file xlsx (CLI arg #1).');
    await pool.end().catch(() => {});
    process.exit(0);
  }
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    printDryRun(`Không tìm thấy file: ${abs}`);
    await pool.end().catch(() => {});
    process.exit(0);
  }

  log.info({ abs }, 'Đọc file xlsx');
  const wb = xlsx.readFile(abs);

  const stdRows  = readSheet(wb, SHEET_NAMES.standards);
  const chemRows = readSheet(wb, SHEET_NAMES.chemical) ?? [];
  const mechRows = readSheet(wb, SHEET_NAMES.mechanical) ?? [];
  const reqRows  = readSheet(wb, SHEET_NAMES.requirements) ?? [];

  if (!stdRows) {
    console.error(`❌ Không tìm thấy sheet Standards (đã thử: ${SHEET_NAMES.standards.join(', ')}).`);
    console.error(`   Sheet hiện có trong file: ${wb.SheetNames.join(', ')}`);
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const codeToId = new Map();
  let stdN = 0, chemN = 0, mechN = 0, reqN = 0;

  try {
    await pool.query('BEGIN');

    // ── 1) Standards (UPSERT theo code) ──
    for (const row of stdRows) {
      const code = pick(row, COLS.standards.code);
      if (!code) continue;
      const title = pick(row, COLS.standards.title) ?? String(code);
      const grp = pick(row, COLS.standards.grp);
      const tierRaw = pick(row, COLS.standards.tier);
      const tier = tierRaw != null ? parseInt(String(tierRaw).replace(/[^0-9]/g, ''), 10) || 1 : 1;
      const version = pick(row, COLS.standards.version);
      const issuedRaw = pick(row, COLS.standards.issued_date);
      const issued = issuedRaw ? new Date(issuedRaw) : null;
      const issuedDate = issued && !isNaN(issued) ? issued.toISOString().slice(0, 10) : null;
      const status = pick(row, COLS.standards.status) ?? 'ACTIVE';
      const fullText = pick(row, COLS.standards.full_text);

      const { rows } = await pool.query(
        `INSERT INTO qaqc_standards (code, title, grp, tier, version, issued_date, status, full_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (code) DO UPDATE SET
           title = EXCLUDED.title, grp = EXCLUDED.grp, tier = EXCLUDED.tier,
           version = EXCLUDED.version, issued_date = EXCLUDED.issued_date,
           status = EXCLUDED.status,
           full_text = COALESCE(EXCLUDED.full_text, qaqc_standards.full_text),
           updated_at = now()
         RETURNING id, code`,
        [String(code).trim(), title, grp, tier, version, issuedDate, status, fullText]
      );
      codeToId.set(String(code).trim(), rows[0].id);
      stdN++;
    }

    // Helper: resolve standard_id từ standard_code (đã có trong map hoặc query DB).
    async function resolveStdId(stdCode) {
      if (!stdCode) return null;
      const key = String(stdCode).trim();
      if (codeToId.has(key)) return codeToId.get(key);
      const { rows } = await pool.query('SELECT id FROM qaqc_standards WHERE code = $1', [key]);
      if (rows[0]) { codeToId.set(key, rows[0].id); return rows[0].id; }
      return null;
    }

    // ── 2) Chemical specs (idempotent: xoá theo standard_id+grade rồi insert) ──
    // Gom theo (standard_id, grade) để clear một lần.
    const clearedChem = new Set();
    for (const row of chemRows) {
      const stdId = await resolveStdId(pick(row, COLS.chemical.standard_code));
      const grade = pick(row, COLS.chemical.grade);
      const element = pick(row, COLS.chemical.element);
      if (!stdId || !element) continue;

      const clearKey = `${stdId}::${grade ?? ''}`;
      if (!clearedChem.has(clearKey)) {
        await pool.query(
          'DELETE FROM qaqc_chemical_specs WHERE standard_id = $1 AND grade IS NOT DISTINCT FROM $2',
          [stdId, grade]
        );
        clearedChem.add(clearKey);
      }

      const { min, max } = resolveMinMax(row, COLS.chemical);
      const unit = pick(row, COLS.chemical.unit) ?? '%';
      await pool.query(
        `INSERT INTO qaqc_chemical_specs (standard_id, grade, element, min_val, max_val, unit)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [stdId, grade, String(element).trim(), min, max, unit]
      );
      chemN++;
    }

    // ── 3) Mechanical specs (idempotent giống chemical) ──
    const clearedMech = new Set();
    for (const row of mechRows) {
      const stdId = await resolveStdId(pick(row, COLS.mechanical.standard_code));
      const grade = pick(row, COLS.mechanical.grade);
      const property = pick(row, COLS.mechanical.property);
      if (!stdId || !property) continue;

      const clearKey = `${stdId}::${grade ?? ''}`;
      if (!clearedMech.has(clearKey)) {
        await pool.query(
          'DELETE FROM qaqc_mechanical_specs WHERE standard_id = $1 AND grade IS NOT DISTINCT FROM $2',
          [stdId, grade]
        );
        clearedMech.add(clearKey);
      }

      const { min, max } = resolveMinMax(row, COLS.mechanical);
      const unit = pick(row, COLS.mechanical.unit);
      await pool.query(
        `INSERT INTO qaqc_mechanical_specs (standard_id, grade, property, min_val, max_val, unit)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [stdId, grade, String(property).trim(), min, max, unit]
      );
      mechN++;
    }

    // ── 4) Requirements (tuỳ chọn; idempotent: xoá theo standard_id rồi insert) ──
    const clearedReq = new Set();
    for (const row of reqRows) {
      const stdId = await resolveStdId(pick(row, COLS.requirements.standard_code));
      if (!stdId) continue;
      if (!clearedReq.has(stdId)) {
        await pool.query('DELETE FROM qaqc_standard_requirements WHERE standard_id = $1', [stdId]);
        clearedReq.add(stdId);
      }
      await pool.query(
        `INSERT INTO qaqc_standard_requirements (standard_id, req_type, property, condition, notes)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          stdId,
          pick(row, COLS.requirements.req_type),
          pick(row, COLS.requirements.property),
          pick(row, COLS.requirements.condition),
          pick(row, COLS.requirements.notes),
        ]
      );
      reqN++;
    }

    await pool.query('COMMIT');
    log.info({ stdN, chemN, mechN, reqN }, '✅ Import standards hoàn tất');
    console.log(`✅ Import hoàn tất: ${stdN} tiêu chuẩn, ${chemN} chemical, ${mechN} mechanical, ${reqN} requirements.`);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    log.error(err, '❌ Import standards thất bại — đã rollback');
    console.error('❌ Lỗi import:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

run();
