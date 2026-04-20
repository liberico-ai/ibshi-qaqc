CREATE TABLE IF NOT EXISTS qaqc_projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(50)  NOT NULL UNIQUE,
  name           VARCHAR(200) NOT NULL,
  customer       VARCHAR(200),
  status         VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
  erp_source_id  VARCHAR(100),
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_projects_code     ON qaqc_projects(code);
CREATE INDEX IF NOT EXISTS idx_qaqc_projects_status   ON qaqc_projects(status);
CREATE INDEX IF NOT EXISTS idx_qaqc_projects_synced   ON qaqc_projects(synced_at);
