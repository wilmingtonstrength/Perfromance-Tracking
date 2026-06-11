// Polled by the client to check on a background transcription job.
//
// Returns { status: 'pending' | 'done' | 'error', text?, error? } from Netlify Blobs.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id query param' };
  }
  try {
    const store = getStore('transcriptions');
    const data = await store.get(id, { type: 'json' });
    if (!data) {
      // Background hasn't written 'pending' yet — treat as still queued.
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('transcribe-status failed:', err);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', error: err.message }) };
  }
};
