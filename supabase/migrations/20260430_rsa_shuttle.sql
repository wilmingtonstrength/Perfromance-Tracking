-- RSA Shuttle: 6-rep timed test stored as one row in `results`.
-- `converted_value` (existing) holds avg_time so leaderboard / PR / charts keep working.
-- The per-rep array and the other two computed values are stored alongside.

-- 1. Mark a test as multi-rep on the `tests` table.
ALTER TABLE tests
  ADD COLUMN IF NOT EXISTS multi_rep  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rep_count  INTEGER;

-- 2. Per-rep array + computed columns on the `results` table.
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS reps          JSONB,
  ADD COLUMN IF NOT EXISTS best_time     NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_time      NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_off_pct  NUMERIC;

-- 3. Insert the RSA Shuttle test row, idempotent.
--    `direction = 'lower'` (faster avg is better),
--    `unit = 'sec'` (seconds), shows on record board, youth-only by default.
INSERT INTO tests (
  id, name, athlete_type, category, category_label,
  direction, unit, display_unit,
  multi_rep, rep_count,
  show_on_record_board, record_board_section, record_board_format,
  active, sort_order
)
VALUES (
  'rsa_shuttle', 'RSA Shuttle', 'athlete', 'agility', 'Change of Direction',
  'lower', 'sec', 'sec',
  true, 6,
  true, 'speed', 'fixed2',
  true, COALESCE((SELECT MAX(sort_order) + 1 FROM tests), 100)
)
ON CONFLICT (id) DO NOTHING;
