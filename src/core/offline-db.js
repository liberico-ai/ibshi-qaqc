const DB_NAME = 'ibshi_offline';
const DB_VERSION = 1;

export function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('request_queue')) {
        const store = db.createObjectStore('request_queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('enqueuedAt', 'enqueuedAt');
      }
      if (!db.objectStoreNames.contains('form_drafts')) {
        db.createObjectStore('form_drafts', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
