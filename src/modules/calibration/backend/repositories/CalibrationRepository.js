import { Repository, pool } from '../../../../core/db.js';

class CalMasterRepository extends Repository {
  constructor() { super('cal_master_list', { trackActor: true }); }
}

class CalDeviceRepository extends Repository {
  constructor() { super('cal_devices', {}); }

  /**
   * Danh sách thiết bị kèm lần hiệu chuẩn mới nhất + trạng thái hạn.
   * status_hsd: VALID (còn hạn) | EXPIRING (sắp hết, <= ngưỡng) | EXPIRED (hết hạn) | UNKNOWN (chưa có)
   */
  async findWithStatus(filter = {}, { limit, offset, warnDays = 30 } = {}) {
    const params = [warnDays];
    const where = [];
    if (filter.status) { params.push(filter.status); where.push(`d.status = $${params.length}`); }
    if (filter.master_id) { params.push(filter.master_id); where.push(`d.master_id = $${params.length}`); }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      where.push(`(d.device_code ILIKE $${params.length} OR d.name ILIKE $${params.length})`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let limitClause = '';
    if (limit) { params.push(limit); limitClause += ` LIMIT $${params.length}`; }
    if (offset) { params.push(offset); limitClause += ` OFFSET $${params.length}`; }

    const sql = `
      SELECT d.*,
             r.calibrated_date, r.due_date, r.certificate_no, r.result AS last_result, r.calibrated_by,
             CASE
               WHEN r.due_date IS NULL THEN 'UNKNOWN'
               WHEN r.due_date < CURRENT_DATE THEN 'EXPIRED'
               WHEN r.due_date <= CURRENT_DATE + ($1 || ' days')::interval THEN 'EXPIRING'
               ELSE 'VALID'
             END AS status_hsd
      FROM cal_devices d
      LEFT JOIN LATERAL (
        SELECT * FROM cal_records cr WHERE cr.device_id = d.id
        ORDER BY cr.due_date DESC NULLS LAST, cr.created_at DESC LIMIT 1
      ) r ON TRUE
      ${whereClause}
      ORDER BY r.due_date ASC NULLS LAST, d.device_code
      ${limitClause}
    `;
    const { rows } = await pool.query(sql, params);

    // Count query: rebuild WHERE with its own placeholder numbering ($1..),
    // since it does NOT include the warnDays param used by the main SELECT.
    const countParams = [];
    const countWhere = [];
    if (filter.status) { countParams.push(filter.status); countWhere.push(`d.status = $${countParams.length}`); }
    if (filter.master_id) { countParams.push(filter.master_id); countWhere.push(`d.master_id = $${countParams.length}`); }
    if (filter.search) {
      countParams.push(`%${filter.search}%`);
      countWhere.push(`(d.device_code ILIKE $${countParams.length} OR d.name ILIKE $${countParams.length})`);
    }
    const countWhereClause = countWhere.length ? `WHERE ${countWhere.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*)::int AS c FROM cal_devices d ${countWhereClause}`;
    const { rows: cnt } = await pool.query(countSql, countParams);
    return { data: rows, total: cnt[0].c };
  }

  async findDetail(deviceId) {
    const [dev, records] = await Promise.all([
      pool.query('SELECT * FROM cal_devices WHERE id = $1', [deviceId]),
      pool.query('SELECT * FROM cal_records WHERE device_id = $1 ORDER BY due_date DESC NULLS LAST, created_at DESC', [deviceId]),
    ]);
    if (!dev.rows[0]) return null;
    return { ...dev.rows[0], records: records.rows };
  }
}

class CalRecordRepository extends Repository {
  constructor() { super('cal_records', { trackActor: true }); }
}

export const calMasterRepo = new CalMasterRepository();
export const calDeviceRepo = new CalDeviceRepository();
export const calRecordRepo = new CalRecordRepository();
