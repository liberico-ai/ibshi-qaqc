import { openOfflineDB } from './offline-db.js';

const STORE = 'form_drafts';

export const offlineFormStore = {
  // key format: {userId}_{entityType}_{entityId}
  async saveDraft(key, data) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put({ key, data, savedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async loadDraft(key) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async clearDraft(key) {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};
