CREATE TABLE IF NOT EXISTS sys_providers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  class_name  VARCHAR(100) NOT NULL,
  module      VARCHAR(50)  NOT NULL,
  config      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  INT REFERENCES sys_users(id),
  updated_by  INT REFERENCES sys_users(id)
);

CREATE INDEX IF NOT EXISTS idx_sys_providers_class  ON sys_providers(class_name);
CREATE INDEX IF NOT EXISTS idx_sys_providers_module ON sys_providers(module);
CREATE INDEX IF NOT EXISTS idx_sys_providers_active ON sys_providers(is_active);
