import { Repository, pool, transaction } from '../../../../core/db.js';

class InspectionRepository extends Repository {
  constructor() {
    super('qaqc_inspections', {});
  }

  async findWithResults(inspectionId) {
    const [insp, results, photos] = await Promise.all([
      pool.query(`
        SELECT i.*, u.full_name AS assigned_name
        FROM qaqc_inspections i
        LEFT JOIN sys_users u ON u.id = i.assigned_to
        WHERE i.id = $1 OR (i.original_id = $1 AND i.is_current = TRUE)
        ORDER BY i.revision DESC
        LIMIT 1
      `, [inspectionId]),
      pool.query('SELECT * FROM qaqc_inspection_results WHERE inspection_id = $1 ORDER BY created_at', [inspectionId]),
      pool.query('SELECT * FROM qaqc_inspection_photos WHERE inspection_id = $1 ORDER BY created_at', [inspectionId]),
    ]);
    if (!insp.rows[0]) return null;
    return { ...insp.rows[0], results: results.rows, photos: photos.rows };
  }

  async getDashboard() {
    const { rows } = await pool.query(`
      SELECT p.code AS project_code, p.name AS project_name,
             i.ip_code,
             count(*) FILTER (WHERE i.status = 'COMPLETED') AS completed,
             count(*) FILTER (WHERE i.status = 'PENDING')   AS pending,
             count(*) FILTER (WHERE i.status = 'FAILED')    AS failed,
             count(*) AS total
      FROM qaqc_inspections i
      JOIN qaqc_projects p ON p.id = i.project_id
      WHERE i.is_current = TRUE
      GROUP BY p.code, p.name, i.ip_code
      ORDER BY p.code, i.ip_code
    `);
    return rows;
  }

  async saveResults(inspectionId, results) {
    return transaction(async (client) => {
      await client.query('DELETE FROM qaqc_inspection_results WHERE inspection_id = $1', [inspectionId]);
      for (const r of results) {
        await client.query(
          'INSERT INTO qaqc_inspection_results (inspection_id, checkpoint_id, result, measured_value, measured_unit, device_id, note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [inspectionId, r.checkpoint_id, r.result ?? null, r.measured_value ?? null, r.measured_unit ?? null, r.device_id ?? null, r.note ?? null]
        );
      }
      await client.query('UPDATE qaqc_inspections SET updated_at = now() WHERE id = $1', [inspectionId]);
    });
  }
}

export const inspectionRepo = new InspectionRepository();
