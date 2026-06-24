import { pool } from '../../../../core/db.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('dashboard-kpi');

/**
 * Bộ tính KPI phòng thủ: mọi truy vấn tới bảng nghiệp vụ của module khác
 * đều kiểm tra sự tồn tại của bảng trước (information_schema). Nếu bảng
 * chưa có (module chưa cài/chưa migrate) thì trả 0/rỗng, không ném lỗi.
 */
export class KpiService {
  static async tableExists(tableName) {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
        [tableName]
      );
      return rows.length > 0;
    } catch (e) {
      log.warn({ err: e, tableName }, 'tableExists check failed');
      return false;
    }
  }

  /** Chạy query an toàn: nếu bảng thiếu hoặc lỗi → trả fallback. */
  static async safeQuery(requiredTables, sql, params = [], fallback = { rows: [] }) {
    for (const t of requiredTables) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await this.tableExists(t))) return fallback;
    }
    try {
      return await pool.query(sql, params);
    } catch (e) {
      log.warn({ err: e, sql: sql.slice(0, 80) }, 'safeQuery failed — returning fallback');
      return fallback;
    }
  }

  // ── QC KPI ─────────────────────────────────────────────────
  static async qcKpi() {
    // 1. First Pass Rate từ qaqc_inspection_results
    const fprRes = await this.safeQuery(
      ['qaqc_inspection_results'],
      `SELECT
         count(*) FILTER (WHERE upper(result) = 'PASS') AS pass,
         count(*) FILTER (WHERE result IS NOT NULL)     AS total
       FROM qaqc_inspection_results`
    );
    const fpr = fprRes.rows[0] ?? { pass: 0, total: 0 };
    const firstPassRate = Number(fpr.total) > 0
      ? Math.round((Number(fpr.pass) / Number(fpr.total)) * 1000) / 10
      : 0;

    // 2. NCR close-out time (ngày trung bình từ tạo → đóng) từ ncr_records
    const ncrRes = await this.safeQuery(
      ['ncr_records'],
      `SELECT
         count(*) AS total,
         count(*) FILTER (WHERE upper(COALESCE(status,'')) IN ('OPEN','OPENED')) AS open_count,
         AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0)
           FILTER (WHERE closed_at IS NOT NULL) AS avg_close_days
       FROM ncr_records`
    );
    const ncr = ncrRes.rows[0] ?? { total: 0, open_count: 0, avg_close_days: null };

    // 3. MDR completion từ mdr_dossiers.completion_pct
    const mdrRes = await this.safeQuery(
      ['mdr_dossiers'],
      `SELECT AVG(completion_pct) AS avg_completion, count(*) AS total FROM mdr_dossiers`
    );
    const mdr = mdrRes.rows[0] ?? { avg_completion: null, total: 0 };

    // 4. Inspection cycle time (ngày tạo → hoàn thành) từ qaqc_inspections
    const cycleRes = await this.safeQuery(
      ['qaqc_inspections'],
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400.0)
                FILTER (WHERE completed_at IS NOT NULL) AS avg_cycle_days
       FROM qaqc_inspections`
    );
    const cycle = cycleRes.rows[0] ?? { avg_cycle_days: null };

    return {
      firstPassRate,
      firstPass: { pass: Number(fpr.pass) || 0, total: Number(fpr.total) || 0 },
      ncr: {
        total: Number(ncr.total) || 0,
        open: Number(ncr.open_count) || 0,
        avgCloseoutDays: ncr.avg_close_days != null ? Math.round(Number(ncr.avg_close_days) * 10) / 10 : null,
      },
      mdr: {
        total: Number(mdr.total) || 0,
        avgCompletion: mdr.avg_completion != null ? Math.round(Number(mdr.avg_completion) * 10) / 10 : null,
      },
      inspectionCycleDays: cycle.avg_cycle_days != null ? Math.round(Number(cycle.avg_cycle_days) * 10) / 10 : null,
    };
  }

  // ── Project Dashboard (mỗi dự án) ──────────────────────────
  static async projectDashboard() {
    if (!(await this.tableExists('qaqc_projects'))) return [];

    const projRes = await this.safeQuery(
      ['qaqc_projects'],
      `SELECT id, code, name FROM qaqc_projects ORDER BY code`
    );
    const projects = projRes.rows;
    if (!projects.length) return [];

    const hasInsp    = await this.tableExists('qaqc_inspections');
    const hasResults = await this.tableExists('qaqc_inspection_results');
    const hasNcr     = await this.tableExists('ncr_records');
    const hasMdr     = await this.tableExists('mdr_dossiers');

    // Pass/Fail theo dự án (join results → inspections → project)
    const passMap = new Map();
    if (hasInsp && hasResults) {
      const r = await this.safeQuery(
        ['qaqc_inspections', 'qaqc_inspection_results'],
        `SELECT i.project_id,
                count(*) FILTER (WHERE upper(r.result) = 'PASS') AS pass,
                count(*) FILTER (WHERE upper(r.result) = 'FAIL') AS fail,
                count(r.id) AS total
         FROM qaqc_inspection_results r
         JOIN qaqc_inspections i ON i.id = r.inspection_id
         GROUP BY i.project_id`
      );
      for (const row of r.rows) passMap.set(row.project_id, row);
    }

    // Open NCR theo dự án
    const ncrMap = new Map();
    if (hasNcr) {
      const r = await this.safeQuery(
        ['ncr_records'],
        `SELECT project_id, count(*) FILTER (WHERE upper(COALESCE(status,'')) IN ('OPEN','OPENED')) AS open_count
         FROM ncr_records GROUP BY project_id`
      );
      for (const row of r.rows) ncrMap.set(row.project_id, Number(row.open_count) || 0);
    }

    // MDR % theo dự án
    const mdrMap = new Map();
    if (hasMdr) {
      const r = await this.safeQuery(
        ['mdr_dossiers'],
        `SELECT project_id, AVG(completion_pct) AS avg_completion FROM mdr_dossiers GROUP BY project_id`
      );
      for (const row of r.rows) mdrMap.set(row.project_id, row.avg_completion != null ? Math.round(Number(row.avg_completion) * 10) / 10 : null);
    }

    return projects.map(p => {
      const pf = passMap.get(p.id) ?? { pass: 0, fail: 0, total: 0 };
      const total = Number(pf.total) || 0;
      const pass = Number(pf.pass) || 0;
      const fail = Number(pf.fail) || 0;
      return {
        project_id: p.id,
        code: p.code,
        name: p.name,
        passPct: total > 0 ? Math.round((pass / total) * 1000) / 10 : 0,
        failPct: total > 0 ? Math.round((fail / total) * 1000) / 10 : 0,
        inspectionTotal: total,
        openNcr: ncrMap.get(p.id) ?? 0,
        mdrCompletion: mdrMap.has(p.id) ? mdrMap.get(p.id) : null,
      };
    });
  }

  // ── Management Overview (rollup toàn hệ thống) ─────────────
  static async managementOverview() {
    const [qc, projects] = await Promise.all([this.qcKpi(), this.projectDashboard()]);
    const totalProjects = projects.length;
    const totalOpenNcr = projects.reduce((s, p) => s + (p.openNcr || 0), 0);
    const mdrVals = projects.map(p => p.mdrCompletion).filter(v => v != null);
    const avgMdr = mdrVals.length ? Math.round((mdrVals.reduce((s, v) => s + v, 0) / mdrVals.length) * 10) / 10 : null;

    return {
      totalProjects,
      totalOpenNcr,
      avgMdrCompletion: avgMdr,
      firstPassRate: qc.firstPassRate,
      inspectionCycleDays: qc.inspectionCycleDays,
      ncrAvgCloseoutDays: qc.ncr.avgCloseoutDays,
      projects,
    };
  }
}
