/**
 * Base class for notification channel providers.
 * Each channel (Telegram, Mattermost, Email, Zalo, ...) extends this class.
 * Adding a new channel = new class + DB row in sys_providers + register in ChannelRegistry.
 * Zero change at EventDispatchService.
 */
export class NotificationChannelProvider {
  constructor(config = {}) {
    this.config = config;
    this.mockMode = config.mock_mode === true;
    this._linkHandler = null;
  }

  /**
   * Callback injected by ChannelRegistry — used when bot/webhook receives a link code.
   * Signature: (identity, code) => Promise<void>
   */
  setLinkHandler(handler) {
    this._linkHandler = handler;
  }

  /** Send message to an identity on this channel. */
  async send(_identity, _eventType, _payload) {
    throw new Error('NotificationChannelProvider.send() not implemented');
  }

  /** Start link flow for a user — returns code + instructions. */
  async initiateLink(_userId) {
    throw new Error('NotificationChannelProvider.initiateLink() not implemented');
  }

  /** Complete link flow with user-provided value (code or webhook URL). */
  async completeLink(_userId, _value) {
    throw new Error('NotificationChannelProvider.completeLink() not implemented');
  }

  /** Called once at server startup. No-op by default. */
  async startListening() {}

  /** Called at server shutdown. No-op by default. */
  async stopListening() {}

  /** Health check — returns { ok, message }. */
  async healthCheck() {
    return { ok: true, message: 'ok' };
  }
}
