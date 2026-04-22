import { NotificationChannelProvider } from './NotificationChannelProvider.js';

/**
 * Email channel — not yet supported.
 * Stub preserves interface so ChannelRegistry can enumerate available channels
 * without crashing. Full implementation (SMTP/provider) in a later sprint.
 */
export class EmailChannelProvider extends NotificationChannelProvider {
  async initiateLink(_userId) {
    throw new Error('Email channel chưa hỗ trợ');
  }

  async completeLink(_userId, _value) {
    throw new Error('Email channel chưa hỗ trợ');
  }

  async send(_identity, _eventType, _payload) {
    throw new Error('Email channel chưa hỗ trợ');
  }

  async healthCheck() {
    return { ok: false, message: 'Email channel stub — not yet supported' };
  }
}
