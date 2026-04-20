INSERT INTO sys_settings (key, value, description) VALUES
('log_level', 'info', 'Mức độ ghi log của hệ thống (trace/debug/info/warn/error/fatal)')
ON CONFLICT (key) DO NOTHING;
