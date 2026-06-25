-- NCR SLA tracking (BR03.01) — bổ sung cột hạn SLA & trạng thái SLA cho ncr_records
-- Hạn SLA mặc định suy ra từ mức độ nghiêm trọng khi tạo (critical=3, major=7, minor=14 ngày).
-- sla_status được TÍNH KHI ĐỌC trong service (ON_TIME/AT_RISK/OVERDUE/CLOSED) — cột dưới chỉ là
-- bộ nhớ đệm tuỳ chọn, không bắt buộc đồng bộ.

ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS sla_due_date DATE;
ALTER TABLE ncr_records ADD COLUMN IF NOT EXISTS sla_status   VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_ncr_sla_due ON ncr_records(sla_due_date);

-- Backfill hạn SLA cho các NCR đã tồn tại mà chưa có sla_due_date:
-- ưu tiên due_date thủ công nếu có, ngược lại suy từ severity dựa trên created_at.
UPDATE ncr_records
SET sla_due_date = COALESCE(
  due_date,
  (created_at::date + (
    CASE severity
      WHEN 'critical' THEN INTERVAL '3 days'
      WHEN 'major'    THEN INTERVAL '7 days'
      ELSE                 INTERVAL '14 days'
    END
  ))::date
)
WHERE sla_due_date IS NULL;
