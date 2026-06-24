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

/** Trả về id của user admin nếu có, để seed các bảng phụ thuộc theo current login. */
async function getAdminId() {
  const { rows } = await pool.query(`SELECT id FROM sys_users WHERE username='admin' LIMIT 1`);
  return rows[0]?.id ?? null;
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
  // plan (tránh trùng: kiểm tra theo project + product_type) — status=ACTIVE để xuất hiện ở /templates
  let planId;
  const existing = await pool.query(
    `SELECT id FROM qaqc_inspection_plans WHERE project_id = $1 AND product_type = $2 LIMIT 1`,
    [projectId, 'Demo Duct Assembly']
  );
  if (existing.rows.length) {
    planId = existing.rows[0].id;
    await pool.query(`UPDATE qaqc_inspection_plans SET status='ACTIVE' WHERE id=$1`, [planId]);
  } else {
    const { rows } = await pool.query(
      `INSERT INTO qaqc_inspection_plans (project_id, product_type, version, status, created_by)
       VALUES ($1, $2, 1, 'ACTIVE', $3) RETURNING id`,
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
      // IP-NDT (seq 5) là Hold Point để xuất hiện ở /pending-holds
      const holdType = s.seq === 5 ? 'H' : 'NONE';
      const r = await pool.query(
        `INSERT INTO qaqc_itp_items (plan_id, seq, ip_code, description, hold_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [planId, s.seq, s.ip, s.desc, holdType]
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

// ===================== STANDARDS KB =====================
const STANDARDS = [
  { code: 'ASTM A36/A36M', title: 'Carbon Structural Steel', grp: 'ASTM', tier: 1, version: '2024', issued: '2024-01-15' },
  { code: 'ASTM A516-70',  title: 'Pressure Vessel Plates, Carbon Steel, Moderate/Lower-Temperature', grp: 'ASTM', tier: 1, version: '2023', issued: '2023-05-10' },
  { code: 'ASTM A106-B',   title: 'Seamless Carbon Steel Pipe for High-Temperature Service', grp: 'ASTM', tier: 1, version: '2022', issued: '2022-09-01' },
  { code: 'AWS D1.1/D1.1M', title: 'Structural Welding Code — Steel', grp: 'AWS', tier: 2, version: '2020', issued: '2020-11-30' },
  { code: 'ASME BPV-V',    title: 'Boiler and Pressure Vessel Code, Section V — Nondestructive Examination', grp: 'ASME', tier: 2, version: '2023', issued: '2023-07-01' },
  { code: 'EN 10025-2',    title: 'Hot rolled products of structural steels — Non-alloy structural steels', grp: 'EN', tier: 1, version: '2019', issued: '2019-08-15' },
];

const CHEM_SPECS = {
  'ASTM A36/A36M': [
    { grade: 'A36', element: 'C',  max: 0.26 },
    { grade: 'A36', element: 'Mn', max: 1.20 },
    { grade: 'A36', element: 'P',  max: 0.04 },
    { grade: 'A36', element: 'S',  max: 0.05 },
    { grade: 'A36', element: 'Si', max: 0.40 },
  ],
  'ASTM A516-70': [
    { grade: 'Gr.70', element: 'C',  max: 0.27 },
    { grade: 'Gr.70', element: 'Mn', min: 0.79, max: 1.30 },
    { grade: 'Gr.70', element: 'P',  max: 0.035 },
    { grade: 'Gr.70', element: 'S',  max: 0.035 },
  ],
  'ASTM A106-B': [
    { grade: 'B', element: 'C',  max: 0.30 },
    { grade: 'B', element: 'Mn', min: 0.29, max: 1.06 },
  ],
};

const MECH_SPECS = {
  'ASTM A36/A36M': [
    { grade: 'A36', property: 'Tensile Strength',   min: 400, max: 550, unit: 'MPa' },
    { grade: 'A36', property: 'Yield Strength',     min: 250, unit: 'MPa' },
    { grade: 'A36', property: 'Elongation in 200mm', min: 20, unit: '%' },
  ],
  'ASTM A516-70': [
    { grade: 'Gr.70', property: 'Tensile Strength', min: 485, max: 620, unit: 'MPa' },
    { grade: 'Gr.70', property: 'Yield Strength',   min: 260, unit: 'MPa' },
    { grade: 'Gr.70', property: 'Elongation',       min: 21, unit: '%' },
  ],
};

const EQUIVS = [
  { key: 'A36', eq: 'S235JR (EN 10025-2)', note: 'Tương đương EN' },
  { key: 'A36', eq: 'SS400 (JIS G3101)',   note: 'Tương đương JIS' },
  { key: 'Gr.70', eq: 'P355GH (EN 10028-2)', note: 'Tương đương EN cho pressure vessel' },
];

async function seedStandards() {
  if (!(await tableExists('qaqc_standards'))) return {};
  const map = {};
  for (const s of STANDARDS) {
    const r = await pool.query(
      `INSERT INTO qaqc_standards (code, title, grp, tier, version, issued_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')
       ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version
       RETURNING id, code`,
      [s.code, s.title, s.grp, s.tier, s.version, s.issued]
    );
    map[r.rows[0].code] = r.rows[0].id;
  }
  for (const [code, specs] of Object.entries(CHEM_SPECS)) {
    const stdId = map[code];
    if (!stdId) continue;
    await pool.query(`DELETE FROM qaqc_chemical_specs WHERE standard_id = $1`, [stdId]);
    for (const sp of specs) {
      await pool.query(
        `INSERT INTO qaqc_chemical_specs (standard_id, grade, element, min_val, max_val, unit)
         VALUES ($1,$2,$3,$4,$5,'%')`,
        [stdId, sp.grade, sp.element, sp.min ?? null, sp.max ?? null]
      );
    }
  }
  for (const [code, specs] of Object.entries(MECH_SPECS)) {
    const stdId = map[code];
    if (!stdId) continue;
    await pool.query(`DELETE FROM qaqc_mechanical_specs WHERE standard_id = $1`, [stdId]);
    for (const sp of specs) {
      await pool.query(
        `INSERT INTO qaqc_mechanical_specs (standard_id, grade, property, min_val, max_val, unit)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [stdId, sp.grade, sp.property, sp.min ?? null, sp.max ?? null, sp.unit]
      );
    }
  }
  if (await tableExists('qaqc_std_equivalents')) {
    for (const e of EQUIVS) {
      const exists = await pool.query(
        `SELECT 1 FROM qaqc_std_equivalents WHERE grade_key = $1 AND equivalent_grade = $2 LIMIT 1`,
        [e.key, e.eq]
      );
      if (!exists.rows.length) {
        await pool.query(
          `INSERT INTO qaqc_std_equivalents (grade_key, equivalent_grade, note) VALUES ($1,$2,$3)`,
          [e.key, e.eq, e.note]
        );
      }
    }
  }
  log.info(`  ✓ ${STANDARDS.length} tiêu chuẩn + chem/mech specs + ${EQUIVS.length} equivalents`);
  return map;
}

// ===================== MIR =====================
const MIRS = [
  { po: 'PO-2026-001', supplier: 'POSCO',          stage: 'EXPECTED',          stdCode: 'ASTM A36/A36M',  heat: 'H45678', grade: 'A36' },
  { po: 'PO-2026-002', supplier: 'Nippon Steel',   stage: 'DOC_RECEIVED',      stdCode: 'ASTM A516-70',   heat: 'NS-2280', grade: 'Gr.70' },
  { po: 'PO-2026-003', supplier: 'Hoa Phat',       stage: 'MTC_VERIFIED',      stdCode: 'ASTM A106-B',    heat: 'HP-7711', grade: 'B' },
  { po: 'PO-2026-004', supplier: 'Hyundai Steel',  stage: 'DECIDED',           stdCode: 'ASTM A36/A36M',  heat: 'HD-9090', grade: 'A36' },
];

async function seedMir(projectId, userId, stdMap) {
  if (!(await tableExists('qaqc_mir_records'))) return;
  // idempotent: xoá demo cũ theo PO prefix
  await pool.query(`DELETE FROM qaqc_mir_records WHERE po_ref LIKE 'PO-2026-%'`);
  let n = 0;
  for (const m of MIRS) {
    const r = await pool.query(
      `INSERT INTO qaqc_mir_records (project_id, po_ref, supplier_id, stage, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [projectId, m.po, m.supplier, m.stage, userId]
    );
    const mirId = r.rows[0].id;
    if (m.stage !== 'EXPECTED' && stdMap[m.stdCode]) {
      await pool.query(
        `INSERT INTO qaqc_material_certs (mir_id, standard_id, heat_no, grade, supplier, ocr_extracted)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mirId, stdMap[m.stdCode], m.heat, m.grade, m.supplier, JSON.stringify({ C: 0.22, Mn: 1.10, tensile: 460 })]
      );
    }
    if (m.stage === 'DECIDED') {
      await pool.query(
        `INSERT INTO qaqc_acceptances (mir_id, decision, decided_by, decided_at, ai_confidence, ai_result)
         VALUES ($1,'ACCEPT',$2, now() - interval '2 days', 0.92, $3)`,
        [mirId, userId, JSON.stringify({ ok: true, summary: { passed: 8, total: 8 } })]
      );
    }
    n++;
  }
  log.info(`  ✓ ${n} MIR (Expected/Doc/MTC/Decided) + material certs + acceptance`);
}

// ===================== WELDING (WPS + PQR + Weld Map + Joints + Welder quals) =====================
async function seedWelding(projectId, userId) {
  if (!(await tableExists('wld_wps'))) return;

  // welders đã có (W-001..W-003) — lấy id
  const wd = await pool.query(`SELECT id, welder_code FROM wld_welders WHERE welder_code IN ('W-001','W-002','W-003') ORDER BY welder_code`);
  const welderIds = wd.rows.reduce((acc, r) => (acc[r.welder_code] = r.id, acc), {});

  // Welder quals
  if (await tableExists('wld_welder_quals')) {
    for (const code of Object.keys(welderIds)) {
      const exists = await pool.query(`SELECT 1 FROM wld_welder_quals WHERE welder_id = $1 LIMIT 1`, [welderIds[code]]);
      if (exists.rows.length) continue;
      await pool.query(
        `INSERT INTO wld_welder_quals (welder_id, process, position, thickness_min, thickness_max, cert_no, qualified_date, expiry_date, continuity_last_date)
         VALUES ($1,'SMAW','1G',3,25,$2, now() - interval '180 days', now() + interval '185 days', now() - interval '15 days')`,
        [welderIds[code], `Q-${code}`]
      );
    }
  }

  // WPS
  const wpsList = [
    { no: 'WPS-001', process: 'SMAW', base: 'SA516-70',  pos: '1G', thick: '6-25mm', status: 'APPROVED' },
    { no: 'WPS-002', process: 'GMAW', base: 'A36',       pos: '2F', thick: '3-12mm', status: 'APPROVED' },
    { no: 'WPS-003', process: 'GTAW', base: 'A106-B',    pos: '6G', thick: '3-15mm', status: 'DRAFT' },
  ];
  await pool.query(`DELETE FROM wld_wps WHERE wps_no IN ('WPS-001','WPS-002','WPS-003')`);
  const wpsIds = {};
  for (const w of wpsList) {
    const r = await pool.query(
      `INSERT INTO wld_wps (wps_no, project_id, process, base_metal, position, thickness_range, status, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [w.no, projectId, w.process, w.base, w.pos, w.thick, w.status, w.status === 'APPROVED' ? userId : null]
    );
    wpsIds[w.no] = r.rows[0].id;
  }

  // PQR
  if (await tableExists('wld_pqr')) {
    await pool.query(`DELETE FROM wld_pqr WHERE pqr_no LIKE 'PQR-%'`);
    await pool.query(
      `INSERT INTO wld_pqr (pqr_no, wps_id, test_result) VALUES ('PQR-001', $1, 'PASS'), ('PQR-002', $2, 'PASS')`,
      [wpsIds['WPS-001'], wpsIds['WPS-002']]
    );
  }

  // Weld map + joints
  if (await tableExists('wld_weld_maps')) {
    await pool.query(`DELETE FROM wld_weld_maps WHERE drawing_no LIKE 'DWG-WHY-%'`);
    const wm = await pool.query(
      `INSERT INTO wld_weld_maps (project_id, drawing_no, name)
       VALUES ($1, 'DWG-WHY-001', 'Duct Assembly #1 — Weld Map') RETURNING id`,
      [projectId]
    );
    const wmId = wm.rows[0].id;
    if (await tableExists('wld_weld_joints')) {
      const joints = [
        { no: 'J-01', wps: 'WPS-001', welder: 'W-001', ndt: true,  status: 'COMPLETED' },
        { no: 'J-02', wps: 'WPS-001', welder: 'W-001', ndt: true,  status: 'COMPLETED' },
        { no: 'J-03', wps: 'WPS-002', welder: 'W-002', ndt: false, status: 'COMPLETED' },
        { no: 'J-04', wps: 'WPS-002', welder: 'W-002', ndt: true,  status: 'IN_PROGRESS' },
        { no: 'J-05', wps: 'WPS-003', welder: 'W-003', ndt: true,  status: 'PLANNED' },
      ];
      for (const j of joints) {
        await pool.query(
          `INSERT INTO wld_weld_joints (weld_map_id, joint_no, wps_id, welder_id, ndt_required, status)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [wmId, j.no, wpsIds[j.wps], welderIds[j.welder], j.ndt, j.status]
        );
      }
    }
  }
  log.info(`  ✓ 3 WPS + 2 PQR + 1 Weld Map (5 joints) + welder quals`);
}

// ===================== NDT =====================
const NDT_VENDORS = [
  { name: 'Bureau Veritas Vietnam', email: 'qc-vn@bureauveritas.com', approved: true },
  { name: 'SGS Vietnam',            email: 'ndt@sgs.com.vn',          approved: true },
  { name: 'TUV Rheinland',          email: 'tuv-vn@tuvrheinland.com', approved: false },
];

async function seedNdt(projectId, userId) {
  if (!(await tableExists('ndt_vendors'))) return;
  const vendorIds = {};
  for (const v of NDT_VENDORS) {
    const exists = await pool.query(`SELECT id FROM ndt_vendors WHERE name = $1 LIMIT 1`, [v.name]);
    if (exists.rows.length) {
      vendorIds[v.name] = exists.rows[0].id;
    } else {
      const r = await pool.query(
        `INSERT INTO ndt_vendors (name, contact_email, is_approved) VALUES ($1,$2,$3) RETURNING id`,
        [v.name, v.email, v.approved]
      );
      vendorIds[v.name] = r.rows[0].id;
    }
  }
  if (await tableExists('ndt_requests')) {
    await pool.query(`DELETE FROM ndt_requests WHERE request_no LIKE 'NDT-2026-%'`);
    const reqs = [
      { no: 'NDT-2026-001', method: 'UT', vendor: 'Bureau Veritas Vietnam', status: 'COMPLETED' },
      { no: 'NDT-2026-002', method: 'RT', vendor: 'SGS Vietnam',            status: 'IN_PROGRESS' },
      { no: 'NDT-2026-003', method: 'MT', vendor: 'Bureau Veritas Vietnam', status: 'REQUESTED' },
      { no: 'NDT-2026-004', method: 'PT', vendor: 'SGS Vietnam',            status: 'REQUESTED' },
    ];
    for (const q of reqs) {
      await pool.query(
        `INSERT INTO ndt_requests (request_no, project_id, method, vendor_id, status, requested_by, requested_at)
         VALUES ($1,$2,$3,$4,$5,$6, now() - interval '3 days')`,
        [q.no, projectId, q.method, vendorIds[q.vendor], q.status, userId]
      );
    }
  }
  log.info(`  ✓ ${NDT_VENDORS.length} NDT vendor + 4 request`);
}

// ===================== CALIBRATION MASTER LIST =====================
async function seedCalMaster(userId) {
  if (!(await tableExists('cal_master_list'))) return;
  const year = 2026;
  const exists = await pool.query(`SELECT 1 FROM cal_master_list WHERE year = $1 AND owner_dept = $2 LIMIT 1`, [year, 'QA/QC']);
  if (!exists.rows.length) {
    await pool.query(
      `INSERT INTO cal_master_list (year, owner_dept, note, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)`,
      [year, 'QA/QC', `Master list ${year} — DFT/UT/Dimensional`, userId]
    );
  }
  log.info(`  ✓ 1 calibration master list (${year})`);
}

// ===================== PORTAL ACCESS =====================
async function seedPortalAccess(userIds, projMap) {
  if (!(await tableExists('portal_project_access'))) return;
  const projs = ['13079', '13080', '13082'];
  let n = 0;
  for (const uid of userIds.filter(Boolean)) {
    for (const code of projs) {
      if (!projMap[code]) continue;
      const exists = await pool.query(
        `SELECT 1 FROM portal_project_access WHERE user_id = $1 AND project_id = $2 LIMIT 1`,
        [uid, projMap[code]]
      );
      if (!exists.rows.length) {
        await pool.query(
          `INSERT INTO portal_project_access (user_id, project_id, client_name) VALUES ($1,$2,$3)`,
          [uid, projMap[code], `Client view ${code}`]
        );
        n++;
      }
    }
  }
  log.info(`  ✓ ${n} portal access mappings (admin + qc01)`);
}

// ===================== STANDARDS LOOKUP (AI-1 cache) =====================
async function seedStdLookup() {
  if (!(await tableExists('qaqc_std_lookup'))) return;
  const rows = [
    { code: 'ASTM A36', name: 'Carbon Structural Steel', grade: 'A36',
      chem: { C: { max: 0.26 }, Mn: { max: 1.20 }, P: { max: 0.04 }, S: { max: 0.05 } },
      mech: { tensile: { min: 400, max: 550, unit: 'MPa' }, yield: { min: 250, unit: 'MPa' }, elongation: { min: 20, unit: '%' } } },
    { code: 'ASTM A516', name: 'Pressure Vessel Steel', grade: 'Gr.70',
      chem: { C: { max: 0.27 }, Mn: { min: 0.79, max: 1.30 } },
      mech: { tensile: { min: 485, max: 620, unit: 'MPa' }, yield: { min: 260, unit: 'MPa' } } },
    { code: 'EN 10025-2', name: 'Hot rolled structural steel', grade: 'S235JR',
      chem: { C: { max: 0.17 }, Mn: { max: 1.40 }, P: { max: 0.035 } },
      mech: { tensile: { min: 360, max: 510, unit: 'MPa' }, yield: { min: 235, unit: 'MPa' } } },
    { code: 'JIS G3101', name: 'Rolled Steels for General Structure', grade: 'SS400',
      chem: { C: { max: 0.25 }, Mn: { max: 1.40 } },
      mech: { tensile: { min: 400, max: 510, unit: 'MPa' }, yield: { min: 245, unit: 'MPa' } } },
  ];
  for (const r of rows) {
    await pool.query(
      `INSERT INTO qaqc_std_lookup (standard_code, standard_name, grade, chemistry, mechanical)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (standard_code, grade) DO UPDATE
         SET chemistry = EXCLUDED.chemistry, mechanical = EXCLUDED.mechanical`,
      [r.code, r.name, r.grade, JSON.stringify(r.chem), JSON.stringify(r.mech)]
    );
  }
  log.info(`  ✓ ${rows.length} standards lookup entries (AI-1 cache)`);
}

// ===================== STANDARDS IMPORT JOBS =====================
async function seedImportJobs(userId) {
  if (!(await tableExists('qaqc_standards_import_jobs'))) return;
  const exists = await pool.query(`SELECT COUNT(*) c FROM qaqc_standards_import_jobs`);
  if (parseInt(exists.rows[0].c) > 0) return;
  const jobs = [
    { filename: 'ASTM-A36-2024.pdf', status: 'COMPLETED', total: 24, indexed: 24, progress: 100 },
    { filename: 'ASTM-A516-70-2023.pdf', status: 'COMPLETED', total: 36, indexed: 36, progress: 100 },
    { filename: 'AWS-D1.1-2020.pdf', status: 'PROCESSING', total: 588, indexed: 312, progress: 53 },
    { filename: 'ASME-BPV-V-2023.pdf', status: 'QUEUED', total: null, indexed: 0, progress: 0 },
  ];
  for (const j of jobs) {
    await pool.query(
      `INSERT INTO qaqc_standards_import_jobs (filename, status, progress, total_chunks, indexed_chunks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [j.filename, j.status, j.progress, j.total, j.indexed, userId]
    );
  }
  log.info(`  ✓ ${jobs.length} import jobs (completed/processing/queued)`);
}

// ===================== SYS NOTIFICATIONS =====================
async function seedNotifications(adminId, qcId) {
  if (!(await tableExists('sys_notifications')) || !adminId) return;
  // idempotent: chỉ insert nếu chưa có notification cho target
  const existing = await pool.query(`SELECT COUNT(*) c FROM sys_notifications`);
  if (parseInt(existing.rows[0].c) > 0) return;
  const ns = [
    { tgt: adminId, title: 'MIR mới chờ duyệt',          msg: 'PO-2026-002 đã sẵn sàng cross-check MTC',     type: 'INFO',    read: false, link: '/qaqc/mir' },
    { tgt: adminId, title: 'NCR Critical: NCR-005',      msg: 'Welding rework Duct #4 cần review',           type: 'WARNING', read: false, link: '/ncr' },
    { tgt: adminId, title: 'Welder W-001 sắp hết hạn',   msg: 'Continuity expiry trong 30 ngày tới',         type: 'WARNING', read: true,  link: '/welding/welders' },
    { tgt: adminId, title: 'MDR-012 hoàn thành 93%',     msg: 'Còn 7% category để hoàn tất bàn giao',         type: 'INFO',    read: true,  link: '/mdr' },
    { tgt: qcId,    title: 'Inspection hôm nay (3 IP)',  msg: 'Lịch IP04/IP05/IP06 đang chờ thực thi',        type: 'INFO',    read: false, link: '/qaqc/inspections' },
  ];
  for (const n of ns) {
    if (!n.tgt) continue;
    await pool.query(
      `INSERT INTO sys_notifications (target_type, target_id, title, message, type, is_read, link, created_at)
       VALUES ('USER', $1, $2, $3, $4, $5, $6, now() - interval '${Math.floor(Math.random() * 5) + 1} days')`,
      [n.tgt, n.title, n.msg, n.type, n.read, n.link]
    );
  }
  log.info(`  ✓ ${ns.length} notifications (admin + qc01)`);
}

// ===================== FORMS (RFI / Painting / Pressure) =====================
async function seedForms(projectId, userId) {
  if (await tableExists('frm_rfi')) {
    await pool.query(`DELETE FROM frm_rfi WHERE rfi_no LIKE 'RFI-2026-%'`);
    const rfis = [
      { no: 'RFI-2026-001', type: 'INTERNAL', ip: 'IP-WELD', status: 'OPEN',    note: 'Yêu cầu xác nhận WPS cho Duct #8' },
      { no: 'RFI-2026-002', type: 'EXTERNAL', ip: 'IP-NDT',  status: 'CLOSED',  note: 'Khách yêu cầu RT thay UT cho seam #15' },
      { no: 'RFI-2026-003', type: 'INTERNAL', ip: 'IP-DIM',  status: 'OPEN',    note: 'Lệch dung sai 0.5mm — cần kỹ thuật review' },
    ];
    for (const r of rfis) {
      await pool.query(
        `INSERT INTO frm_rfi (rfi_no, project_id, type, inspection_point, requested_by, status, scheduled_at, note)
         VALUES ($1,$2,$3,$4,$5,$6, now() + interval '3 days', $7)`,
        [r.no, projectId, r.type, r.ip, userId, r.status, r.note]
      );
    }
    log.info(`  ✓ ${rfis.length} RFI`);
  }
  if (await tableExists('frm_painting')) {
    await pool.query(`DELETE FROM frm_painting WHERE area LIKE 'Demo Panel%'`);
    const items = [
      { area: 'Demo Panel A1', dft: 285.0, min: 250, max: 320, prep: 'SSPC-SP10', result: 'PASS' },
      { area: 'Demo Panel A2', dft: 240.0, min: 250, max: 320, prep: 'SSPC-SP10', result: 'FAIL' },
      { area: 'Demo Panel B1', dft: 305.5, min: 280, max: 350, prep: 'SSPC-SP6',  result: 'PASS' },
    ];
    for (const it of items) {
      await pool.query(
        `INSERT INTO frm_painting (project_id, area, dft_reading, dft_min, dft_max, surface_prep, result, inspected_by, inspected_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() - interval '2 days')`,
        [projectId, it.area, it.dft, it.min, it.max, it.prep, it.result, userId]
      );
    }
    log.info(`  ✓ ${items.length} painting records`);
  }
  if (await tableExists('frm_pressure_test')) {
    await pool.query(`DELETE FROM frm_pressure_test WHERE test_no LIKE 'PT-2026-%'`);
    const tests = [
      { no: 'PT-2026-001', medium: 'Hydro', pressure: 22.5, hold: '30 min', result: 'PASS', cert: 'CERT-001' },
      { no: 'PT-2026-002', medium: 'Pneumatic', pressure: 8.0, hold: '60 min', result: 'PASS', cert: 'CERT-002' },
    ];
    for (const t of tests) {
      await pool.query(
        `INSERT INTO frm_pressure_test (project_id, test_no, medium, pressure_value, hold_time, result, certificate_no, tested_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() - interval '5 days')`,
        [projectId, t.no, t.medium, t.pressure, t.hold, t.result, t.cert]
      );
    }
    log.info(`  ✓ ${tests.length} pressure tests`);
  }
}

// ===================== WEBHOOK SUBSCRIPTIONS =====================
async function seedWebhooks(userId) {
  if (!(await tableExists('sys_webhook_subscriptions'))) return;
  const hooks = [
    { name: 'ERP MIR Decided',  url: 'https://erp.ibs.vn/api/qaqc/webhook', events: ['mir.decided', 'mir.rejected'] },
    { name: 'ERP NCR Critical', url: 'https://erp.ibs.vn/api/qaqc/webhook', events: ['ncr.critical.created', 'ncr.closed'] },
  ];
  for (const h of hooks) {
    const exists = await pool.query(`SELECT 1 FROM sys_webhook_subscriptions WHERE name = $1 LIMIT 1`, [h.name]);
    if (!exists.rows.length) {
      await pool.query(
        `INSERT INTO sys_webhook_subscriptions (name, url, secret, event_types, status, created_by)
         VALUES ($1,$2,$3,$4,'ACTIVE',$5)`,
        [h.name, h.url, 'demo-secret-' + Math.random().toString(36).slice(2, 10), h.events, userId]
      );
    }
  }
  log.info(`  ✓ ${hooks.length} outbound webhook subscriptions`);
}

async function run() {
  try {
    await pool.query('BEGIN');
    log.info('--- Seeding DEMO data ---');

    const userId = await ensureDemoUser();
    const adminId = await getAdminId();
    const projMap = await seedProjects();
    const whyallaId = projMap['13079'];

    const { planId, checkpoints } = await seedItp(whyallaId, userId);
    await seedInspections(planId, checkpoints, whyallaId, userId);
    await seedNcr(whyallaId, userId);
    await seedMdr(whyallaId, userId);
    await seedWelders();
    await seedCalibration();

    // NEW seed groups — fill toàn bộ tính năng còn trống
    const stdMap = await seedStandards();
    await seedStdLookup();
    await seedImportJobs(userId);
    await seedMir(whyallaId, userId, stdMap);
    await seedWelding(whyallaId, userId);
    await seedNdt(whyallaId, userId);
    await seedCalMaster(userId);
    await seedPortalAccess([adminId, userId], projMap);
    await seedForms(whyallaId, userId);
    await seedWebhooks(userId);
    await seedNotifications(adminId, userId);

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
