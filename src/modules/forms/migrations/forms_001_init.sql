-- ============================================================
-- Module — Biểu mẫu bổ sung (Forms): RFI, Painting/DFT, Pressure Test
-- Migration: forms_001_init.sql
-- Public schema, snake_case. project_id để mềm (UUID, không FK cứng)
-- để không phụ thuộc thứ tự migrate. FK cứng tới sys_users(id) INT.
-- ============================================================

-- RFI — Request For Inspection (ILS-QAC-F06) 2 chiều (nội bộ + bên ngoài)
CREATE TABLE IF NOT EXISTS frm_rfi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfi_no            VARCHAR(100) NOT NULL UNIQUE,
  project_id        UUID,
  type              VARCHAR(20) NOT NULL DEFAULT 'internal',  -- internal | external
  inspection_point  VARCHAR(200),
  requested_by      INT REFERENCES sys_users(id),
  assigned_to       INT REFERENCES sys_users(id),
  status            VARCHAR(30) NOT NULL DEFAULT 'OPEN',      -- OPEN|SCHEDULED|DONE|CLOSED|REJECTED
  scheduled_at      TIMESTAMPTZ,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_frm_rfi_project ON frm_rfi(project_id);
CREATE INDEX IF NOT EXISTS idx_frm_rfi_status  ON frm_rfi(status);
CREATE INDEX IF NOT EXISTS idx_frm_rfi_type    ON frm_rfi(type);

-- Painting / DFT (ILS-QAC-F12) — kiểm tra chiều dày màng sơn khô + ngưỡng
CREATE TABLE IF NOT EXISTS frm_painting (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID,
  area          VARCHAR(200),
  dft_reading   NUMERIC(10,2),
  dft_min       NUMERIC(10,2),
  dft_max       NUMERIC(10,2),
  surface_prep  VARCHAR(100),                  -- ví dụ: Sa2.5, St3
  result        VARCHAR(20),                   -- PASS | FAIL
  inspected_by  INT REFERENCES sys_users(id),
  inspected_at  TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_frm_painting_project ON frm_painting(project_id);
CREATE INDEX IF NOT EXISTS idx_frm_painting_result  ON frm_painting(result);

-- Pressure Test Certificate (ILS-QAC-F14) — hydro / pneumatic
CREATE TABLE IF NOT EXISTS frm_pressure_test (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID,
  test_no         VARCHAR(100) NOT NULL UNIQUE,
  medium          VARCHAR(20) NOT NULL DEFAULT 'hydro',  -- hydro | pneumatic
  pressure_value  NUMERIC(12,3),
  hold_time       VARCHAR(50),                            -- ví dụ: "30 min"
  result          VARCHAR(20),                            -- PASS | FAIL
  certificate_no  VARCHAR(150),
  tested_at       TIMESTAMPTZ,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_frm_pressure_project ON frm_pressure_test(project_id);
CREATE INDEX IF NOT EXISTS idx_frm_pressure_result  ON frm_pressure_test(result);
