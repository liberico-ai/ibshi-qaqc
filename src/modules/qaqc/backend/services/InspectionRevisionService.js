import { pool, transaction } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';

const MUTABLE_FIELDS = [
  'assigned_to', 'unit_id', 'ip_code', 'status',
  'notes', 'started_at', 'completed_at',
];

export class InspectionRevisionService {
  static async createRevision(inspectionId, { userId, reason, updatedData = {} }) {
    if (!reason || reason.trim().length < 20) {
      throw new AppError(400, 'Lý do revision phải có ít nhất 20 ký tự');
    }

    return transaction(async (client) => {
      const { rows: cur } = await client.query(
        'SELECT * FROM qaqc_inspections WHERE id=$1',
        [inspectionId]
      );
      if (!cur[0]) throw new AppError(404, 'Inspection không tồn tại');
      if (!cur[0].is_current) throw new AppError(400, 'Chỉ revision hiện hành mới có thể tạo bản mới');

      const current = cur[0];
      const originalId = current.original_id ?? current.id;

      // 1. Mark current as not current
      await client.query(
        'UPDATE qaqc_inspections SET is_current = FALSE, updated_at = now() WHERE id = $1',
        [inspectionId]
      );

      // 2. Build new row (clone + apply updates)
      const newRow = {};
      for (const field of MUTABLE_FIELDS) {
        newRow[field] = field in updatedData ? updatedData[field] : current[field];
      }

      const { rows: inserted } = await client.query(
        `INSERT INTO qaqc_inspections
           (plan_id, item_id, project_id, unit_id, ip_code, assigned_to, status, notes,
            started_at, completed_at,
            revision, is_current, parent_id, original_id, revision_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12,$13,$14)
         RETURNING *`,
        [
          current.plan_id, current.item_id, current.project_id,
          newRow.unit_id, newRow.ip_code, newRow.assigned_to,
          newRow.status ?? 'PENDING', newRow.notes ?? null,
          newRow.started_at ?? null, newRow.completed_at ?? null,
          (current.revision ?? 1) + 1,
          inspectionId, originalId, reason.trim(),
        ]
      );
      const newId = inserted[0].id;

      // 3. Copy results from prior revision (reference new inspection_id)
      await client.query(
        `INSERT INTO qaqc_inspection_results
           (inspection_id, checkpoint_id, result, measured_value, measured_unit, device_id, note)
         SELECT $1, checkpoint_id, result, measured_value, measured_unit, device_id, note
         FROM qaqc_inspection_results WHERE inspection_id = $2`,
        [newId, inspectionId]
      );

      // 4. Copy photos (keep file_url references — no file duplication)
      await client.query(
        `INSERT INTO qaqc_inspection_photos (inspection_id, result_id, file_url, taken_at)
         SELECT $1, result_id, file_url, taken_at
         FROM qaqc_inspection_photos WHERE inspection_id = $2`,
        [newId, inspectionId]
      );

      // 5. If results supplied explicitly, overwrite copied ones
      if (Array.isArray(updatedData.results)) {
        await client.query('DELETE FROM qaqc_inspection_results WHERE inspection_id = $1', [newId]);
        for (const r of updatedData.results) {
          await client.query(
            `INSERT INTO qaqc_inspection_results
               (inspection_id, checkpoint_id, result, measured_value, measured_unit, device_id, note)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [newId, r.checkpoint_id ?? null, r.result ?? null, r.measured_value ?? null,
             r.measured_unit ?? null, r.device_id ?? null, r.note ?? null]
          );
        }
      }

      return { id: newId, revision: inserted[0].revision, parent_id: inspectionId, original_id: originalId, user_id: userId };
    });
  }

  static async getRevisionHistory(inspectionId) {
    const { rows: meta } = await pool.query(
      'SELECT original_id FROM qaqc_inspections WHERE id = $1',
      [inspectionId]
    );
    if (!meta[0]) throw new AppError(404, 'Inspection không tồn tại');
    const originalId = meta[0].original_id ?? inspectionId;

    const { rows } = await pool.query(
      `SELECT i.id, i.revision, i.is_current, i.parent_id, i.status,
              i.revision_reason, i.created_at, i.updated_at,
              u.full_name AS editor_name
       FROM qaqc_inspections i
       LEFT JOIN sys_users u ON u.id = i.assigned_to
       WHERE i.original_id = $1 OR i.id = $1
       ORDER BY i.revision ASC`,
      [originalId]
    );
    return { original_id: originalId, revisions: rows };
  }

  static async getRevisionDetail(inspectionId) {
    const [insp, results, photos] = await Promise.all([
      pool.query('SELECT * FROM qaqc_inspections WHERE id = $1', [inspectionId]),
      pool.query('SELECT * FROM qaqc_inspection_results WHERE inspection_id = $1 ORDER BY created_at', [inspectionId]),
      pool.query('SELECT * FROM qaqc_inspection_photos WHERE inspection_id = $1 ORDER BY created_at', [inspectionId]),
    ]);
    if (!insp.rows[0]) return null;
    return { ...insp.rows[0], results: results.rows, photos: photos.rows };
  }

  static async getDiff(revAId, revBId) {
    const [a, b] = await Promise.all([
      this.getRevisionDetail(revAId),
      this.getRevisionDetail(revBId),
    ]);
    if (!a || !b) throw new AppError(404, 'Một trong hai revision không tồn tại');

    const fieldDiffs = [];
    for (const f of MUTABLE_FIELDS) {
      if (JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null)) {
        fieldDiffs.push({ field: f, from: a[f] ?? null, to: b[f] ?? null });
      }
    }

    // Compare results keyed by checkpoint_id
    const aByCp = new Map(a.results.map(r => [r.checkpoint_id ?? `_${r.id}`, r]));
    const bByCp = new Map(b.results.map(r => [r.checkpoint_id ?? `_${r.id}`, r]));
    const resultDiffs = [];
    const cpKeys = new Set([...aByCp.keys(), ...bByCp.keys()]);
    for (const cp of cpKeys) {
      const ra = aByCp.get(cp);
      const rb = bByCp.get(cp);
      if (!ra)      resultDiffs.push({ checkpoint_id: cp, change: 'added',   to: rb });
      else if (!rb) resultDiffs.push({ checkpoint_id: cp, change: 'removed', from: ra });
      else {
        const changed = ['result', 'measured_value', 'measured_unit', 'device_id', 'note']
          .some(k => String(ra[k] ?? '') !== String(rb[k] ?? ''));
        if (changed) resultDiffs.push({ checkpoint_id: cp, change: 'modified', from: ra, to: rb });
      }
    }

    return { fields: fieldDiffs, results: resultDiffs };
  }
}
