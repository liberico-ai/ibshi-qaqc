# Gap #10 — i18n VN/EN Multilingual Support

**BRD:** NFR-USE-01 | **Priority:** P2 | **Effort:** 1 ngày | **Sprint:** 4

## Context

UI hiện tại lẫn lộn tiếng Anh và tiếng Việt. QC Inspector người Việt muốn UI hoàn toàn tiếng Việt; Customer Auditor (LR/BV/DNV) cần English để review. NFR-USE-01: "System SHALL support VN and EN languages, switchable by user."

**Dependencies:** Không có. Có thể triển khai song song với bất kỳ gap nào.

**Install:** `npm install vue-i18n@9`

---

## Migration: `src/modules/system/migrations/018_user_preferences.sql`

```sql
ALTER TABLE sys_users
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
-- Lưu: { "language": "vi", "timezone": "Asia/Ho_Chi_Minh", ... }
```

---

## Backend

### Error codes thay vì message strings

Thay đổi tất cả backend responses từ message string sang error code:

```js
// Trước:
res.status(409).json({ error: 'Hold Point chưa được release' })

// Sau:
res.status(409).json({ code: 'HOLD_POINT_NOT_RELEASED', data: { blockingItems } })
```

Frontend map code → translated message qua i18n.

### API preferences — `src/modules/system/backend/controllers/UserController.js` — sửa

- `GET  /api/system/users/me/preferences` — trả preferences JSON
- `PUT  /api/system/users/me/preferences` — update preferences (bao gồm language)

---

## Frontend

### `src/plugins/i18n.js` — tạo mới

```js
import { createI18n } from 'vue-i18n'
import vi from '../locales/vi.json'
import en from '../locales/en.json'

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),    // từ user preference hoặc navigator.language
  fallbackLocale: 'vi',
  messages: { vi, en }
})

function detectLocale() {
  const saved = localStorage.getItem('locale')
  if (saved) return saved
  return navigator.language.startsWith('en') ? 'en' : 'vi'
}
```

### `src/locales/vi.json` — tạo mới (~500-800 keys)

Chia theo module:
```json
{
  "common": {
    "save": "Lưu", "cancel": "Huỷ", "delete": "Xóa",
    "confirm": "Xác nhận", "loading": "Đang tải..."
  },
  "itp": {
    "title": "Kế hoạch kiểm tra",
    "status": {
      "DRAFT": "Nháp", "ACTIVE": "Đang hiệu lực",
      "DIRECTOR_APPROVED": "Giám đốc đã duyệt"
    },
    "hold_type": { "H": "Hold", "W": "Witness", "HC": "Hold - Khách hàng" }
  },
  "inspection": { ... },
  "mir": { ... },
  "standards": { ... },
  "system": { ... },
  "errors": {
    "HOLD_POINT_NOT_RELEASED": "Điểm Hold {ip_code} chưa được release",
    "DOCUMENT_SIGNED": "Tài liệu đã ký số, không thể sửa",
    "MFA_ENROLLMENT_REQUIRED": "Bạn cần kích hoạt MFA trong vòng 7 ngày"
  }
}
```

### `src/locales/en.json` — tạo mới

Bản dịch tương ứng với vi.json. Technical terms (ASME, NDT, PWHT, ITP, MIR, NCR) giữ nguyên tiếng Anh.

### `src/components/LanguageSwitcher.vue` — tạo mới

```html
<button @click="toggleLocale">
  🌐 {{ locale === 'vi' ? 'EN' : 'VI' }}
</button>
```

- Đặt ở top-right của app layout
- Thay đổi tức thì, không reload
- Lưu vào localStorage + POST `/api/system/users/me/preferences`

### Các Vue views — sửa (tất cả 12 views + components)

Replace hardcoded strings với `t('key')`:

```html
<!-- Trước -->
<button>Lưu</button>
<h1>Kế hoạch kiểm tra</h1>

<!-- Sau -->
<button>{{ t('common.save') }}</button>
<h1>{{ t('itp.title') }}</h1>
```

**Date/Number formatting dùng Intl API:**
```js
// VN: dd/MM/yyyy | EN: MM/DD/YYYY
const formatDate = (date) => new Intl.DateTimeFormat(locale.value === 'vi' ? 'vi-VN' : 'en-US').format(date)

// VN: 1.234,56 | EN: 1,234.56
const formatNumber = (num) => new Intl.NumberFormat(locale.value === 'vi' ? 'vi-VN' : 'en-US').format(num)
```

### `src/main.js` — sửa

```js
app.use(i18n)
```

---

## Acceptance Criteria

- **AC10.1:** Tất cả UI strings có trong locale files, không còn hardcoded
- **AC10.2:** Switch VN ↔ EN tức thì, không reload page
- **AC10.3:** Language preference lưu persistent — lần login sau vẫn giữ
- **AC10.4:** Date/number format đúng theo locale (vi-VN vs en-US)
- **AC10.5:** Backend error codes: frontend map đúng sang translated message

## Testing

```
describe('i18n', () => {
  it('should switch locale without page reload')
  it('should persist locale preference in localStorage')
  it('should format dates as dd/MM/yyyy in vi locale')
  it('should format dates as MM/DD/YYYY in en locale')
  it('should map backend error code to translated message')
  it('should fallback to vi when key missing in en locale')
})
```
