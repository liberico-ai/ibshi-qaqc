# Gap #5 — Standards Bulk Import Pipeline

**BRD:** BR09.01 | **Priority:** P1 | **Effort:** 3 ngày | **Sprint:** 4

## Context

Document Controller phải upload từng PDF một, mỗi file mất 15-30 phút, không có rollback clean khi lỗi. Cần bulk import pipeline async cho 200+ tài liệu (ASME, AWS, API, ISO, EN, DIN, JIS, TCVN). AI-1 Standards Lookup chỉ hữu ích khi kho đầy đủ và cập nhật.

**Dependencies:** Không có. Gap #7 AI Citation phụ thuộc gap này.

**Install:** `npm install bullmq ioredis pdf-parse`
**Infrastructure:** Redis instance cho BullMQ (cần IT infra chuẩn bị).

---

## Migration: `src/modules/qaqc/migrations/009_standards_import.sql`

```sql
CREATE TABLE IF NOT EXISTS qaqc_standards_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'QUEUED',  -- QUEUED/EXTRACTING/CHUNKING/EMBEDDING/DONE/FAILED
  progress INT DEFAULT 0,
  error_msg TEXT,
  total_chunks INT,
  indexed_chunks INT DEFAULT 0,
  standard_id UUID REFERENCES qaqc_standards(id),
  created_by UUID REFERENCES sys_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qaqc_standard_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES qaqc_standards(id),
  chunk_idx INT NOT NULL,
  text TEXT NOT NULL,
  embedding vector(768),          -- pgvector, cần extension
  metadata JSONB DEFAULT '{}',    -- {section, subsection, table, page_start, page_end, language}
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON qaqc_standard_chunks(standard_id);
CREATE INDEX ON qaqc_standard_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Kích hoạt extension nếu chưa có:
-- CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Backend

### `src/modules/qaqc/backend/workers/standardsImportWorker.js` — tạo mới

BullMQ Worker xử lý từng file:

```js
// Pipeline steps:
// Step A: Validate PDF (check pages, not corrupted)
// Step B: Extract metadata (Title, Section code, Year từ cover page — regex + heuristics)
// Step C: Chunking — split theo section headers, fallback to 500-token overlap chunks
//         Mỗi chunk có {standard_code, section, subsection, table, page_start, page_end}
// Step D: Embedding generation — call Gemini embedding API
//         (model: text-embedding-004, dimension: 768)
// Step E: Upsert vào qaqc_standard_chunks (chunk_id, vector, metadata, text)
// Step F: Update qaqc_standards với status=INDEXED
// Step G: Update job status = DONE

// Error handling:
// - Mỗi step lỗi: retry up to 3 lần
// - Fail hẳn: mark FAILED, giữ error message, rollback = DELETE chunks của file này
// - Update progress % sau mỗi batch chunk
```

### `src/modules/qaqc/backend/services/StandardsImportService.js` — tạo mới

```js
class StandardsImportService {
  async enqueueBatch(files, metadata, userId)   // tạo jobs, trả job IDs
  async getJobStatus(jobId)                     // trả progress + status
  async retryFailed(jobId)                      // re-enqueue failed job
  async checkSupersede(standardCode, year)      // kiểm tra version cũ có không
  async supersede(oldStandardId, newStandardId) // mark cũ là SUPERSEDED
}
```

### `src/modules/qaqc/backend/controllers/StandardsImportController.js` — tạo mới

- `POST /api/qaqc/standards/import` — upload files + metadata → enqueue jobs
- `GET  /api/qaqc/standards/import/jobs` — list jobs (admin)
- `GET  /api/qaqc/standards/import/jobs/:id` — job progress (polling / websocket)
- `POST /api/qaqc/standards/import/jobs/:id/retry` — retry failed

### `src/modules/qaqc/backend/routes.js` — sửa

Thêm routes import vào module qaqc.

---

## Frontend

### `src/modules/qaqc/frontend/views/StandardsImportView.vue` — tạo mới

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Import Standards                            │
│                                             │
│ [Drop zone: kéo thả PDF hoặc ZIP]          │
│                                             │
│ Standard family: [ASME ▼]  Year: [2023]    │
│ Language: [EN ▼]                            │
│                                             │
│ [Start Import]                              │
│                                             │
│ ┌──────────────────────────────────────┐   │
│ │ Filename     Status    Progress      │   │
│ │ ASME-IX.pdf  CHUNKING  ████░ 60%    │   │
│ │ ASME-V.pdf   DONE      █████ 100%   │   │
│ │ AWS-D1.pdf   FAILED    ⚠ PDF parse  │   │
│ │              [Retry]                 │   │
│ └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

- Dùng WebSocket (socket.io đã có) hoặc polling mỗi 5s để update progress
- Khi import xong: prompt "ASME 2021 đã tồn tại. Supersede?" với 3 options: Yes / No / Keep both

---

## Acceptance Criteria

- **AC5.1:** Upload ZIP 10 PDFs → pipeline process async, hiển thị progress từng file
- **AC5.2:** File OK → chunks trong DB với metadata đầy đủ (standard_code, section, page)
- **AC5.3:** File FAIL → status=FAILED + error message; không có chunks leak vào DB
- **AC5.4:** Import version mới: prompt Supersede với 3 options
- **AC5.5:** AI Lookup sau import: trả chunks từ standard mới với citation đúng page
- **AC5.6:** Pipeline xử lý 15.000 trang trong < 4 giờ (benchmark)

## Testing

```
describe('StandardsImportWorker', () => {
  it('should parse PDF and extract section headers as chunk boundaries')
  it('should rollback all chunks if any step fails')
  it('should mark job FAILED with readable error message')
  it('should update progress percentage after each batch')
  it('should supersede old version when confirmed')
})
```
