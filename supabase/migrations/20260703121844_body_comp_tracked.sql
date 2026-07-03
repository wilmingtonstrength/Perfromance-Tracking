-- Flag for "this athlete should be tested for body composition monthly."
-- All active ADULTS are implicitly tracked (handled in app logic). This column
-- is for the specific youth athletes the coach also wants on the body-comp
-- rotation, so the "Due for Body Comp" list on Test Entry can surface them.

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS body_comp_tracked BOOLEAN DEFAULT false;

-- The named youth athletes (confirmed IDs):
--   405 Ian Mairs, 421 Kyler Terry, 461 Taylor Stewart,
--   463 Tristan Stewart, 536 Xander Scaldaferri, 580 Kaden Meares
UPDATE athletes
SET body_comp_tracked = true
WHERE id IN (405, 421, 461, 463, 536, 580);
