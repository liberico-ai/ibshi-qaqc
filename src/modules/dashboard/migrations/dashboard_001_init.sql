-- ============================================================
-- Module — Bảng điều khiển & Báo cáo (Dashboard & Reports)
-- Migration: dashboard_001_init.sql
-- Module này CHỦ YẾU đọc dữ liệu từ các module khác (truy vấn phòng thủ).
-- Bảng duy nhất ở đây dùng để lưu lịch sử chạy báo cáo định kỳ.
-- KHÔNG tạo FK tới các bảng nghiệp vụ bên ngoài.
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboard_report_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period       VARCHAR(20) NOT NULL,          -- weekly | monthly
  kind         VARCHAR(50) NOT NULL DEFAULT 'qc_kpi',
  payload      JSONB NOT NULL DEFAULT '{}',   -- snapshot KPI tại thời điểm chạy
  generated_by INT,                           -- sys_users(id), soft reference
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_runs_period  ON dashboard_report_runs(period);
CREATE INDEX IF NOT EXISTS idx_dashboard_runs_created ON dashboard_report_runs(created_at);
