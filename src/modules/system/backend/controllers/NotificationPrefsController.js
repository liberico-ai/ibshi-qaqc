import crypto from 'crypto';
import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { channelRegistry } from '../services/ChannelRegistry.js';

export class NotificationPrefsController {
  // GET /api/system/notifications/prefs
  static async getPrefs(req, res) {
    const userId = req.user.id;
    const { rows: identities } = await pool.query(
      `SELECT channel_class, identity, is_verified, linked_at
       FROM sys_user_channel_identities WHERE user_id = $1`,
      [userId]
    );
    const { rows: prefs } = await pool.query(
      `SELECT event_type, channel_class, enabled
       FROM sys_notification_prefs WHERE user_id = $1`,
      [userId]
    );
    res.json({
      data: {
        channels: channelRegistry.list(),
        identities,
        prefs,
      },
    });
  }

  // PUT /api/system/notifications/prefs — body: { prefs: [{event_type, channel_class, enabled}] }
  static async updatePrefs(req, res) {
    const userId = req.user.id;
    const { prefs } = req.body;
    if (!Array.isArray(prefs)) throw new AppError(400, 'prefs must be an array');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of prefs) {
        if (!p.event_type || !p.channel_class) continue;
        await client.query(
          `INSERT INTO sys_notification_prefs (user_id, event_type, channel_class, enabled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, event_type, channel_class) DO UPDATE SET enabled = EXCLUDED.enabled`,
          [userId, p.event_type, p.channel_class, p.enabled !== false]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  }

  // POST /api/system/notifications/channels/:channelClass/link/initiate
  static async initiateLink(req, res) {
    const { channelClass } = req.params;
    const provider = channelRegistry.get(channelClass);
    if (!provider) throw new AppError(404, `Channel ${channelClass} không khả dụng`);
    const result = await provider.initiateLink(req.user.id);
    res.json({ data: result });
  }

  // POST /api/system/notifications/channels/:channelClass/link/complete — body: { value }
  static async completeLink(req, res) {
    const { channelClass } = req.params;
    const { value } = req.body;
    const provider = channelRegistry.get(channelClass);
    if (!provider) throw new AppError(404, `Channel ${channelClass} không khả dụng`);
    const result = await provider.completeLink(req.user.id, value);
    res.json({ data: result });
  }

  // DELETE /api/system/notifications/channels/:channelClass
  static async unlinkChannel(req, res) {
    const { channelClass } = req.params;
    await pool.query(
      `DELETE FROM sys_user_channel_identities WHERE user_id = $1 AND channel_class = $2`,
      [req.user.id, channelClass]
    );
    res.json({ ok: true });
  }

  // GET /api/system/webhooks
  static async listWebhooks(_req, res) {
    const { rows } = await pool.query(
      `SELECT id, name, url, event_types, status, created_at FROM sys_webhook_subscriptions ORDER BY created_at DESC`
    );
    res.json({ data: rows });
  }

  // POST /api/system/webhooks — body: { name, url, event_types }
  static async createWebhook(req, res) {
    const { name, url, event_types } = req.body;
    if (!name || !url || !Array.isArray(event_types) || !event_types.length) {
      throw new AppError(400, 'name, url, event_types required');
    }
    const secret = crypto.randomBytes(32).toString('hex');
    const { rows } = await pool.query(
      `INSERT INTO sys_webhook_subscriptions (name, url, secret, event_types, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, url, event_types, status, created_at`,
      [name, url, secret, event_types, req.user?.id ?? null]
    );
    res.status(201).json({ data: { ...rows[0], secret } });
  }

  // DELETE /api/system/webhooks/:id
  static async deleteWebhook(req, res) {
    await pool.query(`DELETE FROM sys_webhook_subscriptions WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  }
}
