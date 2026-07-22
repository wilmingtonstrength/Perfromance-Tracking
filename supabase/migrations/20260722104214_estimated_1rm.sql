-- Estimated 1RM support on the results table.
-- The 1RM Logger (Test Entry) posts an estimated max for a grinding lift from a
-- working set (weight x reps, Epley). These flags let the Record Board show an
-- "est" tag and keep the rep context for display/trends.
--
-- estimated = true  -> value came from a rep-max estimate (not a tested single)
-- est_reps          -> reps performed on the logged set (1 = tested single)

ALTER TABLE results
  ADD COLUMN IF NOT EXISTS estimated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS est_reps  INTEGER;
