CREATE TABLE IF NOT EXISTS qaqc_mir_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES qaqc_projects(id),
  po_ref       VARCHAR(100),
  po_line_ids  JSONB DEFAULT '[]',
  supplier_id  VARCHAR(100),
  stage        VARCHAR(30) NOT NULL DEFAULT 'EXPECTED',
  created_by   INT REFERENCES sys_users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_mir_project  ON qaqc_mir_records(project_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_mir_stage    ON qaqc_mir_records(stage);
CREATE INDEX IF NOT EXISTS idx_qaqc_mir_supplier ON qaqc_mir_records(supplier_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_mir_created  ON qaqc_mir_records(created_at);

CREATE TABLE IF NOT EXISTS qaqc_material_certs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mir_id          UUID NOT NULL REFERENCES qaqc_mir_records(id) ON DELETE CASCADE,
  standard_id     UUID REFERENCES qaqc_standards(id),
  heat_no         VARCHAR(100),
  grade           VARCHAR(100),
  supplier        VARCHAR(200),
  file_url        TEXT,
  ocr_extracted   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_mtc_mir      ON qaqc_material_certs(mir_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_mtc_standard ON qaqc_material_certs(standard_id);

CREATE TABLE IF NOT EXISTS qaqc_acceptances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mir_id         UUID NOT NULL REFERENCES qaqc_mir_records(id) ON DELETE CASCADE,
  decision       VARCHAR(30) NOT NULL,
  decided_by     INT REFERENCES sys_users(id),
  decided_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  waiver_note    TEXT,
  ai_confidence  NUMERIC(5,4),
  ai_result      JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_qaqc_accept_mir ON qaqc_acceptances(mir_id);

CREATE TABLE IF NOT EXISTS qaqc_supplier_quality (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      VARCHAR(100) NOT NULL,
  period_year      INT NOT NULL,
  period_month     INT NOT NULL,
  ncr_count        INT NOT NULL DEFAULT 0,
  mir_count        INT NOT NULL DEFAULT 0,
  rejection_count  INT NOT NULL DEFAULT 0,
  score            NUMERIC(5,2),
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_qaqc_sq_supplier ON qaqc_supplier_quality(supplier_id);
