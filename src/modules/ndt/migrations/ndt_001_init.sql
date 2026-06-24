-- ============================================================
-- Module M5 — Kiểm tra không phá huỷ (NDT)
-- Migration: ndt_001_init.sql
-- IMPORTANT: migrations chạy theo thứ tự alphabet → ndt_* chạy TRƯỚC welding_*.
-- Vì vậy KHÔNG tạo hard FK tới bảng welding. Dùng cột phẳng nullable
-- weld_joint_ref INT (không có ràng buộc FK) để liên kết mềm tới mối hàn.
-- Soft-references: qaqc_projects(id) UUID, qaqc_inspections(id) UUID, sys_users(id) INT.
-- ============================================================

-- Nhà thầu NDT
CREATE TABLE IF NOT EXISTS ndt_vendors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200) NOT NULL,
  contact_email  VARCHAR(200),
  is_approved    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ndt_vendors_approved ON ndt_vendors(is_approved);

-- Yêu cầu NDT (ILS-QAC-F11)
CREATE TABLE IF NOT EXISTS ndt_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no      VARCHAR(100) NOT NULL UNIQUE,
  project_id      UUID REFERENCES qaqc_projects(id),
  method          VARCHAR(10) NOT NULL,             -- RT|UT|MT|PT
  inspection_id   UUID REFERENCES qaqc_inspections(id),  -- soft ref (hard FK OK, qaqc chạy trước)
  weld_joint_ref  INT,                              -- liên kết mềm tới mối hàn welding, KHÔNG FK
  vendor_id       UUID REFERENCES ndt_vendors(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED|SENT|IN_PROGRESS|COMPLETED|CANCELLED
  requested_by    INT REFERENCES sys_users(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ndt_req_project    ON ndt_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ndt_req_vendor     ON ndt_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ndt_req_status     ON ndt_requests(status);
CREATE INDEX IF NOT EXISTS idx_ndt_req_method     ON ndt_requests(method);
CREATE INDEX IF NOT EXISTS idx_ndt_req_inspection ON ndt_requests(inspection_id);

-- Kết quả NDT (F08 / F15)
CREATE TABLE IF NOT EXISTS ndt_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES ndt_requests(id) ON DELETE CASCADE,
  result        VARCHAR(10) NOT NULL,               -- accept|reject
  report_no     VARCHAR(100),
  file_link     TEXT,
  recorded_by   INT REFERENCES sys_users(id),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ndt_results_request ON ndt_results(request_id);
