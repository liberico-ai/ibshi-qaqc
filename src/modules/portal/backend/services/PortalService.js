import { pool } from '../../../../core/db.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('portal');

export class PortalService {
  static async tableExists(tableName) {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
        [tableName]
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  /** Trả về danh sách project_id mà user được phép xem. */
  static async accessibleProjectIds(userId) {
    const { rows } = await pool.query(
      'SELECT project_id FROM portal_project_access WHERE user_id = $1',
      [userId]
    );
    return rows.map(r => r.project_id);
  }

  /** Danh sách dự án (kèm client_name) user được gán. */
  static async listProjects(userId) {
    const hasProjects = await this.tableExists('qaqc_projects');
    if (!hasProjects) {
      const { rows } = await pool.query(
        'SELECT project_id, client_name FROM portal_project_access WHERE user_id = $1',
        [userId]
      );
      return rows.map(r => ({ project_id: r.project_id, code: null, name: null, client_name: r.client_name }));
    }
    const { rows } = await pool.query(`
      SELECT a.project_id, a.client_name, p.code, p.name, p.status
      FROM portal_project_access a
      LEFT JOIN qaqc_projects p ON p.id = a.project_id
      WHERE a.user_id = $1
      ORDER BY p.code NULLS LAST
    `, [userId]);
    return rows;
  }

  /** Tổng hợp read-only cho 1 dự án mà user có quyền: inspection status, open NCR, MDR %. */
  static async projectSummary(userId, projectId) {
    const ids = await this.accessibleProjectIds(userId);
    if (!ids.includes(projectId)) return null;

    const summary = {
      project: null,
      inspections: { completed: 0, pending: 0, failed: 0, total: 0 },
      openNcr: 0,
      mdrCompletion: null,
    };

    if (await this.tableExists('qaqc_projects')) {
      const { rows } = await pool.query('SELECT id, code, name, status FROM qaqc_projects WHERE id = $1', [projectId]);
      summary.project = rows[0] ?? null;
    }

    if (await this.tableExists('qaqc_inspections')) {
      try {
        const { rows } = await pool.query(`
          SELECT count(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                 count(*) FILTER (WHERE status = 'PENDING')   AS pending,
                 count(*) FILTER (WHERE status = 'FAILED')    AS failed,
                 count(*) AS total
          FROM qaqc_inspections WHERE project_id = $1
        `, [projectId]);
        const r = rows[0] ?? {};
        summary.inspections = {
          completed: Number(r.completed) || 0,
          pending: Number(r.pending) || 0,
          failed: Number(r.failed) || 0,
          total: Number(r.total) || 0,
        };
      } catch (e) { log.warn({ err: e }, 'inspection summary failed'); }
    }

    if (await this.tableExists('ncr_records')) {
      try {
        const { rows } = await pool.query(
          `SELECT count(*) FILTER (WHERE upper(COALESCE(status,'')) IN ('OPEN','OPENED')) AS open_count
           FROM ncr_records WHERE project_id = $1`,
          [projectId]
        );
        summary.openNcr = Number(rows[0]?.open_count) || 0;
      } catch (e) { log.warn({ err: e }, 'ncr summary failed'); }
    }

    if (await this.tableExists('mdr_dossiers')) {
      try {
        const { rows } = await pool.query(
          'SELECT AVG(completion_pct) AS avg_completion FROM mdr_dossiers WHERE project_id = $1',
          [projectId]
        );
        summary.mdrCompletion = rows[0]?.avg_completion != null
          ? Math.round(Number(rows[0].avg_completion) * 10) / 10 : null;
      } catch (e) { log.warn({ err: e }, 'mdr summary failed'); }
    }

    return summary;
  }
}
