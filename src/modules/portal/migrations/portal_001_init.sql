-- ============================================================
-- Module — Cổng khách hàng (Client Portal, read-only)
-- Migration: portal_001_init.sql
-- Gán quyền truy cập theo (user_id, project_id). FK cứng tới sys_users(id).
-- project_id để mềm (UUID, không FK) để không phụ thuộc thứ tự migrate.
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_project_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      INT NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL,
  client_name  VARCHAR(200),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_portal_access_user    ON portal_project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_project ON portal_project_access(project_id);
