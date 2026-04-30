-- RSA Shuttle: a 6-rep timed test stored as one row in test_results.
-- `value` (existing column) holds avg_time so leaderboards / PR / charts keep working.
-- The per-rep array and the other two computed values are stored alongside.

ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS reps          JSONB,
  ADD COLUMN IF NOT EXISTS best_time     NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_time      NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_off_pct  NUMERIC;

-- Add the test to Wilmington Strength's custom_tests, scoped to that one gym.
-- Look the gym up by name so this migration is portable.
-- Mark it as `multi_rep` via the conversion_formula JSON so the app can detect it
-- without needing a brand new schema column.
INSERT INTO custom_tests (
  gym_id, name, unit, direction, display_unit,
  conversion_formula, category, sort_order, show_on_record_board, active
)
SELECT
  g.id,
  'RSA Shuttle',
  'sec',
  'lower',
  'sec',
  '{"type":"multi_rep","reps":6}'::jsonb,
  'agility',
  COALESCE((SELECT MAX(sort_order) + 1 FROM custom_tests WHERE gym_id = g.id), 0),
  true,
  true
FROM gyms g
WHERE g.name ILIKE 'Wilmington Strength%'
  AND NOT EXISTS (
    SELECT 1 FROM custom_tests ct
    WHERE ct.gym_id = g.id AND ct.name = 'RSA Shuttle'
  );
