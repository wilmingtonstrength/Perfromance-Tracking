-- Per-athlete assessment notes (goals, training history, injury history, free-form notes).
-- One row per athlete, upserted from the app on athlete_id.
-- NOTE: athletes.id on this database is INTEGER (not UUID), so athlete_id matches.

CREATE TABLE IF NOT EXISTS athlete_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        INTEGER NOT NULL UNIQUE REFERENCES athletes(id) ON DELETE CASCADE,
  goals             TEXT DEFAULT '',
  training_history  TEXT DEFAULT '',
  injury_history    TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS athlete_assessments_athlete_id_idx
  ON athlete_assessments(athlete_id);
