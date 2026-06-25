-- 021_qaqc_ivfflat.sql
-- Tạo index pgvector IVFFlat trên cột embedding của qaqc_standard_chunks
-- để tăng tốc tìm kiếm ngữ nghĩa (semantic search / RAG).
--
-- Bọc trong DO ... EXCEPTION WHEN OTHERS THEN NULL để biến thành no-op an toàn
-- khi: extension pgvector chưa cài, bảng/cột embedding chưa tồn tại, hoặc
-- toán tử vector_cosine_ops không khả dụng. Không làm hỏng tiến trình migrate.

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_qaqc_standard_chunks_embedding
    ON qaqc_standard_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
