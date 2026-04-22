# Gap #8 — Real-time Notification (Channel-Swappable Provider Pattern)

**BRD:** INT-05, INT-06 | **Priority:** P2 | **Effort:** 2 ngày

## Context

QC Manager với 15 inspector và 3 dự án song song không thể poll. Team đang dùng Telegram nhưng có thể chuyển sang Mattermost hoặc email tùy dự án. Thiết kế theo **Provider Pattern** đã có sẵn trong codebase (`ProviderService`, `sys_providers`) — thêm kênh mới = thêm 1 class + 1 DB row, **zero code change** tại dispatch layer.

**Dependencies:** Không có. Migration `017_notification_channels.sql` đã tạo.

**Install:** `npm install node-telegram-bot-api`

> Email channel chưa hỗ trợ trong scope này. `EmailChannelProvider` stub sẵn interface nhưng `send()` throw `not implemented`.

---

## Architecture Overview

```
Event (hook)
  │
  ▼
EventDispatchService.dispatch(eventType, payload, userIds)
  │  • load prefs per user (sys_notification_prefs)
  │  • rate limit: 10/user/min
  │  • dedup: same eventType within 5 min
  │  • get identity (sys_user_channel_identities)
  │
  ▼
ChannelRegistry.get(channel_class)   ← singleton Map, populated at startup
  │
  ▼
NotificationChannelProvider (base class)
  ├── TelegramChannelProvider        ← channel_class = 'notification-telegram'
  ├── MattermostChannelProvider      ← channel_class = 'notification-mattermost'
  └── EmailChannelProvider           ← channel_class = 'notification-email'
```

**Thêm kênh mới:** tạo class mới extends `NotificationChannelProvider` + `INSERT INTO sys_providers` + đăng ký trong `ChannelRegistry`. Không chạm `EventDispatchService`.

---

## DB Schema (đã tạo trong `017_notification_channels.sql`)

- `sys_user_channel_identities(user_id, channel_class, identity, is_verified, link_code, link_code_expires_at)`
- `sys_notification_prefs(user_id, event_type, channel_class, enabled)`
- `sys_webhook_subscriptions(name, url, secret, event_types, status, created_by)`
- `sys_notification_dlq(channel_class, recipient, event_type, payload, error, retry_count, last_attempt)`

---

## Files To Create

### 1. `src/modules/system/backend/providers/NotificationChannelProvider.js`

Base class — interface contract cho mọi channel:

```js
export class NotificationChannelProvider {
  // Gửi nội dung tới identity (chat_id / email / webhook URL)
  async send(identity, eventType, payload) { throw new Error('not implemented') }

  // Trả link_code để user gửi cho bot/service
  async initiateLink(userId) { throw new Error('not implemented') }

  // Xác nhận code do user gửi, trả identity đã verify
  async completeLink(userId, code) { throw new Error('not implemented') }

  // Gọi khi server khởi động (polling, webhook registration, v.v.)
  async startListening() {}

  // Gọi khi server shutdown
  async stopListening() {}

  // Health check — trả { ok: bool, message: string }
  async healthCheck() { return { ok: true, message: 'ok' } }
}
```

### 2. `src/modules/system/backend/providers/TelegramChannelProvider.js`

- Extends `NotificationChannelProvider`
- Constructor nhận `{ bot_token, mock_mode }` từ `sys_providers.config`
- `mock_mode = true` → log console thay vì gọi Telegram API (giữ compat staging)
- `startListening()` khởi động polling một lần duy nhất (ChannelRegistry cache instance)
- `initiateLink(userId)`:
  - gen 6-digit code, set `link_code + link_code_expires_at` vào `sys_user_channel_identities`
  - trả `{ code, instructions: 'Gửi /link CODE cho @IBSHIQAQCBot' }`
- `completeLink(userId, code)`: validate code → set `identity = chat_id`, `is_verified = true`, clear code
- Bot `/link CODE` handler: gọi `this._linkHandler(chat_id, code)` — callback inject từ `ChannelRegistry.register()`
- `send(chatId, eventType, payload)`: format Markdown message → `bot.sendMessage`

### 3. `src/modules/system/backend/providers/MattermostChannelProvider.js`

- Stateless — `identity` = webhook URL của user trên Mattermost
- `initiateLink()`: không cần bot/code — user tự paste webhook URL vào Settings UI
- `completeLink(userId, webhookUrl)`: validate URL format → set `identity = webhookUrl`, `is_verified = true`
- `send(webhookUrl, eventType, payload)`: POST JSON `{ text, attachments }` tới webhook URL
- Chuyển từ Telegram sang Mattermost = đổi `channel_class` trong `sys_notification_prefs`, zero code

### 4. `src/modules/system/backend/providers/EmailChannelProvider.js`

- Stub — chỉ implement interface, `send()` throw `new Error('Email channel not yet supported')`
- Giữ file để ChannelRegistry không lỗi khi config có `notification-email`; bật thật ở sprint sau

### 5. `src/modules/system/backend/services/ChannelRegistry.js`

Singleton Map — caches instances, gọi `startListening()` đúng một lần:

```js
class ChannelRegistry {
  #channels = new Map()  // channel_class → provider instance

  async register(channelClass, ProviderClass, config, linkHandler) {
    const instance = new ProviderClass(config)
    if (linkHandler) instance.setLinkHandler(linkHandler)
    await instance.startListening()
    this.#channels.set(channelClass, instance)
  }

  get(channelClass) { return this.#channels.get(channelClass) }

  async shutdown() {
    for (const p of this.#channels.values()) await p.stopListening()
  }
}

export const channelRegistry = new ChannelRegistry()
```

### 6. `src/modules/system/backend/services/EventDispatchService.js`

Channel-agnostic dispatcher:

```js
export class EventDispatchService {
  // Main entry point
  async dispatch(eventType, payload, userIds) {
    for (const userId of userIds) {
      const prefs = await this._getEnabledChannels(userId, eventType)
      for (const pref of prefs) {
        if (await this._isDuplicate(userId, eventType, pref.channel_class)) continue
        if (await this._isRateLimited(userId, pref.channel_class)) continue
        const identity = await this._getIdentity(userId, pref.channel_class)
        if (!identity?.is_verified) continue
        await this._sendWithRetry(pref.channel_class, identity.identity, eventType, payload)
      }
    }
  }

  // Ghi sys_notification_dlq sau 3 lần thất bại
  async _sendWithRetry(channelClass, identity, eventType, payload, maxRetries = 3)
  async _isDuplicate(userId, eventType, channelClass)   // check sys_notification_dlq + in-memory LRU (5 min window)
  async _isRateLimited(userId, channelClass)            // 10/user/min counter (in-memory Map, reset mỗi phút)
}

export const eventDispatch = new EventDispatchService()
```

### 7. `src/modules/system/backend/controllers/NotificationPrefsController.js`

- `GET  /api/system/notifications/prefs` — load `sys_notification_prefs` + `sys_user_channel_identities` của user
- `PUT  /api/system/notifications/prefs` — upsert prefs `{ event_type, channel_class, enabled }`
- `POST /api/system/notifications/channels/:channelClass/link/initiate` — gọi `provider.initiateLink(userId)`
- `POST /api/system/notifications/channels/:channelClass/link/complete` — gọi `provider.completeLink(userId, code)`
- `GET  /api/system/webhooks` — list `sys_webhook_subscriptions` (admin scope)
- `POST /api/system/webhooks` — tạo subscription
- `DELETE /api/system/webhooks/:id` — xóa subscription

### 8. `src/modules/system/frontend/views/NotificationSettingsView.vue`

```
┌────────────────────────────────────────────────┐
│ Cài đặt thông báo                              │
│                                                │
│ Kênh đã kết nối:                              │
│  Telegram: Chưa kết nối  [Kết nối]            │
│    → sinh code 6 digit, hướng dẫn /link CODE  │
│  Mattermost: [Paste webhook URL]  [Lưu]       │
│  Email: user@ibshi.com.vn  ✓ (auto)           │
│                                                │
│ Sự kiện              Telegram  Mattermost Email│
│ ────────────────────────────────────────────── │
│ ITP chờ duyệt           ☑         ☐       ☑  │
│ NCR nghiêm trọng        ☑         ☑       ☑  │
│ Task quá hạn            ☑         ☐       ☐  │
│ Digest sáng             ☐         ☐       ☑  │
└────────────────────────────────────────────────┘
```

---

## Files To Modify

### `src/modules/system/backend/index.js`

Sau khi load `sys_providers`, đăng ký channels vào `ChannelRegistry`:

```js
import { channelRegistry } from './services/ChannelRegistry.js'
import { TelegramChannelProvider } from './providers/TelegramChannelProvider.js'
import { MattermostChannelProvider } from './providers/MattermostChannelProvider.js'
import { EmailChannelProvider } from './providers/EmailChannelProvider.js'

// Trong module init:
const telegramConfig = await providerService.getConfigByClass('notification-telegram')
if (telegramConfig) {
  await channelRegistry.register('notification-telegram', TelegramChannelProvider, telegramConfig,
    async (chatId, code) => notificationPrefsRepo.completeLinkByCode(code, chatId))
}
// Tương tự Mattermost, Email
```

### `src/modules/qaqc/backend/index.js`

Đăng ký hook `qaqc.inspection.event` → gọi `eventDispatch.dispatch()`:

```js
hooks.addAction('qaqc.inspection.event', async ({ eventType, payload, userIds }) => {
  await eventDispatch.dispatch(eventType, payload, userIds)
}, { priority: 10 })
```

### `src/modules/qaqc/backend/services/InspectionService.js` / `ITPWorkflowService.js` / `MIRWorkflowService.js`

Sau mỗi state transition:
```js
await hooks.doAction('qaqc.inspection.event', {
  eventType: 'NCR_HIGH_SEVERITY',
  payload: { ncrId, title, severity, projectId },
  userIds: [assignedQCManagerId]
})
```

**Event types:** `ITP_SUBMITTED`, `ITP_APPROVED`, `ITP_REJECTED`, `NCR_CREATED`, `NCR_HIGH_SEVERITY`, `INSPECTION_OVERDUE`, `MIR_NEEDS_DECISION`, `HOLD_POINT_RELEASED`, `HOLD_POINT_OVERRIDE`

### `src/modules/qaqc/backend/cronjobs.js`

```js
// Digest 8:00 sáng
cron.schedule('0 8 * * *', () => eventDispatch.dispatchDigestAll())

// Inspection overdue mỗi 30 phút
cron.schedule('*/30 * * * *', () => InspectionService.checkAndNotifyOverdue())

// MIR stuck mỗi giờ
cron.schedule('0 * * * *', () => MIRWorkflowService.checkAndNotifyStuck())
```

---

## sys_providers Seed Data

```sql
INSERT INTO sys_providers (name, class_name, module, config, is_active) VALUES
  ('Telegram Channel', 'notification-telegram', 'system',
   '{"bot_token": "", "mock_mode": true}', true),
  ('Mattermost Channel', 'notification-mattermost', 'system',
   '{}', true),
  ('Email Channel', 'notification-email', 'system',
   '{"stub": true}', false)   -- is_active=false, chưa hỗ trợ
ON CONFLICT (class_name) DO NOTHING;
```

---

## Cách thêm kênh mới (ví dụ: Zalo)

1. Tạo `ZaloChannelProvider.js` extends `NotificationChannelProvider`
2. `INSERT INTO sys_providers (class_name='notification-zalo', ...)`
3. Đăng ký trong `system/backend/index.js`: `channelRegistry.register('notification-zalo', ZaloChannelProvider, config)`
4. User chọn Zalo trong NotificationSettingsView — tự động hiển thị nhờ `sys_user_channel_identities`
5. **Zero change** tại `EventDispatchService`

---

## Acceptance Criteria

- **AC8.1:** Telegram Bot respond `/link CODE` → linked, `is_verified = true`
- **AC8.2:** Event `NCR_HIGH_SEVERITY`: subscribed users nhận thông báo trong < 5 giây
- **AC8.3:** Chuyển user từ Telegram sang Mattermost = đổi `sys_notification_prefs.channel_class`, không deploy code
- **AC8.4:** Webhook outbound signed với `X-IBSHI-Signature: HMAC-SHA256`
- **AC8.5:** Fail 3 lần → ghi `sys_notification_dlq` với payload đầy đủ
- **AC8.6:** Rate limit: không gửi > 10 thông báo/user/phút
- **AC8.7:** `mock_mode = true` trên staging → log console, không gọi API thật

## Testing

```
describe('EventDispatchService', () => {
  it('should route to correct channel based on user prefs')
  it('should skip unverified channel identities')
  it('should not send more than 10 notifications per user per minute')
  it('should deduplicate same eventType within 5 minutes')
  it('should write to DLQ after 3 failed send attempts')
})

describe('ChannelRegistry', () => {
  it('should call startListening only once per channel class')
  it('should return same instance on multiple get() calls')
})

describe('TelegramChannelProvider', () => {
  it('should complete link when correct code sent to bot')
  it('should expire link code after TTL')
  it('should log to console instead of calling API in mock_mode')
})
```
