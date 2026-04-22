# Gap #7 — AI-1 Citation với page/section chính xác

**BRD:** BR09.03, AC09.02 | **Priority:** P1 | **Effort:** 2 ngày | **Sprint:** 4

## Context

AI hiện trả "ASME Section IX" mà không chỉ rõ section/page cụ thể — user không thể verify. AC09.02: "Every AI answer MUST include citation with standard code, section, page, and confidence score." Không có citation chính xác = AI answer không dùng được cho mục đích kỹ thuật và sẽ bị khách hàng EPC reject khi audit.

**Dependencies:** Gap #5 Bulk Import Pipeline phải hoàn thành (chunks cần metadata page/section).

---

## Backend

### `src/modules/qaqc/backend/providers/AIStandardsLookupProvider.js` — sửa

**Thay đổi 1: Structured system prompt**

```js
const SYSTEM_PROMPT = `You are a QA/QC standards expert assistant.
RULES:
1. You MUST cite every fact with format: [STANDARD_CODE § SECTION, p.PAGE]
2. Use ONLY information from the provided context chunks.
3. If information is not in context, respond with exactly: "NOT_FOUND: <reason>"
4. Do not invent, extrapolate, or use training knowledge.

OUTPUT FORMAT (JSON only):
{
  "summary": "...",
  "citations": [
    { "standard": "ASME BPVC IX 2023", "section": "QW-252.1", "page": 142, "chunk_id": "..." }
  ],
  "confidence": 0.87,
  "not_found_reasons": []
}`
```

**Thay đổi 2: Vector similarity search thay FTS**

```js
async search(query) {
  // 1. Generate query embedding
  const queryEmbedding = await this.embedText(query)
  // 2. pgvector cosine similarity search
  const chunks = await db.query(`
    SELECT c.*, s.code AS standard_code, s.title
    FROM qaqc_standard_chunks c
    JOIN qaqc_standards s ON s.id = c.standard_id
    WHERE s.status = 'ACTIVE'
    ORDER BY c.embedding <=> $1
    LIMIT 8
  `, [pgvectorFormat(queryEmbedding)])
  // 3. Build context với metadata đầy đủ
  return chunks
}
```

**Thay đổi 3: Structured response parsing**

```js
async lookup(query) {
  const chunks = await this.search(query)
  const context = buildContextWithMetadata(chunks)  // include section, page, standard_code
  const rawAnswer = await this.callGemini(SYSTEM_PROMPT, context, query)
  // Parse JSON response từ LLM
  const parsed = JSON.parse(rawAnswer)
  // Tính confidence: average(chunk cosine similarities) * LLM confidence
  parsed.confidence = calibrateConfidence(chunks, parsed.confidence)
  return parsed
}
```

### `src/modules/qaqc/backend/services/StandardsSearchService.js` — sửa

- Thêm method `vectorSearch(queryEmbedding, limit)` dùng pgvector
- Fallback về FTS nếu embedding chưa có

### Migration: `src/modules/qaqc/migrations/010_ai_feedback.sql`

```sql
CREATE TABLE IF NOT EXISTS qaqc_ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  answer_snapshot JSONB,
  user_id UUID REFERENCES sys_users(id),
  feedback_type VARCHAR(20) NOT NULL,  -- 'WRONG_ANSWER', 'MISSING_CITATION', 'WRONG_PAGE'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API endpoint mới trong `StandardsLookupController.js`

- `POST /api/qaqc/lookup/feedback` — `{ query, answer_snapshot, feedback_type, reason }`

---

## Frontend

### `src/components/CitationBadge.vue` — tạo mới

```html
<!-- Clickable badge -->
<button class="citation-badge" @click="showModal = true">
  📖 ASME BPVC IX 2023 § QW-252.1, p.142
</button>

<!-- Modal -->
<div v-if="showModal">
  <h3>ASME BPVC Section IX 2023</h3>
  <p>Section QW-252.1 | Page 142</p>
  <blockquote>{{ citation.chunk_text }}</blockquote>  <!-- highlighted -->
  <a :href="pdfUrl" target="_blank">Mở PDF trang 142 ↗</a>
</div>
```

Props: `{ citation: { standard, section, page, chunk_id, chunk_text } }`

### `src/components/ConfidenceIndicator.vue` — tạo mới

```html
<!-- xanh > 0.8 / vàng 0.6-0.8 / đỏ < 0.6 -->
<span :class="confidenceClass">{{ (confidence * 100).toFixed(0) }}% tin cậy</span>
```

### `src/modules/qaqc/frontend/views/StandardsLookupView.vue` — sửa

- Thay text citation cũ bằng danh sách `<CitationBadge />` per citation
- Hiển thị `<ConfidenceIndicator />` dưới summary
- Nếu `confidence < 0.6`: thêm disclaimer "Kết quả có độ tin cậy thấp, vui lòng tra thêm"
- Nếu `not_found_reasons.length > 0`: hiển thị "Không tìm thấy trong thư viện tiêu chuẩn"
- Nút "Báo sai" → modal chọn `feedback_type` + reason → POST `/api/qaqc/lookup/feedback`

---

## Acceptance Criteria

- **AC7.1:** Mỗi AI answer có ≥ 1 citation với `{standard_code, section, page}` đầy đủ
- **AC7.2:** Click citation → modal hiển thị text gốc + link tới PDF page
- **AC7.3:** Confidence hiển thị dạng số + màu (xanh/vàng/đỏ)
- **AC7.4:** Không đủ context → AI trả "NOT_FOUND" thay vì bịa
- **AC7.5:** "Báo sai" → lưu vào `qaqc_ai_feedback` với timestamp + user + reason

## Testing

```
describe('AIStandardsLookupProvider', () => {
  it('should return structured citations with section and page')
  it('should return NOT_FOUND when query has no matching chunks')
  it('should calculate confidence below 0.6 for low-similarity results')
  it('should use vector search when embeddings available')
  it('should fallback to FTS when no embeddings exist')
})
```
