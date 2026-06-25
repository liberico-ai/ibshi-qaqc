import { Repository, pool } from '../../../../core/db.js';

// ── Vendors ───────────────────────────────────────────────────────
class NDTVendorRepository extends Repository {
  constructor() { super('ndt_vendors', {}); }
}

// ── Requests ──────────────────────────────────────────────────────
class NDTRequestRepository extends Repository {
  constructor() { super('ndt_requests', {}); }

  async findDetail(id) {
    const [reqQ, resultsQ] = await Promise.all([
      pool.query(
        `SELECT r.*, v.name AS vendor_name, v.contact_email AS vendor_email,
                p.code AS project_code, u.full_name AS requester_name
         FROM ndt_requests r
         LEFT JOIN ndt_vendors v ON v.id = r.vendor_id
         LEFT JOIN qaqc_projects p ON p.id = r.project_id
         LEFT JOIN sys_users u ON u.id = r.requested_by
         WHERE r.id = $1`,
        [id]
      ),
      pool.query('SELECT * FROM ndt_results WHERE request_id = $1 ORDER BY recorded_at', [id]),
    ]);
    if (!reqQ.rows[0]) return null;
    return { ...reqQ.rows[0], results: resultsQ.rows };
  }

  async listWithVendor(filter, { limit, offset, page }) {
    const where = [];
    const params = [];
    if (filter.project_id) { params.push(filter.project_id); where.push(`r.project_id = $${params.length}`); }
    if (filter.status)     { params.push(filter.status);     where.push(`r.status = $${params.length}`); }
    if (filter.method)     { params.push(filter.method);     where.push(`r.method = $${params.length}`); }
    if (filter.vendor_id)  { params.push(filter.vendor_id);  where.push(`r.vendor_id = $${params.length}`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countQ = await pool.query(`SELECT COUNT(*)::int AS c FROM ndt_requests r ${clause}`, params);
    const total = countQ.rows[0].c;

    params.push(limit); const limIdx = params.length;
    params.push(offset); const offIdx = params.length;
    const { rows } = await pool.query(
      `SELECT r.*, v.name AS vendor_name, p.code AS project_code
       FROM ndt_requests r
       LEFT JOIN ndt_vendors v ON v.id = r.vendor_id
       LEFT JOIN qaqc_projects p ON p.id = r.project_id
       ${clause}
       ORDER BY r.requested_at DESC
       LIMIT $${limIdx} OFFSET $${offIdx}`,
      params
    );
    return { data: rows, meta: { total, page, totalPages: Math.ceil(total / limit) } };
  }
}

// ── Results ───────────────────────────────────────────────────────
class NDTResultRepository extends Repository {
  constructor() { super('ndt_results', {}); }
}

// ── Vendor scoped tokens ──────────────────────────────────────────
class NDTVendorTokenRepository extends Repository {
  constructor() { super('ndt_vendor_tokens', {}); }

  /** Tìm token kèm thông tin yêu cầu NDT liên quan (1 lượt). */
  async findByToken(token) {
    const { rows } = await pool.query(
      `SELECT t.*, r.request_no, r.method, r.status AS request_status,
              r.inspection_id, r.weld_joint_ref, r.requested_by
       FROM ndt_vendor_tokens t
       JOIN ndt_requests r ON r.id = t.request_id
       WHERE t.token = $1
       LIMIT 1`,
      [token]
    );
    return rows[0] ?? null;
  }

  /** Đánh dấu token đã sử dụng (chống tái sử dụng). */
  async markUsed(id) {
    const { rows } = await pool.query(
      `UPDATE ndt_vendor_tokens SET used_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

export const ndtVendorRepo      = new NDTVendorRepository();
export const ndtRequestRepo     = new NDTRequestRepository();
export const ndtResultRepo      = new NDTResultRepository();
export const ndtVendorTokenRepo = new NDTVendorTokenRepository();
