-- 021_qaqc_inspection_device.sql
-- Bổ sung cột thiết bị đo (device_id) và tham chiếu mối hàn (weld_joint_ref)
-- cho bảng phiếu nghiệm thu. Idempotent — an toàn khi chạy lại.

ALTER TABLE qaqc_inspections ADD COLUMN IF NOT EXISTS device_id INT;
ALTER TABLE qaqc_inspections ADD COLUMN IF NOT EXISTS weld_joint_ref VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_qaqc_insp_device     ON qaqc_inspections(device_id);
CREATE INDEX IF NOT EXISTS idx_qaqc_insp_weld_joint ON qaqc_inspections(weld_joint_ref);
