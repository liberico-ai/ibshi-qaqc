import TelegramBot from 'node-telegram-bot-api';
import { pool } from '../../../../core/db.js';
import { createLogger } from '../../../../core/logger.js';
import { NotificationChannelProvider } from './NotificationChannelProvider.js';

const log = createLogger('telegram-channel');
const CODE_TTL_MINUTES = 15;

export class TelegramChannelProvider extends NotificationChannelProvider {
  constructor(config = {}) {
    super(config);
    this.botToken = config.bot_token ?? '';
    this.botUsername = config.bot_username ?? 'IBSHIQAQCBot';
    this.bot = null;
  }

  async startListening() {
    if (this.mockMode || !this.botToken) {
      log.info({ mock: this.mockMode }, 'Telegram channel running in mock mode — no bot polling');
      return;
    }
    try {
      this.bot = new TelegramBot(this.botToken, { polling: true });
      this.bot.onText(/\/link\s+(\w+)/i, async (msg, match) => {
        const chatId = msg.chat.id.toString();
        const code = match[1].trim();
        try {
          if (!this._linkHandler) throw new Error('link handler not set');
          await this._linkHandler(chatId, code);
          await this.bot.sendMessage(chatId, '✅ Đã liên kết tài khoản Telegram thành công.');
        } catch (err) {
          log.warn({ err, chatId }, 'Telegram link failed');
          await this.bot.sendMessage(chatId, `❌ Liên kết thất bại: ${err.message}`);
        }
      });
      this.bot.on('polling_error', (err) => log.warn({ err: err.message }, 'Telegram polling error'));
      log.info('Telegram channel listening');
    } catch (err) {
      log.error({ err }, 'Failed to start Telegram bot');
    }
  }

  async stopListening() {
    if (this.bot) {
      try { await this.bot.stopPolling(); } catch { /* ignore */ }
      this.bot = null;
    }
  }

  async initiateLink(userId) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO sys_user_channel_identities (user_id, channel_class, link_code, link_code_expires_at, is_verified, updated_at)
       VALUES ($1, 'notification-telegram', $2, $3, FALSE, now())
       ON CONFLICT (user_id, channel_class) DO UPDATE
         SET link_code = EXCLUDED.link_code,
             link_code_expires_at = EXCLUDED.link_code_expires_at,
             updated_at = now()`,
      [userId, code, expiresAt]
    );

    return {
      code,
      instructions: `Mở Telegram, chat với @${this.botUsername} và gửi: /link ${code}`,
      expires_at: expiresAt.toISOString(),
    };
  }

  async completeLink(_userId, _code) {
    throw new Error('Telegram completeLink is triggered via bot message, not direct API');
  }

  async send(chatId, eventType, payload) {
    const text = this._formatMessage(eventType, payload);
    if (this.mockMode || !this.botToken) {
      log.info({ chatId, eventType, text }, '[MOCK] Telegram message');
      return;
    }
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Telegram API: ${body.description ?? res.statusText}`);
    }
  }

  _formatMessage(eventType, payload) {
    const title = payload.title ?? eventType;
    const body = payload.message ?? JSON.stringify(payload);
    return `*${title}*\n${body}`;
  }

  async healthCheck() {
    if (this.mockMode) return { ok: true, message: 'mock mode' };
    if (!this.botToken) return { ok: false, message: 'bot_token not configured' };
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
    const body = await res.json();
    return body.ok
      ? { ok: true, message: `@${body.result.username}` }
      : { ok: false, message: body.description };
  }
}
