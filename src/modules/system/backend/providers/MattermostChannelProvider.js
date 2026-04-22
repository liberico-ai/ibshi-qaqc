import { pool } from '../../../../core/db.js';
import { createLogger } from '../../../../core/logger.js';
import { NotificationChannelProvider } from './NotificationChannelProvider.js';

const log = createLogger('mattermost-channel');

export class MattermostChannelProvider extends NotificationChannelProvider {
  async initiateLink(_userId) {
    return {
      code: null,
      instructions: 'Tạo Incoming Webhook trên Mattermost và dán URL vào ô bên dưới.',
    };
  }

  async completeLink(userId, webhookUrl) {
    if (typeof webhookUrl !== 'string' || !webhookUrl.startsWith('http')) {
      throw new Error('Webhook URL không hợp lệ');
    }
    await pool.query(
      `INSERT INTO sys_user_channel_identities
         (user_id, channel_class, identity, is_verified, linked_at, updated_at)
       VALUES ($1, 'notification-mattermost', $2, TRUE, now(), now())
       ON CONFLICT (user_id, channel_class) DO UPDATE
         SET identity = EXCLUDED.identity,
             is_verified = TRUE,
             linked_at = now(),
             updated_at = now(),
             link_code = NULL,
             link_code_expires_at = NULL`,
      [userId, webhookUrl]
    );
    return { identity: webhookUrl, is_verified: true };
  }

  async send(webhookUrl, eventType, payload) {
    const message = {
      text: `**${payload.title ?? eventType}**\n${payload.message ?? ''}`,
      attachments: payload.link ? [{ title: 'Mở liên kết', title_link: payload.link }] : undefined,
    };
    if (this.mockMode) {
      log.info({ webhookUrl, eventType, message }, '[MOCK] Mattermost message');
      return;
    }
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      throw new Error(`Mattermost webhook: ${res.status} ${res.statusText}`);
    }
  }

  async healthCheck() {
    return { ok: true, message: 'Mattermost channel (stateless) ready' };
  }
}
