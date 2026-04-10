-- ============================================================================
-- cleanup_presets.sql
-- Kaimetric: Remove unwanted test presets and rename "Flying 10 (5-10)"
-- Supabase project: jfyexedcjgerahuumyqu
-- RUN THIS IN THE SUPABASE SQL EDITOR
-- ============================================================================

BEGIN;

-- Delete unwanted test presets by name
DELETE FROM test_presets
WHERE name IN (
  '200m Dash',
  '20-Yard Sprint',
  'Push-Up Reps',
  'Chin-Up Reps',
  'Chin-Up (Weighted)',
  'Conventional Deadlift',
  'Overhead Squat',
  'RDL',
  '3-Cone Drill'
);

-- Rename "Flying 10 (5-10)" to "5-10 Fly"
UPDATE test_presets
SET name = '5-10 Fly'
WHERE name = 'Flying 10 (5-10)';

COMMIT;
