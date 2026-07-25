-- Online program delivery: athlete per-set training log + program assignments.
-- Anon-key access, consistent with the rest of this project's tables.

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id bigint not null references athletes(id),
  template text not null,
  block int,
  week int,
  day text,
  ex_index int,
  ex_name text,
  set_index int,
  value numeric,
  unit text,
  note text,
  logged_at timestamptz default now(),
  unique (athlete_id, template, block, week, day, ex_index, set_index)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id bigint not null references athletes(id),
  template text not null,
  start_date date default current_date,
  active boolean default true,
  created_at timestamptz default now()
);

grant all on table workout_logs to anon, authenticated, service_role;
grant all on table assignments  to anon, authenticated, service_role;
