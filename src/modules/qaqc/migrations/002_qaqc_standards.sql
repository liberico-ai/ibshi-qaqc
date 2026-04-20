CREATE TABLE IF NOT EXISTS qaqc_standards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(100) NOT NULL UNIQUE,
  title        VARCHAR(500) NOT NULL,
  grp          VARCHAR(100),
  tier         SMALLINT NOT NULL DEFAULT 1,
  version      VARCHAR(50),
  issued_date  DATE,
  status       VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  file_url     TEXT,
  full_text    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_standards_code   ON qaqc_standards(code);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_status ON qaqc_standards(status);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_grp    ON qaqc_standards(grp);
CREATE INDEX IF NOT EXISTS idx_qaqc_standards_fts    ON qaqc_standards USING gin(to_tsvector('english', coalesce(full_text,'')||' '||coalesce(title,'')||' '||coalesce(code,'')));

CREATE TABLE IF NOT EXISTS qaqc_standard_requirements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id  UUID NOT NULL REFERENCES qaqc_standards(id) ON DELETE CASCADE,
  req_type     VARCHAR(50),
  property     VARCHAR(200),
  condition    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_std_req_std ON qaqc_standard_requirements(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_chemical_specs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id  UUID NOT NULL REFERENCES qaqc_standards(id) ON DELETE CASCADE,
  grade        VARCHAR(100),
  element      VARCHAR(50) NOT NULL,
  min_val      NUMERIC(12,6),
  max_val      NUMERIC(12,6),
  unit         VARCHAR(20),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_chem_std ON qaqc_chemical_specs(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_mechanical_specs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id  UUID NOT NULL REFERENCES qaqc_standards(id) ON DELETE CASCADE,
  grade        VARCHAR(100),
  property     VARCHAR(100) NOT NULL,
  min_val      NUMERIC(12,4),
  max_val      NUMERIC(12,4),
  unit         VARCHAR(30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_mech_std ON qaqc_mechanical_specs(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_dimensional_specs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id  UUID NOT NULL REFERENCES qaqc_standards(id) ON DELETE CASCADE,
  grade        VARCHAR(100),
  property     VARCHAR(100) NOT NULL,
  min_val      NUMERIC(12,4),
  max_val      NUMERIC(12,4),
  unit         VARCHAR(30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_dim_std ON qaqc_dimensional_specs(standard_id);
