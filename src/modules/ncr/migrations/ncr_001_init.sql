-- NCR (Non-Conformance Report) — M3 Quản lý điểm không phù hợp
-- Soft references to qaqc_projects(id), qaqc_inspections(id), qaqc_mir_records(id), sys_users(id).

CREATE TABLE IF NOT EXISTS ncr_records (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_no               VARCHAR(50) NOT NULL UNIQUE,
  project_id           UUID REFERENCES qaqc_projects(id),
  title                VARCHAR(300) NOT NULL,
  description          TEXT,
  source_type          VARCHAR(20) NOT NULL DEFAULT 'manual', -- inspection | mir | manual
  source_ref_id        UUID,                                  -- soft ref → inspection/MIR
  severity             VARCHAR(20) NOT NULL DEFAULT 'minor',  -- minor | major | critical
  status               VARCHAR(20) NOT NULL DEFAULT 'OPEN',   -- workflow state
  root_cause_category  VARCHAR(50),
  assigned_to          INT REFERENCES sys_users(id),
  due_date             DATE,
  hold_flag            BOOLEAN NOT NULL DEFAULT FALSE,
  created_by           INT REFERENCES sys_users(id),
  closed_at            TIMESTAMPTZ,                           -- set khi status → CLOSED (dùng cho KPI close-out time)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Idempotent guard cho DB đã migrate trước khi thêm cột closed_at
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ncr_project   ON ncr_records(project_id);
CREATE INDEX IF NOT EXISTS idx_ncr_status    ON ncr_records(status);
CREATE INDEX IF NOT EXISTS idx_ncr_assigned  ON ncr_records(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ncr_due       ON ncr_records(due_date);
CREATE INDEX IF NOT EXISTS idx_ncr_created   ON ncr_records(created_at);

CREATE TABLE IF NOT EXISTS ncr_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id        UUID NOT NULL REFERENCES ncr_records(id) ON DELETE CASCADE,
  action_type   VARCHAR(20) NOT NULL DEFAULT 'corrective', -- corrective | preventive
  description   TEXT NOT NULL,
  owner_id      INT REFERENCES sys_users(id),
  due_date      DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'open',        -- open | in_progress | done | verified
  verified_by   INT REFERENCES sys_users(id),
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_ncr   ON ncr_actions(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_owner ON ncr_actions(owner_id);

CREATE TABLE IF NOT EXISTS ncr_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id      UUID NOT NULL REFERENCES ncr_records(id) ON DELETE CASCADE,
  event_type  VARCHAR(40) NOT NULL,   -- created | transition | assigned | action_added | action_verified | closed | reopened | escalated
  from_status VARCHAR(20),
  to_status   VARCHAR(20),
  note        TEXT,
  actor_id    INT REFERENCES sys_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ncr_history_ncr ON ncr_history(ncr_id);
