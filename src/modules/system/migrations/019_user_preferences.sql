ALTER TABLE sys_users
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Expected shape:
-- { "language": "vi" | "en", "timezone": "Asia/Ho_Chi_Minh", ... }
