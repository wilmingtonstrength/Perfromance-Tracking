-- Normalize athlete gender to 'Male' / 'Female'. The assessment and combine forms
-- had been storing single letters ('M' / 'F'), and some older rows used lowercase,
-- which dropped those athletes off the gender-split record board. One-time cleanup;
-- the forms now store the full words too.
UPDATE athletes SET gender = 'Female' WHERE lower(gender) IN ('f', 'female');
UPDATE athletes SET gender = 'Male'   WHERE lower(gender) IN ('m', 'male');
