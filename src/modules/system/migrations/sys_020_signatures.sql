-- Gap-03: Khôi phục chữ ký số (digital signature) cho các bước ký/phê duyệt/nghiệm thu.
-- Hai bảng:
--   sys_user_pins   : lưu PIN ký số đã băm (argon2), mỗi user 1 PIN.
--   sys_signatures  : sổ chữ ký APPEND-ONLY (chỉ INSERT/SELECT), có giá trị
--                     chống chối bỏ (non-repudiation). Không cho UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS sys_user_pins (
  user_id     INT PRIMARY KEY REFERENCES sys_users(id) ON DELETE CASCADE,
  pin_hash    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_signatures (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES sys_users(id),
  entity_type  VARCHAR(100) NOT NULL,   -- VD: inspection, itp, mir
  entity_id    VARCHAR(100) NOT NULL,   -- id của bản ghi được ký (uuid hoặc int dạng text)
  action       VARCHAR(100) NOT NULL,   -- VD: sign, approve, accept
  signed_hash  VARCHAR(128) NOT NULL,   -- SHA-256 hex của payload tại thời điểm ký
  pin_verified BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_signatures_entity
  ON sys_signatures (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sys_signatures_user
  ON sys_signatures (user_id);

-- ── APPEND-ONLY enforcement ─────────────────────────────────────────────
-- Chặn mọi UPDATE/DELETE trên sys_signatures ở tầng database để bảo đảm
-- tính bất biến (immutability) của chữ ký, kể cả khi code có lỗi.
CREATE OR REPLACE FUNCTION sys_signatures_block_modify()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'sys_signatures la append-only: khong cho phep % ', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sys_signatures_no_update ON sys_signatures;
CREATE TRIGGER trg_sys_signatures_no_update
  BEFORE UPDATE OR DELETE ON sys_signatures
  FOR EACH ROW EXECUTE FUNCTION sys_signatures_block_modify();
