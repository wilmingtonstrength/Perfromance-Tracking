-- Phone number captured at signup for high-touch onboarding outreach
ALTER TABLE gym_users
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Track whether the gym owner has dismissed the "Book a setup call" CTA
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS setup_call_dismissed_at TIMESTAMPTZ;

-- Track whether the gym owner has clicked the "Book a setup call" CTA
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS setup_call_clicked_at TIMESTAMPTZ;
