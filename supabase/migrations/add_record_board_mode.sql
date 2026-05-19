-- Add record_board_mode to gyms (youth = age/gender filters, team = varsity/jv filter)
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS record_board_mode TEXT NOT NULL DEFAULT 'youth'
  CHECK (record_board_mode IN ('youth', 'team'));

-- Add team_level to athletes (used when gym is in team mode)
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS team_level TEXT
  CHECK (team_level IS NULL OR team_level IN ('varsity', 'jv'));
