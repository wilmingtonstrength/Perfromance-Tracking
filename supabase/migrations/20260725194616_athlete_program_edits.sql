-- Athlete-side program overrides (e.g. swapping an exercise), scoped per athlete.
-- Mirrors the coach's program_edits but keyed by athlete_id. Keyed per block/day
-- slot (not week) so a swap applies across that block's weeks.
create table if not exists athlete_program_edits (
  id uuid primary key default gen_random_uuid(),
  athlete_id bigint not null references athletes(id),
  template text not null,
  block int,
  day text,
  ex_index int,
  field text not null,
  value text,
  updated_at timestamptz default now(),
  unique (athlete_id, template, block, day, ex_index, field)
);
grant all on table athlete_program_edits to anon, authenticated, service_role;
