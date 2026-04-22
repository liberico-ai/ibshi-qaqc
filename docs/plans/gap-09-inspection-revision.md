# Gap #9 — Inspection Revision Versioning

**BRD:** BR02.06 | **Priority:** P2 | **Effort:** 1 ngày | **Sprint:** 3

## Context

Inspection hiện bị overwrite khi update — mất version gốc. BRD BR02.06: "Submitted inspection MUST be versioned. Any change creates new revision with link to previous version." Khách hàng EPC có thể audit và hỏi "bản đầu tiên thế nào?" — hệ thống phải trả lời được.

**Dependencies:** Không có. Có thể triển khai độc lập.

---

## Migration: `src/modules/qaqc/migrations/008_inspection_revision.sql`

```sql
ALTER TABLE qaqc_inspections
  ADD COLUMN IF NOT EXISTS revision INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES qaqc_inspections(id),
  ADD COLUMN IF NOT EXISTS original_id UUID REFERENCES qaqc_inspections(id),
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- Unique: chỉ 1 bản is_current per original_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_current
  ON qaqc_inspections(original_id) WHERE is_current = TRUE;

-- Block DELETE
CREATE RULE no_delete_inspections AS ON DELETE TO qaqc_inspections DO INSTEAD NOTHING;
```

> `original_id` = id của revision 1 (tất cả các revision cùng inspection đều trỏ về đây).

---

## Backend

### `src/modules/qaqc/backend/services/InspectionRevisionService.js` — tạo mới

```js
class InspectionRevisionService {
  async createRevision(inspectionId, { userId, reason, updatedData })
    // 1. Verify inspectionId là is_current=true
    // 2. Verify user role QC-MGR+ 
    // 3. UPDATE qaqc_inspections SET is_current=false WHERE id=inspectionId
    // 4. INSERT new row: { ...current_data, ...updatedData, revision: current.revision+1,
    //                      is_current: true, parent_id: inspectionId,
    //                      original_id: current.original_id ?? inspectionId,
    //                      revision_reason: reason }
    // 5. Copy results + photos từ current sang new (reference, không duplicate file)
    // Return new inspection id

  async getRevisionHistory(inspectionId)
    // Trả all revisions của cùng original_id, sắp xếp theo revision ASC

  async getDiff(revisionAId, revisionBId)
    // So sánh 2 revision: trả { field, oldValue, newValue }[]
}
```

### `src/modules/qaqc/backend/repositories/InspectionRepository.js` — sửa

- Tất cả queries thêm `WHERE is_current = TRUE` (hoặc dùng default)
- Thêm method `findAllRevisions(originalId)`
- Tuyệt đối không UPDATE trực tiếp khi đã submitted — dùng `createRevision`

### `src/modules/qaqc/backend/controllers/InspectionController.js` — sửa

- `POST /api/qaqc/inspections/:id/revise` — `{ reason (>=20 ký tự), ...updatedData }` → createRevision
- `GET  /api/qaqc/inspections/:id/revisions` — list all revisions
- `GET  /api/qaqc/inspections/:id/diff/:fromRevision` — diff giữa 2 revisions

---

## Frontend

### `src/modules/qaqc/frontend/views/InspectionFormView.vue` — sửa

- Nếu inspection status = SUBMITTED và user role QC-MGR+: hiển thị nút "Tạo revision"
- Click → modal yêu cầu reason (≥ 20 ký tự) → mở form pre-filled với data hiện tại
- Submit → POST `/api/qaqc/inspections/:id/revise`

### `src/modules/qaqc/frontend/views/InspectionRevisionView.vue` — tạo mới

Tab "Lịch sử revision" trong Inspection detail:

```
┌──────────────────────────────────────────────────┐
│ Lịch sử revision                                 │
│                                                  │
│ Rev.1  Nguyễn Tuấn  21/04/2026 10:30  (Gốc)    │
│ Rev.2  Trần Hùng    22/04/2026 14:15  "Cập nhật │
│         spatter tại vị trí mối hàn W-03"        │
│                                                  │
│ [So sánh Rev.1 ↔ Rev.2]                         │
│                                                  │
│ ┌─────────────────┬─────────────────┐           │
│ │   Rev.1         │   Rev.2         │           │
│ │ CP01: PASS ✓    │ CP01: PASS ✓   │           │
│ │ CP02: PASS ✓    │ CP02: FAIL ✗   │  ← vàng  │
│ │ Note: -         │ Note: spatter   │  ← xanh  │
│ └─────────────────┴─────────────────┘           │
└──────────────────────────────────────────────────┘
```

- Diff highlight: đỏ (removed) / xanh (added) / vàng (modified)
- Thumbnail ảnh của cả 2 phiên bản (nếu có thay đổi)

---

## Acceptance Criteria

- **AC9.1:** Submit Inspection → `revision=1`, `is_current=true`
- **AC9.2:** Tạo revision: modal yêu cầu reason ≥ 20 ký tự; save → `revision=2`, link `parent_id`
- **AC9.3:** Tab "Lịch sử revision" list all revisions theo thứ tự thời gian
- **AC9.4:** Diff viewer highlight chính xác các thay đổi giữa 2 revision
- **AC9.5:** DB không cho phép DELETE inspection (rule block)

## Testing

```
describe('InspectionRevisionService', () => {
  it('should set revision=1 and is_current=true on first submit')
  it('should create revision=2 with parent_id pointing to rev=1')
  it('should set is_current=false on old revision after new one created')
  it('should return all revisions ordered by revision ASC')
  it('should correctly diff changed fields between two revisions')
})
```
