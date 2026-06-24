-- ============================================================
-- Module M4 — Quản lý hàn (Welding)
-- Migration: welding_001_init.sql
-- Public schema, snake_case. Soft-references qaqc_projects(id) UUID,
-- sys_users(id) INT. All FKs within this module are hard FKs.
-- ============================================================

-- WPS — Welding Procedure Specification
CREATE TABLE IF NOT EXISTS wld_wps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wps_no           VARCHAR(100) NOT NULL UNIQUE,
  project_id       UUID REFERENCES qaqc_projects(id),
  process          VARCHAR(50),          -- SMAW, GTAW, GMAW, FCAW, SAW ...
  base_metal       VARCHAR(200),
  position         VARCHAR(50),          -- 1G, 2G, 3G, 6G ...
  thickness_range  VARCHAR(100),         -- ví dụ: "3-20 mm"
  status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',  -- DRAFT|APPROVED|OBSOLETE
  approved_by      INT REFERENCES sys_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_wps_project ON wld_wps(project_id);
CREATE INDEX IF NOT EXISTS idx_wld_wps_status  ON wld_wps(status);

-- PQR — Procedure Qualification Record
CREATE TABLE IF NOT EXISTS wld_pqr (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pqr_no       VARCHAR(100) NOT NULL UNIQUE,
  wps_id       UUID REFERENCES wld_wps(id) ON DELETE SET NULL,
  test_result  VARCHAR(30) NOT NULL DEFAULT 'PASS',  -- PASS|FAIL
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_pqr_wps ON wld_pqr(wps_id);

-- Welders — danh bạ thợ hàn
CREATE TABLE IF NOT EXISTS wld_welders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  welder_code  VARCHAR(50) NOT NULL UNIQUE,
  full_name    VARCHAR(200) NOT NULL,
  stamp_no     VARCHAR(50),
  status       VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|INACTIVE
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_welders_status ON wld_welders(status);

-- Welder qualifications — phạm vi chứng chỉ (process/position/thickness) + hiệu lực
CREATE TABLE IF NOT EXISTS wld_welder_quals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  welder_id             UUID NOT NULL REFERENCES wld_welders(id) ON DELETE CASCADE,
  process               VARCHAR(50),
  position              VARCHAR(50),
  thickness_min         NUMERIC(8,2),
  thickness_max         NUMERIC(8,2),
  cert_no               VARCHAR(100),
  qualified_date        DATE,
  expiry_date           DATE,
  continuity_last_date  DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_quals_welder ON wld_welder_quals(welder_id);
CREATE INDEX IF NOT EXISTS idx_wld_quals_expiry ON wld_welder_quals(expiry_date);

-- Weld maps — bản đồ mối hàn
CREATE TABLE IF NOT EXISTS wld_weld_maps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES qaqc_projects(id),
  drawing_no   VARCHAR(100),
  name         VARCHAR(200),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_maps_project ON wld_weld_maps(project_id);

-- Weld joints — mối hàn được gán thợ hàn + WPS
CREATE TABLE IF NOT EXISTS wld_weld_joints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weld_map_id   UUID NOT NULL REFERENCES wld_weld_maps(id) ON DELETE CASCADE,
  joint_no      VARCHAR(50) NOT NULL,
  wps_id        UUID REFERENCES wld_wps(id) ON DELETE SET NULL,
  welder_id     UUID REFERENCES wld_welders(id) ON DELETE SET NULL,
  ndt_required  BOOLEAN NOT NULL DEFAULT false,
  status        VARCHAR(30) NOT NULL DEFAULT 'PLANNED',  -- PLANNED|WELDED|ACCEPTED|REJECTED
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wld_joints_map    ON wld_weld_joints(weld_map_id);
CREATE INDEX IF NOT EXISTS idx_wld_joints_welder ON wld_weld_joints(welder_id);
CREATE INDEX IF NOT EXISTS idx_wld_joints_wps    ON wld_weld_joints(wps_id);
