-- ============================================================
-- Module M8 — Hiệu chuẩn thiết bị (Calibration)
-- Migration: calibration_001_init.sql
-- Public schema, snake_case. New cal_* tables (KHÔNG đụng tới
-- qaqc_calibration_devices đã có sẵn). Soft-references sys_users(id) INT.
-- ============================================================

-- Master List — sổ tổng danh mục thiết bị theo năm/bộ phận (ILS-QAC-F01)
CREATE TABLE IF NOT EXISTS cal_master_list (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INT NOT NULL,
  owner_dept  VARCHAR(150),
  note        TEXT,
  created_by  INT REFERENCES sys_users(id),
  updated_by  INT REFERENCES sys_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cal_master_list ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES sys_users(id);
CREATE INDEX IF NOT EXISTS idx_cal_master_year ON cal_master_list(year);

-- Devices — thiết bị đo lường cần hiệu chuẩn
CREATE TABLE IF NOT EXISTS cal_devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id    UUID REFERENCES cal_master_list(id) ON DELETE SET NULL,
  device_code  VARCHAR(100) NOT NULL UNIQUE,
  name         VARCHAR(200) NOT NULL,
  type         VARCHAR(100),
  location     VARCHAR(200),
  status       VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE|INACTIVE|RETIRED
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cal_devices_status ON cal_devices(status);
CREATE INDEX IF NOT EXISTS idx_cal_devices_master ON cal_devices(master_id);

-- Records — lần hiệu chuẩn (Calibration Master Log)
CREATE TABLE IF NOT EXISTS cal_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        UUID NOT NULL REFERENCES cal_devices(id) ON DELETE CASCADE,
  calibrated_date  DATE,
  due_date         DATE,
  certificate_no   VARCHAR(150),
  result           VARCHAR(30),                 -- PASS|FAIL|ADJUSTED
  calibrated_by    VARCHAR(200),                -- tổ chức/đơn vị hiệu chuẩn
  note             TEXT,
  -- cờ chống gửi trùng cảnh báo: lưu mốc ngày đã nhắc (30/7/1)
  alert_sent_at    JSONB NOT NULL DEFAULT '[]',
  created_by       INT REFERENCES sys_users(id),
  updated_by       INT REFERENCES sys_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cal_records ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES sys_users(id);
CREATE INDEX IF NOT EXISTS idx_cal_records_device ON cal_records(device_id);
CREATE INDEX IF NOT EXISTS idx_cal_records_due    ON cal_records(due_date);
