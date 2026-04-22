import { createLogger } from '../../../../core/logger.js';

const log = createLogger('channel-registry');

class ChannelRegistry {
  #channels = new Map();

  async register(channelClass, ProviderClass, config = {}, linkHandler = null) {
    if (this.#channels.has(channelClass)) {
      log.warn({ channelClass }, 'Channel already registered; skipping');
      return;
    }
    const instance = new ProviderClass(config);
    if (linkHandler && typeof instance.setLinkHandler === 'function') {
      instance.setLinkHandler(linkHandler);
    }
    try {
      await instance.startListening();
    } catch (err) {
      log.warn({ err, channelClass }, 'startListening failed — channel registered but may be degraded');
    }
    this.#channels.set(channelClass, instance);
    log.info({ channelClass }, 'Channel registered');
  }

  get(channelClass) {
    return this.#channels.get(channelClass) ?? null;
  }

  list() {
    return Array.from(this.#channels.keys());
  }

  async shutdown() {
    for (const p of this.#channels.values()) {
      try { await p.stopListening(); } catch { /* ignore */ }
    }
    this.#channels.clear();
  }
}

export const channelRegistry = new ChannelRegistry();
