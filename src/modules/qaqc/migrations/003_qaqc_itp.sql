CREATE TABLE IF NOT EXISTS qaqc_inspection_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES qaqc_projects(id),
  product_type      VARCHAR(100) NOT NULL,
  version           INT NOT NULL DEFAULT 1,
  status            VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  template_id       UUID,
  reason_for_change TEXT,
  active_from       DATE,
  active_to         DATE,
  created_by        INT REFERENCES sys_users(id),
  approved_by       INT REFERENCES sys_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_itp_project ON qaqc_inspection_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_itp_status  ON qaqc_inspection_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qaqc_itp_active_unique
  ON qaqc_inspection_plans(project_id, product_type)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS qaqc_itp_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              UUID NOT NULL REFERENCES qaqc_inspection_plans(id) ON DELETE CASCADE,
  seq                  INT NOT NULL,
  ip_code              VARCHAR(50),
  description          TEXT,
  standard_id          UUID REFERENCES qaqc_standards(id),
  hold_flag            BOOLEAN NOT NULL DEFAULT FALSE,
  witness_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  acceptance_criteria  TEXT,
  sample_rule          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_itp_items_plan ON qaqc_itp_items(plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qaqc_itp_items_seq ON qaqc_itp_items(plan_id, seq);

CREATE TABLE IF NOT EXISTS qaqc_itp_checkpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES qaqc_itp_items(id) ON DELETE CASCADE,
  label       VARCHAR(300) NOT NULL,
  required    BOOLEAN NOT NULL DEFAULT TRUE,
  data_type   VARCHAR(30) NOT NULL DEFAULT 'boolean',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_itp_cp_item ON qaqc_itp_checkpoints(item_id);

CREATE TABLE IF NOT EXISTS qaqc_itp_plan_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES qaqc_inspection_plans(id),
  version       INT NOT NULL,
  changed_by    INT REFERENCES sys_users(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_reason TEXT,
  snapshot      JSONB
);
CREATE INDEX IF NOT EXISTS idx_qaqc_itp_history_plan ON qaqc_itp_plan_history(plan_id);
