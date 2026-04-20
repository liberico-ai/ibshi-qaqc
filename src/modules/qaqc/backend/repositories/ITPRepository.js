import { Repository, pool, transaction } from '../../../../core/db.js'; // pool for raw queries, transaction for atomic ops

class ITPRepository extends Repository {
  constructor() {
    super('qaqc_inspection_plans', {});
  }

  async findWithItems(planId) {
    const [plan, items] = await Promise.all([
      pool.query('SELECT * FROM qaqc_inspection_plans WHERE id = $1', [planId]),
      pool.query(`
        SELECT i.*, array_agg(row_to_json(c.*) ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL) AS checkpoints
        FROM qaqc_itp_items i
        LEFT JOIN qaqc_itp_checkpoints c ON c.item_id = i.id
        WHERE i.plan_id = $1
        GROUP BY i.id
        ORDER BY i.seq
      `, [planId]),
    ]);
    if (!plan.rows[0]) return null;
    return { ...plan.rows[0], items: items.rows };
  }

  async createWithItems({ plan, items = [] }) {
    return transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO qaqc_inspection_plans (project_id,product_type,version,status,template_id,reason_for_change,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [plan.project_id, plan.product_type, plan.version ?? 1, plan.status ?? 'DRAFT', plan.template_id ?? null, plan.reason_for_change ?? null, plan.created_by ?? null]
      );
      const planRecord = rows[0];
      for (const item of items) {
        const { rows: ir } = await client.query(
          `INSERT INTO qaqc_itp_items (plan_id,seq,ip_code,description,standard_id,hold_flag,witness_flag,acceptance_criteria,sample_rule)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [planRecord.id, item.seq, item.ip_code ?? null, item.description ?? null, item.standard_id ?? null,
           item.hold_flag ?? false, item.witness_flag ?? false, item.acceptance_criteria ?? null, item.sample_rule ?? null]
        );
        for (const cp of item.checkpoints ?? []) {
          await client.query(
            'INSERT INTO qaqc_itp_checkpoints (item_id,label,required,data_type) VALUES ($1,$2,$3,$4)',
            [ir[0].id, cp.label, cp.required ?? true, cp.data_type ?? 'boolean']
          );
        }
      }
      return planRecord;
    });
  }

  async addItem(planId, item) {
    return transaction(async (client) => {
      const { rows: seq } = await client.query(
        'SELECT COALESCE(MAX(seq),0)+1 AS next FROM qaqc_itp_items WHERE plan_id=$1', [planId]
      );
      const { rows } = await client.query(
        `INSERT INTO qaqc_itp_items (plan_id,seq,ip_code,description,standard_id,hold_flag,witness_flag,acceptance_criteria,sample_rule)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [planId, item.seq ?? seq[0].next, item.ip_code ?? null, item.description ?? null, item.standard_id ?? null,
         item.hold_flag ?? false, item.witness_flag ?? false, item.acceptance_criteria ?? null, item.sample_rule ?? null]
      );
      const itemRecord = rows[0];
      for (const cp of item.checkpoints ?? []) {
        await client.query(
          'INSERT INTO qaqc_itp_checkpoints (item_id,label,required,data_type) VALUES ($1,$2,$3,$4)',
          [itemRecord.id, cp.label, cp.required ?? true, cp.data_type ?? 'boolean']
        );
      }
      return itemRecord;
    });
  }

  async removeItem(itemId) {
    await pool.query('DELETE FROM qaqc_itp_items WHERE id=$1', [itemId]);
  }

  async saveHistory(planId, version, changedBy, reason, snapshot) {
    await pool.query(
      'INSERT INTO qaqc_itp_plan_history (plan_id,version,changed_by,change_reason,snapshot) VALUES ($1,$2,$3,$4,$5)',
      [planId, version, changedBy, reason, JSON.stringify(snapshot)]
    );
  }

  async transition(planId, newStatus, updatedBy) {
    await pool.query(
      'UPDATE qaqc_inspection_plans SET status = $1, updated_at = now() WHERE id = $2',
      [newStatus, planId]
    );
  }
}

export const itpRepo = new ITPRepository();
