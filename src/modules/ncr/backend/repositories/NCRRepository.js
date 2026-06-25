import { Repository, pool } from '../../../../core/db.js';
import { computeSlaStatus } from '../services/SLAService.js';

class NCRRepository extends Repository {
  constructor() {
    super('ncr_records', {});
  }

  /** Sinh số NCR dạng NCR-YYYY-#### theo năm hiện tại. */
  async nextNcrNo() {
    const year = new Date().getFullYear();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM ncr_records WHERE ncr_no LIKE $1`,
      [`NCR-${year}-%`]
    );
    const seq = String(rows[0].c + 1).padStart(4, '0');
    return `NCR-${year}-${seq}`;
  }

  async findDetail(ncrId) {
    const [ncr, actions, history] = await Promise.all([
      pool.query(`
        SELECT n.*,
               p.code      AS project_code,
               p.name      AS project_name,
               a.full_name AS assigned_name,
               c.full_name AS creator_name
        FROM ncr_records n
        LEFT JOIN qaqc_projects p ON p.id = n.project_id
        LEFT JOIN sys_users a ON a.id = n.assigned_to
        LEFT JOIN sys_users c ON c.id = n.created_by
        WHERE n.id = $1
      `, [ncrId]),
      pool.query(`
        SELECT ac.*, o.full_name AS owner_name, v.full_name AS verifier_name
        FROM ncr_actions ac
        LEFT JOIN sys_users o ON o.id = ac.owner_id
        LEFT JOIN sys_users v ON v.id = ac.verified_by
        WHERE ac.ncr_id = $1 ORDER BY ac.created_at
      `, [ncrId]),
      pool.query(`
        SELECT h.*, u.full_name AS actor_name
        FROM ncr_history h
        LEFT JOIN sys_users u ON u.id = h.actor_id
        WHERE h.ncr_id = $1 ORDER BY h.created_at DESC
      `, [ncrId]),
    ]);
    if (!ncr.rows[0]) return null;
    const row = ncr.rows[0];
    return {
      ...row,
      sla_status: computeSlaStatus(row),
      actions: actions.rows,
      history: history.rows,
    };
  }

  async findAndCountList(filter, options) {
    const where = [];
    const params = [];
    if (filter.status)     { params.push(filter.status);     where.push(`n.status = $${params.length}`); }
    if (filter.project_id) { params.push(filter.project_id); where.push(`n.project_id = $${params.length}`); }
    if (filter.severity)   { params.push(filter.severity);   where.push(`n.severity = $${params.length}`); }

    // Lọc theo trạng thái SLA (tính trên hạn SLA so với hôm nay).
    // due = COALESCE(sla_due_date, due_date).
    const SLA_FILTER = {
      CLOSED:  `n.status = 'CLOSED'`,
      OVERDUE: `n.status <> 'CLOSED' AND COALESCE(n.sla_due_date, n.due_date) IS NOT NULL AND COALESCE(n.sla_due_date, n.due_date) < CURRENT_DATE`,
      AT_RISK: `n.status <> 'CLOSED' AND COALESCE(n.sla_due_date, n.due_date) IS NOT NULL AND COALESCE(n.sla_due_date, n.due_date) >= CURRENT_DATE AND COALESCE(n.sla_due_date, n.due_date) <= (CURRENT_DATE + INTERVAL '2 days')`,
      ON_TIME: `n.status <> 'CLOSED' AND COALESCE(n.sla_due_date, n.due_date) IS NOT NULL AND COALESCE(n.sla_due_date, n.due_date) > (CURRENT_DATE + INTERVAL '2 days')`,
    };
    if (filter.sla_status && SLA_FILTER[filter.sla_status]) {
      where.push(`(${SLA_FILTER[filter.sla_status]})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ncr_records n ${whereClause}`, params
    );
    const total = countRes.rows[0].total;

    const dataParams = [...params, options.limit, options.offset];
    const { rows } = await pool.query(`
      SELECT n.*, p.code AS project_code, a.full_name AS assigned_name
      FROM ncr_records n
      LEFT JOIN qaqc_projects p ON p.id = n.project_id
      LEFT JOIN sys_users a ON a.id = n.assigned_to
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `, dataParams);

    return {
      data: rows.map(r => ({ ...r, sla_status: computeSlaStatus(r) })),
      meta: { total, totalPages: options.limit ? Math.ceil(total / options.limit) : 1 },
    };
  }

  async updateStatus(ncrId, status, extra = {}) {
    const sets = ['status = $1', 'updated_at = now()'];
    const params = [status];
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) continue;
      params.push(v);
      sets.push(`${k} = $${params.length}`);
    }
    params.push(ncrId);
    const { rows } = await pool.query(
      `UPDATE ncr_records SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0];
  }

  async addHistory(entry) {
    const { rows } = await pool.query(
      `INSERT INTO ncr_history (ncr_id, event_type, from_status, to_status, note, actor_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [entry.ncr_id, entry.event_type, entry.from_status ?? null,
       entry.to_status ?? null, entry.note ?? null, entry.actor_id ?? null]
    );
    return rows[0];
  }

  async addAction(action) {
    const { rows } = await pool.query(
      `INSERT INTO ncr_actions (ncr_id, action_type, description, owner_id, due_date, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [action.ncr_id, action.action_type, action.description,
       action.owner_id ?? null, action.due_date ?? null, action.status ?? 'open']
    );
    return rows[0];
  }

  async findAction(actionId) {
    const { rows } = await pool.query('SELECT * FROM ncr_actions WHERE id = $1', [actionId]);
    return rows[0];
  }

  async updateAction(actionId, status, verifiedBy) {
    const verifiedFields = status === 'verified'
      ? ', verified_by = $2, verified_at = now()'
      : '';
    const params = status === 'verified' ? [status, verifiedBy ?? null, actionId] : [status, actionId];
    const idPlaceholder = status === 'verified' ? '$3' : '$2';
    const { rows } = await pool.query(
      `UPDATE ncr_actions SET status = $1${verifiedFields}, updated_at = now()
       WHERE id = ${idPlaceholder} RETURNING *`,
      params
    );
    return rows[0];
  }

  /**
   * Liệt kê NCR mở đang quá hạn hoặc còn 2 ngày tới hạn (dùng cho escalation cron).
   * Ưu tiên hạn SLA (sla_due_date), nếu trống thì dùng due_date thủ công.
   */
  async findDueSoonOrOverdue() {
    const { rows } = await pool.query(`
      SELECT n.*, p.code AS project_code,
             COALESCE(n.sla_due_date, n.due_date) AS effective_due_date
      FROM ncr_records n
      LEFT JOIN qaqc_projects p ON p.id = n.project_id
      WHERE n.status NOT IN ('CLOSED')
        AND COALESCE(n.sla_due_date, n.due_date) IS NOT NULL
        AND COALESCE(n.sla_due_date, n.due_date) <= (CURRENT_DATE + INTERVAL '2 days')
    `);
    return rows;
  }
}

export const ncrRepo = new NCRRepository();
