// Remote MCP server for the Wilmington Strength performance data.
// Exposes read-only analytics tools to Claude chat (claude.ai custom connector).
//
// Transport: MCP "Streamable HTTP", implemented statelessly — every POST is a
// self-contained JSON-RPC call answered with a single application/json response
// (no SSE session needed for a pure tool server).
//
// Auth: a shared secret passed as ?key=... in the URL (compared to MCP_SECRET).
// Outputs are aggregate stats (correlation r, sample size n) — no athlete PII —
// so even the tool results carry nothing sensitive.
//
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MCP_SECRET.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_SECRET = process.env.MCP_SECRET;
const SERVER_INFO = { name: 'wilmington-strength', version: '1.0.0' };

// ---- Supabase fetch + correlation engine ----
let _cache = null; // { tests, best } cached for the lifetime of a warm invocation
async function loadData() {
  if (_cache) return _cache;
  const headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
  const testsRes = await fetch(`${SUPABASE_URL}/rest/v1/tests?select=id,name,direction,category&active=eq.true`, { headers });
  const tests = await testsRes.json();
  const testById = {};
  tests.forEach(t => { testById[t.id] = t; });
  // Paginate results
  let all = [], from = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/results?select=athlete_id,test_id,converted_value&limit=1000&offset=${from}`, { headers });
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  // best value per (athlete, test), direction-aware
  const best = {}; // testId -> { athleteId: value }
  for (const r of all) {
    const v = parseFloat(r.converted_value);
    if (isNaN(v)) continue;
    const t = testById[r.test_id];
    if (!t) continue;
    if (!best[r.test_id]) best[r.test_id] = {};
    const cur = best[r.test_id][r.athlete_id];
    if (cur === undefined) best[r.test_id][r.athlete_id] = v;
    else best[r.test_id][r.athlete_id] = t.direction === 'lower' ? Math.min(cur, v) : Math.max(cur, v);
  }
  _cache = { tests, testById, best };
  return _cache;
}

function pearson(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pairs) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

function correlate(best, aId, bId) {
  const sa = best[aId] || {}, sb = best[bId] || {};
  const pairs = [];
  for (const ath of Object.keys(sa)) {
    if (sb[ath] !== undefined) pairs.push([sa[ath], sb[ath]]);
  }
  return { r: pearson(pairs), n: pairs.length };
}

// Resolve a user-supplied test string to a test id. Matches id, exact name,
// then substring; plus a few coach aliases.
const ALIASES = {
  'rea vert': 'approach_jump', 'reactive vert': 'approach_jump', 'approach': 'approach_jump',
  'single leg rsi': 'sl_rsi_l', 'sl rsi': 'sl_rsi_l',
  '505': '5_0_5', '5 0 5': '5_0_5', '5-0-5': '5_0_5',
  'max v': 'max_velocity', 'maxv': 'max_velocity',
};
function resolveTest(tests, q) {
  if (!q) return { error: 'No test specified' };
  const s = String(q).trim().toLowerCase();
  const byId = tests.find(t => t.id.toLowerCase() === s);
  if (byId) return { id: byId.id };
  if (ALIASES[s]) return { id: ALIASES[s] };
  const byName = tests.find(t => t.name.toLowerCase() === s);
  if (byName) return { id: byName.id };
  const subs = tests.filter(t => t.name.toLowerCase().includes(s) || t.id.toLowerCase().includes(s));
  if (subs.length === 1) return { id: subs[0].id };
  if (subs.length > 1) return { error: `Ambiguous "${q}". Matches: ${subs.map(t => `${t.name} (${t.id})`).join(', ')}` };
  return { error: `No test matches "${q}". Call list_tests to see available test ids.` };
}

const rLabel = (r) => {
  const a = Math.abs(r);
  const s = a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'negligible';
  return `${s} ${r < 0 ? 'negative' : 'positive'}`;
};

// ---- Tool definitions ----
const TOOLS = [
  {
    name: 'list_tests',
    description: 'List every active test in the Wilmington Strength database (id, name, direction, category). Call this first to learn valid test ids for the other tools.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'correlate',
    description: 'Pearson correlation between two tests across all athletes who have both. Uses each athlete\'s best value per test. Returns r, sample size n, and an interpretation. Note direction: for "lower is better" tests (sprints, agility) a negative r vs a "higher is better" test means they improve together.',
    inputSchema: {
      type: 'object',
      properties: {
        test_a: { type: 'string', description: 'Test id or name (e.g. "sl_rsi_l", "Approach Jump", "rea vert").' },
        test_b: { type: 'string', description: 'Second test id or name.' },
      },
      required: ['test_a', 'test_b'], additionalProperties: false,
    },
  },
  {
    name: 'rank_correlations',
    description: 'For one test, rank every other test by absolute correlation strength across athletes. Great for "what is most correlated with X". Returns a sorted list of {test, r, n}.',
    inputSchema: {
      type: 'object',
      properties: {
        test: { type: 'string', description: 'Test id or name to correlate against everything else.' },
        min_n: { type: 'number', description: 'Minimum overlapping-athlete sample size to include (default 8). Higher = more reliable.' },
        limit: { type: 'number', description: 'Max results to return (default 20).' },
      },
      required: ['test'], additionalProperties: false,
    },
  },
];

async function callTool(name, args) {
  const { tests, best } = await loadData();
  if (name === 'list_tests') {
    const rows = tests.filter(t => !t.id.startsWith('_')).map(t => `${t.id}  |  ${t.name}  |  ${t.direction}  |  ${t.category || ''}`).join('\n');
    return `Available tests (id | name | direction | category):\n${rows}`;
  }
  if (name === 'correlate') {
    const ra = resolveTest(tests, args.test_a), rb = resolveTest(tests, args.test_b);
    if (ra.error) return ra.error;
    if (rb.error) return rb.error;
    const { r, n } = correlate(best, ra.id, rb.id);
    const ta = tests.find(t => t.id === ra.id), tb = tests.find(t => t.id === rb.id);
    if (r === null) return `Not enough overlapping data for ${ta.name} vs ${tb.name} (n=${n}). Need at least 3 athletes with both.`;
    return JSON.stringify({
      test_a: ta.name, test_b: tb.name, r: Math.round(r * 1000) / 1000, n,
      strength: rLabel(r),
      note: `${ta.name} is "${ta.direction} is better", ${tb.name} is "${tb.direction} is better".`,
    }, null, 2);
  }
  if (name === 'rank_correlations') {
    const rt = resolveTest(tests, args.test);
    if (rt.error) return rt.error;
    const minN = args.min_n != null ? args.min_n : 8;
    const limit = args.limit != null ? args.limit : 20;
    const base = tests.find(t => t.id === rt.id);
    const rows = [];
    for (const t of tests) {
      if (t.id === rt.id || t.id.startsWith('_')) continue;
      const { r, n } = correlate(best, rt.id, t.id);
      if (r !== null && n >= minN) rows.push({ test: t.name, id: t.id, r: Math.round(r * 1000) / 1000, n });
    }
    rows.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    return JSON.stringify({ base_test: base.name, min_n: minN, ranked: rows.slice(0, limit) }, null, 2);
  }
  return `Unknown tool: ${name}`;
}

// ---- JSON-RPC / MCP handling ----
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

async function handleRpc(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: (params && params.protocolVersion) || '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null; // notification, no reply
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const toolName = params && params.name;
    const args = (params && params.arguments) || {};
    try {
      const text = await callTool(toolName, args);
      return rpcResult(id, { content: [{ type: 'text', text }] });
    } catch (err) {
      return rpcResult(id, { content: [{ type: 'text', text: 'Error: ' + (err.message || String(err)) }], isError: true });
    }
  }
  if (id === undefined || id === null) return null; // unknown notification
  return rpcError(id, -32601, `Method not found: ${method}`);
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  // Auth: secret in ?key= or Authorization: Bearer
  const key = (event.queryStringParameters && event.queryStringParameters.key) ||
    ((event.headers && (event.headers.authorization || event.headers.Authorization) || '').replace(/^Bearer\s+/i, ''));
  if (!MCP_SECRET || key !== MCP_SECRET) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server not configured' }) };
  }
  // GET: this stateless server has no server-initiated stream.
  if (event.httpMethod === 'GET') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers: cors, body: 'Invalid JSON' }; }

  // Support batch or single
  const isBatch = Array.isArray(body);
  const messages = isBatch ? body : [body];
  const replies = [];
  for (const m of messages) {
    const reply = await handleRpc(m);
    if (reply !== null) replies.push(reply);
  }
  if (replies.length === 0) return { statusCode: 202, headers: cors, body: '' };
  const payload = isBatch ? replies : replies[0];
  return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
};
