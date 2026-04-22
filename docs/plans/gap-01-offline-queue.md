# Gap #1 — Offline Queue 2 giờ

**BRD:** BR08.04, NFR-AV-02 | **Priority:** P0 | **Effort:** 3 ngày | **Sprint:** 3

## Context

QC Inspector hay mất Wi-Fi công trình (router reboot, thép dày che sóng), gây mất dữ liệu form đang điền. BRD yêu cầu offline tolerance 2 giờ: mọi thao tác trong 2h offline phải sync thành công khi có mạng trở lại.

**Dependencies:** Không có.

---

## Backend Changes

### Migration: `src/modules/system/migrations/016_audit_offline.sql`
```sql
ALTER TABLE sys_audit_logs
  ADD COLUMN IF NOT EXISTS offline_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ;
```

### `src/core/audit-log.js` — sửa
- Thêm optional params `{ offline_synced, client_timestamp }` vào hàm `log()`
- Lưu cả 2 field khi được cung cấp

### Inspection submit endpoint — sửa
- Accept header `X-Client-Timestamp` → ghi vào audit log
- Accept query param `?offline_synced=true`

---

## Frontend Changes (phần chính)

### `public/service-worker.js` — tạo mới
- Intercept `fetch()` calls tới `/api/`
- Nếu network fail: serialize request (method, url, headers, body) → enqueue vào IndexedDB `offline_queue`
- Khi `online` event: flush queue FIFO, exponential backoff (1s → 2s → 4s → 8s) cho server 5xx
- Item > 2h trong queue: mark EXPIRED, không retry, xóa khi user re-auth

### `src/core/offline-queue.js` — tạo mới
IndexedDB wrapper:
```js
export const offlineQueue = {
  async enqueue(request) { /* key: timestamp, payload: {url, method, headers, body, enqueuedAt} */ },
  async flush(onSync)    { /* FIFO, gọi onSync per item */ },
  async clearExpired()   { /* xóa items > 2h */ },
  async pendingCount()   { /* trả số lượng items pending */ }
}
```

### `src/core/offline-form-store.js` — tạo mới
IndexedDB cho form drafts:
```js
export const offlineFormStore = {
  async saveDraft(key, data) { /* key: {userId}_{entityType}_{entityId} */ },
  async loadDraft(key)       {},
  async clearDraft(key)      {}
}
// Lưu cả Blob cho ảnh chụp (WebP ~200KB/ảnh), giữ EXIF metadata
```

### `src/components/OfflineBanner.vue` — tạo mới
- Banner màu cam top: "Đang offline — N thao tác chờ đồng bộ"
- Icon 🟢 (online) / 🟡 (syncing) / 🔴 (offline) realtime
- Toast "Đã đồng bộ" khi sync xong
- Warning "Hết hạn offline (2h), vui lòng đăng nhập lại" khi > 2h

### `src/composables/useOfflineSync.js` — tạo mới
```js
export function useOfflineSync() {
  const isOnline = ref(navigator.onLine)
  const pendingCount = ref(0)
  const syncNow = async () => { ... }
  // watch window online/offline events
  return { isOnline, pendingCount, syncNow }
}
```

### `src/modules/qaqc/frontend/views/InspectionFormView.vue` — sửa
- Auto-save state → `offlineFormStore` mỗi 30s (dùng `setInterval`)
- Khi load form: `loadDraft()` → pre-fill nếu có draft
- Khi submit thành công: `clearDraft()`
- Giữ EXIF metadata ảnh khi đưa vào Blob store

### `src/entry-client.js` — sửa
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
}
```

### `src/App.vue` hoặc layout chính — sửa
- Thêm `<OfflineBanner />` ở top của app

---

## Acceptance Criteria

- **AC1.1:** Form vẫn cho nhập và Submit khi offline → lưu IndexedDB
- **AC1.2:** Online trở lại trong 2h → sync đúng thứ tự, không mất record
- **AC1.3:** Offline > 2h → cảnh báo, xóa queue, buộc re-auth
- **AC1.4:** Audit log: `offline_synced=true` cho thao tác sync
- **AC1.5:** Ảnh giữ EXIF (timestamp, GPS) gốc khi upload

## Testing

```
describe('Offline Queue', () => {
  it('should save form draft to IndexedDB when offline')
  it('should flush queue FIFO when back online within 2h')
  it('should expire and clear queue after 2h offline')
  it('should mark audit log with offline_synced=true on sync')
})
```
