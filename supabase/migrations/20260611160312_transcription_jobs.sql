-- Background transcription jobs. Used by the voice entry feature on Test Entry.
-- The transcribe-background Netlify function inserts a 'pending' row, calls
-- Whisper, then updates the row to 'done' or 'error'. The transcribe-status
-- function reads the row to report progress to the client.
--
-- Writes are server-side only (service_role bypasses RLS). The id is a UUID,
-- so reads via the status endpoint don't need a user-scoped policy — the URL
-- itself is unguessable.

CREATE TABLE IF NOT EXISTS transcription_jobs (
  id           UUID PRIMARY KEY,
  status       TEXT NOT NULL DEFAULT 'pending',
  result       TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transcription_jobs_created_at_idx
  ON transcription_jobs (created_at);
