-- Adult assessment type. Athlete assessments keep using the existing columns
-- untouched; adult intake (movement screen, prescription, outcome, etc.) lives in
-- a single jsonb blob so the athlete flow never changes.
alter table athlete_assessments add column if not exists assessment_type text default 'athlete';
alter table athlete_assessments add column if not exists adult_data jsonb;
