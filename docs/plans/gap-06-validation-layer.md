# Gap #6 — Validation Layer (Zod)

**BRD:** NFR-SEC-03 | **Priority:** P1 | **Effort:** 2 ngày | **Sprint:** 1

## Context

Backend controllers (ITPController, InspectionController, MIRController...) hiện không validate — chỉ cast kiểu và insert DB. Frontend có validation nhưng attacker có thể bypass bằng Postman/curl. Không có validation layer = SQL injection, XSS, type confusion đều là rủi ro thực.

**Dependencies:** Không có. Nên triển khai đồng thời hoặc trước Gap #2 (Sprint 1).

**Install:** `npm install zod`

---

## Architecture

```
Request → validate(schema) middleware → req.validated → Handler → Service → DB
                    ↓ fail
               400 RFC 7807 response + audit log suspicious patterns
```

---

## Backend

### `src/core/validate.js` — tạo mới

```js
import { ZodError } from 'zod'

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        msg: i.message
      }))
      // Log nếu có SQL keywords hoặc XSS patterns
      const raw = JSON.stringify(req.body)
      if (/DROP TABLE|SELECT\s+\*|<script/i.test(raw)) {
        logger.warn('suspicious_input', { userId: req.user?.id, ip: req.ip, body: raw })
      }
      return res.status(400).json({
        type: '/errors/validation',
        title: 'Validation Failed',
        status: 400,
        errors
      })
    }
    req.validated = result.data
    next()
  }
}
```

### `src/modules/qaqc/backend/schemas/common.schema.js` — tạo mới

```js
export const uuidSchema = z.string().uuid()
export const isoDateSchema = z.string().datetime()
export const ipCodeSchema = z.string().regex(/^IP\d{2}$/)
export const heatNumberSchema = z.string().min(3).max(30)
export const itpStatusSchema = z.enum(['DRAFT','UNDER_REVIEW','MANAGER_APPROVED','DIRECTOR_APPROVED','ACTIVE','SUPERSEDED','ARCHIVED'])
export const mirStageSchema = z.enum(['EXPECTED','DOC_RECEIVED','PHYSICAL_INSPECTED','MTC_VERIFIED','DECIDED','INSTOCK'])
```

### `src/modules/qaqc/backend/schemas/itp.schema.js` — tạo mới

Schemas cho:
- `createITPSchema` — `{ project_id, name (3-200), description?, rows: array min(1) max(50) }`
- `updateITPSchema` — partial của createITPSchema
- `addITPItemSchema` — `{ seq, ip_code, standard_id?, hold_type, witness_flag }`
- `itpTransitionSchema` — `{ comment?, signature_id? }`

### `src/modules/qaqc/backend/schemas/inspection.schema.js` — tạo mới

Schemas cho:
- `createInspectionSchema` — `{ plan_id, item_id, unit_id, assigned_to }`
- `saveResultsSchema` — `{ results: [{checkpoint_id, result, measured_value?, device_id?}] }`
- `signInspectionSchema` — `{ signature_id }` (sau khi có Gap #3)

### `src/modules/qaqc/backend/schemas/mir.schema.js` — tạo mới

Schemas cho:
- `createMIRSchema` — `{ project_id, po_ref, supplier_id, po_line_ids }`
- `recordPhysicalSchema` — `{ heat_no, grade, quantity, unit }`
- `decideSchema` — `{ decision: enum(ACCEPT/REJECT/WAIVER), waiver_note?, signature_id? }`

### `src/modules/qaqc/backend/schemas/standards.schema.js` — tạo mới

Schemas cho:
- `createStandardSchema` — `{ code, title, grp, tier, version, issued_date, status }`
- `addSpecSchema` — `{ grade, property, min_val, max_val, unit }`

### Routes — sửa `src/modules/qaqc/backend/routes.js`

Thêm `validate(schema)` vào mỗi POST/PUT route:

```js
router.post('/itp', validate(createITPSchema), ITPController.create)
router.put('/itp/:id', validate(updateITPSchema), ITPController.update)
// ... tương tự cho tất cả POST/PUT
```

Tương tự cho `src/modules/system/backend/routes.js` (user, provider management).

---

## Acceptance Criteria

- **AC6.1:** 100% POST/PUT endpoints có Zod schema
- **AC6.2:** Invalid request → 400 JSON với `{ type, title, status, errors: [{field, msg}] }`
- **AC6.3:** SQL injection payload (`"; DROP TABLE...`) → reject 400 + log `suspicious_input`
- **AC6.4:** XSS payload (`<script>`) → reject 400
- **AC6.5:** Valid request: data đi qua `req.validated`, không dùng `req.body` raw trong handler
- **AC6.6:** Coverage: 100% endpoints trong modules `qaqc` + `system`

## Testing

```
describe('validate middleware', () => {
  it('should return 400 with field details when schema fails')
  it('should set req.validated with coerced data when schema passes')
  it('should log suspicious_input for SQL injection patterns')
  it('should reject XSS payload in text fields')
  it('should reject unknown extra fields (strict mode)')
})
```
