// Polled by the client to check on a background transcription job.
// Reads from the Supabase transcription_jobs table using the service role.

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: 'Missing id query param' };
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { statusCode: 500, body: JSON.stringify({ status: 'error', error: 'Supabase env vars not set on the server.' }) };
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('transcription_jobs')
      .select('status,result,error')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Background hasn't written the 'pending' row yet — treat as still queued.
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: data.status,
        text: data.result || undefined,
        error: data.error || undefined,
      }),
    };
  } catch (err) {
    console.error('transcribe-status failed:', err);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', error: err.message }) };
  }
};
