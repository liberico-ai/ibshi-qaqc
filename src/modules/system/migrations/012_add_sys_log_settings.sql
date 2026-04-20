INSERT INTO sys_settings (key, value, description, is_encrypted)
VALUES
    ('sys_log_enabled',        'true', 'Bật/tắt ghi log thao tác database (true/false)', false),
    ('sys_log_retention_days', '90',   'Số ngày lưu log trước khi tự động xóa (0 = giữ mãi)', false)
ON CONFLICT (key) DO NOTHING;
