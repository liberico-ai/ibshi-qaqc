# Gap #4 — Hold Point Enforcement

**BRD:** BR02.03 | **Priority:** P0 | **Effort:** 2 ngày | **Sprint:** 2

## Context

ITP đã có flag `hold_flag` nhưng chưa enforce — hoàn toàn dựa vào ý thức người dùng. Bỏ qua Hold Point trong dây chuyền hàn áp lực có thể gây thiệt hại hàng tỉ đồng. BRD BR02.03: "System SHALL block progression to next IP if prior H-point not released."

**Dependencies:** Gap #3 Digital Signature (Release ceremony dùng signature).

---

## Migration: `src/modules/qaqc/migrations/007_hold_point.sql`

```sql
ALTER TABLE qaqc_itp_items
  ADD COLUMN IF NOT EXISTS hold_type VARCHAR(5) DEFAULT 'NONE',  -- NONE/W/H/HC
  ADD COLUMN IF NOT EXISTS release_required_role VARCHAR(20);    -- QC-MGR/QC-DIR/CUSTOMER

CREATE TABLE IF NOT EXISTS qaqc_itp_ip_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES qaqc_itp_items(id),
  released_by UUID NOT NULL REFERENCES sys_users(id),
  released_at TIMESTAMPTZ DEFAULT now(),
  comment TEXT NOT NULL CHECK (length(comment) >= 20),
  signature_id UUID REFERENCES sys_signatures(id),
  is_override BOOLEAN DEFAULT FALSE
);
CREATE INDEX ON qaqc_itp_ip_releases(item_id);

CREATE TABLE IF NOT EXISTS sys_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) >= 50),
  performed_by UUID NOT NULL REFERENCES sys_users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  signature_id UUID REFERENCES sys_signatures(id)
);
```

---

## Backend

### `src/modules/qaqc/backend/services/HoldPointService.js` — tạo mới

```js
class HoldPointService {
  async checkBlocking(planId, targetItemSeq)
    // Query items với seq < targetItemSeq và hold_type IN ('H','HC')
    // LEFT JOIN qaqc_itp_ip_releases để xem đã release chưa
    // Return { blocked: bool, blockingItems: [{ip_code, hold_type}] }

  async releaseHoldPoint(itemId, { userId, comment, signatureId })
    // Verify user role >= release_required_role
    // Verify signatureId hợp lệ
    // INSERT qaqc_itp_ip_releases
    // Trigger notification: "IP0X đã released"

  async overrideHoldPoint(itemId, { userId, reason, signatureId })
    // Verify userId role == QC-DIR
    // INSERT sys_overrides
    // INSERT qaqc_itp_ip_releases với is_override=true
    // Notify toàn ban

  async getPendingHoldPoints(projectId)
    // List H/HC items chưa release → dùng cho dashboard badge
}
```

### `src/modules/qaqc/backend/middleware/holdPointGuard.js` — tạo mới

```js
export async function holdPointGuard(req, res, next) {
  const { planId, itemSeq } = extractFromRequest(req)
  const { blocked, blockingItems } = await HoldPointService.checkBlocking(planId, itemSeq)
  if (blocked) {
    return res.status(409).json({
      error: 'HOLD_POINT_NOT_RELEASED',
      blocking: blockingItems.map(i => i.ip_code),
      message: `${blockingItems[0].ip_code} is Hold Point, not released yet`
    })
  }
  next()
}
```

### `src/modules/qaqc/backend/controllers/InspectionController.js` — sửa

- POST `/api/qaqc/inspections` — gắn `holdPointGuard` middleware
- POST `/api/qaqc/inspections/:id/submit` — gắn `holdPointGuard` middleware

### `src/modules/qaqc/backend/controllers/ITPController.js` — sửa

- POST `/api/qaqc/itp/items/:id/release` — gọi `HoldPointService.releaseHoldPoint`
- POST `/api/qaqc/itp/items/:id/override` — gọi `HoldPointService.overrideHoldPoint` (QC-DIR only)
- GET  `/api/qaqc/itp/:planId/hold-status` — trả trạng thái mỗi IP

---

## Frontend

### `src/modules/qaqc/frontend/views/ITPDetailView.vue` — sửa

- Mỗi ITP item row: badge hold_type + trạng thái 🟢/🟡/🔴/⛔
- Nút "Release Hold" (QC-MGR+, H/HC chưa release) → `<SignatureCeremony />` + comment field
- Nút "Override" (chỉ QC-DIR, reason ≥ 50 ký tự)

### `src/modules/qaqc/frontend/views/InspectionTaskView.vue` — sửa

- Task bị block: grayed-out, tooltip "Blocked by IP03 (Hold Point chưa release)"
- Disable nút Submit khi có hold pending

### Dashboard QC-MGR — sửa

- Badge "N Hold Points Pending" khi > 0 trong dự án

---

## Cronjob — Weekly Override Report

`src/modules/qaqc/backend/cronjobs.js` — thêm job chạy mỗi thứ Hai 7:00 sáng:
- Query `sys_overrides` trong 7 ngày qua với `override_type = 'HOLD_POINT'`
- Gửi email/notification tới QC-DIR với list override (hoặc "Không có override")

---

## Acceptance Criteria

- **AC4.1:** ITP có H-point chưa release → tạo inspection kế tiếp → 409 `HOLD_POINT_NOT_RELEASED`
- **AC4.2:** Release Hold: signature + comment ≥ 20 ký tự → IP kế tiếp unblock
- **AC4.3:** Override: chỉ QC-DIR, reason ≥ 50 ký tự → `sys_overrides`
- **AC4.4:** Dashboard badge "N Hold Points Pending" khi > 0
- **AC4.5:** Weekly report override (hoặc "Không có override")

## Testing

```
describe('HoldPointService', () => {
  it('should block inspection creation when prior H-point not released')
  it('should allow inspection when H-point is released')
  it('should require comment >= 20 chars for release')
  it('should reject override from non QC-DIR role')
  it('should log override with reason >= 50 chars to sys_overrides')
})
```
