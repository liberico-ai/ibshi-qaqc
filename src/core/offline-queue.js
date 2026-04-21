import { openOfflineDB } from './offline-db.js';

const STORE = 'request_queue';
const OFFLINE_TTL = 2 * 60 * 60 * 1000; // 2 hours in ms

export const offlineQueue = {
  async enqueue({ url, method, headers, body, clientTimestamp }) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const item = {
        url,
        method: method || 'GET',
        headers: headers || {},
        body: body ?? null,
        clientTimestamp: clientTimestamp || new Date().toISOString(),
        enqueuedAt: Date.now(),
      };
      const req = tx.objectStore(STORE).add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll() {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(id) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear() {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clearExpired() {
    const db = await openOfflineDB();
    const cutoff = Date.now() - OFFLINE_TTL;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const range = IDBKeyRange.upperBound(cutoff);
      const req = store.index('enqueuedAt').openCursor(range);
      let deleted = 0;
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); deleted++; cursor.continue(); }
        else resolve(deleted);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async pendingCount() {
    const items = await this.getAll();
    const cutoff = Date.now() - OFFLINE_TTL;
    return items.filter(i => i.enqueuedAt > cutoff).length;
  },

  async hasExpired() {
    const items = await this.getAll();
    if (items.length === 0) return false;
    const oldest = Math.min(...items.map(i => i.enqueuedAt));
    return (Date.now() - oldest) > OFFLINE_TTL;
  },

  // Flush queue FIFO. Returns { synced, failed } counts.
  async flush(token) {
    const items = (await this.getAll()).sort((a, b) => a.enqueuedAt - b.enqueuedAt);
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      if ((Date.now() - item.enqueuedAt) > OFFLINE_TTL) {
        await this.remove(item.id);
        continue;
      }

      let delay = 1000;
      let success = false;

      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        try {
          const headers = { ...(item.headers || {}) };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          headers['X-Client-Timestamp'] = item.clientTimestamp;
          headers['X-Offline-Sync'] = 'true';

          const res = await fetch(item.url, {
            method: item.method,
            headers,
            body: item.body,
          });

          // 4xx = bad request, no point retrying
          if (res.ok || (res.status >= 400 && res.status < 500)) {
            await this.remove(item.id);
            synced++;
            success = true;
            break;
          }
        } catch {
          // network still down — stop flushing
          failed++;
          break;
        }
      }

      if (!success && !failed) failed++;
    }

    return { synced, failed };
  },
};
