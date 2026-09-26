-- Combine roster. A simple boolean flag on athletes marks who is in the current
-- combine, so the shared Combine tab shows the same pre-loaded, alphabetical list
-- on every coach's phone. Ephemeral by design: clear it by setting all back to
-- false. Seeded with the 22 athletes already in the system for the 9/26 combine;
-- the 9 brand-new kids get flagged as they're created.
alter table athletes add column if not exists in_combine boolean default false;

update athletes set in_combine = true where id in (
  368, 414, 552, 434, 629, 548, 605, 399, 639, 647, 597,
  609, 600, 658, 421, 415, 442, 657, 577, 395, 413, 650
);
