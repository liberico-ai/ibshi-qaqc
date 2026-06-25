import nodemailer from 'nodemailer';
import { NotificationChannelProvider } from './NotificationChannelProvider.js';
import { SettingsService } from '../../../../core/settings.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('email-channel');

/**
 * Kênh thông báo Email qua SMTP (nodemailer).
 *
 * Nguồn cấu hình (ưu tiên giảm dần):
 *   1. config truyền vào constructor (ChannelRegistry → sys_providers).
 *   2. sys_settings (SettingsService, các field bí mật được mã hoá).
 *   3. Biến môi trường (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE).
 *
 * Nếu SMTP chưa được cấu hình → no-op + cảnh báo (không ném lỗi để không chặn pipeline gửi).
 */
export class EmailChannelProvider extends NotificationChannelProvider {
  constructor(config = {}) {
    super(config);
    this.transporter = null;
    this.from = null;
    this._loaded = false;
  }

  /** Đọc & hợp nhất cấu hình SMTP từ 3 nguồn. */
  async _resolveConfig() {
    const c = this.config ?? {};
    const get = async (cfgKey, settingKey, envKey) => {
      if (c[cfgKey] != null && c[cfgKey] !== '') return c[cfgKey];
      try {
        const v = await SettingsService.getSetting(settingKey);
        if (v != null && v !== '') return v;
      } catch { /* DB chưa sẵn sàng */ }
      return process.env[envKey] ?? null;
    };

    const host = await get('smtp_host', 'smtp_host', 'SMTP_HOST');
    const portRaw = await get('smtp_port', 'smtp_port', 'SMTP_PORT');
    const user = await get('smtp_user', 'smtp_user', 'SMTP_USER');
    const pass = await get('smtp_pass', 'smtp_pass', 'SMTP_PASS');
    const from = await get('smtp_from', 'smtp_from', 'SMTP_FROM');
    const secureRaw = await get('smtp_secure', 'smtp_secure', 'SMTP_SECURE');

    const port = portRaw ? parseInt(portRaw, 10) : 587;
    const secure = secureRaw != null
      ? (secureRaw === true || String(secureRaw).toLowerCase() === 'true')
      : port === 465;

    return { host, port, user, pass, from: from ?? user, secure };
  }

  /** Khởi tạo transporter (lazy). Trả về false nếu chưa cấu hình. */
  async _ensureTransporter() {
    if (this._loaded) return this.transporter != null;
    this._loaded = true;

    const cfg = await this._resolveConfig();
    if (!cfg.host || !cfg.from) {
      log.warn('SMTP chưa được cấu hình (thiếu host/from) — kênh email ở chế độ no-op');
      return false;
    }

    this.from = cfg.from;
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.pass } } : {}),
    });
    log.info({ host: cfg.host, port: cfg.port, secure: cfg.secure }, 'Email channel cấu hình SMTP thành công');
    return true;
  }

  async startListening() {
    // Email không cần polling; chỉ chuẩn bị transporter để phát hiện sớm cấu hình thiếu.
    try {
      await this._ensureTransporter();
    } catch (err) {
      log.warn({ err: err.message }, 'Không thể khởi tạo transporter SMTP khi khởi động');
    }
  }

  async initiateLink(userId) {
    // Người dùng tự khai báo địa chỉ email; không có mã liên kết qua bot.
    return {
      instructions: 'Nhập địa chỉ email của bạn để nhận thông báo qua email.',
      requires_value: true,
      user_id: userId,
    };
  }

  async completeLink(_userId, value) {
    const email = String(value ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Địa chỉ email không hợp lệ');
    }
    return { identity: email };
  }

  async send(identity, eventType, payload) {
    const ready = await this._ensureTransporter();
    if (!ready) {
      log.warn({ identity, eventType }, '[NO-OP] SMTP chưa cấu hình — bỏ qua gửi email');
      return;
    }
    const subject = payload?.title ?? eventType;
    const text = payload?.message ?? (typeof payload === 'string' ? payload : JSON.stringify(payload));
    const html = payload?.html ?? `<p>${String(text).replace(/\n/g, '<br>')}</p>`;

    await this.transporter.sendMail({
      from: this.from,
      to: identity,
      subject,
      text,
      html,
    });
    log.info({ identity, eventType }, 'Đã gửi email thông báo');
  }

  async healthCheck() {
    try {
      const ready = await this._ensureTransporter();
      if (!ready) return { ok: false, message: 'SMTP chưa cấu hình' };
      await this.transporter.verify();
      return { ok: true, message: `SMTP OK (from: ${this.from})` };
    } catch (err) {
      return { ok: false, message: `SMTP lỗi: ${err.message}` };
    }
  }
}
