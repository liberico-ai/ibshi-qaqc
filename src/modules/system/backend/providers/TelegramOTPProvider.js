export class TelegramOTPProvider {
  constructor({ bot_token, message_template }) {
    this.botToken = bot_token;
    this.template = message_template || 'Mã OTP của bạn: {{otp}}. Hiệu lực 5 phút.';
  }

  async send(chatId, otp) {
    if (!this.botToken) throw new Error('TelegramOTPProvider: bot_token chưa được cấu hình');
    if (!chatId) throw new Error('TelegramOTPProvider: chatId (destination) không được trống');

    const text = this.template.replace('{{otp}}', otp);
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Telegram API error: ${body.description ?? res.statusText}`);
    }
  }

  async healthCheck() {
    if (!this.botToken) return { message: 'bot_token chưa cấu hình' };
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
    const body = await res.json();
    if (!body.ok) throw new Error(body.description);
    return { message: `Bot: @${body.result.username}` };
  }
}
