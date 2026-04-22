ALTER TABLE qaqc_itp_items
  ADD COLUMN IF NOT EXISTS hold_type             VARCHAR(5)  DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS release_required_role VARCHAR(20);

-- NONE / W (Witness) / H (Hold) / HC (Hold-Customer)
-- release_required_role: QC-MGR / QC-DIR / CUSTOMER

CREATE TABLE IF NOT EXISTS qaqc_itp_ip_releases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID         NOT NULL REFERENCES qaqc_itp_items(id),
  released_by  INTEGER      NOT NULL REFERENCES sys_users(id),
  released_at  TIMESTAMPTZ  DEFAULT now(),
  comment      TEXT         NOT NULL CHECK (length(comment) >= 20),
  signature_id UUID         REFERENCES sys_signatures(id),
  is_override  BOOLEAN      DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_ip_release_item ON qaqc_itp_ip_releases(item_id);

CREATE TABLE IF NOT EXISTS sys_overrides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type VARCHAR(50)  NOT NULL,
  entity_id     UUID         NOT NULL,
  reason        TEXT         NOT NULL CHECK (length(reason) >= 50),
  performed_by  INTEGER      NOT NULL REFERENCES sys_users(id),
  performed_at  TIMESTAMPTZ  DEFAULT now(),
  signature_id  UUID         REFERENCES sys_signatures(id)
);
CREATE INDEX IF NOT EXISTS idx_overrides_entity   ON sys_overrides(entity_id);
CREATE INDEX IF NOT EXISTS idx_overrides_type_at  ON sys_overrides(override_type, performed_at DESC);
