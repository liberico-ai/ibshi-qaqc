/**
 * seed-standards.js — Nạp một bộ "starter" tiêu chuẩn THẬT (nhỏ, đại diện) vào
 * các bảng qaqc_standards + qaqc_chemical_specs + qaqc_mechanical_specs để
 * Knowledge Base không rỗng khi chưa có file xlsx/Supabase đầy đủ.
 *
 * Phong cách: ESM, async/await, parameterized SQL, dùng `pool` từ src/core/db.js
 * (giống scripts/seed.js & scripts/seed-demo.js).
 *
 * Idempotent:
 *   - qaqc_standards: UPSERT theo code (UNIQUE).
 *   - chemical/mechanical: xoá theo (standard_id, grade) rồi insert lại
 *     → chạy nhiều lần không nhân bản.
 *
 * Chạy:  node --env-file=.env scripts/seed-standards.js
 *        (hoặc: npm run db:seed-standards)
 *
 * Bộ starter: ASTM A36, ASTM A516-70 (thép tấm bình áp lực),
 *             AWS D1.1 filler grades (E7018 SMAW, ER70S-6 GMAW).
 */
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('seed-standards');

// element/property: min/max là số (NULL = không quy định cận đó), unit theo schema.
const STANDARDS = [
  {
    code: 'ASTM A36',
    title: 'Standard Specification for Carbon Structural Steel',
    grp: 'ASTM', tier: 1, version: 'A36/A36M-19', issued_date: '2019-01-01',
    full_text: 'carbon structural steel plates shapes bars hot rolled A36',
    grades: [
      {
        grade: 'A36',
        chemical: [
          { element: 'C',  min: null, max: 0.26, unit: '%' },
          { element: 'Mn', min: null, max: null, unit: '%' },
          { element: 'P',  min: null, max: 0.04, unit: '%' },
          { element: 'S',  min: null, max: 0.05, unit: '%' },
          { element: 'Si', min: 0.15, max: 0.40, unit: '%' },
        ],
        mechanical: [
          { property: 'Yield Strength',   min: 250, max: null, unit: 'MPa' },
          { property: 'Tensile Strength', min: 400, max: 550,  unit: 'MPa' },
          { property: 'Elongation',       min: 23,  max: null, unit: '%'   },
        ],
      },
    ],
  },
  {
    code: 'ASTM A516-70',
    title: 'Pressure Vessel Plates, Carbon Steel, for Moderate- and Lower-Temperature Service — Grade 70',
    grp: 'ASTM', tier: 1, version: 'A516/A516M-17', issued_date: '2017-01-01',
    full_text: 'pressure vessel plate carbon steel grade 70 A516 moderate lower temperature',
    grades: [
      {
        grade: 'Gr.70',
        chemical: [
          { element: 'C',  min: null, max: 0.27, unit: '%' },
          { element: 'Mn', min: 0.85, max: 1.20, unit: '%' },
          { element: 'P',  min: null, max: 0.025, unit: '%' },
          { element: 'S',  min: null, max: 0.025, unit: '%' },
          { element: 'Si', min: 0.15, max: 0.40, unit: '%' },
        ],
        mechanical: [
          { property: 'Yield Strength',   min: 260, max: null, unit: 'MPa' },
          { property: 'Tensile Strength', min: 485, max: 620,  unit: 'MPa' },
          { property: 'Elongation',       min: 21,  max: null, unit: '%'   },
        ],
      },
    ],
  },
  {
    code: 'AWS D1.1',
    title: 'Structural Welding Code — Steel (filler metals)',
    grp: 'AWS', tier: 1, version: 'D1.1/D1.1M:2020', issued_date: '2020-01-01',
    full_text: 'structural welding code steel filler metal SMAW GMAW E7018 ER70S-6 D1.1',
    grades: [
      {
        grade: 'E7018',   // SMAW electrode (AWS A5.1)
        chemical: [
          { element: 'C',  min: null, max: 0.15, unit: '%' },
          { element: 'Mn', min: null, max: 1.60, unit: '%' },
          { element: 'Si', min: null, max: 0.75, unit: '%' },
          { element: 'P',  min: null, max: 0.03, unit: '%' },
          { element: 'S',  min: null, max: 0.03, unit: '%' },
        ],
        mechanical: [
          { property: 'Yield Strength',   min: 400, max: null, unit: 'MPa' },
          { property: 'Tensile Strength', min: 485, max: null, unit: 'MPa' },
          { property: 'Elongation',       min: 22,  max: null, unit: '%'   },
          { property: 'Impact (CVN)',     min: 27,  max: null, unit: 'J'   },
        ],
      },
      {
        grade: 'ER70S-6',  // GMAW wire (AWS A5.18)
        chemical: [
          { element: 'C',  min: 0.06, max: 0.15, unit: '%' },
          { element: 'Mn', min: 1.40, max: 1.85, unit: '%' },
          { element: 'Si', min: 0.80, max: 1.15, unit: '%' },
          { element: 'P',  min: null, max: 0.025, unit: '%' },
          { element: 'S',  min: null, max: 0.035, unit: '%' },
        ],
        mechanical: [
          { property: 'Yield Strength',   min: 400, max: null, unit: 'MPa' },
          { property: 'Tensile Strength', min: 485, max: null, unit: 'MPa' },
          { property: 'Elongation',       min: 22,  max: null, unit: '%'   },
        ],
      },
    ],
  },
];

async function run() {
  let stdN = 0, chemN = 0, mechN = 0;
  try {
    await pool.query('BEGIN');

    for (const std of STANDARDS) {
      const { rows } = await pool.query(
        `INSERT INTO qaqc_standards (code, title, grp, tier, version, issued_date, status, full_text)
         VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7)
         ON CONFLICT (code) DO UPDATE SET
           title = EXCLUDED.title, grp = EXCLUDED.grp, tier = EXCLUDED.tier,
           version = EXCLUDED.version, issued_date = EXCLUDED.issued_date,
           full_text = EXCLUDED.full_text, updated_at = now()
         RETURNING id`,
        [std.code, std.title, std.grp, std.tier, std.version, std.issued_date, std.full_text]
      );
      const stdId = rows[0].id;
      stdN++;

      for (const g of std.grades) {
        // Idempotent: clear specs cũ của (standard, grade) rồi insert lại.
        await pool.query(
          'DELETE FROM qaqc_chemical_specs WHERE standard_id = $1 AND grade IS NOT DISTINCT FROM $2',
          [stdId, g.grade]
        );
        await pool.query(
          'DELETE FROM qaqc_mechanical_specs WHERE standard_id = $1 AND grade IS NOT DISTINCT FROM $2',
          [stdId, g.grade]
        );

        for (const c of g.chemical) {
          await pool.query(
            `INSERT INTO qaqc_chemical_specs (standard_id, grade, element, min_val, max_val, unit)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [stdId, g.grade, c.element, c.min, c.max, c.unit]
          );
          chemN++;
        }
        for (const m of g.mechanical) {
          await pool.query(
            `INSERT INTO qaqc_mechanical_specs (standard_id, grade, property, min_val, max_val, unit)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [stdId, g.grade, m.property, m.min, m.max, m.unit]
          );
          mechN++;
        }
      }
    }

    await pool.query('COMMIT');
    log.info({ stdN, chemN, mechN }, '✅ Seed standards starter hoàn tất');
    console.log(`✅ Seed standards: ${stdN} tiêu chuẩn, ${chemN} chemical, ${mechN} mechanical.`);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    log.error(err, '❌ Seed standards thất bại — đã rollback');
    console.error('❌ Lỗi seed-standards:', err.message);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

run();
