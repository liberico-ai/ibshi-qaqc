import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';

export class StandardsLookupController {
  // GET /api/qaqc/standards-lookup
  // Returns list of standards with their grades (code, name, grades array)
  static async getStandards(req, res) {
    const { rows } = await pool.query(
      `SELECT standard_code, standard_name, array_agg(grade ORDER BY grade) AS grades
       FROM qaqc_std_lookup
       GROUP BY standard_code, standard_name
       ORDER BY standard_code`
    );
    res.json({ data: rows });
  }

  // GET /api/qaqc/standards-lookup/:standardCode/grades/:grade
  // Returns full chemistry+mechanical for one grade
  static async getGrade(req, res) {
    const standardCode = decodeURIComponent(req.params.standardCode);
    const grade = decodeURIComponent(req.params.grade);
    const { rows } = await pool.query(
      `SELECT * FROM qaqc_std_lookup WHERE standard_code = $1 AND grade = $2`,
      [standardCode, grade]
    );
    if (!rows[0]) throw new AppError(404, 'Grade not found');
    res.json({ data: rows[0] });
  }

  // POST /api/qaqc/standards-lookup/compare
  // Body: { selections: [{standardCode, grade}, ...] } (2-3 items)
  // Returns array of full grade data
  static async compare(req, res) {
    const { selections } = req.body;
    if (!Array.isArray(selections) || selections.length < 2 || selections.length > 3) {
      throw new AppError(400, 'selections must be an array of 2-3 items');
    }
    const results = [];
    for (const sel of selections) {
      const { standardCode, grade } = sel;
      if (!standardCode || !grade) throw new AppError(400, 'Each selection must have standardCode and grade');
      const { rows } = await pool.query(
        `SELECT * FROM qaqc_std_lookup WHERE standard_code = $1 AND grade = $2`,
        [standardCode, grade]
      );
      if (!rows[0]) throw new AppError(404, `Grade not found: ${standardCode} / ${grade}`);
      results.push(rows[0]);
    }
    res.json({ data: results });
  }

  // GET /api/qaqc/standards-lookup/equivalents
  // ?q= optional filter
  // Returns grouped equivalents: [{grade_key, equivalents: [{equivalent_grade, note}]}]
  static async getEquivalents(req, res) {
    const q = req.query.q?.trim();
    let queryText;
    let params;
    if (q) {
      queryText = `
        SELECT grade_key, equivalent_grade, note
        FROM qaqc_std_equivalents
        WHERE grade_key ILIKE $1 OR equivalent_grade ILIKE $1
        ORDER BY grade_key, equivalent_grade
      `;
      params = [`%${q}%`];
    } else {
      queryText = `
        SELECT grade_key, equivalent_grade, note
        FROM qaqc_std_equivalents
        ORDER BY grade_key, equivalent_grade
      `;
      params = [];
    }
    const { rows } = await pool.query(queryText, params);

    // Group by grade_key
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.grade_key]) {
        grouped[row.grade_key] = { grade_key: row.grade_key, equivalents: [] };
      }
      grouped[row.grade_key].equivalents.push({ equivalent_grade: row.equivalent_grade, note: row.note });
    }
    res.json({ data: Object.values(grouped) });
  }
}
