ALTER TABLE sys_users
  ADD COLUMN IF NOT EXISTS sign_pin_hash VARCHAR(256),
  ADD COLUMN IF NOT EXISTS sign_salt     VARCHAR(64);

CREATE TABLE IF NOT EXISTS sys_signatures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      INTEGER NOT NULL REFERENCES sys_users(id),
  entity_type  VARCHAR(50)  NOT NULL,
  entity_id    UUID         NOT NULL,
  doc_hash     VARCHAR(64)  NOT NULL,
  signed_at    TIMESTAMPTZ  DEFAULT now(),
  ip           INET,
  user_agent   TEXT,
  pin_verified BOOLEAN      DEFAULT FALSE,
  otp_verified BOOLEAN      DEFAULT FALSE,
  method       VARCHAR(20)  DEFAULT 'PIN+OTP'
);

CREATE RULE no_update_signatures AS ON UPDATE TO sys_signatures DO INSTEAD NOTHING;
CREATE RULE no_delete_signatures AS ON DELETE TO sys_signatures DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_sig_entity ON sys_signatures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sig_user   ON sys_signatures(user_id);

CREATE TABLE IF NOT EXISTS sys_signature_voids (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id UUID NOT NULL REFERENCES sys_signatures(id),
  voided_by    INTEGER NOT NULL REFERENCES sys_users(id),
  voided_at    TIMESTAMPTZ DEFAULT now(),
  reason       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sigvoid_sig ON sys_signature_voids(signature_id);
