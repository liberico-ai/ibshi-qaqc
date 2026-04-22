import { pool } from '../../../../core/db.js';
import { createLogger } from '../../../../core/logger.js';
import { channelRegistry } from './ChannelRegistry.js';

const log = createLogger('event-dispatch');

const RATE_LIMIT_PER_MINUTE = 10;
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [500, 2000, 5000];

/**
 * Channel-agnostic event dispatcher.
 *   - Loads per-user per-channel preferences from sys_notification_prefs
 *   - Enforces rate limit (10/user/min) and dedup (5 min window)
 *   - Retries 3× on failure then writes to sys_notification_dlq
 *
 * Adding a new channel requires ZERO changes here — just register it in ChannelRegistry.
 */
class EventDispatchService {
  #rateWindow = new Map();      // `${userId}:${channelClass}` → { count, resetAt }
  #dedupCache = new Map();      // `${userId}:${eventType}:${channelClass}` → timestamp

  async dispatch(eventType, payload, userIds) {
    if (!Array.isArray(userIds)) userIds = [userIds];
    for (const userId of userIds) {
      if (!userId) continue;
      const prefs = await this._getEnabledChannels(userId, eventType);
      for (const pref of prefs) {
        const { channel_class: channelClass } = pref;
        if (this._isDuplicate(userId, eventType, channelClass)) continue;
        if (this._isRateLimited(userId, channelClass)) {
          log.warn({ userId, channelClass }, 'rate limit exceeded — skipping');
          continue;
        }
        const identity = await this._getIdentity(userId, channelClass);
        if (!identity?.is_verified || !identity.identity) continue;
        await this._sendWithRetry(channelClass, identity.identity, eventType, payload);
        this._markSent(userId, eventType, channelClass);
      }
    }
  }

  async _getEnabledChannels(userId, eventType) {
    const { rows } = await pool.query(
      `SELECT channel_class FROM sys_notification_prefs
       WHERE user_id = $1 AND event_type = $2 AND enabled = TRUE`,
      [userId, eventType]
    );
    return rows;
  }

  async _getIdentity(userId, channelClass) {
    const { rows } = await pool.query(
      `SELECT identity, is_verified FROM sys_user_channel_identities
       WHERE user_id = $1 AND channel_class = $2`,
      [userId, channelClass]
    );
    return rows[0] ?? null;
  }

  _isDuplicate(userId, eventType, channelClass) {
    const key = `${userId}:${eventType}:${channelClass}`;
    const last = this.#dedupCache.get(key);
    if (!last) return false;
    if (Date.now() - last > DEDUP_WINDOW_MS) {
      this.#dedupCache.delete(key);
      return false;
    }
    return true;
  }

  _isRateLimited(userId, channelClass) {
    const key = `${userId}:${channelClass}`;
    const now = Date.now();
    const bucket = this.#rateWindow.get(key);
    if (!bucket || now > bucket.resetAt) {
      this.#rateWindow.set(key, { count: 1, resetAt: now + 60_000 });
      return false;
    }
    if (bucket.count >= RATE_LIMIT_PER_MINUTE) return true;
    bucket.count++;
    return false;
  }

  _markSent(userId, eventType, channelClass) {
    this.#dedupCache.set(`${userId}:${eventType}:${channelClass}`, Date.now());
  }

  async _sendWithRetry(channelClass, identity, eventType, payload) {
    const provider = channelRegistry.get(channelClass);
    if (!provider) {
      log.warn({ channelClass }, 'channel not registered — skipping');
      return;
    }
    let lastErr = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await provider.send(identity, eventType, payload);
        return;
      } catch (err) {
        lastErr = err;
        log.warn({ err: err.message, attempt: attempt + 1, channelClass }, 'send failed, retrying');
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt]));
        }
      }
    }
    await this._writeDLQ(channelClass, identity, eventType, payload, lastErr);
  }

  async _writeDLQ(channelClass, recipient, eventType, payload, err) {
    try {
      await pool.query(
        `INSERT INTO sys_notification_dlq
           (channel_class, recipient, event_type, payload, error, retry_count, last_attempt)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [channelClass, recipient, eventType, JSON.stringify(payload), err?.message ?? null, MAX_RETRIES]
      );
      log.error({ channelClass, eventType, error: err?.message }, 'wrote to notification DLQ');
    } catch (dbErr) {
      log.error({ dbErr }, 'failed to write DLQ');
    }
  }

  async dispatchDigestAll() {
    log.info('dispatchDigestAll called — stub; implement per-project aggregation later');
  }
}

export const eventDispatch = new EventDispatchService();
