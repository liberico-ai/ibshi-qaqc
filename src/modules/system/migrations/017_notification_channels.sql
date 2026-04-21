-- User channel identities — maps each user to their identity on each channel
-- identity: channel-specific (e.g. Telegram chat_id, Mattermost webhook URL, email address)
-- Thêm kênh mới = thêm row với channel_class mới — không cần ALTER TABLE
CREATE TABLE IF NOT EXISTS sys_user_channel_identities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  channel_class        VARCHAR(50) NOT NULL,   -- 'notification-telegram' | 'notification-email' | 'notification-mattermost'
  identity             TEXT,                   -- chat_id / email / webhook_url (NULL until linked)
  is_verified          BOOLEAN DEFAULT FALSE,
  link_code            VARCHAR(10),
  link_code_expires_at TIMESTAMPTZ,
  linked_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel_class)
);
CREATE INDEX IF NOT EXISTS idx_uchan_user    ON sys_user_channel_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_uchan_class   ON sys_user_channel_identities(channel_class);
CREATE INDEX IF NOT EXISTS idx_uchan_code    ON sys_user_channel_identities(link_code) WHERE link_code IS NOT NULL;

-- Per-user, per-event-type, per-channel notification preferences
CREATE TABLE IF NOT EXISTS sys_notification_prefs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
  event_type   VARCHAR(50) NOT NULL,
  channel_class VARCHAR(50) NOT NULL,
  enabled      BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, event_type, channel_class)
);
CREATE INDEX IF NOT EXISTS idx_nprefs_user ON sys_notification_prefs(user_id);

-- Outbound webhook subscriptions for external systems (INT-05)
CREATE TABLE IF NOT EXISTS sys_webhook_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  status      VARCHAR(20) DEFAULT 'ACTIVE',
  created_by  INTEGER REFERENCES sys_users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Dead letter queue for failed external channel deliveries
CREATE TABLE IF NOT EXISTS sys_notification_dlq (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_class VARCHAR(50) NOT NULL,
  recipient    TEXT NOT NULL,
  event_type   VARCHAR(50),
  payload      JSONB NOT NULL,
  error        TEXT,
  retry_count  INT DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ndlq_created ON sys_notification_dlq(created_at DESC);
