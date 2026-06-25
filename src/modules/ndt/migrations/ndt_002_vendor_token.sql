-- ============================================================
-- Module M5 — NDT: Token phạm vi cho nhà thầu (vendor scoped token)
-- Migration: ndt_002_vendor_token.sql
-- Cho phép nhà thầu nộp kết quả NDT bằng token hợp lệ (chưa hết hạn, chưa dùng)
-- mà KHÔNG cần đăng nhập đầy đủ — token chỉ có hiệu lực cho 1 yêu cầu NDT.
-- ============================================================

CREATE TABLE IF NOT EXISTS ndt_vendor_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES ndt_requests(id) ON DELETE CASCADE,
  token       VARCHAR(128) NOT NULL UNIQUE,
  vendor_id   UUID REFERENCES ndt_vendors(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ndt_vtok_request ON ndt_vendor_tokens(request_id);
CREATE INDEX IF NOT EXISTS idx_ndt_vtok_vendor  ON ndt_vendor_tokens(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ndt_vtok_token   ON ndt_vendor_tokens(token);

-- Cờ liên kết: yêu cầu NDT phát sinh tự động từ inspection IP05 (BR — tích hợp IP05/NDT).
ALTER TABLE ndt_requests ADD COLUMN IF NOT EXISTS auto_from_inspection BOOLEAN NOT NULL DEFAULT false;
