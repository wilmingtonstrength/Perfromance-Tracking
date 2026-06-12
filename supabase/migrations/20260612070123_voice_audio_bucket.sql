-- Storage bucket for transient voice recordings on the Test Entry page.
-- Files are written by the browser, read by the transcribe-background function,
-- then deleted. Anon role can read/write because we have no authenticated user
-- on this single-tenant app; the path is a UUID so URLs are unguessable.
--
-- 25MB upload cap matches Whisper's own input limit.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-audio',
  'voice-audio',
  false,
  26214400,  -- 25 MiB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anon can upload + read + delete in this bucket. (Service role bypasses RLS.)
DROP POLICY IF EXISTS "voice_audio_anon_insert" ON storage.objects;
CREATE POLICY "voice_audio_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'voice-audio');

DROP POLICY IF EXISTS "voice_audio_anon_select" ON storage.objects;
CREATE POLICY "voice_audio_anon_select"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'voice-audio');

DROP POLICY IF EXISTS "voice_audio_anon_delete" ON storage.objects;
CREATE POLICY "voice_audio_anon_delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'voice-audio');
