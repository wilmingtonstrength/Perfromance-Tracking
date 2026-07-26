-- Static (squat) jump test — paused-in-the-bottom, no countermovement.
-- Paired with Vertical Jump (countermovement) to compute Eccentric Utilization
-- Ratio (EUR = CMJ / SJ) in the athlete profile ("Eccentric Capability").
-- Mirrors Vertical Jump's config, but kept off the record board (diagnostic).

INSERT INTO tests (
  id, name, unit, direction, category, category_label, display_unit,
  feet_inches, row_time, allow_kg, show_on_record_board, record_board_format,
  athlete_type, sort_order, active
)
VALUES (
  'static_jump', 'Static Jump', 'inches', 'higher', 'power', 'Power', 'in',
  false, false, false, false, 'fixed1',
  'both', 14, true
)
ON CONFLICT (id) DO NOTHING;
