-- Bảng sys_settings đã tồn tại từ migration 001.
-- File này chỉ để bổ sung dữ liệu mẫu nếu chưa có.
INSERT INTO sys_settings (key, value, description) VALUES
('system_name', 'IBS QA/QC Platform', 'Tên hệ thống hiển thị chung'),
('default_theme', 'light', 'Giao diện sáng / tối (light/dark)'),
('logo_url', '', 'Đường dẫn logo của hệ thống')
ON CONFLICT (key) DO NOTHING;
