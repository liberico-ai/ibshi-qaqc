CREATE TABLE IF NOT EXISTS qaqc_ai_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query         TEXT NOT NULL,
  answer_snapshot JSONB,
  user_id       INTEGER REFERENCES sys_users(id),
  feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN ('WRONG_ANSWER','MISSING_CITATION','WRONG_PAGE','OTHER')),
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user    ON qaqc_ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON qaqc_ai_feedback(created_at DESC);
