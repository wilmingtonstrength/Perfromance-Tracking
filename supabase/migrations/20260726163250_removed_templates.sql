-- Templates the coach has deleted. Built-ins can't be removed from code at
-- runtime, so we record their id here and filter them out everywhere.
create table if not exists removed_templates (
  id text primary key,
  removed_at timestamptz default now()
);
grant all on table removed_templates to anon, authenticated, service_role;
