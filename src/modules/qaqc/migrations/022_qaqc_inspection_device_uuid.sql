-- 022_qaqc_inspection_device_uuid.sql
-- Sửa cột device_id từ INT → UUID để khớp với cal_devices.id (UUID).
-- Cột này được thêm ở 021 dưới dạng INT do nhầm lẫn — không tham chiếu được
-- cal_devices (UUID) nên hook calibration không hoạt động.
-- Idempotent: chỉ alter khi kiểu vẫn là integer.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qaqc_inspections'
      AND column_name = 'device_id'
      AND data_type = 'integer'
  ) THEN
    -- Drop index trước khi đổi type
    DROP INDEX IF EXISTS idx_qaqc_insp_device;
    -- Tabula rasa: cột này chưa được dùng ở bản INT (mới thêm), an toàn DROP rồi ADD lại UUID.
    ALTER TABLE qaqc_inspections DROP COLUMN device_id;
    ALTER TABLE qaqc_inspections ADD COLUMN device_id UUID;
    CREATE INDEX idx_qaqc_insp_device ON qaqc_inspections(device_id);
  END IF;
END $$;
