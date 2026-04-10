-- Add standing_reach column to athletes table for Jump Calculator
-- RUN THIS IN THE SUPABASE SQL EDITOR
-- standing_reach is stored in total inches (e.g., 7'2" = 86 inches)

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS standing_reach NUMERIC;
