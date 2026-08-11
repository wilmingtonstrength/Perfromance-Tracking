-- Assessments capture where an athlete comes from: their school and how they
-- heard about Wilmington Strength. Added so the one-page New Assessment flow can
-- record the full intake (school + referral source) alongside sport/goals/history.
alter table athlete_assessments add column if not exists school text default '';
alter table athlete_assessments add column if not exists how_heard text default '';
