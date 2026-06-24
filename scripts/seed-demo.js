/**
 * seed-demo.js — dữ liệu DEMO để Dashboard & các danh sách trông "đầy đủ" như mockup.
 *
 * Idempotent: dùng ON CONFLICT / kiểm tra tồn tại, chạy nhiều lần không nhân bản.
 * Theo phong cách scripts/seed.js (ESM, dùng pool, --env-file=.env).
 *
 * Chạy:  node --env-file=.env scripts/seed-demo.js
 *        (hoặc: npm run db:seed-demo)
 *
 * Nội dung:
 *   - 6 dự án (gồm "13079 Whyalla — BRADEN")
 *   - 1 ITP plan + items + checkpoints (để tạo inspection hợp lệ theo FK)
 *   - ~12 inspections + results (PASS / FAIL / REWORK) trải các giai đoạn QC
 *   - 8 NCR (mixed status + nguyên nhân gốc)
 *   - MDR dossiers với % hoàn thành khác nhau
 *   - vài thợ hàn (wld_welders) + thiết bị hiệu chuẩn (cal_devices, qaqc_calibration_devices)
 */
import argon2 from 'argon2';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('seed-demo');

/** Kiểm tra bảng tồn tại (phòng khi module chưa migrate). */
async function tableExists(name) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [name]
  );
  return rows.length > 0;
}

async function ensureDemoUser() {
  const hash = await argon2.hash('123456');
  const { rows } = await pool.query(
    `INSERT INTO sys_users (full_name, username, password_hash, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    ['QC Inspector', 'qc01', hash]
  );
  return rows[0].id;
}

const PROJECTS = [
  { code: '13079', name: 'Whyalla Steelworks',          customer: 'BRADEN',     status: 'ACTIVE' },
  { code: '13080', name: 'CDE Minerals Classifier',     customer: 'CDE Asia',   status: 'ACTIVE' },
  { code: '13081', name: 'Santos GLNG - Pipe Rack',     customer: 'Santos Ltd', status: 'COMPLETED' },
  { code: '13082', name: 'Rio Tinto - Conveyor Structure', customer: 'Rio Tinto', status: 'ACTIVE' },
  { code: '13083', name: 'FLSmidth Ball Mill',          customer: 'FLSmidth',   status: 'ON_HOLD' },
  { code: '13078', name: 'Thiess Mining Equipment',     customer: 'Thiess',     status: 'COMPLETED' },
];

async function seedProjects() {
  const map = {};
  for (const p of PROJECTS) {
    const { rows } = await pool.query(
      `INSERT INTO qaqc_projects (code, name, customer, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, customer = EXCLUDED.customer, status = EXCLUDED.status
       RETURNING id, code`,
      [p.code, p.name, p.customer, p.status]
    );
    map[rows[0].code] = rows[0].id;
  }
  log.info(`  ✓ ${PROJECTS.length} dự án`);
  return map;
}

/** Tạo 1 ITP plan + items + checkpoints cho dự án Whyalla → trả ra map checkpoint theo seq. */
async function seedItp(projectId, userId) {
  // plan (tránh trùng: kiểm tra theo project + product_type)
  let planId;
  const existing = await pool.query(
    `SELECT id FROM qaqc_inspection_plans WHERE project_id = $1 AND product_type = $2 LIMIT 1`,
    [projectId, 'Demo Duct Assembly']
  );
  if (existing.rows.length) {
    planId = existing.rows[0].id;
  } else {
    const { rows } = await pool.query(
      `INSERT INTO qaqc_inspection_plans (project_id, product_type, version, status, created_by)
       VALUES ($1, $2, 1, 'APPROVED', $3) RETURNING id`,
      [projectId, 'Demo Duct Assembly', userId]
    );
    planId = rows[0].id;
  }

  const STAGES = [
    { seq: 1, ip: 'IP-MAT', desc: 'Material Inspection' },
    { seq: 2, ip: 'IP-CUT', desc: 'Marking & Cutting' },
    { seq: 3, ip: 'IP-FIT', desc: 'Fit-up Assembly' },
    { seq: 4, ip: 'IP-WELD', desc: 'Welding Visual' },
    { seq: 5, ip: 'IP-NDT', desc: 'NDT - UT' },
    { seq: 6, ip: 'IP-DIM', desc: 'Dimensional Check' },
    { seq: 7, ip: 'IP-PNT', desc: 'Painting DFT' },
  ];

  const checkpoints = {};
  for (const s of STAGES) {
    let itemId;
    const it = await pool.query(
      `SELECT id FROM qaqc_itp_items WHERE plan_id = $1 AND seq = $2 LIMIT 1`,
      [planId, s.seq]
    );
    if (it.rows.length) {
      itemId = it.rows[0].id;
    } else {
      const r = await pool.query(
        `INSERT INTO qaqc_itp_items (plan_id, seq, ip_code, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [planId, s.seq, s.ip, s.desc]
      );
      itemId = r.rows[0].id;
    }

    let cpId;
    const cp = await pool.query(
      `SELECT id FROM qaqc_itp_checkpoints WHERE item_id = $1 LIMIT 1`,
      [itemId]
    );
    if (cp.rows.length) {
      cpId = cp.rows[0].id;
    } else {
      const r = await pool.query(
        `INSERT INTO qaqc_itp_checkpoints (item_id, label, required, data_type)
         VALUES ($1, $2, true, 'boolean') RETURNING id`,
        [itemId, `${s.desc} — Acceptance`]
      );
      cpId = r.rows[0].id;
    }
    checkpoints[s.seq] = { itemId, checkpointId: cpId, ip: s.ip, desc: s.desc };
  }
  return { planId, checkpoints };
}

// 12 inspection demo: (seq giai đoạn, kết quả, số ngày trước)
const INSPECTIONS = [
  { seq: 4, result: 'PASS',   item: 'Welding Visual - Duct #7',        daysAgo: 1 },
  { seq: 5, result: 'FAIL',   item: 'NDT - UT Weld Seam #15',          daysAgo: 2 },
  { seq: 6, result: 'PASS',   item: 'Dimensional Check - Frame A3',    daysAgo: 3 },
  { seq: 1, result: 'PASS',   item: 'Material Cert - Plate 12mm',      daysAgo: 4 },
  { seq: 7, result: 'REWORK', item: 'Painting DFT - Panel B2',         daysAgo: 5 },
  { seq: 1, result: 'PASS',   item: 'Material Inspection - Beam set',  daysAgo: 6 },
  { seq: 2, result: 'PASS',   item: 'Marking & Cutting - Plate run',   daysAgo: 7 },
  { seq: 3, result: 'PASS',   item: 'Fit-up - Flange joint J12',       daysAgo: 8 },
  { seq: 4, result: 'PASS',   item: 'Welding Visual - Duct #6',        daysAgo: 9 },
  { seq: 4, result: 'PASS',   item: 'Welding Visual - Duct #5',        daysAgo: 10 },
  { seq: 5, result: 'PASS',   item: 'NDT - UT Weld Seam #12',          daysAgo: 11 },
  { seq: 6, result: 'PASS',   item: 'Dimensional Check - Frame A1',    daysAgo: 12 },
];

async function seedInspections(planId, checkpoints, projectId, userId) {
  // Xoá demo cũ để tránh nhân bản (dựa trên unit_id prefix DEMO-)
  await pool.query(
    `DELETE FROM qaqc_inspections WHERE plan_id = $1 AND unit_id LIKE 'DEMO-%'`,
    [planId]
  );

  let n = 0;
  for (const ins of INSPECTIONS) {
    const cp = checkpoints[ins.seq];
    if (!cp) continue;
    const completedAt = `now() - interval '${ins.daysAgo} days'`;
    const createdAt = `now() - interval '${ins.daysAgo + 2} days'`;
    const r = await pool.query(
      `INSERT INTO qaqc_inspections (plan_id, item_id, project_id, unit_id, ip_code, status, assigned_to, completed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6, ${completedAt}, ${createdAt})
       RETURNING id`,
      [planId, cp.itemId, projectId, `DEMO-${n + 1}`, cp.ip, userId]
    );
    const inspId = r.rows[0].id;
    await pool.query(
      `INSERT INTO qaqc_inspection_results (inspection_id, checkpoint_id, result, note)
       VALUES ($1, $2, $3, $4)`,
      [inspId, cp.checkpointId, ins.result, ins.item]
    );
    n++;
  }
  log.info(`  ✓ ${n} inspections + results (PASS/FAIL/REWORK)`);
}

const NCRS = [
  { no: 'NCR-001', title: 'Welding undercut tại Duct #3',   status: 'CLOSED', root: 'welding',     sev: 'major',    closedDaysAgo: 20 },
  { no: 'NCR-002', title: 'Sai lệch kích thước Frame A2',    status: 'CLOSED', root: 'dimensional', sev: 'minor',    closedDaysAgo: 18 },
  { no: 'NCR-003', title: 'Process deviation - sai WPS',     status: 'CLOSED', root: 'process',     sev: 'major',    closedDaysAgo: 12 },
  { no: 'NCR-004', title: 'Welding porosity Seam #9',        status: 'CLOSED', root: 'welding',     sev: 'major',    closedDaysAgo: 8 },
  { no: 'NCR-005', title: 'Welding rework Duct #4',          status: 'CLOSED', root: 'welding',     sev: 'critical', closedDaysAgo: 1 },
  { no: 'NCR-006', title: 'Process deviation - thiếu MIR',   status: 'OPEN',   root: 'process',     sev: 'major',    closedDaysAgo: null },
  { no: 'NCR-007', title: 'Process deviation - sai cốt liệu', status: 'OPEN',  root: 'process',     sev: 'minor',    closedDaysAgo: null },
  { no: 'NCR-008', title: 'Painting defect tại Duct #5',     status: 'OPEN',   root: 'painting',    sev: 'minor',    closedDaysAgo: null },
];

async function seedNcr(projectId, userId) {
  let n = 0;
  for (const c of NCRS) {
    const closedExpr = c.closedDaysAgo != null ? `now() - interval '${c.closedDaysAgo} days'` : 'NULL';
    const createdExpr = `now() - interval '${(c.closedDaysAgo ?? 5) + 10} days'`;
    await pool.query(
      `INSERT INTO ncr_records (ncr_no, project_id, title, severity, status, root_cause_category, created_by, closed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ${closedExpr}, ${createdExpr})
       ON CONFLICT (ncr_no) DO UPDATE
         SET status = EXCLUDED.status, root_cause_category = EXCLUDED.root_cause_category,
             severity = EXCLUDED.severity, closed_at = EXCLUDED.closed_at`,
      [c.no, projectId, c.title, c.sev, c.status, c.root, userId]
    );
    n++;
  }
  log.info(`  ✓ ${n} NCR (mixed status + root cause)`);
}

const MDRS = [
  { name: 'MDR-001 Duct Assembly #1', pct: 100, status: 'submitted' },
  { name: 'MDR-005 Stack Section',    pct: 100, status: 'submitted' },
  { name: 'MDR-012 Expansion Joint',  pct: 93,  status: 'in_progress' },
  { name: 'MDR-018 Damper Assembly',  pct: 87,  status: 'in_progress' },
  { name: 'MDR-020 Support Frame',    pct: 75,  status: 'in_progress' },
  { name: 'MDR-021 Inlet Duct',       pct: 100, status: 'submitted' },
  { name: 'MDR-022 Outlet Cone',      pct: 62,  status: 'in_progress' },
];

async function seedMdr(projectId, userId) {
  // Xoá demo cũ theo prefix tên để idempotent
  await pool.query(`DELETE FROM mdr_dossiers WHERE name LIKE 'MDR-0%' AND project_id = $1`, [projectId]);
  let n = 0;
  for (const m of MDRS) {
    await pool.query(
      `INSERT INTO mdr_dossiers (project_id, name, status, completion_pct, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, m.name, m.status, m.pct, userId]
    );
    n++;
  }
  log.info(`  ✓ ${n} MDR dossiers (% hoàn thành đa dạng)`);
}

async function seedWelders() {
  if (!(await tableExists('wld_welders'))) return;
  const WELDERS = [
    { code: 'W-001', name: 'Nguyễn Văn An', stamp: 'A1' },
    { code: 'W-002', name: 'Trần Minh Bình', stamp: 'B2' },
    { code: 'W-003', name: 'Lê Công Danh',   stamp: 'C3' },
  ];
  for (const w of WELDERS) {
    await pool.query(
      `INSERT INTO wld_welders (welder_code, full_name, stamp_no, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (welder_code) DO UPDATE SET full_name = EXCLUDED.full_name`,
      [w.code, w.name, w.stamp]
    );
  }
  log.info(`  ✓ ${WELDERS.length} thợ hàn`);
}

async function seedCalibration() {
  const DEVICES = [
    { code: 'CAL-DFT-01', name: 'DFT Gauge Elcometer 456', type: 'Coating Thickness', loc: 'Workshop 1' },
    { code: 'CAL-UT-01',  name: 'UT Flaw Detector EPOCH',  type: 'NDT - UT',          loc: 'NDT Lab' },
    { code: 'CAL-CAL-01', name: 'Vernier Caliper 300mm',   type: 'Dimensional',       loc: 'QC Office' },
  ];
  if (await tableExists('cal_devices')) {
    for (const d of DEVICES) {
      await pool.query(
        `INSERT INTO cal_devices (device_code, name, type, location, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         ON CONFLICT (device_code) DO UPDATE SET name = EXCLUDED.name`,
        [d.code, d.name, d.type, d.loc]
      );
    }
    log.info(`  ✓ ${DEVICES.length} thiết bị (cal_devices)`);
  }
  if (await tableExists('qaqc_calibration_devices')) {
    for (const d of DEVICES) {
      await pool.query(
        `INSERT INTO qaqc_calibration_devices (code, name, calibrated_until)
         VALUES ($1, $2, now() + interval '180 days')
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [d.code, d.name]
      );
    }
  }
}

async function run() {
  try {
    await pool.query('BEGIN');
    log.info('--- Seeding DEMO data ---');

    const userId = await ensureDemoUser();
    const projMap = await seedProjects();
    const whyallaId = projMap['13079'];

    const { planId, checkpoints } = await seedItp(whyallaId, userId);
    await seedInspections(planId, checkpoints, whyallaId, userId);
    await seedNcr(whyallaId, userId);
    await seedMdr(whyallaId, userId);
    await seedWelders();
    await seedCalibration();

    await pool.query('COMMIT');
    log.info('✅ Seed DEMO thành công!');
  } catch (err) {
    await pool.query('ROLLBACK');
    log.error(err, '❌ Lỗi seed demo — đã rollback');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
