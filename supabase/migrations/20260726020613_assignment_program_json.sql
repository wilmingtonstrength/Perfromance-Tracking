-- Per-athlete editable program document. Seeded from the template at assign
-- time; the coach edits this (add/remove exercises, add blocks, copy days) and
-- the athlete portal renders it. Null = fall back to the shared template.
alter table assignments add column if not exists program_json jsonb;
