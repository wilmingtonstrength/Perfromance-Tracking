-- Archive of monthly adult programs (warm-up + movement + challenge).
-- One row per month, so past months are preserved and browsable instead of
-- living only in code. The Adult Program page will read the current month from
-- here; older months stay saved for look-back + program-variety analysis.

CREATE TABLE IF NOT EXISTS adult_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key   TEXT UNIQUE NOT NULL,   -- 'YYYY-MM'
  label       TEXT,
  program     JSONB NOT NULL,         -- { warmup, movement, challenge }
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
