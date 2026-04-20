---
flow: |
  "nodejs-developer" -> "nodejs-reviewer"
  "vuejs-developer" -> "vuejs-reviewer"
  "nodejs-reviewer" -> "stpa-analyst"
  "vuejs-reviewer" -> "stpa-analyst"
models:
  "coordinator": "anthropic/claude-opus-4-6"
  "nodejs-developer": "anthropic/claude-opus-4-6"
  "nodejs-reviewer": "anthropic/claude-opus-4-6"
  "stpa-analyst": "anthropic/claude-opus-4-6"
  "vuejs-developer": "anthropic/claude-opus-4-6"
  "vuejs-reviewer": "anthropic/claude-opus-4-6"
---

Update hệ thống hiện có theo plan bên dưới để:

- Quản lý service providers
- Thêm module qaqc

# Plan: QAQC Platform – Phase 1 MVP

## Context

Build Phase 1 (Foundation) của IBS Heavy Industry QAQC Platform trên repo `ibshi-qaqc` hiện có (Express + Vue 3 + PostgreSQL). Mục tiêu Phase 1: chuẩn hóa Standards KB, xử lý MIR/ITP/Inspection trên Platform thay vì Excel + NAS. Tích hợp với IBS ERP qua **provider pattern** – tạm thời dùng mock, viết API doc để ibshi ERP team implement.

## Tech Stack (giữ nguyên hiện tại)
- Backend: Express + Node.js (không chuyển FastAPI như BRD khuyến nghị vì repo đã có sẵn)
- Frontend: Vue 3 + TailwindCSS (SSR)
- DB: PostgreSQL (schema `public`, naming `snake_case`)
- AI: Rule-based (switchable sang Gemini khi cần)
- Pattern: Theo module pattern sẵn có (`src/modules/{name}/backend/{routes,controllers,repositories}/`)

---

## Architecture: Provider Management System (trong `system` module)

### Thiết kế tổng quan

Provider system là generic plugin/adapter layer. Mỗi **provider class** (code) có thể được cấu hình thành nhiều **provider instance** (DB record). Config lưu DB, mã hóa bằng `SettingsService` encryption pattern sẵn có.

```
src/core/
  provider-registry.js      # Global in-memory class registry (singleton)

src/modules/system/
  backend/
    controllers/
      ProvidersController.js   # Admin CRUD cho provider instances
    services/
      ProviderService.js       # get/instantiate providers, decrypt config
    repositories/
      ProvidersRepository.js
  frontend/
    ProvidersView.vue          # Admin UI: list + create + edit instances
  migrations/
    013_sys_providers.sql      # NEW migration
```

### `sys_providers` table (migration 014):
```sql
sys_providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,           -- display name ("ibshi ERP Webhook Prod")
  class_name  VARCHAR(100) NOT NULL,           -- registered class ("ibshi-erp-webhook")
  module      VARCHAR(50)  NOT NULL,           -- module đăng ký class này ("qaqc")
  config      TEXT,                            -- JSON encrypted (AES-256-CBC)
  is_active   BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  INT REFERENCES sys_users(id),
  updated_by  INT REFERENCES sys_users(id)
)
```

### `provider-registry.js` (core singleton):
```js
// Module đăng ký class: providerRegistry.register('ibshi-erp-webhook', IbshiErpWebhookProvider)
// System lấy instance:  providerRegistry.getClass('ibshi-erp-webhook') → class
```

### `ProviderService.js`:
```js
// Instantiate provider từ DB record
async getInstance(name) → provider instance
// Gọi: const webhook = await providerService.getInstance('ibshi ERP Webhook Prod')
```

### Mỗi module đăng ký provider classes trong `index.js`:

**`qaqc` module** đăng ký 6 provider classes:
- `ibshi-erp-sso` – SSO / user sync (INT-01)
- `ibshi-erp-webhook` – Outbound webhook (INT-05)
- `ibshi-erp-projects` – Project snapshot sync (INT-03)
- `ibshi-erp-nas` – NAS file listing (INT-07)
- `ai-standards-lookup` – AI-1 lookup (rule-based hoặc Gemini)
- `ai-mtc-crosscheck` – AI-2 cross-check (rule-based hoặc Gemini)

**Provider class files** nằm trong `src/modules/qaqc/backend/providers/`:
```
src/modules/qaqc/backend/providers/
  IbshiErpSSOProvider.js        # mock + http implementation
  IbshiErpWebhookProvider.js    # mock (log) + http (POST + HMAC)
  IbshiErpProjectsProvider.js   # mock (seed data) + http (GET /api/v1/projects)
  IbshiErpNASProvider.js        # mock (static files) + http (SMB worker)
  AIStandardsLookupProvider.js  # rule-based (FTS) + gemini (future)
  AIMTCCrossCheckProvider.js    # rule-based (range compare) + gemini (future)
```

Mỗi provider class nhận `config` object từ DB khi khởi tạo:
```js
class IbshiErpWebhookProvider {
  constructor(config) {
    // config = { mode: 'mock' | 'http', url, secret, ... }
  }
  async send(event, payload) { ... }
}
```

**Dev setup**: Admin tạo provider instances trong UI với `mode: 'mock'` → không cần env vars, không call HTTP thật.

---

## Database Migrations (thứ tự thực hiện)

### Existing: 13 migration files (system module)

### New migrations (trong `src/modules/{module}/migrations/`):

**1. `projects` (reference table)**
```sql
qaqc_projects (id UUID PK, code VARCHAR UNIQUE, name, customer, status, synced_at TIMESTAMPTZ, erp_source_id)
```

**2. Standards KB (5 tables)**
```sql
standards (id, code, title, group VARCHAR, tier INT, version, issued_date DATE, status, file_url, full_text TEXT, created_at, updated_at)
standard_requirements (id, standard_id FK, req_type, property, condition, notes)
chemical_specs (id, standard_id FK, grade, element, min_val NUMERIC, max_val NUMERIC, unit)
mechanical_specs (id, standard_id FK, grade, property, min_val NUMERIC, max_val NUMERIC, unit)
dimensional_specs (id, standard_id FK, grade, property, min_val NUMERIC, max_val NUMERIC, unit)
```
Index: `standards` có GIN index trên `full_text` cho search. FK index trên mọi `standard_id`.

**3. ITP (4 tables)**
```sql
inspection_plans (id, project_id FK, product_type, version INT, status VARCHAR, template_id, created_by FK, approved_by FK, active_from, active_to, reason_for_change TEXT, created_at, updated_at)
itp_items (id, plan_id FK, seq INT, ip_code VARCHAR, description, standard_id FK, hold_flag BOOL, witness_flag BOOL, acceptance_criteria, sample_rule)
itp_checkpoints (id, item_id FK, label, required BOOL, data_type VARCHAR)
itp_plan_history (id, plan_id FK, version INT, changed_by FK, changed_at, change_reason, snapshot JSONB)
```
Unique: `(plan_id, seq)` trên itp_items. Unique: `(project_id, product_type)` WHERE status='ACTIVE' partial unique.

**4. Inspection (3 tables)**
```sql
inspections (id, plan_id FK, item_id FK, project_id FK, unit_id VARCHAR, ip_code, status VARCHAR, assigned_to FK, signed_by FK, signed_at, completed_at, created_at, updated_at)
inspection_results (id, inspection_id FK, checkpoint_id FK, result VARCHAR, measured_value NUMERIC, measured_unit, device_id FK, note, created_at)
inspection_photos (id, inspection_id FK, result_id FK NULLABLE, file_url, geotag POINT, taken_at TIMESTAMPTZ, is_tampered BOOL DEFAULT FALSE)
```

**5. MIR (4 tables)**
```sql
mir_records (id, project_id FK, po_ref, po_line_ids JSONB, supplier_id, stage VARCHAR, created_by FK, created_at, updated_at)
material_certs (id, mir_id FK, standard_id FK, heat_no, grade, supplier, file_url, ocr_extracted JSONB, created_at)
acceptances (id, mir_id FK, decision VARCHAR, decided_by FK, decided_at, waiver_note, ai_confidence NUMERIC, ai_result JSONB)
supplier_quality (id, supplier_id VARCHAR, period_year INT, period_month INT, ncr_count INT, mir_count INT, rejection_count INT, score NUMERIC, calculated_at)
```

**6. Calibration reference (cho Inspection device linking)**
```sql
calibration_devices (id, name, code, calibrated_until DATE, certificate_url, created_at)
-- Full M8 Calibration ở Phase 3; Phase 1 chỉ cần bảng reference nhẹ
```

---

## Module Structure: Single `qaqc` Module

Toàn bộ Phase 1 nằm trong **một module duy nhất**: `src/modules/qaqc/`, theo đúng pattern của `src/modules/system/`.

```
src/modules/qaqc/
  backend/
    index.js                        # đăng ký actions + routes + menus + cronjobs
    routes.js                       # tất cả API routes của module
    actions.js                      # permission action registry
    menus.js                        # navigation menu entries
    cronjobs.js                     # project sync nightly + NAS sync nightly
    controllers/
      ProjectsController.js         # project snapshot CRUD
      StandardsController.js        # Standards KB + AI-1 search
      ITPController.js              # ITP workflow
      InspectionController.js       # Inspection execution
      MIRController.js              # MIR 6-stage + AI-2 cross-check
    services/
      ProjectSyncService.js         # gọi ibshi provider → sync projects
      StandardsSearchService.js     # AI-1: PostgreSQL FTS + switchable AI
      ITPWorkflowService.js         # state machine ITP
      InspectionService.js          # checklist execution
      MIRWorkflowService.js         # 6-stage MIR state machine
      MIRCrossCheckService.js       # AI-2: rule-based comparison
      WebhookOutboundService.js     # outbound webhook + retry queue
    repositories/
      ProjectsRepository.js
      StandardsRepository.js
      ITPRepository.js
      InspectionRepository.js
      MIRRepository.js
      MaterialCertRepository.js
  frontend/
    index.js                        # Vue router registration
    ProjectsView.vue
    StandardsListView.vue
    StandardsDetailView.vue
    StandardsSearchView.vue         # AI-1 search UI
    ITPListView.vue
    ITPDetailView.vue
    ITPEditorView.vue
    InspectionTaskView.vue          # "My Tasks" (S2.1)
    InspectionFormView.vue          # checklist form (S2.2)
    IPDashboardView.vue             # heatmap IP × Project (S2.3)
    MIRListView.vue
    MIRDetailView.vue
    MIRCrossCheckView.vue           # AI-2 result display
  migrations/
    001_qaqc_projects.sql
    002_qaqc_standards.sql
    003_qaqc_itp.sql
    004_qaqc_inspection.sql
    005_qaqc_mir.sql
```

### Actions (permissions) trong `qaqc` module:
```
qaqc.projects.read / qaqc.projects.sync
qaqc.standards.read / qaqc.standards.write / qaqc.standards.import
qaqc.itp.read / qaqc.itp.write / qaqc.itp.approve
qaqc.inspection.read / qaqc.inspection.execute / qaqc.inspection.sign
qaqc.mir.read / qaqc.mir.write / qaqc.mir.decide / qaqc.mir.warehouse
```

### Sub-sections API (tất cả prefix `/api/qaqc/`):

**Projects:**
```
GET  /api/qaqc/projects            → list + pagination
POST /api/qaqc/projects/sync       → manual trigger sync (admin)
```

**Standards KB (AI-1):**
```
GET  /api/qaqc/standards           ?q=&group=&tier=&status=
GET  /api/qaqc/standards/:id       → detail với specs
POST /api/qaqc/standards           → tạo mới (admin)
PUT  /api/qaqc/standards/:id       → update (soft versioning)
POST /api/qaqc/standards/search    {query, filters}  → AI-1 full-text
POST /api/qaqc/standards/:id/deprecate
GET  /api/qaqc/standards/:id/specs → chemical+mechanical+dimensional
```

**ITP (M1):**
```
GET  /api/qaqc/itp                 ?projectId=&status=
GET  /api/qaqc/itp/:id
POST /api/qaqc/itp                 → tạo từ template hoặc blank
PUT  /api/qaqc/itp/:id             → update (chỉ khi DRAFT)
POST /api/qaqc/itp/:id/submit      → DRAFT → UNDER_REVIEW
POST /api/qaqc/itp/:id/approve     → workflow transition với role check
POST /api/qaqc/itp/:id/activate
POST /api/qaqc/itp/:id/copy        → copy sang project khác (AC01.01: ≤30s)
GET  /api/qaqc/itp/templates       → danh sách template theo product_type
```

**Inspection (M2, IP01-IP07):**
```
GET  /api/qaqc/inspections         ?assignedTo=&date=&projectId=&status=
GET  /api/qaqc/inspections/:id
POST /api/qaqc/inspections         → tạo inspection từ ITPItem
PUT  /api/qaqc/inspections/:id/results  → ghi kết quả checkpoints
POST /api/qaqc/inspections/:id/sign     → ký số (PIN + timestamp)
POST /api/qaqc/inspections/:id/photos   → upload ảnh
POST /api/qaqc/inspections/:id/escalate → escalate to NCR (BR02.01)
GET  /api/qaqc/inspections/dashboard    → heatmap data IP × Project
```

**MIR (M6, 6-stage + AI-2):**
```
GET  /api/qaqc/mir                 ?projectId=&stage=&supplierId=&date=
GET  /api/qaqc/mir/:id
POST /api/qaqc/mir                 → tạo MIR (Commercial, stage=EXPECTED)
POST /api/qaqc/mir/:id/upload-mtc  → upload MTC file
POST /api/qaqc/mir/:id/physical    → ghi kết quả physical inspection
POST /api/qaqc/mir/:id/crosscheck  → chạy AI-2 cross-check
POST /api/qaqc/mir/:id/decide      → ACCEPT/CONDITIONAL/REJECT (QC-MGR)
POST /api/qaqc/mir/:id/warehouse   → warehouse entry (WH-KEEP)
GET  /api/qaqc/mir/:id/audit       → full audit trail
GET  /api/qaqc/mir/export          → Excel export (AC06.04)
```

**ITP State machine** (BR01.01-BR01.07):
`DRAFT → UNDER_REVIEW → MANAGER_APPROVED → [DIRECTOR_APPROVED] → ACTIVE → SUPERSEDED → ARCHIVED`

**MIR 6-stage state machine** (D.6.1):
`EXPECTED → DOC_RECEIVED → PHYSICAL_INSPECTED → MTC_VERIFIED → DECIDED → INSTOCK`

**AI-2 rule-based** (MIRCrossCheckService):
1. Parse `material_cert.ocr_extracted` JSONB (chemical/mechanical values)
2. Load `chemical_specs` + `mechanical_specs` từ Standards KB theo `standard_id`
3. So sánh từng property: `actual` vs `[min_val, max_val]` → PASS/FAIL/WARN
4. Return `CrossCheckResult[]` với `confidence = 1.0` (rule-based, deterministic)
5. Interface: `crossCheck(mtcId, standardId) → {results[], summary, confidence}` – swap sang Gemini bằng cách thay implementation

**Outbound webhook** (AC06.03): Sau khi `decide`, gọi `ibshiProvider.webhook.send('mir.decided', payload)`. Retry 5× exponential backoff. Dead-letter queue nếu fail 5 lần.

---

## Provider System API Endpoints

Thêm vào `system` module (admin-only):
```
GET  /api/system/providers                   → list provider instances
GET  /api/system/providers/classes           → list registered classes (từ registry)
GET  /api/system/providers/:id
POST /api/system/providers                   → tạo instance mới
PUT  /api/system/providers/:id               → update config (re-encrypt)
POST /api/system/providers/:id/test          → test connection (gọi health check)
DELETE /api/system/providers/:id (soft delete)
```

---

## Critical Files (existing) to Reference

- `src/core/db.js` – BaseRepository (reuse `find`, `findOne`, `create`, `update`, `transaction`)
- `src/core/hooks.js` – hooks system (dùng cho after_create_mir, after_decide_mir)
- `src/core/logger.js` – `createLogger(name)` cho mỗi module
- `src/core/errors.js` – `AppError` cho error handling
- `src/modules/system/backend/index.js` – pattern để đăng ký module
- `src/modules/system/backend/services/NotificationService.js` – tái dùng cho alert calibration/NCR SLA

---

## Verification Plan

1. **Unit test**: Mỗi service (MIRWorkflowService, ITPWorkflowService, MIRCrossCheckService) có test state transitions
2. **API smoke test**: Chạy từng endpoint với seed data; kiểm tra status codes + response shape
3. **Provider mock test**: Swap `IBSHI_ERP_PROVIDER=mock` → xác nhận không call HTTP nào ra ngoài
4. **AI-2 rule test**: Upload MTC mẫu (ASTM A36), chạy cross-check → expect từng property PASS/FAIL đúng
5. **Webhook retry test**: Mock ERP endpoint trả 500 → xác nhận retry 5× với backoff

