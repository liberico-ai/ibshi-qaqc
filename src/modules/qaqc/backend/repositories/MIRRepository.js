import { Repository, pool, transaction } from '../../../../core/db.js';

class MIRRepository extends Repository {
  constructor() {
    super('qaqc_mir_records', {});
  }

  async findDetail(mirId) {
    const [mir, certs, acceptances] = await Promise.all([
      pool.query(`
        SELECT m.*, p.code AS project_code, u.full_name AS creator_name
        FROM qaqc_mir_records m
        JOIN qaqc_projects p ON p.id = m.project_id
        LEFT JOIN sys_users u ON u.id = m.created_by
        WHERE m.id = $1
      `, [mirId]),
      pool.query('SELECT * FROM qaqc_material_certs WHERE mir_id = $1 ORDER BY created_at', [mirId]),
      pool.query('SELECT * FROM qaqc_acceptances WHERE mir_id = $1 ORDER BY decided_at', [mirId]),
    ]);
    if (!mir.rows[0]) return null;
    return { ...mir.rows[0], certs: certs.rows, acceptances: acceptances.rows };
  }

  async transition(mirId, newStage) {
    await pool.query(
      'UPDATE qaqc_mir_records SET stage = $1, updated_at = now() WHERE id = $2',
      [newStage, mirId]
    );
  }

  async addCert(cert) {
    const { rows } = await pool.query(
      `INSERT INTO qaqc_material_certs (mir_id,standard_id,heat_no,grade,supplier,file_url,ocr_extracted)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [cert.mir_id, cert.standard_id ?? null, cert.heat_no ?? null, cert.grade ?? null,
       cert.supplier ?? null, cert.file_url ?? null, JSON.stringify(cert.ocr_extracted ?? {})]
    );
    return rows[0];
  }

  async saveAcceptance(acceptance) {
    const { rows } = await pool.query(
      `INSERT INTO qaqc_acceptances (mir_id,decision,decided_by,waiver_note,ai_confidence,ai_result)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [acceptance.mir_id, acceptance.decision, acceptance.decided_by ?? null,
       acceptance.waiver_note ?? null, acceptance.ai_confidence ?? null,
       JSON.stringify(acceptance.ai_result ?? {})]
    );
    return rows[0];
  }

  async getAuditTrail(mirId) {
    const { rows } = await pool.query(`
      SELECT 'stage_change' AS event_type, stage AS value, updated_at AS ts, NULL::INT AS actor
      FROM qaqc_mir_records WHERE id = $1
      UNION ALL
      SELECT 'cert_added', heat_no, created_at, NULL FROM qaqc_material_certs WHERE mir_id = $1
      UNION ALL
      SELECT 'decision', decision, decided_at, decided_by FROM qaqc_acceptances WHERE mir_id = $1
      ORDER BY ts
    `, [mirId]);
    return rows;
  }
}

export const mirRepo = new MIRRepository();
