CREATE TABLE IF NOT EXISTS qaqc_calibration_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  code              VARCHAR(100) NOT NULL UNIQUE,
  calibrated_until  DATE,
  certificate_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qaqc_inspections (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        UUID NOT NULL REFERENCES qaqc_inspection_plans(id),
  item_id        UUID NOT NULL REFERENCES qaqc_itp_items(id),
  project_id     UUID NOT NULL REFERENCES qaqc_projects(id),
  unit_id        VARCHAR(100),
  ip_code        VARCHAR(50),
  status         VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  assigned_to    INT REFERENCES sys_users(id),
  signed_by      INT REFERENCES sys_users(id),
  signed_at      TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qaqc_insp_project    ON qaqc_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_plan       ON qaqc_inspections(plan_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_assigned   ON qaqc_inspections(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_status     ON qaqc_inspections(status);

CREATE TABLE IF NOT EXISTS qaqc_inspection_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    UUID NOT NULL REFERENCES qaqc_inspections(id) ON DELETE CASCADE,
  checkpoint_id    UUID NOT NULL REFERENCES qaqc_itp_checkpoints(id),
  result           VARCHAR(20),
  measured_value   NUMERIC(15,4),
  measured_unit    VARCHAR(30),
  device_id        UUID REFERENCES qaqc_calibration_devices(id),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_res_insp ON qaqc_inspection_results(inspection_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_res_cp   ON qaqc_inspection_results(checkpoint_id);

CREATE TABLE IF NOT EXISTS qaqc_inspection_photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id  UUID NOT NULL REFERENCES qaqc_inspections(id) ON DELETE CASCADE,
  result_id      UUID REFERENCES qaqc_inspection_results(id),
  file_url       TEXT NOT NULL,
  geotag         POINT,
  taken_at       TIMESTAMPTZ,
  is_tampered    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qaqc_photos_insp ON qaqc_inspection_photos(inspection_id);
