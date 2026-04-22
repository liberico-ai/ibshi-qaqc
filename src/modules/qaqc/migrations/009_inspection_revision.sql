ALTER TABLE qaqc_inspections
  ADD COLUMN IF NOT EXISTS revision        INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parent_id       UUID REFERENCES qaqc_inspections(id),
  ADD COLUMN IF NOT EXISTS original_id     UUID REFERENCES qaqc_inspections(id),
  ADD COLUMN IF NOT EXISTS revision_reason TEXT;

-- Only one current revision per inspection chain
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_current
  ON qaqc_inspections(original_id) WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_inspection_original ON qaqc_inspections(original_id);
CREATE INDEX IF NOT EXISTS idx_inspection_parent   ON qaqc_inspections(parent_id);

-- Block DELETE: append-only history
CREATE OR REPLACE RULE no_delete_inspections AS ON DELETE TO qaqc_inspections DO INSTEAD NOTHING;

-- Backfill existing rows: original_id = self, revision=1, is_current=true
UPDATE qaqc_inspections
  SET original_id = id, revision = 1, is_current = TRUE
  WHERE original_id IS NULL;
