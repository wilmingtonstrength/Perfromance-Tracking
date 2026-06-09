-- Open body comp tests (body weight, body fat %, skeletal muscle mass) to youth
-- athletes as well as adults, and stop rounding body weight / muscle mass.
--
-- Before: athlete_type='adult' meant only the Adult Client side of Test Entry
-- could enter these. Coaches now want them on the youth side too (growth tracking,
-- in-season weight monitoring).
--
-- record_board_format 'round' was stripping decimals from body weight and muscle
-- mass on display. fixed1 shows one decimal place (165.4 lb, 75.2 lb). Body fat %
-- was already on fixed1 so it's untouched here.

UPDATE tests
SET athlete_type = 'both'
WHERE id IN ('body_weight', 'body_fat_pct', 'lean_muscle_mass');

UPDATE tests
SET record_board_format = 'fixed1'
WHERE id IN ('body_weight', 'lean_muscle_mass');
