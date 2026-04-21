-- MFA factors: mỗi row là 1 factor của 1 user
CREATE TABLE IF NOT EXISTS sys_user_mfa_factors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  factor_type   VARCHAR(32) NOT NULL,    -- 'totp' | 'hotp' | 'passkey'
  factor_name   VARCHAR(128) NOT NULL,   -- label user đặt
  status        VARCHAR(16) NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'disabled'
  use_as_login  BOOLEAN NOT NULL DEFAULT FALSE,
  config        TEXT NOT NULL DEFAULT '',  -- AES-256-CBC encrypted JSON
  enrolled_at   TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, factor_type, factor_name),
  CONSTRAINT passkey_login_only CHECK (use_as_login = FALSE OR factor_type = 'passkey')
);
CREATE INDEX IF NOT EXISTS idx_mfa_factors_user_status ON sys_user_mfa_factors(user_id, status);

-- Backup codes (tách riêng để dễ invalidate)
CREATE TABLE IF NOT EXISTS sys_user_mfa_backup_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(255) NOT NULL,  -- argon2 hash
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user ON sys_user_mfa_backup_codes(user_id) WHERE used_at IS NULL;

-- Audit attempts (lockout tracking)
CREATE TABLE IF NOT EXISTS sys_mfa_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INTEGER NOT NULL REFERENCES sys_users(id),
  factor_type   VARCHAR(32),
  success       BOOLEAN NOT NULL,
  attempted_at  TIMESTAMPTZ DEFAULT now(),
  ip            INET,
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_time ON sys_mfa_attempts(user_id, attempted_at);

-- MFA enforcement policy
INSERT INTO sys_settings (key, value, description) VALUES (
  'mfa_enforcement',
  '{"enabled": false, "grace_days": 7}',
  'Chính sách bắt buộc MFA. enabled=false tắt enforcement, grace_days=số ngày ân hạn'
) ON CONFLICT (key) DO NOTHING;

-- HOTP delivery providers
INSERT INTO sys_providers (name, class_name, module, is_active, config, description) VALUES
  ('hotp-telegram',
   'TelegramOTPProvider',
   'mfa',
   FALSE,
   '{"bot_token":"","message_template":"Mã OTP của bạn: {{otp}}. Hiệu lực 5 phút."}',
   'Gửi HOTP qua Telegram bot')
ON CONFLICT (name) DO NOTHING;
