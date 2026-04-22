# Gap #2 — MFA (Multi-Factor Authentication)

**BRD:** NFR-SEC-01 | **Priority:** P0 | **Effort:** 2 ngày | **Sprint:** 1

## Context

Hệ thống lưu evidence pháp lý ASME/TCVN. Nếu tài khoản QC-MGR/DIR bị compromise thì toàn bộ chuỗi traceability vô giá trị. MFA bắt buộc cho roles có quyền Approve/Sign. Dùng TOTP chuẩn RFC 6238 (tương thích Google Authenticator).

**Dependencies:** Không có. Gap #3 Digital Signature phụ thuộc gap này (OTP tái sử dụng).

**Install:** `npm install otplib qrcode @simplewebauthn/server @simplewebauthn/browser bcrypt`

---

## Migration: `src/modules/system/migrations/014_mfa.sql`

### Design principles
- `sys_user_mfa_factors` — mỗi row là 1 factor (1 user có thể có nhiều factor khác nhau)
- `config JSONB` — mỗi factor type có payload riêng, không cần ALTER TABLE khi thêm type mới
- `sys_user_mfa_backup_codes` — bảng riêng, dễ query/invalidate từng code
- `sys_mfa_attempts` — audit + lockout, theo dõi theo `factor_type`

#### Factor types & config schema
| `factor_type` | `config` keys |
|---|---|
| `totp` | `{ secret: "BASE32" }` |
| `hotp` | `{ secret: "BASE32", counter: 0, delivery: "email\|telegram\|sms", destination: "..." }` |
| `passkey` | `{ credential_id: "base64url", public_key: "base64url", sign_count: 0, aaguid: "uuid", transports: [] }` |

Backup codes lưu tại `sys_user_mfa_backup_codes` (không trong JSONB).

```sql
-- Không thêm cột vào sys_users.
-- Kiểm tra MFA bằng query: EXISTS (SELECT 1 FROM sys_user_mfa_factors WHERE user_id=? AND status='active')

CREATE TABLE IF NOT EXISTS sys_user_mfa_factors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  factor_type   VARCHAR(32) NOT NULL,   -- 'totp' | 'hotp' | 'passkey'
  factor_name   VARCHAR(128) NOT NULL,  -- label do user đặt, e.g. "Điện thoại cá nhân"
  status        VARCHAR(16) NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'disabled'
  use_as_login  BOOLEAN NOT NULL DEFAULT FALSE,         -- TRUE = passkey thay password (passwordless)
  config        TEXT NOT NULL DEFAULT '{}',             -- AES-256-GCM encrypted JSON, see §Encryption
  enrolled_at   TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, factor_type, factor_name),
  -- chỉ passkey mới được use_as_login=true
  CONSTRAINT passkey_login_only CHECK (use_as_login = FALSE OR factor_type = 'passkey')
);
CREATE INDEX ON sys_user_mfa_factors(user_id, status);

-- Backup codes tách riêng để dễ invalidate từng code
CREATE TABLE IF NOT EXISTS sys_user_mfa_backup_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(128) NOT NULL,  -- bcrypt hash
  used_at     TIMESTAMPTZ,            -- NULL = chưa dùng
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON sys_user_mfa_backup_codes(user_id) WHERE used_at IS NULL;

-- Audit log + lockout tracking
CREATE TABLE IF NOT EXISTS sys_mfa_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES sys_users(id),
  factor_type   VARCHAR(32),
  success       BOOLEAN NOT NULL,
  attempted_at  TIMESTAMPTZ DEFAULT now(),
  ip            INET,
  user_agent    TEXT
);
CREATE INDEX ON sys_mfa_attempts(user_id, attempted_at);

-- MFA enforcement policy — lưu vào sys_settings (bảng đã có)
INSERT INTO sys_settings (key, value, description) VALUES (
  'mfa_enforcement',
  '{"enabled": true, "roles": ["QC-DIR","QC-MGR","SYS-ADM","MDR-CMP"], "grace_days": 7}',
  'Chính sách bắt buộc MFA. enabled=false tắt hoàn toàn, roles=danh sách role bị ràng buộc, grace_days=số ngày ân hạn sau khi tạo tài khoản'
) ON CONFLICT (key) DO NOTHING;

-- HOTP delivery providers — lưu vào sys_providers (bảng đã có)
-- config là JSON chứa credentials, SYS-ADM cấu hình qua Admin UI
-- is_active=false = provider chưa cấu hình / tắt tạm
INSERT INTO sys_providers (name, class_name, module, is_active, config, description) VALUES
  ('hotp-email',
   'EmailOTPProvider',
   'mfa',
   FALSE,
   '{"host":"","port":587,"secure":false,"user":"","password":"","from":""}',
   'Gửi HOTP qua email (SMTP)'),
  ('hotp-telegram',
   'TelegramOTPProvider',
   'mfa',
   FALSE,
   '{"bot_token":"","message_template":"Mã OTP của bạn: {{otp}}. Hiệu lực 5 phút."}',
   'Gửi HOTP qua Telegram bot'),
  ('hotp-sms',
   'SmsOTPProvider',
   'mfa',
   FALSE,
   '{"gateway_url":"","api_key":"","sender_id":"","message_template":"Ma OTP: {{otp}}"}',
   'Gửi HOTP qua SMS gateway')
ON CONFLICT (name) DO NOTHING;
```

---

## HOTP Channel — 2 tầng cấu hình

| Tầng | Bảng | Ai cấu hình | Nội dung |
|---|---|---|---|
| **Provider** (system) | `sys_providers` | SYS-ADM qua Admin UI | SMTP creds, Telegram bot token, SMS gateway URL |
| **Factor** (user) | `sys_user_mfa_factors.config` | User khi enroll | Chọn provider nào + destination (email address, Telegram chat_id, số điện thoại) |

**Flow enroll HOTP:**
```
User chọn delivery channel → FE hiển thị danh sách provider is_active=TRUE
  → POST /api/system/mfa/factors/hotp/init { factorName, providerName, destination }
  → BE: load provider từ sys_providers WHERE name=? AND module='mfa' AND is_active=TRUE
  → decryptConfig(provider.config) → khởi tạo provider class → gửi OTP thử
  → lưu sys_user_mfa_factors { config: encrypt({ secret, counter:0, providerName, destination }) }
```

**HOTPService dispatch:**
```js
async sendHOTP(factorId, userId) {
  const factor = await loadFactor(factorId, userId)
  const { providerName, destination } = decryptConfig(factor.config)
  const provider = await loadProvider(providerName)  // sys_providers
  const otp = generateHOTP(secret, counter)
  await provider.send(destination, otp)
  await incrementCounter(factorId)
}
```

**Admin API — quản lý providers:**
```
GET    /api/system/providers?module=mfa          — list MFA delivery providers
PUT    /api/system/providers/:id                  — cập nhật config (SMTP, bot token...)
PATCH  /api/system/providers/:id/toggle           — bật/tắt provider
```
Reuse provider controller nếu đã có, thêm filter `module=mfa`.

---

## Encryption — `config` column

**Approach:** Application-level AES-256-GCM. Key không bao giờ xuống DB.

**Tại sao không dùng `pgcrypto`?** Key phải truyền trong câu query → lộ vào pg logs/query history.

**Format lưu trong cột `config` (TEXT):**
```
<iv_hex>:<authTag_hex>:<ciphertext_hex>
```

**Env var:** `MFA_ENCRYPTION_KEY` — 32-byte key, base64-encoded.
```
# .env
MFA_ENCRYPTION_KEY=<base64 của 32 random bytes>
# Tạo: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Helper — `src/modules/system/backend/services/MFACrypto.js`:**
```js
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'base64')

export function encryptConfig(obj) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, KEY, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ct.toString('hex')}`
}

export function decryptConfig(text) {
  const [ivHex, tagHex, ctHex] = text.split(':')
  const decipher = createDecipheriv(ALG, KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()])
  return JSON.parse(pt.toString('utf8'))
}
```

**MFAService** gọi `encryptConfig()` trước khi INSERT/UPDATE, `decryptConfig()` sau khi SELECT.
Query vẫn filter theo `user_id` + `factor_type` — không cần query bên trong `config`.

**Key rotation:** thêm `key_version SMALLINT DEFAULT 1` vào `sys_user_mfa_factors` nếu cần rotate.

---

## Backend

### `src/modules/system/backend/services/MFAService.js` — tạo mới

```js
class MFAService {
  // --- Query helpers ---
  async hasActiveFactor(userId)                    // EXISTS query trên sys_user_mfa_factors
  async listFactors(userId)                        // trả danh sách factors (che config.secret)

  // --- TOTP ---
  async initTOTP(userId, factorName)               // tạo factor pending: { secret, qrCodeDataUrl }
  async enrollTOTP(factorId, userId, token)        // verify token → status='active', enrolled_at=now()

  // --- HOTP (email / telegram / SMS) ---
  async initHOTP(userId, factorName, delivery, destination)
                                                   // tạo factor pending, gửi OTP đầu tiên
  async sendHOTP(factorId, userId)                 // tăng counter, gửi OTP qua delivery channel
  async enrollHOTP(factorId, userId, token)        // verify → status='active'

  // --- Passkey (WebAuthn FIDO2) ---
  async initPasskey(userId, factorName, useAsLogin) // trả PublicKeyCredentialCreationOptions
                                                    // userVerification: 'required' (UV bắt buộc)
  async enrollPasskey(factorId, userId, attestation)
                                                   // verify attestation → lưu credential, status='active'
  async initPasskeyAssertion(username)             // passwordless: trả PublicKeyCredentialRequestOptions
                                                   // không cần biết userId trước (discoverable credential)
  async verifyPasskeyAssertion(assertion)          // xác minh, trả userId → cấp full JWT trực tiếp

  // --- Verify (dùng làm 2nd factor khi login hoặc sign) ---
  async verifyFactor(factorId, userId, credential) // dispatch theo factor_type, ghi attempt
  async verifyBackupCode(userId, rawCode)          // bcrypt compare, mark used_at

  // --- Management ---
  async disableFactor(factorId, userId)            // status='disabled'
  async resetAllFactors(adminId, targetUserId, reason)  // SYS-ADM only + audit log
  async generateBackupCodes(userId)                // 10 codes, hash lưu DB, trả plaintext 1 lần
  async checkLockout(userId)                       // 3 fails/10 phút → lock 15 phút
}
```

### `src/modules/system/backend/controllers/MFAController.js` — tạo mới

**Factor management (authenticated user):**
```
GET  /api/system/mfa/factors                      — list factors của current user
POST /api/system/mfa/factors/totp/init            — { factorName } → { factorId, secret, qrCodeDataUrl }
POST /api/system/mfa/factors/totp/:id/enroll      — { token } → activate
POST /api/system/mfa/factors/hotp/init            — { factorName, delivery, destination }
POST /api/system/mfa/factors/hotp/:id/send        — gửi lại OTP
POST /api/system/mfa/factors/hotp/:id/enroll      — { token } → activate
POST /api/system/mfa/factors/passkey/init         — { factorName, useAsLogin } → PublicKeyCredentialCreationOptions
POST /api/system/mfa/factors/passkey/:id/enroll   — { attestation } → activate
DELETE /api/system/mfa/factors/:id                — disable factor
GET  /api/system/mfa/backup-codes                 — generate mới 10 codes (plaintext 1 lần)
```

**Login flow — passwordless passkey (không cần password):**
```
GET  /api/auth/passkey/challenge  — { username? } → PublicKeyCredentialRequestOptions + challengeToken
POST /api/auth/passkey/verify     — { challengeToken, assertion } → full JWT trực tiếp
```

**Login flow — password + 2nd factor (TOTP/HOTP/passkey-as-2FA):**
```
POST /api/auth/mfa/challenge   — { partial_token, factorId } → gửi OTP (nếu HOTP) hoặc no-op
POST /api/auth/mfa/verify      — { partial_token, factorId, credential } → full JWT
POST /api/auth/mfa/backup      — { partial_token, backup_code } → full JWT
```

**Admin:**
```
POST /api/system/mfa/admin/reset  — SYS-ADM: { user_id, reason } → disable all factors + audit log
```

### `src/modules/system/backend/controllers/AuthController.js` — sửa

Thay đổi flow login — 2 path song song:

**Path A — Passwordless passkey:**
```
GET /api/auth/passkey/challenge → POST /api/auth/passkey/verify → full JWT
  (không qua /api/auth/login)
```

**Path B — Password-first (giữ nguyên + thêm MFA step):**
```
POST /api/auth/login:
  1. verify email + password
  2. query: SELECT id, factor_type, factor_name, use_as_login
            FROM sys_user_mfa_factors
            WHERE user_id=? AND status='active' AND use_as_login=FALSE
  3. if factors.length > 0:
       return {
         mfa_required: true,
         partial_token: sign({ userId, step:'mfa' }, 5min),
         available_factors: [{ id, factor_type, factor_name }]
       }
     else:
       return full JWT
```

**Note:** Passkey `use_as_login=TRUE` không xuất hiện trong `available_factors` của Path B — chúng chỉ dùng qua Path A.

**LoginView hiển thị 2 options:**
```
[ Đăng nhập bằng Passkey ]   ← Path A, gọi WebAuthn API trực tiếp
────── hoặc ──────
Email + Password             ← Path B
```

### MFA Policy — thêm vào auth middleware hiện tại

```js
// Pseudo-code middleware
async function enforceMFAPolicy(req, res, next) {
  const policy = await getSettingJSON('mfa_enforcement')
  // { enabled, roles, grace_days }

  if (!policy.enabled) return next()                          // tắt toàn bộ enforcement

  const { role, userId, createdAt } = req.user
  if (!policy.roles.includes(role)) return next()            // role không bị ràng buộc

  const accountAgeDays = daysSince(createdAt)
  if (accountAgeDays <= policy.grace_days) return next()     // trong thời gian ân hạn

  const hasActive = await mfaService.hasActiveFactor(userId)
  if (!hasActive) return res.status(403).json({ code: 'MFA_ENROLLMENT_REQUIRED' })

  next()
}
```

**Admin API — cập nhật policy (SYS-ADM only):**
```
GET  /api/system/settings/mfa-enforcement          — đọc policy hiện tại
PUT  /api/system/settings/mfa-enforcement          — { enabled, roles, grace_days }
```

Reuse controller Settings hiện tại, chỉ thêm route với auth scope `SYS-ADM`.

---

## Frontend

### `src/modules/system/frontend/views/MFASetupView.vue` — tạo mới

1. Fetch QR code từ `/api/system/mfa/setup`
2. Hiển thị QR + hướng dẫn cài Google Authenticator
3. Input 6-digit OTP → POST `/api/system/mfa/enroll`
4. Nếu OK: hiển thị 10 backup codes với nút Download/Print
5. Done → redirect về dashboard

### `src/components/OTPInput.vue` — tạo mới (reusable)

- 6 ô input riêng biệt, auto-focus next
- Tự động submit khi đủ 6 digit
- Reuse ở MFA login step và Digital Signature ceremony (Gap #3)

### `src/modules/system/frontend/views/LoginView.vue` — sửa

- Nút "Đăng nhập bằng Passkey": gọi `navigator.credentials.get()` → POST `/api/auth/passkey/verify` → full JWT
- Khi nhận `mfa_required: true`: hiển thị step 2, chọn factor từ `available_factors`
  - `totp`/`hotp` → `<OTPInput />`
  - `passkey` (as 2nd factor) → trigger `navigator.credentials.get()` với `allowCredentials`
- Link "Dùng backup code" → input text thường

### `src/modules/system/frontend/views/ProfileView.vue` — sửa

- Thêm tab/section "Bảo mật" với trạng thái MFA và nút Enable/Disable

---

## Acceptance Criteria

- **AC2.1:** Roles P0 phải enroll MFA trong 7 ngày kể từ deploy, sau đó bị chặn login
- **AC2.2:** QR code → scan → nhập OTP test → kích hoạt thành công
- **AC2.6:** SYS-ADM set `enabled=false` → tất cả roles đăng nhập không cần MFA, không bị 403
- **AC2.7:** SYS-ADM remove role khỏi `roles` → role đó không bị enforce dù chưa enroll MFA
- **AC2.8:** User trong `grace_days` → được login dù chưa enroll
- **AC2.9:** Enroll passkey với `useAsLogin=true` → đăng nhập trực tiếp bằng passkey không cần password
- **AC2.7:** Passkey login dùng `userVerification: required` — thiếu biometric/PIN → browser từ chối
- **AC2.8:** Passkey `use_as_login=false` vẫn hoạt động như 2nd factor sau khi nhập password
- **AC2.3:** Login bước 2 yêu cầu OTP, sai 3 lần/10 phút → lock 15 phút
- **AC2.4:** 10 backup codes, mỗi code 1 lần. Hết → prompt tạo bộ mới
- **AC2.5:** SYS-ADM reset MFA → yêu cầu reason → ghi audit log

## Testing

```
describe('MFAService — TOTP', () => {
  it('should generate valid TOTP secret and QR code')
  it('should verify TOTP within ±30s window')
  it('should reject token outside window')
})

describe('MFAService — HOTP delivery', () => {
  it('should increment counter on each send')
  it('should verify correct HOTP token')
  it('should reject already-used counter value')
})

describe('MFAService — Passkey', () => {
  it('should generate CreationOptions with userVerification=required')
  it('should verify attestation and store credential')
  it('should set use_as_login=true when enrolling as passwordless')
  it('should verify passwordless assertion and return userId without password check')
  it('should reject assertion with sign_count <= stored (replay attack)')
  it('should NOT include use_as_login passkeys in MFA available_factors list')
})

describe('MFAService — Backup codes', () => {
  it('should generate 10 unique codes, store hashed')
  it('should invalidate backup code after single use')
  it('should reject already-used backup code')
})

describe('MFA Policy middleware', () => {
  it('should allow login when enabled=false regardless of role')
  it('should allow login when role not in policy.roles')
  it('should allow login within grace_days even without active factor')
  it('should block login when role enforced + grace expired + no active factor')
})

describe('MFAService — Lockout & admin', () => {
  it('should lock account after 3 failed attempts in 10 minutes')
  it('should reject non-SYS-ADM from resetting MFA')
  it('should disable all active factors on admin reset + write audit log')
})
```
