# Gap #3 — Digital Signature (PIN + OTP)

**BRD:** BR07.04, BR05.08 | **Priority:** P0 | **Effort:** 3 ngày | **Sprint:** 2

## Context

MIR close-out và NCR close-out cần "evidentiary signature" — chữ ký số có giá trị pháp lý theo Nghị định 130/2018/NĐ-CP. Cơ chế PIN + OTP đạt mức Advanced Electronic Signature (AdES): ràng buộc duy nhất với người ký, có timestamp, không thể giả mạo.

**Dependencies:** Gap #2 MFA phải hoàn thành (`OTPInput.vue` và `MFAService.verifyTOTP` tái sử dụng).

---

## Migration: `src/modules/system/migrations/015_digital_signature.sql`

```sql
ALTER TABLE sys_users
  ADD COLUMN IF NOT EXISTS sign_pin_hash VARCHAR(256),
  ADD COLUMN IF NOT EXISTS sign_salt VARCHAR(64);

CREATE TABLE IF NOT EXISTS sys_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES sys_users(id),
  entity_type VARCHAR(50) NOT NULL,   -- 'MIR', 'NCR', 'ITP', 'HOLD_RELEASE'
  entity_id UUID NOT NULL,
  doc_hash VARCHAR(64) NOT NULL,      -- SHA-256 of canonical JSON
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip INET,
  user_agent TEXT,
  pin_verified BOOLEAN DEFAULT FALSE,
  otp_verified BOOLEAN DEFAULT FALSE,
  method VARCHAR(20) DEFAULT 'PIN+OTP'
);

-- APPEND-ONLY: block UPDATE/DELETE
CREATE RULE no_update_signatures AS ON UPDATE TO sys_signatures DO INSTEAD NOTHING;
CREATE RULE no_delete_signatures AS ON DELETE TO sys_signatures DO INSTEAD NOTHING;

CREATE INDEX ON sys_signatures(entity_type, entity_id);
CREATE INDEX ON sys_signatures(user_id);

-- Bảng void (vì sys_signatures không cho UPDATE)
CREATE TABLE IF NOT EXISTS sys_signature_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id UUID NOT NULL REFERENCES sys_signatures(id),
  voided_by UUID NOT NULL REFERENCES sys_users(id),
  voided_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT NOT NULL
);
```

---

## Backend

### `src/modules/system/backend/services/SignatureService.js` — tạo mới

```js
class SignatureService {
  async enrollPIN(userId, pin)
    // hash(PIN + salt) argon2id → lưu sign_pin_hash, sign_salt

  async verifySignature(userId, { pin, otpToken, entityType, entityId, docPayload })
    // 1. argon2 verify PIN
    // 2. MFAService.verifyTOTP(userId, otpToken) — tái sử dụng Gap #2
    // 3. doc_hash = SHA256(JSON.stringify(canonical(docPayload)))
    // 4. INSERT INTO sys_signatures → return signature id

  async voidSignature(voiderId, signatureId, reason)
    // Verify voiderId role > signer role
    // INSERT sys_signature_voids

  computeDocHash(payload)  // SHA-256 canonical JSON

  async getSignature(entityType, entityId)
    // LEFT JOIN sys_signature_voids để check is_voided
}
```

### `src/modules/system/backend/controllers/SignatureController.js` — tạo mới

- `POST /api/system/signature/enroll-pin` — `{ pin }` → enrollPIN
- `POST /api/system/signature/sign` — `{ pin, otp_token, entity_type, entity_id, doc_payload }` → sign
- `GET  /api/system/signature/:entityType/:entityId` — lấy signature info
- `POST /api/system/signature/:id/void` — `{ reason }` → void (role check)

### `src/modules/qaqc/backend/controllers/MIRController.js` — sửa

- POST `/api/qaqc/mir/:id/decide` nhận thêm `{ signature_id }` → verify signature tồn tại + entity match
- MIR đã có signature → block update với 403 `{ code: 'DOCUMENT_SIGNED' }`

### `src/modules/qaqc/backend/controllers/ITPController.js` — sửa

- DIRECTOR_APPROVED transition → yêu cầu `signature_id`

---

## Frontend

### `src/components/SignatureCeremony.vue` — tạo mới

Modal props: `{ entityType, entityId, summaryText, onSuccess, onCancel }`

```
┌─────────────────────────────────────────┐
│ Xác nhận chữ ký số                      │
│                                         │
│ Tài liệu: MIR-2026-0458                 │
│ Quyết định: ACCEPT — SA516 Gr.70 10T    │
│                                         │
│ PIN 6 chữ số:  [OTPInput component]     │
│ OTP (Authenticator): [OTPInput]         │
│                                         │
│ ☑ Tôi xác nhận đã đọc và chịu trách nhiệm│
│                                         │
│           [Huỷ]  [Xác nhận ký]         │
└─────────────────────────────────────────┘
```

Dùng `<OTPInput />` (đã tạo ở Gap #2) cho cả PIN và OTP fields.

### `src/components/SignatureBadge.vue` — tạo mới

- Icon shield xanh "✓ Ký số bởi X lúc T"
- Hover: popup signed_at, IP, method
- Dùng trong: MIR detail, NCR detail, ITP detail

### `src/modules/qaqc/frontend/views/MIRDetailView.vue` — sửa

- Nút "Close MIR" → trigger `<SignatureCeremony />`
- Sau sign thành công: hiển thị `<SignatureBadge />`
- Nếu đã signed: ẩn nút Edit

### `src/modules/system/frontend/views/ProfileView.vue` — sửa

- Section "Chữ ký số" → nút "Đặt PIN ký số" → modal nhập PIN 6 digit x2

---

## Acceptance Criteria

- **AC3.1:** PIN 6-digit → lưu hash argon2id, không bao giờ lưu plain text
- **AC3.2:** Ceremony: PIN + OTP verify cả 2 → record sys_signatures
- **AC3.3:** `sys_signatures` APPEND-ONLY — rule chặn UPDATE/DELETE
- **AC3.4:** Signed entity: badge "Ký số bởi X lúc T" + icon ✓
- **AC3.5:** Sửa signed entity → 403 `{ code: 'DOCUMENT_SIGNED' }`
- **AC3.6:** Unsign: role cao hơn + reason → ghi sys_signature_voids + audit
- **AC3.7:** MDR export: embed signature info (tên, thời gian, hash) dạng readable

## Testing

```
describe('SignatureService', () => {
  it('should hash PIN with argon2id and never store plain text')
  it('should create signature record when PIN+OTP both verified')
  it('should reject signature when PIN is wrong')
  it('should reject update to signed entity with 403')
  it('should only allow higher role to void signature')
})
```
