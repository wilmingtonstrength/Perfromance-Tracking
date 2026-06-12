// Background Whisper transcription. The `-background` suffix tells Netlify to
// invoke this asynchronously: the HTTP request returns 202 immediately so the
// client never sits waiting on a synchronous proxy that has its own ~10s
// inactivity timeout.
//
// The audio itself is NOT in the request body — that would exceed the AWS
// Lambda async-invocation 256KB cap and 500 before our code runs. Instead the
// client uploads the audio blob directly to Supabase Storage (bucket
// 'voice-audio') and only sends us the path. We download it, send to Whisper,
// then delete the file.

const { OpenAI, toFile } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const setJob = async (supabase, jobId, fields) => {
  const row = { id: jobId, ...fields };
  await supabase.from('transcription_jobs').upsert(row, { onConflict: 'id' });
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { jobId, audioPath, mimeType, namesHint, testsHint } = payload;
  if (!jobId || typeof jobId !== 'string') {
    return { statusCode: 400, body: 'Missing jobId' };
  }
  if (!audioPath || typeof audioPath !== 'string') {
    return { statusCode: 400, body: 'Missing audioPath' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase env vars not set');
    return { statusCode: 202 };
  }

  await setJob(supabase, jobId, { status: 'pending' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await setJob(supabase, jobId, { status: 'error', error: 'OPENAI_API_KEY not configured.', finished_at: new Date().toISOString() });
    return { statusCode: 202 };
  }

  // Always try to clean the storage object up, even on error.
  const cleanupStorage = async () => {
    try { await supabase.storage.from('voice-audio').remove([audioPath]); } catch (e) { console.warn('storage cleanup failed', e); }
  };

  let audioBuffer;
  try {
    const { data, error } = await supabase.storage.from('voice-audio').download(audioPath);
    if (error || !data) throw new Error(error ? error.message : 'audio download returned no data');
    const arrayBuffer = await data.arrayBuffer();
    audioBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Storage download failed:', err);
    await setJob(supabase, jobId, { status: 'error', error: `Could not load audio: ${err.message}`, finished_at: new Date().toISOString() });
    await cleanupStorage();
    return { statusCode: 202 };
  }

  if (audioBuffer.length < 100) {
    await setJob(supabase, jobId, { status: 'error', error: 'Audio too short', finished_at: new Date().toISOString() });
    await cleanupStorage();
    return { statusCode: 202 };
  }
  if (audioBuffer.length > 25 * 1024 * 1024) {
    await setJob(supabase, jobId, { status: 'error', error: 'Audio too large (max 25MB)', finished_at: new Date().toISOString() });
    await cleanupStorage();
    return { statusCode: 202 };
  }

  const promptParts = ['A youth sports coach calling out athlete names and test names during a performance testing session.'];
  if (namesHint && typeof namesHint === 'string' && namesHint.trim()) {
    promptParts.push(`Athletes may include: ${namesHint.slice(0, 600)}.`);
  }
  if (testsHint && typeof testsHint === 'string' && testsHint.trim()) {
    promptParts.push(`Tests may include: ${testsHint.slice(0, 200)}.`);
  }
  const prompt = promptParts.join(' ').slice(0, 900);

  const extension = (mimeType || '').includes('mp4') ? 'mp4'
    : (mimeType || '').includes('ogg') ? 'ogg'
    : 'webm';

  try {
    const file = await toFile(audioBuffer, `recording.${extension}`, { type: mimeType || `audio/${extension}` });
    const openai = new OpenAI({ apiKey });
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      prompt,
      language: 'en',
      temperature: 0,
    });
    await setJob(supabase, jobId, {
      status: 'done',
      result: result.text || '',
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Whisper failed:', err);
    await setJob(supabase, jobId, {
      status: 'error',
      error: err.message || 'Transcription failed',
      finished_at: new Date().toISOString(),
    });
  }
  await cleanupStorage();
  return { statusCode: 202 };
};
