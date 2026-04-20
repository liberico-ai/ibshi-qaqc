CREATE TABLE sys_notifications (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL DEFAULT 'USER', /* 'USER' or 'MEMBER' */
    target_id INT NOT NULL, /* references sys_users.id or loy_members.id */
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO', /* INFO, WARNING, SUCCESS, ERROR */
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INT REFERENCES sys_users(id)
);

CREATE INDEX idx_sys_notifications_target ON sys_notifications(target_type, target_id);
CREATE INDEX idx_sys_notifications_created_at ON sys_notifications(created_at DESC);
CREATE INDEX idx_sys_notifications_is_read ON sys_notifications(is_read);
