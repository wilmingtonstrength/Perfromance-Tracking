-- Allow free-text set values ("7 feet", "1.9s", "225") in the athlete portal.
alter table workout_logs alter column value type text using value::text;
