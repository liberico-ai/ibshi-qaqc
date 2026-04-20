import { Repository } from '../../../../core/db.js';

class SysLogsRepository extends Repository {
  constructor() {
    // sys_logs trong SKIP_TABLES audit
    super('sys_logs');
  }

  async findFiltered({ keyword, action, entity_table, user_id, from, to, limit, offset }) {
    const params = [];
    const where = [];

    if (keyword) {
      params.push(`%${keyword}%`);
      const n = params.length;
      where.push(`(l.username ILIKE $${n} OR l.entity_table ILIKE $${n} OR l.entity_id ILIKE $${n} OR l.category ILIKE $${n})`);
    }
    if (action) {
      params.push(action);
      where.push(`l.action = $${params.length}`);
    }
    if (entity_table) {
      params.push(`%${entity_table}%`);
      where.push(`l.entity_table ILIKE $${params.length}`);
    }
    if (user_id) {
      params.push(parseInt(user_id, 10));
      where.push(`l.user_id = $${params.length}`);
    }
    if (from) { params.push(from); where.push(`l.created_at >= $${params.length}`); }
    if (to)   { params.push(to);   where.push(`l.created_at <= $${params.length}`); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const dataQ = `
      SELECT l.id, l.user_id, l.username, l.action, l.category,
             l.entity_table, l.entity_id, l.new_data,
             l.ip_address, l.created_at
      FROM sys_logs l
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countQ = `SELECT COUNT(*)::int AS total FROM sys_logs l ${whereClause}`;

    const [dataRes, countRes] = await Promise.all([
      this.query(dataQ, [...params, limit, offset]),
      this.query(countQ, params),
    ]);

    return { rows: dataRes.rows, total: countRes.rows[0].total };
  }

  async statsLast7Days() {
    const { rows } = await this.query(`
      SELECT action, COUNT(*)::int AS count
      FROM sys_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY action
      ORDER BY count DESC
    `);
    return rows;
  }
}

export const sysLogsRepo = new SysLogsRepository();
