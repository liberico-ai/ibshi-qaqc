CREATE TABLE IF NOT EXISTS qaqc_std_lookup (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code VARCHAR(100) NOT NULL,
  standard_name VARCHAR(200) NOT NULL,
  grade         VARCHAR(100) NOT NULL,
  chemistry     JSONB NOT NULL DEFAULT '{}',
  mechanical    JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_std_lookup UNIQUE(standard_code, grade)
);
CREATE INDEX IF NOT EXISTS idx_qaqc_std_lookup_code ON qaqc_std_lookup(standard_code);
CREATE INDEX IF NOT EXISTS idx_qaqc_std_lookup_grade ON qaqc_std_lookup(grade);

CREATE TABLE IF NOT EXISTS qaqc_std_equivalents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_key       VARCHAR(100) NOT NULL,
  equivalent_grade VARCHAR(100) NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_std_equiv_key ON qaqc_std_equivalents(grade_key);
