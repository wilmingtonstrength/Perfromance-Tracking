// Background Whisper transcription. The `-background` suffix tells Netlify to
// invoke this asynchronously: the HTTP request returns 202 immediately so the
// client never sits waiting on a synchronous proxy that has its own ~10s
// inactivity timeout (which was producing the 504 the coach was seeing).
//
// The client generates a job_id (UUID) and includes it in the POST body. This
// function stores the result in Netlify Blobs under that key. The client polls
// `/.netlify/functions/transcribe-status?id=<job_id>` until done.

const { OpenAI, toFile } = require('openai');
const { getStore } = require('@netlify/blobs');

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

  const { jobId, audio, mimeType, namesHint, testsHint } = payload;
  if (!jobId || typeof jobId !== 'string') {
    return { statusCode: 400, body: 'Missing jobId' };
  }
  if (!audio || typeof audio !== 'string') {
    return { statusCode: 400, body: 'Missing audio' };
  }

  const store = getStore('transcriptions');
  await store.setJSON(jobId, { status: 'pending', createdAt: new Date().toISOString() });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await store.setJSON(jobId, { status: 'error', error: 'OPENAI_API_KEY not configured on the server.' });
    return { statusCode: 202 };
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audio, 'base64');
  } catch {
    await store.setJSON(jobId, { status: 'error', error: 'Audio could not be decoded' });
    return { statusCode: 202 };
  }
  if (audioBuffer.length < 100) {
    await store.setJSON(jobId, { status: 'error', error: 'Audio too short' });
    return { statusCode: 202 };
  }
  if (audioBuffer.length > 25 * 1024 * 1024) {
    await store.setJSON(jobId, { status: 'error', error: 'Audio too large (max 25MB)' });
    return { statusCode: 202 };
  }

  // Prime Whisper with the roster + tests so unusual surnames transcribe right.
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
    await store.setJSON(jobId, {
      status: 'done',
      text: result.text || '',
      finishedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Whisper failed:', err);
    await store.setJSON(jobId, {
      status: 'error',
      error: err.message || 'Transcription failed',
      finishedAt: new Date().toISOString(),
    });
  }
  // Background functions return 202 regardless; the body is ignored by Netlify.
  return { statusCode: 202 };
};
