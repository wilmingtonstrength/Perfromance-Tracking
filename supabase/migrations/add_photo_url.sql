-- Add photo_url column to athletes table for profile photos
-- RUN THIS IN THE SUPABASE SQL EDITOR
-- Photos are stored as base64 data URLs (small, compressed to 200px max)

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url TEXT;
