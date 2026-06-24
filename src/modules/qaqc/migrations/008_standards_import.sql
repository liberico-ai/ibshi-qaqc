-- pgvector is optional. If unavailable (no superuser, extension missing),
-- the embedding column is created as TEXT and AI search falls back to FTS.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  -- extension not installable (insufficient_privilege / undefined_file /
  -- feature_not_supported "extension is not available"); AI vector search
  -- gracefully falls back to FTS and the embedding column becomes TEXT.
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS qaqc_standards_import_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       TEXT         NOT NULL,
  status         VARCHAR(20)  DEFAULT 'QUEUED',  -- QUEUED/EXTRACTING/CHUNKING/EMBEDDING/DONE/FAILED
  progress       INT          DEFAULT 0,
  error_msg      TEXT,
  total_chunks   INT,
  indexed_chunks INT          DEFAULT 0,
  standard_id    UUID         REFERENCES qaqc_standards(id),
  created_by     INTEGER      REFERENCES sys_users(id),
  created_at     TIMESTAMPTZ  DEFAULT now(),
  updated_at     TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status    ON qaqc_standards_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created   ON qaqc_standards_import_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS qaqc_standard_chunks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID    NOT NULL REFERENCES qaqc_standards(id) ON DELETE CASCADE,
  chunk_idx   INT     NOT NULL,
  text        TEXT    NOT NULL,
  metadata    JSONB   DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_standard ON qaqc_standard_chunks(standard_id);

-- Add embedding column with pgvector type if available, else TEXT (stores JSON array).
DO $$
BEGIN
  EXECUTE 'ALTER TABLE qaqc_standard_chunks ADD COLUMN IF NOT EXISTS embedding vector(768)';
EXCEPTION WHEN undefined_object THEN
  EXECUTE 'ALTER TABLE qaqc_standard_chunks ADD COLUMN IF NOT EXISTS embedding TEXT';
END $$;

-- IVFFlat index for cosine similarity search (requires pgvector):
-- CREATE INDEX ON qaqc_standard_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Supersession tracking on standards
ALTER TABLE qaqc_standards
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES qaqc_standards(id),
  ADD COLUMN IF NOT EXISTS full_text     TEXT;
CREATE INDEX IF NOT EXISTS idx_standards_supersedes ON qaqc_standards(supersedes_id) WHERE supersedes_id IS NOT NULL;
