-- Task 3: Liên kết metadata file NAS (PDF/DOC) vào bản ghi mà KHÔNG di chuyển file.
-- Chỉ lưu đường dẫn/URL tới file trên NAS cùng metadata tối thiểu.

CREATE TABLE IF NOT EXISTS sys_file_links (
  id           BIGSERIAL PRIMARY KEY,
  entity_type  VARCHAR(100) NOT NULL,  -- VD: project, ncr, inspection, mdr
  entity_id    VARCHAR(100) NOT NULL,  -- id bản ghi được liên kết
  file_name    VARCHAR(512) NOT NULL,  -- tên file hiển thị
  nas_path     TEXT NOT NULL,          -- đường dẫn UNC/URL tới file trên NAS
  mime_type    VARCHAR(150),
  linked_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  linked_by    INT REFERENCES sys_users(id)
);

CREATE INDEX IF NOT EXISTS idx_sys_file_links_entity
  ON sys_file_links (entity_type, entity_id);

-- Tránh tạo trùng liên kết cho cùng 1 file vào cùng 1 bản ghi.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sys_file_links_unique
  ON sys_file_links (entity_type, entity_id, nas_path);
