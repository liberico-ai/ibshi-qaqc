# QAQC Platform – Phase 1 Implementation Goal

**Dành cho:** Implementation Agent  
**Version:** 1.0 | 2026-04-20  
**Repo:** `ibshi-qaqc` | Port: 8767

---

## 1. Context

IBS Heavy Industry cần một platform QA/QC chuyên dụng để thay thế quy trình thủ công trên NAS + Excel. Phase 1 MVP tập trung vào:
- **Standards KB** – index + tra cứu 387+ PDF tiêu chuẩn (ASTM, ASME, AWS, ISO...)
- **ITP** – Kế hoạch kiểm tra theo từng loại dự án
- **Inspection** – Thực thi 10 điểm kiểm tra (IP01-IP10) trong Fab Pipeline
- **MIR** – Kiểm tra vật tư nhập kho 6 giai đoạn (quarantine principle)

### Stack hiện tại (KHÔNG thay đổi)
- Backend: **Express 4 + Node.js 22** (không phải FastAPI)
- Frontend: **Vue 3 + TailwindCSS** (SSR via Vite)
- DB: **PostgreSQL** (pool qua `pg`, không dùng ORM ngoại trừ BaseRepository nội bộ)
- Auth: **JWT** qua `jsonwebtoken`
- Pattern: Module auto-discovery tại `src/modules/*/backend/index.js`

### Patterns bắt buộc tái dùng
| Cần | File tham chiếu |
|-----|----------------|
| BaseRepository (find/create/update/delete/transaction) | `src/core/db.js` |
| createLogger(name) | `src/core/logger.js` |
| AppError + asyncHandler | `src/core/errors.js` |
| hooks.addAction / hooks.doAction | `src/core/hooks.js` |
| SettingsService (encrypt/decrypt) | `src/modules/system/backend/services/SettingsService.js` |
| Module đăng ký pattern | `src/modules/system/backend/index.js` |
| validate middleware | `src/core/validate.js` |
| requireAction(action) middleware | `src/core/auth.js` |

---

## 2. Deliverable 1: Provider Registry System (trong `system` module)

Đây là **infrastructure trước**, phải xong trước khi build `qaqc` module.

### 2.1 `src/core/provider-registry.js`

Singleton registry. Modules đăng ký provider class khi boot; system lấy ra khi instantiate.

```js
// Giao diện cần implement:
providerRegistry.register(className, ProviderClass, module, description)
providerRegistry.getClass(className) → ProviderClass | null
providerRegistry.listClasses() → [{className, module, description}]
```

Registry là in-memory, reset khi server restart. Modules phải re-register trong `index.js` (gọi khi server boot).

### 2.2 Migration: `src/modules/system/migrations/014_sys_providers.sql`

```sql
CREATE TABLE IF NOT EXISTS sys_providers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  class_name   VARCHAR(100) NOT NULL,
  module       VARCHAR(50)  NOT NULL,
  config       TEXT,                          -- JSON encrypted AES-256-CBC
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   INT REFERENCES sys_users(id),
  updated_by   INT REFERENCES sys_users(id)
);
CREATE INDEX IF NOT EXISTS idx_sys_providers_class ON sys_providers(class_name);
CREATE INDEX IF NOT EXISTS idx_sys_providers_module ON sys_providers(module);
```

### 2.3 `src/modules/system/backend/repositories/ProvidersRepository.js`

Extend BaseRepository, table `sys_providers`. Methods bổ sung:
- `findByClassName(className)` → list
- `findActive()` → all `is_active = true`

### 2.4 `src/modules/system/backend/services/ProviderService.js`

```js
class ProviderService {
  async getInstance(name) {
    // 1. Query sys_providers WHERE name = $1 AND is_active = true
    // 2. Decrypt config bằng SettingsService.decrypt()
    // 3. ProviderClass = providerRegistry.getClass(record.class_name)
    // 4. return new ProviderClass(JSON.parse(decryptedConfig))
  }

  async getInstanceByClass(className) {
    // Lấy instance active đầu tiên của class
  }

  async testProvider(id) {
    // instantiate → gọi provider.healthCheck() nếu có → return {ok, message}
  }
}
```

### 2.5 `src/modules/system/backend/controllers/ProvidersController.js`

CRUD + test. Pattern theo `UsersController.js`.

Actions cần đăng ký:
- `system.providers.read`
- `system.providers.write`

Endpoints thêm vào `src/modules/system/backend/routes.js`:
```
GET    /api/system/providers
GET    /api/system/providers/classes     ← providerRegistry.listClasses()
GET    /api/system/providers/:id
POST   /api/system/providers
PUT    /api/system/providers/:id
POST   /api/system/providers/:id/test
DELETE /api/system/providers/:id         ← soft delete (is_active = false)
```

Khi create/update: mã hoá `config` trước khi lưu (dùng SettingsService encryption).

### 2.6 `src/modules/system/frontend/ProvidersView.vue`

Admin UI theo pattern `UsersView.vue`:
- Bảng list: name, class, module, status, actions
- Form tạo/edit: dropdown class từ `/classes`, textarea config JSON, toggle is_active
- Nút "Test Connection" → gọi `:id/test` → hiện kết quả inline

---

## 3. Deliverable 2: `qaqc` Module

### 3.1 File tree đầy đủ

```
src/modules/qaqc/
  backend/
    index.js
    routes.js
    actions.js
    menus.js
    cronjobs.js
    controllers/
      ProjectsController.js
      StandardsController.js
      ITPController.js
      InspectionController.js
      MIRController.js
    services/
      ProjectSyncService.js
      StandardsSearchService.js
      ITPWorkflowService.js
      InspectionService.js
      MIRWorkflowService.js
      MIRCrossCheckService.js
      WebhookOutboundService.js
    repositories/
      ProjectsRepository.js
      StandardsRepository.js
      ITPRepository.js
      InspectionRepository.js
      MIRRepository.js
      MaterialCertRepository.js
    providers/
      IbshiErpSSOProvider.js
      IbshiErpWebhookProvider.js
      IbshiErpProjectsProvider.js
      IbshiErpNASProvider.js
      AIStandardsLookupProvider.js
      AIMTCCrossCheckProvider.js
  frontend/
    index.js
    ProjectsView.vue
    StandardsListView.vue
    StandardsDetailView.vue
    StandardsSearchView.vue
    ITPListView.vue
    ITPDetailView.vue
    ITPEditorView.vue
    InspectionTaskView.vue
    InspectionFormView.vue
    IPDashboardView.vue
    MIRListView.vue
    MIRDetailView.vue
    MIRCrossCheckView.vue
  migrations/
    001_qaqc_projects.sql
    002_qaqc_standards.sql
    003_qaqc_itp.sql
    004_qaqc_inspection.sql
    005_qaqc_mir.sql
    006_qaqc_calibration_devices.sql
```

### 3.2 `backend/index.js`

Đăng ký actions, routes, menus, cronjobs, **và provider classes**:

```js
import providerRegistry from '../../../core/provider-registry.js'
import IbshiErpSSOProvider from './providers/IbshiErpSSOProvider.js'
import IbshiErpWebhookProvider from './providers/IbshiErpWebhookProvider.js'
import IbshiErpProjectsProvider from './providers/IbshiErpProjectsProvider.js'
import IbshiErpNASProvider from './providers/IbshiErpNASProvider.js'
import AIStandardsLookupProvider from './providers/AIStandardsLookupProvider.js'
import AIMTCCrossCheckProvider from './providers/AIMTCCrossCheckProvider.js'

export default async function register(...) {
  providerRegistry.register('ibshi-erp-sso',      IbshiErpSSOProvider,      'qaqc', 'SSO & user sync với IBS ERP')
  providerRegistry.register('ibshi-erp-webhook',   IbshiErpWebhookProvider,  'qaqc', 'Outbound webhook tới ERP')
  providerRegistry.register('ibshi-erp-projects',  IbshiErpProjectsProvider, 'qaqc', 'Project snapshot sync')
  providerRegistry.register('ibshi-erp-nas',        IbshiErpNASProvider,      'qaqc', 'NAS file listing')
  providerRegistry.register('ai-standards-lookup', AIStandardsLookupProvider,'qaqc', 'Standards KB lookup (AI-1)')
  providerRegistry.register('ai-mtc-crosscheck',   AIMTCCrossCheckProvider,  'qaqc', 'MTC cross-check (AI-2)')
  // ... đăng ký routes, actions, menus, cronjobs
}
```

### 3.3 Provider Classes

Mỗi provider nhận `config` (đã decrypt từ DB) trong constructor. Pattern:

```js
class XxxProvider {
  constructor(config) { this.config = config }
  async healthCheck() { return { ok: true } }
}
```

**`IbshiErpWebhookProvider`** – `config: { mode, url, secret, timeout_ms }`
```js
async send(eventType, payload) → void
// mode='mock': log ra logger
// mode='http': POST với header X-QAQC-Signature (HMAC-SHA256), X-Event-Id (UUID)
```

**`IbshiErpProjectsProvider`** – `config: { mode, base_url, service_key }`
```js
async list(cursor, updatedSince) → { data: Project[], cursor, has_more }
// mode='mock': trả 5 projects seed (IP071-IP080)
// mode='http': GET /api/v1/projects
```

**`IbshiErpSSOProvider`** – `config: { mode, base_url, service_key }`
```js
async exchangeToken(erpJwt) → { user: UserProfile, valid_until }
async syncUsers(updatedSince) → User[]
// mode='mock': hardcoded user map
```

**`AIStandardsLookupProvider`** – `config: { mode }` (`mode: 'rule-based'|'gemini'`)
```js
async search(query, filters) → { results: SearchResult[], total }
// mode='rule-based': PostgreSQL FTS (to_tsvector + plainto_tsquery)
// mode='gemini': future
```

**`AIMTCCrossCheckProvider`** – `config: { mode }`
```js
async crossCheck(mtcValues, standardId) → CrossCheckResult
// CrossCheckResult: { items: [{property, min, max, actual, status, unit}], summary, confidence }
// mode='rule-based': so sánh số học với chemical_specs + mechanical_specs
// confidence = 1.0 (deterministic)
```

---

## 4. Database Migrations (DDL đầy đủ)

### `001_qaqc_projects.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  customer        VARCHAR(200),
  product_type    VARCHAR(50),
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  erp_source_id   VARCHAR(100),
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_projects_code ON qaqc_projects(code);
CREATE INDEX IF NOT EXISTS idx_qaqc_projects_status ON qaqc_projects(status);
```

### `002_qaqc_standards.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_standards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  std_group    VARCHAR(50) NOT NULL,
  tier         SMALLINT NOT NULL DEFAULT 1,
  version      VARCHAR(20),
  issued_date  DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  file_url     VARCHAR(1000),
  full_text    TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES sys_users(id),
  updated_by   UUID REFERENCES sys_users(id),
  UNIQUE(code, version)
);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_group ON qaqc_standards(std_group);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_status ON qaqc_standards(status);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_fts ON qaqc_standards
  USING GIN (to_tsvector('english', coalesce(full_text,'') || ' ' || coalesce(title,'')));

CREATE TABLE IF NOT EXISTS qaqc_chemical_specs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES qaqc_standards(id),
  grade       VARCHAR(50) NOT NULL,
  element     VARCHAR(20) NOT NULL,
  min_val     NUMERIC(10,4),
  max_val     NUMERIC(10,4),
  unit        VARCHAR(10) DEFAULT '%',
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_qaqc_chem_std ON qaqc_chemical_specs(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_mechanical_specs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES qaqc_standards(id),
  grade       VARCHAR(50) NOT NULL,
  property    VARCHAR(50) NOT NULL,
  min_val     NUMERIC(10,2),
  max_val     NUMERIC(10,2),
  unit        VARCHAR(20),
  test_method VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_qaqc_mech_std ON qaqc_mechanical_specs(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_dimensional_specs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES qaqc_standards(id),
  grade       VARCHAR(50),
  property    VARCHAR(100) NOT NULL,
  min_val     NUMERIC(10,3),
  max_val     NUMERIC(10,3),
  unit        VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_qaqc_dim_std ON qaqc_dimensional_specs(standard_id);
```

### `003_qaqc_itp.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_inspection_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES qaqc_projects(id),
  product_type      VARCHAR(50) NOT NULL,
  version           INT NOT NULL DEFAULT 1,
  status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  template_id       UUID,
  reason_for_change TEXT,
  active_from       DATE,
  active_to         DATE,
  created_by        UUID REFERENCES sys_users(id),
  approved_by       UUID REFERENCES sys_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_itp_active
  ON qaqc_inspection_plans(project_id, product_type)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_itp_project ON qaqc_inspection_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_itp_status ON qaqc_inspection_plans(status);

CREATE TABLE IF NOT EXISTS qaqc_itp_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES qaqc_inspection_plans(id),
  seq                 INT NOT NULL,
  ip_code             VARCHAR(10) NOT NULL,
  description         TEXT NOT NULL,
  standard_id         UUID REFERENCES qaqc_standards(id),
  hold_flag           BOOLEAN NOT NULL DEFAULT FALSE,
  witness_flag        BOOLEAN NOT NULL DEFAULT FALSE,
  acceptance_criteria TEXT,
  sample_rule         VARCHAR(200),
  UNIQUE(plan_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_itp_items_plan ON qaqc_itp_items(plan_id);

CREATE TABLE IF NOT EXISTS qaqc_itp_checkpoints (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id   UUID NOT NULL REFERENCES qaqc_itp_items(id),
  label     VARCHAR(200) NOT NULL,
  required  BOOLEAN NOT NULL DEFAULT TRUE,
  data_type VARCHAR(20) DEFAULT 'boolean'
);
CREATE INDEX IF NOT EXISTS idx_itp_cp_item ON qaqc_itp_checkpoints(item_id);

CREATE TABLE IF NOT EXISTS qaqc_itp_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES qaqc_inspection_plans(id),
  version       INT NOT NULL,
  changed_by    UUID REFERENCES sys_users(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_reason TEXT,
  snapshot      JSONB
);
CREATE INDEX IF NOT EXISTS idx_itp_history_plan ON qaqc_itp_history(plan_id);
```

### `004_qaqc_inspection.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_inspections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID REFERENCES qaqc_inspection_plans(id),
  item_id       UUID REFERENCES qaqc_itp_items(id),
  project_id    UUID NOT NULL REFERENCES qaqc_projects(id),
  unit_id       VARCHAR(50),
  ip_code       VARCHAR(10) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  assigned_to   UUID REFERENCES sys_users(id),
  signed_by     UUID REFERENCES sys_users(id),
  signed_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- status: IN_PROGRESS | PASS | FAIL | HOLD | ESCALATED
CREATE INDEX IF NOT EXISTS idx_insp_project ON qaqc_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_insp_assigned ON qaqc_inspections(assigned_to);
CREATE INDEX IF NOT EXISTS idx_insp_status ON qaqc_inspections(status);

CREATE TABLE IF NOT EXISTS qaqc_inspection_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id   UUID NOT NULL REFERENCES qaqc_inspections(id),
  checkpoint_id   UUID REFERENCES qaqc_itp_checkpoints(id),
  result          VARCHAR(10) NOT NULL,
  measured_value  NUMERIC(15,4),
  measured_unit   VARCHAR(20),
  device_id       UUID,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- result: PASS | FAIL | HOLD | N/A
CREATE INDEX IF NOT EXISTS idx_insp_res_insp ON qaqc_inspection_results(inspection_id);

CREATE TABLE IF NOT EXISTS qaqc_inspection_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES qaqc_inspections(id),
  result_id     UUID REFERENCES qaqc_inspection_results(id),
  file_url      VARCHAR(1000) NOT NULL,
  geotag        POINT,
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_tampered   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_insp_photo_insp ON qaqc_inspection_photos(inspection_id);
```

### `005_qaqc_mir.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_mir_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES qaqc_projects(id),
  po_ref       VARCHAR(50),
  po_line_ids  JSONB DEFAULT '[]',
  supplier_id  VARCHAR(100),
  stage        VARCHAR(30) NOT NULL DEFAULT 'EXPECTED',
  created_by   UUID REFERENCES sys_users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- stage: EXPECTED | DOC_RECEIVED | PHYSICAL_INSPECTED | MTC_VERIFIED | DECIDED | INSTOCK
CREATE INDEX IF NOT EXISTS idx_mir_project ON qaqc_mir_records(project_id);
CREATE INDEX IF NOT EXISTS idx_mir_stage ON qaqc_mir_records(stage);
CREATE INDEX IF NOT EXISTS idx_mir_supplier ON qaqc_mir_records(supplier_id);

CREATE TABLE IF NOT EXISTS qaqc_material_certs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mir_id        UUID NOT NULL REFERENCES qaqc_mir_records(id),
  standard_id   UUID REFERENCES qaqc_standards(id),
  heat_no       VARCHAR(50),
  grade         VARCHAR(50),
  supplier      VARCHAR(200),
  file_url      VARCHAR(1000),
  ocr_extracted JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtc_mir ON qaqc_material_certs(mir_id);
CREATE INDEX IF NOT EXISTS idx_mtc_heat ON qaqc_material_certs(heat_no);

CREATE TABLE IF NOT EXISTS qaqc_acceptances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mir_id        UUID NOT NULL REFERENCES qaqc_mir_records(id),
  decision      VARCHAR(20) NOT NULL,
  decided_by    UUID REFERENCES sys_users(id),
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  waiver_note   TEXT,
  ai_confidence NUMERIC(4,3),
  ai_result     JSONB DEFAULT '{}'
);
-- decision: ACCEPT | CONDITIONAL | REJECT
CREATE INDEX IF NOT EXISTS idx_acceptance_mir ON qaqc_acceptances(mir_id);

CREATE TABLE IF NOT EXISTS qaqc_supplier_quality (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      VARCHAR(100) NOT NULL,
  period_year      SMALLINT NOT NULL,
  period_month     SMALLINT NOT NULL,
  ncr_count        INT NOT NULL DEFAULT 0,
  mir_count        INT NOT NULL DEFAULT 0,
  rejection_count  INT NOT NULL DEFAULT 0,
  score            NUMERIC(5,2),
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, period_year, period_month)
);
```

### `006_qaqc_calibration_devices.sql`
```sql
CREATE TABLE IF NOT EXISTS qaqc_calibration_devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  code             VARCHAR(50) UNIQUE,
  device_type      VARCHAR(50),
  calibrated_until DATE,
  certificate_url  VARCHAR(1000),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cal_until ON qaqc_calibration_devices(calibrated_until);

ALTER TABLE qaqc_inspection_results
  ADD CONSTRAINT fk_insp_res_device
  FOREIGN KEY (device_id) REFERENCES qaqc_calibration_devices(id);
```

---

## 5. Business Rules (cần enforce trong code)

### ITPWorkflowService – Valid transitions

| From | To | Role action required |
|------|-----|----------------------|
| DRAFT | UNDER_REVIEW | qaqc.itp.write |
| UNDER_REVIEW | MANAGER_APPROVED | qaqc.itp.approve |
| MANAGER_APPROVED | DIRECTOR_APPROVED | qaqc.itp.approve (nếu project > 5M USD) |
| MANAGER_APPROVED / DIRECTOR_APPROVED | ACTIVE | qaqc.itp.approve |
| ACTIVE | SUPERSEDED | System (khi version mới ACTIVE) |
| ACTIVE | ARCHIVED | System (khi project đóng) |

**BR01.04**: Trước khi ACTIVE, kiểm tra tất cả ITPItems có `standard_id IS NOT NULL`. Thiếu → AppError 400.

**BR01.05**: Mỗi update ITP → ghi snapshot vào `qaqc_itp_history`.

### MIRWorkflowService – Valid stage transitions

```
EXPECTED → DOC_RECEIVED         (role: qaqc.mir.write)
DOC_RECEIVED → PHYSICAL_INSPECTED   (role: qaqc.mir.write)
PHYSICAL_INSPECTED → MTC_VERIFIED   (role: qaqc.mir.write)
MTC_VERIFIED → DECIDED              (role: qaqc.mir.decide)
DECIDED → INSTOCK                   (role: qaqc.mir.warehouse)
```

**BR06.01**: Không bao giờ set INSTOCK trực tiếp, phải qua DECIDED.

Sau khi DECIDED: gọi `WebhookOutboundService.enqueue(eventType, payload)`.
- ACCEPT/CONDITIONAL → event `mir.decided`
- REJECT → event `mir.rejected`

### MIRCrossCheckService – Rule-based AI-2

1. Load `qaqc_material_certs` theo `mtcId` → `ocr_extracted.chemical`, `ocr_extracted.mechanical`
2. Load `qaqc_chemical_specs` WHERE `standard_id = $1` AND `grade = $2`
3. Load `qaqc_mechanical_specs` WHERE `standard_id = $1` AND `grade = $2`
4. Với mỗi property:
   - `actual < min_val` hoặc `actual > max_val` → `FAIL`
   - `min_val IS NULL AND max_val IS NULL` → `WARN`
   - Trong range → `PASS`
5. Return `{ items[], summary: {pass, fail, warn, total}, confidence: 1.0 }`

### WebhookOutboundService – Retry policy

Retry delays: `[30s, 120s, 600s, 1800s, 7200s]` (5 lần).  
Sau 5 lần: gọi `NotificationService.notifyAdmins('webhook_failed', payload)`.

### InspectionService

**BR02.01**: FAIL không tự tạo NCR. QC phải bấm "Escalate to NCR" riêng.

**BR02.02**: Inspection chỉ hoàn tất khi tất cả required checkpoints có result VÀ đã ký số.

**BR02.03**: Inspection append-only. Không update result đã có; tạo revision mới.

---

## 6. API Endpoints (tất cả prefix `/api/qaqc/`)

| Method | Path | Action | Mô tả |
|--------|------|--------|-------|
| GET | /projects | qaqc.projects.read | List projects |
| POST | /projects/sync | qaqc.projects.sync | Manual ERP sync |
| GET | /standards | qaqc.standards.read | List + filter |
| GET | /standards/:id | qaqc.standards.read | Detail + specs |
| POST | /standards | qaqc.standards.write | Tạo mới |
| PUT | /standards/:id | qaqc.standards.write | Update |
| POST | /standards/search | qaqc.standards.read | AI-1 full-text |
| POST | /standards/:id/deprecate | qaqc.standards.write | Deprecate |
| GET | /standards/:id/specs | qaqc.standards.read | Chemical/mech/dim specs |
| GET | /itp | qaqc.itp.read | List |
| GET | /itp/:id | qaqc.itp.read | Detail |
| POST | /itp | qaqc.itp.write | Tạo |
| PUT | /itp/:id | qaqc.itp.write | Update (DRAFT only) |
| POST | /itp/:id/submit | qaqc.itp.write | → UNDER_REVIEW |
| POST | /itp/:id/approve | qaqc.itp.approve | Workflow transition |
| POST | /itp/:id/activate | qaqc.itp.approve | → ACTIVE |
| POST | /itp/:id/copy | qaqc.itp.write | Copy sang project khác |
| GET | /itp/templates | qaqc.itp.read | List templates |
| GET | /inspections | qaqc.inspection.read | List / My Tasks |
| GET | /inspections/:id | qaqc.inspection.read | Detail |
| POST | /inspections | qaqc.inspection.execute | Tạo |
| PUT | /inspections/:id/results | qaqc.inspection.execute | Ghi kết quả |
| POST | /inspections/:id/sign | qaqc.inspection.sign | Ký số |
| POST | /inspections/:id/photos | qaqc.inspection.execute | Upload ảnh |
| POST | /inspections/:id/escalate | qaqc.inspection.execute | → NCR |
| GET | /inspections/dashboard | qaqc.inspection.read | Heatmap |
| GET | /mir | qaqc.mir.read | List |
| GET | /mir/:id | qaqc.mir.read | Detail |
| POST | /mir | qaqc.mir.write | Tạo (EXPECTED) |
| POST | /mir/:id/upload-mtc | qaqc.mir.write | Upload MTC |
| POST | /mir/:id/physical | qaqc.mir.write | Physical inspection |
| POST | /mir/:id/crosscheck | qaqc.mir.write | AI-2 cross-check |
| POST | /mir/:id/decide | qaqc.mir.decide | ACCEPT/CONDITIONAL/REJECT |
| POST | /mir/:id/warehouse | qaqc.mir.warehouse | Warehouse entry |
| GET | /mir/:id/audit | qaqc.mir.read | Audit trail |
| GET | /mir/export | qaqc.mir.read | Excel export |

---

## 7. Cronjobs (`cronjobs.js`)

```js
// Nightly 02:00 – sync projects từ ERP
'0 2 * * *'  →  'qaqc-project-sync'
  // getInstanceByClass('ibshi-erp-projects') → projectSyncService.sync(provider)

// Nightly 00:30 – NAS sync (stub Phase 1)
'30 0 * * *' →  'qaqc-nas-sync'
  // log "NAS sync not yet configured, skipping"
```

---

## 8. Seed Data (thêm vào `scripts/seed.js`)

- 5 projects: IP071–IP080 (code, name, customer, product_type, status='active')
- 10 standards: ASTM A36, A516-70, ASME SA-516, AWS D1.1, ISO 9013, ISO 13920, API 5L, ASME V, ISO 17637, TCVN 1765
- Cho ASTM A36: chemical_specs (C max 0.26%, Mn max 1.20%, P max 0.04%, S max 0.05%), mechanical_specs (tensile 400-550 MPa, yield min 250 MPa, elongation min 20%)
- 1 calibration device: Vernier Caliper 0-150mm, code=CAL-001, calibrated_until=2027-01-01
- 3 roles cho QAQC: QC Director (all qaqc.*), QC Manager (read+write+decide), QC Inspector (read+execute+sign)
- 1 mock sys_providers instance: name='QAQC Mock ERP', class_name='ibshi-erp-webhook', config=`{"mode":"mock"}`

---

## 9. Testing Checklist

- [ ] `MIRWorkflowService` – valid transitions pass; invalid → AppError; INSTOCK trực tiếp → AppError
- [ ] `ITPWorkflowService` – ACTIVE block khi item thiếu standard_id → AppError 400
- [ ] `MIRCrossCheckService` – A36 seed: C=0.25% → PASS, C=0.30% → FAIL
- [ ] `StandardsSearchService` – query "yield strength" → kết quả có snippet
- [ ] `AIStandardsLookupProvider` mode=rule-based – không gọi external HTTP
- [ ] `IbshiErpProjectsProvider` mode=mock – trả 5 projects seed, không gọi HTTP
- [ ] `IbshiErpWebhookProvider` mode=mock – log event, không gọi HTTP
- [ ] Partial unique index – 2 ACTIVE ITP cùng (project, product_type) → PostgreSQL constraint error
- [ ] `sys_providers` CRUD – config encrypted khi lưu; decrypted đúng khi getInstanceByClass
- [ ] Webhook retry – provider mode=http, server trả 500 → 5 lần retry → notifyAdmins
