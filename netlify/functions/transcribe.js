// Whisper transcription endpoint for the Test Entry voice button.
//
// Receives a JSON body with:
//   audio:     base64-encoded audio (webm/opus from Chrome, mp4 from Safari)
//   mimeType:  MIME type of the audio
//   namesHint: comma-separated roster names to bias Whisper's recognition
//   testsHint: comma-separated test names for the same purpose
//
// Calls OpenAI Whisper, returns { text }. Requires OPENAI_API_KEY env var.

const { OpenAI, toFile } = require('openai');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'OPENAI_API_KEY not configured on the server.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  const { audio, mimeType, namesHint, testsHint } = payload;
  if (!audio || typeof audio !== 'string') {
    return { statusCode: 400, body: 'Missing audio (base64 string expected)' };
  }

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audio, 'base64');
  } catch {
    return { statusCode: 400, body: 'Audio could not be decoded' };
  }
  if (audioBuffer.length < 100) {
    return { statusCode: 400, body: 'Audio too short' };
  }
  // Hard cap on size (~25MB Whisper limit, but really we never want this much from a phone)
  if (audioBuffer.length > 10 * 1024 * 1024) {
    return { statusCode: 413, body: 'Audio too large' };
  }

  // Whisper's prompt is capped at ~244 tokens. Build a compact bias prompt
  // listing the athletes and tests the coach is likely to call out. This is
  // the secret sauce: priming the model with the actual roster makes "Kraft",
  // "Mears", "Caffee", etc. much more likely to be transcribed correctly.
  const promptParts = ['A youth sports coach calling out athlete names and test names during a performance testing session.'];
  if (namesHint && typeof namesHint === 'string' && namesHint.trim()) {
    // Truncate to keep prompt under the token limit (rough: 4 chars per token).
    const namesTrimmed = namesHint.slice(0, 600);
    promptParts.push(`Athletes may include: ${namesTrimmed}.`);
  }
  if (testsHint && typeof testsHint === 'string' && testsHint.trim()) {
    promptParts.push(`Tests may include: ${testsHint.slice(0, 200)}.`);
  }
  const prompt = promptParts.join(' ').slice(0, 900); // safety cap

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
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result.text || '' }),
    };
  } catch (err) {
    console.error('Whisper transcription failed:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Transcription failed' }),
    };
  }
};
