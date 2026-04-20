import { Repository } from '../../../../core/db.js';

class NotificationsRepository extends Repository {
  constructor() {
    // sys_notifications nằm trong SKIP_TABLES audit → không log audit
    super('sys_notifications');
  }

  async findForUser(userId, { limit, offset }) {
    const countRes = await this.query(
      `SELECT COUNT(*)::int AS total FROM sys_notifications WHERE target_type = 'USER' AND target_id = $1`,
      [userId]
    );
    const total = countRes.rows[0].total;

    const { rows } = await this.query(
      `SELECT * FROM sys_notifications WHERE target_type = 'USER' AND target_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { rows, total };
  }

  async unreadCountForUser(userId) {
    const { rows } = await this.query(
      `SELECT COUNT(*)::int AS c FROM sys_notifications WHERE target_type = 'USER' AND target_id = $1 AND is_read = false`,
      [userId]
    );
    return rows[0].c;
  }

  async markRead(id, userId) {
    const { rows } = await this.query(
      `UPDATE sys_notifications SET is_read = true
       WHERE id = $1 AND target_type = 'USER' AND target_id = $2 RETURNING *`,
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async markAllReadForUser(userId) {
    await this.query(
      `UPDATE sys_notifications SET is_read = true
       WHERE target_type = 'USER' AND target_id = $1 AND is_read = false`,
      [userId]
    );
  }

  async createNotification({ targetType, targetId, title, message, type, link, senderId }) {
    const { rows } = await this.query(
      `INSERT INTO sys_notifications (target_type, target_id, title, message, type, link, updated_by, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [targetType, targetId, title, message, type, link, senderId]
    );
    return rows[0];
  }
}

export const notificationsRepo = new NotificationsRepository();
