-- Seed channel providers as rows in sys_providers.
-- Config is stored encrypted — defaults here are safe placeholders.
-- Admins set bot_token / webhook URL through the Providers admin UI.
INSERT INTO sys_providers (name, class_name, module, config, is_active)
VALUES
  ('Telegram Channel',   'notification-telegram',   'system', NULL, TRUE),
  ('Mattermost Channel', 'notification-mattermost', 'system', NULL, TRUE),
  ('Email Channel',      'notification-email',      'system', NULL, FALSE)
ON CONFLICT DO NOTHING;
