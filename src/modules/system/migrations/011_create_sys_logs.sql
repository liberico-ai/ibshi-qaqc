CREATE TABLE IF NOT EXISTS sys_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES sys_users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(20) NOT NULL,          -- insert | update | delete
    category VARCHAR(200) NOT NULL,       -- e.g. sys_users:insert
    entity_table VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sys_logs_created_at    ON sys_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_logs_user_id       ON sys_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_logs_category      ON sys_logs(category);
CREATE INDEX IF NOT EXISTS idx_sys_logs_entity        ON sys_logs(entity_table, entity_id);
