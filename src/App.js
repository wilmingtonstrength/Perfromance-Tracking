import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jfyexedcjgerahuumyqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmeWV4ZWRjamdlcmFodXVteXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDc1NzUsImV4cCI6MjA4OTA4MzU3NX0.54fM4aVWV_myuu_alK_OevKTnaqekXABRGT3Qme_2Sc';
const supabase = createClient(supabaseUrl, supabaseKey);

/* ===================== HELPERS ===================== */
const formatFeetInches = (totalInches) => {
  if (totalInches === null || totalInches === undefined || isNaN(totalInches)) return '-';
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  if (inches === 12) return `${ft + 1}'0"`;
  return `${ft}'${inches}"`;
};

const preventScrollChange = (e) => { e.target.blur(); };

const calculateAge = (birthday) => {
  if (!birthday) return null;
  const today = new Date();
  const birth = new Date(String(birthday).slice(0, 10) + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatTestValueByDef = (testDef, value) => {
  if (value === null || value === undefined) return '-';
  const v = parseFloat(value);
  if (isNaN(v)) return '-';
  if (!testDef) return String(v);
  if (testDef.feet_inches) return formatFeetInches(v);
  const unit = testDef.display_unit || testDef.unit;
  if (unit === 'sec' || unit === 'ratio') return v.toFixed(2);
  if (unit === 'MPH') return v.toFixed(1);
  if (unit === 'inches') return String(Math.round(v * 10) / 10);
  return String(Math.round(v));
};

const formatResultWithUnit = (testDef, value) => {
  if (!testDef) return String(value);
  const formatted = formatTestValueByDef(testDef, value);
  if (testDef.feet_inches) return formatted;
  const unit = testDef.display_unit || testDef.unit;
  return formatted + (unit ? ' ' + unit : '');
};

const applyConversion = (testDef, rawValue) => {
  if (!testDef || !testDef.conversion_formula) return rawValue;
  try {
    const v = parseFloat(rawValue);
    const formula = testDef.conversion_formula;
    if (formula.type === 'fly_to_mph' && formula.distance_yards) {
      const meters = formula.distance_yards * 0.9144;
      return parseFloat((meters / v * 2.237).toFixed(4));
    }
    return rawValue;
  } catch { return rawValue; }
};

/* ===================== ATHLETE SCORE (TSA) ===================== */
const TSA_TEST_LABELS = [
  { key: 'vertical_jump', label: 'Vertical Jump', direction: 'higher', unit: 'in' },
  { key: 'clean',         label: 'Clean',          direction: 'higher', unit: 'lbs', matchNames: ['Clean', 'Power Clean'] },
  { key: '_best_squat',   label: 'Best Squat',     direction: 'higher', unit: 'lbs', matchNames: ['Back Squat', 'Front Squat'] },
  { key: 'fly',           label: 'Fly',            direction: 'lower',  unit: 'sec', matchNames: ['5-10 Fly', '10-Yard Fly'] },
  { key: 'max_velocity',  label: 'Max Velocity',   direction: 'higher', unit: 'MPH', matchNames: ['Max Velocity', '10-Yard Fly'] },
  { key: 'agility',       label: 'Agility',        direction: 'lower',  unit: 'sec', matchNames: ['5-0-5', '5-10-5', 'Pro Agility'] },
  { key: 'rsi',           label: 'RSI',            direction: 'higher', unit: '',    matchNames: ['RSI', 'RSI (Reactive Strength)'] },
];

const normalCDF = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const cdf = z > 0 ? 1 - p : p;
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
};

const scoreLabel = (score) => {
  if (score >= 90) return { label: 'Elite',         color: '#ffd700' };
  if (score >= 75) return { label: 'Above Average', color: '#00ff88' };
  if (score >= 40) return { label: 'Average',       color: '#00d4ff' };
  if (score >= 20) return { label: 'Below Average', color: '#FFA500' };
  return                  { label: 'Developing',    color: '#ff6666' };
};

const calculateAthleteScore = (athleteId, allAthletes, allResults, customTests) => {
  const youthAthletes = allAthletes;
  const tsaDefs = TSA_TEST_LABELS.map(tsa => {
    const matchNames = tsa.matchNames || [tsa.label];
    if (tsa.key === '_best_squat') {
      const ids = customTests.filter(ct => matchNames.some(n => ct.name.toLowerCase().includes(n.toLowerCase()))).map(ct => ct.id);
      return { ...tsa, testIds: ids, rollup: true };
    }
    const match = customTests.find(ct => matchNames.some(n => ct.name.toLowerCase() === n.toLowerCase()));
    return { ...tsa, testIds: match ? [match.id] : [], rollup: false };
  }).filter(t => t.testIds.length > 0);

  const getBest = (aId, t) => {
    const vals = allResults.filter(r => r.athlete_id === aId && t.testIds.includes(r.custom_test_id)).map(r => parseFloat(r.value)).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return t.direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
  };

  const popStats = {};
  tsaDefs.forEach(t => {
    const vals = [];
    youthAthletes.forEach(a => { const best = getBest(a.id, t); if (best !== null) vals.push(best); });
    if (vals.length < 5) { popStats[t.key] = null; return; }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length) || 1;
    popStats[t.key] = { mean, sd, n: vals.length };
  });

  const zScores = [];
  const breakdown = [];
  tsaDefs.forEach(t => {
    if (!popStats[t.key]) return;
    const best = getBest(athleteId, t);
    if (best === null) return;
    const { mean, sd } = popStats[t.key];
    const z = t.direction === 'lower' ? (mean - best) / sd : (best - mean) / sd;
    const tScore = normalCDF(z);
    zScores.push(z);
    breakdown.push({ key: t.key, label: t.label, unit: t.unit, z, tScore, best, n: popStats[t.key].n });
  });

  if (zScores.length === 0) return null;
  const avgZ = zScores.reduce((s, v) => s + v, 0) / zScores.length;
  const overall = normalCDF(avgZ);
  return { score: overall, testsUsed: zScores.length, totalTests: tsaDefs.length, breakdown, avgZ };
};

/* ===================== SEARCH PICKER ===================== */
function AthleteSearchPicker({ athletes, value, onChange, excludeIds = [], placeholder = 'Search athlete...' }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = React.useRef(null);
  const selectedAthlete = athletes.find(a => a.id === value);
  const filtered = athletes.filter(a => a.active !== false && !excludeIds.includes(a.id)).filter(a => !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const handleSelect = (athlete) => { onChange(athlete.id); setSearch(''); setIsOpen(false); };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[highlightIndex]) { e.preventDefault(); handleSelect(filtered[highlightIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); }
  };
  return (
    <div ref={ref} style={{ position: 'relative', flex: '2 1 200px' }}>
      {value && !isOpen ? (
        <div onClick={() => { setIsOpen(true); setSearch(''); }} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 }}>
          <span>{selectedAthlete ? `${selectedAthlete.first_name} ${selectedAthlete.last_name}` : ''}</span>
          <span onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{ color: '#888', cursor: 'pointer', fontSize: 18 }}>×</span>
        </div>
      ) : (
        <input type="text" value={search} placeholder={placeholder} onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 8, color: '#fff', fontSize: 16, minHeight: 48 }} />
      )}
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 250, overflowY: 'auto', background: '#1a2744', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, marginTop: 4, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          {filtered.slice(0, 30).map((a, i) => (
            <div key={a.id} onClick={() => handleSelect(a)} onMouseEnter={() => setHighlightIndex(i)} style={{ padding: '10px 16px', cursor: 'pointer', background: i === highlightIndex ? 'rgba(0,212,255,0.2)' : 'transparent', color: '#fff', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {a.first_name} {a.last_name}
              {a.date_of_birth && <span style={{ color: '#888', fontSize: 12 }}> • {calculateAge(a.date_of_birth)} yrs</span>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '10px 16px', color: '#666', fontSize: 14 }}>No athletes found</div>}
        </div>
      )}
    </div>
  );
}

/* ===================== FEET+INCHES INPUT ===================== */
function FeetInchesInput({ value, onChange }) {
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && value !== '' && value !== undefined && value !== null) {
      const total = parseFloat(value);
      if (!isNaN(total)) { setFeet(String(Math.floor(total / 12))); setInches(String(parseFloat((total % 12).toFixed(1)))); }
      setInitialized(true);
    } else if (value === '' || value === undefined || value === null) { if (initialized) { setFeet(''); setInches(''); } }
  }, [value, initialized]);
  const handleChange = (nf, ni) => {
    setFeet(nf); setInches(ni);
    const f = nf !== '' ? parseInt(nf) : 0; const i = ni !== '' ? parseFloat(ni) : 0;
    onChange(nf === '' && ni === '' ? '' : String(f * 12 + i));
  };
  const s = { width: 44, padding: '8px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' };
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
      <input type="number" min="0" max="12" placeholder="ft" value={feet} onChange={(e) => handleChange(e.target.value, inches)} onWheel={preventScrollChange} style={s} />
      <span style={{ color: '#666', fontSize: 14 }}>'</span>
      <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={inches} onChange={(e) => handleChange(feet, e.target.value)} onWheel={preventScrollChange} style={s} />
      <span style={{ color: '#666', fontSize: 14 }}>"</span>
    </div>
  );
}

/* ===================== SIMPLE CHART ===================== */
function SimpleChart({ data, direction, testDef }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const minVal = Math.min(...values); const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const rawStep = range / 4;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
  const step = niceSteps.find(s => s >= rawStep) || rawStep;
  const chartMin = Math.floor(minVal / step) * step - step;
  const chartMax = Math.ceil(maxVal / step) * step + step;
  const chartRange = chartMax - chartMin || 1;
  const yLabels = []; for (let v = chartMin; v <= chartMax + step * 0.01; v += step) { yLabels.push(Math.round(v * 100) / 100); }
  const width = 100; const height = 200;
  const pointSpacing = data.length > 1 ? width / (data.length - 1) : width / 2;
  const getY = (val) => height - ((val - chartMin) / chartRange) * height;
  const points = data.map((d, i) => ({ x: data.length === 1 ? width / 2 : i * pointSpacing, y: getY(d.value), ...d }));
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
  const bestValue = direction === 'lower' ? minVal : maxVal;
  const formatVal = (v) => testDef ? formatTestValueByDef(testDef, v) : v;
  return (
    <div style={{ padding: '20px 0' }}>
      <svg viewBox={'-40 -15 ' + (width + 70) + ' ' + (height + 45)} style={{ width: '100%', height: 280 }}>
        {yLabels.map((val, i) => { const y = getY(val); if (y < -5 || y > height + 5) return null; return (<g key={i}><line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x={-8} y={y + 4} fill="#888" fontSize="9" textAnchor="end">{Number.isInteger(val) ? val : val.toFixed(1)}</text></g>); })}
        <line x1={0} y1={getY(bestValue)} x2={width} y2={getY(bestValue)} stroke="#00ff88" strokeWidth="1.5" strokeDasharray="4,4" />
        <text x={width + 3} y={getY(bestValue) + 4} fill="#00ff88" fontSize="9">{'PR: ' + formatVal(bestValue)}</text>
        <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" />
        {points.map((p, i) => (<g key={i}><circle cx={p.x} cy={p.y} r={p.value === bestValue ? 7 : 5} fill={p.value === bestValue ? '#00ff88' : '#00d4ff'} /><text x={p.x} y={p.y - 12} fill={p.value === bestValue ? '#00ff88' : '#fff'} fontSize="10" fontWeight="700" textAnchor="middle">{formatVal(p.value)}</text><text x={p.x} y={height + 18} fill="#888" fontSize="8" textAnchor="middle">{p.date}</text></g>))}
      </svg>
    </div>
  );
}

/* ===================== LOGIN PAGE ===================== */
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // login, signup, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    onLogin(data.user);
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) onLogin(data.user);
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    if (!email) { setError('Enter your email address'); setLoading(false); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess('Password reset link sent! Check your email.');
    setLoading(false);
  };

  const iStyle = { width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 16 };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      <div style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#0a1628', marginBottom: 16 }}>K</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, letterSpacing: 2, color: '#fff' }}>KAIMETRIC</div>
          <div style={{ fontSize: 13, color: '#00d4ff', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>Performance Tracking</div>
        </div>

        {mode !== 'forgot' && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '12px', background: mode === m ? 'rgba(0,212,255,0.15)' : 'transparent', border: 'none', borderBottom: mode === m ? '2px solid #00d4ff' : '2px solid transparent', color: mode === m ? '#00d4ff' : '#666', fontWeight: mode === m ? 700 : 400, cursor: 'pointer', fontSize: 15, textTransform: 'capitalize' }}>{m === 'login' ? 'Log In' : 'Sign Up'}</button>
            ))}
          </div>
        )}

        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword}>
            <h3 style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>Reset Password</h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>Enter your email and we'll send you a reset link.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#888' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="coach@school.edu" style={iStyle} />
            </div>
            {error && <div style={{ padding: '12px 16px', background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 8, color: '#ff6666', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ padding: '12px 16px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, color: '#00ff88', fontSize: 14, marginBottom: 16 }}>{success}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#555' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 10, color: '#0a1628', fontSize: 18, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', letterSpacing: 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{ width: '100%', marginTop: 12, padding: '12px', background: 'transparent', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: 14 }}>Back to Log In</button>
          </form>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#888' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="coach@school.edu" style={iStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#888' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={iStyle} />
            </div>
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: 13, padding: 0 }}>Forgot password?</button>
              </div>
            )}
            {mode === 'signup' && <div style={{ height: 8 }} />}
            {error && <div style={{ padding: '12px 16px', background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 8, color: '#ff6666', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? '#555' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 10, color: '#0a1628', fontSize: 18, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', letterSpacing: 1 }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ===================== ONBOARDING PAGE ===================== */
function OnboardingPage({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [gymName, setGymName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00d4ff');
  const [presets, setPresets] = useState([]);
  const [selectedPresets, setSelectedPresets] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPresets = async () => {
      const { data } = await supabase.from('test_presets').select('*').order('popular', { ascending: false });
      if (data) { setPresets(data); setSelectedPresets(data.filter(p => p.popular).map(p => p.id)); }
    };
    loadPresets();
  }, []);

  const handleFinish = async () => {
    if (!gymName.trim()) { alert('Please enter your gym or program name'); return; }
    setSaving(true);
    const slug = gymName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: gymData, error: gymErr } = await supabase.from('gyms').insert([{
      name: gymName, slug, primary_color: primaryColor, logo_letter: gymName.charAt(0).toUpperCase()
    }]).select();

    if (gymErr || !gymData) { alert('Error creating gym: ' + (gymErr?.message || 'Unknown')); setSaving(false); return; }
    const gymId = gymData[0].id;

    const { error: linkErr } = await supabase.from('gym_users').insert([{ user_id: user.id, gym_id: gymId, role: 'admin', email: user.email }]);
    if (linkErr) { alert('Error linking account: ' + linkErr.message); setSaving(false); return; }

    const selectedTests = presets.filter(p => selectedPresets.includes(p.id));
    if (selectedTests.length > 0) {
      const testsToInsert = selectedTests.map((p, i) => ({
        gym_id: gymId, name: p.name, unit: p.unit, direction: p.direction,
        display_unit: p.display_unit, conversion_formula: p.conversion_formula,
        category: p.category, sort_order: i, show_on_record_board: true, active: true
      }));
      await supabase.from('custom_tests').insert(testsToInsert);
    }

    setSaving(false);
    onComplete(gymId);
  };

  const togglePreset = (id) => {
    setSelectedPresets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const iStyle = { width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#fff', fontSize: 16 };
  const categoryOrder = ['speed', 'agility', 'strength', 'power'];
  const grouped = {};
  presets.forEach(p => { const c = p.category || 'other'; if (!grouped[c]) grouped[c] = []; grouped[c].push(p); });
  const catLabels = { speed: 'Speed & Sprints', agility: 'Agility & COD', strength: 'Strength', power: 'Power & Jumps', other: 'Other' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: "'Archivo', sans-serif", color: '#e8e8e8' }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, letterSpacing: 2 }}>KAIMETRIC</div>
          <div style={{ fontSize: 13, color: '#00d4ff', letterSpacing: 2, marginTop: 4 }}>SET UP YOUR PROGRAM</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: 40, height: 6, borderRadius: 3, background: step >= s ? '#00d4ff' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, marginBottom: 8 }}>Name your program</h2>
            <p style={{ color: '#888', marginBottom: 12 }}>This is what your athletes and coaches will see at the top of the app.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Program / Gym Name</label>
              <input type="text" value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g. North Brunswick Football" style={iStyle} />
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Use your school, gym, or program name. You can change this later in Settings.</div>
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Brand Color</label>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 12, marginTop: 0 }}>This color will be used for buttons, headers, and accents throughout your app.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['#00d4ff', '#e63946', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db', '#ff6b35', '#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#f1c40f', '#e84393', '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#636e72', '#b71540', '#0c2461', '#079992'].map(c => (
                  <div key={c} onClick={() => setPrimaryColor(c)} style={{ width: 44, height: 44, borderRadius: 10, background: c, cursor: 'pointer', border: primaryColor === c ? '3px solid #fff' : '3px solid transparent', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <button onClick={() => { if (!gymName.trim()) { alert('Enter a name first'); return; } setStep(2); }} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 10, color: '#0a1628', fontSize: 18, fontWeight: 800, cursor: 'pointer', letterSpacing: 1 }}>Next: Pick Your Tests</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, marginBottom: 8 }}>Pick your tests</h2>
            <p style={{ color: '#888', marginBottom: 4 }}>Select the performance tests you run with your athletes. Popular tests are pre-selected.</p>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 8, marginTop: 0 }}>Don't see what you need? You can add custom tests anytime in Settings after setup.</p>
            <p style={{ color: '#00d4ff', fontSize: 14, marginBottom: 24 }}>{selectedPresets.length} tests selected</p>

            {categoryOrder.map(cat => grouped[cat] ? (
              <div key={cat} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>{catLabels[cat]}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {grouped[cat].map(p => {
                    const active = selectedPresets.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePreset(p.id)} style={{ padding: '10px 18px', background: active ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{p.name}</button>
                    );
                  })}
                </div>
              </div>
            ) : null)}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button onClick={() => setStep(1)} style={{ padding: '16px 32px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, cursor: 'pointer' }}>Back</button>
              <button onClick={handleFinish} disabled={saving || selectedPresets.length === 0} style={{ flex: 1, padding: '16px', background: saving ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 10, color: '#0a1628', fontSize: 18, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', letterSpacing: 1 }}>
                {saving ? 'Setting up...' : 'Launch My Program'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== MAIN APP ===================== */
export default function App() {
  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);
  const [gym, setGym] = useState(null);
  const [gymId, setGymId] = useState(null);

  const [page, setPage] = useState('entry');
  const [athletes, setAthletes] = useState([]);
  const [results, setResults] = useState([]);
  const [customTests, setCustomTests] = useState([]);
  const [notification, setNotification] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthState('login'); return; }
      setUser(session.user);
      const { data: gu } = await supabase.from('gym_users').select('gym_id').eq('user_id', session.user.id).limit(1);
      if (!gu || gu.length === 0) { setAuthState('onboarding'); return; }
      setGymId(gu[0].gym_id);
      setAuthState('app');
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { setAuthState('login'); setUser(null); setGym(null); setGymId(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (u) => {
    setUser(u);
    const { data: gu } = await supabase.from('gym_users').select('gym_id').eq('user_id', u.id).limit(1);
    if (!gu || gu.length === 0) { setAuthState('onboarding'); return; }
    setGymId(gu[0].gym_id);
    setAuthState('app');
  };

  const handleOnboardingComplete = (newGymId) => {
    setGymId(newGymId);
    setAuthState('app');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthState('login'); setUser(null); setGym(null); setGymId(null);
  };

  useEffect(() => {
    if (!gymId || authState !== 'app') return;
    const loadData = async () => {
      setAppLoading(true);
      const [gymRes, testsRes, athletesRes] = await Promise.all([
        supabase.from('gyms').select('*').eq('id', gymId).single(),
        supabase.from('custom_tests').select('*').eq('gym_id', gymId).eq('active', true).order('sort_order'),
        supabase.from('athletes').select('*').eq('gym_id', gymId).order('first_name'),
      ]);
      if (gymRes.data) setGym(gymRes.data);
      if (testsRes.data) setCustomTests(testsRes.data);
      if (athletesRes.data) setAthletes(athletesRes.data);

      let allResults = [];
      let from = 0;
      while (true) {
        const { data: batch } = await supabase.from('test_results').select('*').eq('gym_id', gymId).range(from, from + 499);
        if (batch && batch.length > 0) allResults = [...allResults, ...batch];
        if (!batch || batch.length < 500) break;
        from += 500;
      }
      setResults(allResults);
      setAppLoading(false);
    };
    loadData();
  }, [gymId, authState]);

  if (authState === 'loading') return <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20, fontFamily: "'Archivo', sans-serif" }}>Loading...</div>;
  if (authState === 'login') return <LoginPage onLogin={handleLogin} />;
  if (authState === 'onboarding') return <OnboardingPage user={user} onComplete={handleOnboardingComplete} />;
  if (appLoading) return <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20, fontFamily: "'Archivo', sans-serif" }}>Loading your program...</div>;

  const getTestById = (id) => customTests.find(t => t.id === id) || null;
  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 4000); };

  const getTestsByCategory = () => {
    const grouped = {};
    customTests.forEach(t => {
      const cat = t.category || 'other';
      const label = { speed: 'Speed & Sprints', agility: 'Agility & COD', strength: 'Strength', power: 'Power & Jumps', other: 'Other' }[cat] || cat;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(t);
    });
    return grouped;
  };

  const addAthlete = async (athlete) => {
    const { data, error } = await supabase.from('athletes').insert([{
      gym_id: gymId, first_name: athlete.firstName, last_name: athlete.lastName,
      date_of_birth: athlete.birthday || null, gender: athlete.gender, sport: athlete.sport || null
    }]).select();
    if (data) { setAthletes([...athletes, data[0]].sort((a, b) => a.first_name.localeCompare(b.first_name))); showNotification(athlete.firstName + ' added!'); }
    if (error) showNotification('Error: ' + error.message, 'error');
  };

  const updateAthlete = async (id, updates) => {
    const { error } = await supabase.from('athletes').update({
      first_name: updates.firstName, last_name: updates.lastName,
      date_of_birth: updates.birthday || null, gender: updates.gender,
      sport: updates.sport, active: updates.active !== false
    }).eq('id', id);
    if (!error) {
      setAthletes(athletes.map(a => a.id === id ? { ...a, first_name: updates.firstName, last_name: updates.lastName, date_of_birth: updates.birthday, gender: updates.gender, sport: updates.sport, active: updates.active !== false } : a));
      showNotification('Updated!');
    }
  };

  const deleteAthlete = async (id, name) => {
    if (!window.confirm(`Delete ${name} and all their results?`)) return;
    await supabase.from('test_results').delete().eq('athlete_id', id);
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (!error) { setAthletes(athletes.filter(a => a.id !== id)); setResults(results.filter(r => r.athlete_id !== id)); showNotification(name + ' deleted'); }
  };

  const deleteResult = async (id) => {
    const { error } = await supabase.from('test_results').delete().eq('id', id);
    if (!error) { setResults(results.filter(r => r.id !== id)); showNotification('Deleted'); }
  };

  const updateResultRecord = async (id, updates) => {
    const testDef = getTestById(updates.testId);
    const cv = testDef ? applyConversion(testDef, updates.rawValue) : updates.rawValue;
    const { error } = await supabase.from('test_results').update({ tested_at: updates.testDate, value: cv }).eq('id', id);
    if (!error) { setResults(results.map(r => r.id === id ? { ...r, tested_at: updates.testDate, value: cv } : r)); showNotification('Updated!'); }
  };

  const logResults = async (resultsToLog) => {
    let prCount = 0;
    const newResults = [];
    for (const result of resultsToLog) {
      const testDef = getTestById(result.testId);
      const prev = results.filter(r => r.athlete_id === result.athleteId && r.custom_test_id === result.testId);
      let isPR = prev.length === 0;
      if (!isPR && testDef) {
        const best = testDef.direction === 'higher' ? Math.max(...prev.map(r => parseFloat(r.value))) : Math.min(...prev.map(r => parseFloat(r.value)));
        isPR = testDef.direction === 'higher' ? result.value > best : result.value < best;
      }
      const { data } = await supabase.from('test_results').insert([{
        gym_id: gymId, athlete_id: result.athleteId, custom_test_id: result.testId,
        test_type: testDef?.name || '', value: result.value, tested_at: result.testDate, is_pr: isPR
      }]).select();
      if (data) { newResults.push(data[0]); if (isPR) prCount++; }
    }
    setResults([...results, ...newResults]);
    if (prCount > 0) showNotification('🏆 ' + prCount + ' NEW PR' + (prCount > 1 ? 's' : '') + '!', 'pr');
    else showNotification(resultsToLog.length + ' result' + (resultsToLog.length > 1 ? 's' : '') + ' logged!');
    return newResults;
  };

  const getPR = (athleteId, testId) => {
    const testDef = getTestById(testId);
    if (!testDef) return null;
    const ar = results.filter(r => r.athlete_id === athleteId && r.custom_test_id === testId);
    if (ar.length === 0) return null;
    return testDef.direction === 'higher' ? Math.max(...ar.map(r => parseFloat(r.value))) : Math.min(...ar.map(r => parseFloat(r.value)));
  };

  const accentColor = gym?.primary_color || '#00d4ff';
  const gymLetter = gym?.logo_letter || 'K';
  const gymName = gym?.name || 'Kaimetric';

  const isAdmin = user?.email === 'mattsecrest58@gmail.com';
  const navItems = [
    { id: 'entry', label: 'Test Entry' },
    { id: 'athletes', label: 'Athletes' },
    { id: 'recentprs', label: '🔥 Recent PRs' },
    { id: 'recordboard', label: '🏆 Record Board' },
    { id: 'settings', label: '⚙️ Settings' },
    ...(isAdmin ? [{ id: 'admin', label: '🔒 Admin' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: "'Archivo', 'Helvetica Neue', sans-serif", color: '#e8e8e8' }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      <header style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {gym?.logo_url ? (
              <img src={gym.logo_url} alt="Logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#0a1628' }}>{gymLetter}</div>
            )}
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, letterSpacing: 1 }}>{gymName.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: accentColor, letterSpacing: 2, textTransform: 'uppercase' }}>Powered by Kaimetric</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {navItems.map(item => (
                <button key={item.id} onClick={() => setPage(item.id)} style={{ padding: '8px 16px', background: page === item.id ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: page === item.id ? '#0a1628' : '#e8e8e8', fontWeight: page === item.id ? 700 : 500, cursor: 'pointer', fontSize: 13 }}>{item.label}</button>
              ))}
            </nav>
            <button onClick={handleLogout} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12 }}>Logout</button>
          </div>
        </div>
      </header>

      {notification && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', background: notification.type === 'pr' ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, borderRadius: 8, color: '#0a1628', fontWeight: 700, fontSize: 16, zIndex: 1000 }}>
          {notification.message}
        </div>
      )}

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && <KMTestEntryPage athletes={athletes} logResults={logResults} getPR={getPR} getTestById={getTestById} customTests={customTests} getTestsByCategory={getTestsByCategory} accentColor={accentColor} />}
        {page === 'athletes' && <KMAthletesPage athletes={athletes} setAthletes={setAthletes} addAthlete={addAthlete} updateAthlete={updateAthlete} deleteAthlete={deleteAthlete} results={results} setResults={setResults} logResults={logResults} getPR={getPR} getTestById={getTestById} customTests={customTests} getTestsByCategory={getTestsByCategory} deleteResult={deleteResult} updateResult={updateResultRecord} accentColor={accentColor} gymId={gymId} showNotification={showNotification} />}
        {page === 'recentprs' && <KMRecentPRsPage athletes={athletes} results={results} getTestById={getTestById} customTests={customTests} accentColor={accentColor} />}
        {page === 'recordboard' && <KMRecordBoardPage athletes={athletes} results={results} customTests={customTests} getTestById={getTestById} gym={gym} accentColor={accentColor} />}
        {page === 'settings' && <KMSettingsPage gym={gym} setGym={setGym} customTests={customTests} setCustomTests={setCustomTests} gymId={gymId} showNotification={showNotification} user={user} accentColor={accentColor} />}
        {page === 'admin' && isAdmin && <KMAdminPage accentColor={accentColor} />}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: 2px solid ${accentColor}; outline-offset: 2px; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }
      `}</style>
    </div>
  );
}

/* ===================== TEST ENTRY ===================== */
function KMTestEntryPage({ athletes, logResults, getPR, getTestById, customTests, getTestsByCategory, accentColor }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [useKg, setUseKg] = useState(false);
  const [athleteRows, setAthleteRows] = useState([]);
  const [submittedResults, setSubmittedResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const testSet = getTestsByCategory();
  const anyStrength = selectedTests.some(tid => { const t = getTestById(tid); return t && t.unit === 'weight'; });
  const toggleTest = (id) => {
    if (selectedTests.includes(id)) { setSelectedTests(selectedTests.filter(t => t !== id)); setAthleteRows(athleteRows.map(r => { const nv = { ...r.values }; delete nv[id]; return { ...r, values: nv }; })); }
    else { setSelectedTests([...selectedTests, id]); setAthleteRows(athleteRows.map(r => ({ ...r, values: { ...r.values, [id]: '' } }))); }
  };
  const addAthleteRow = (id) => { if (!id || athleteRows.find(r => r.athleteId === id)) return; const v = {}; selectedTests.forEach(t => { v[t] = ''; }); setAthleteRows([...athleteRows, { athleteId: id, values: v }]); };
  const removeRow = (i) => setAthleteRows(athleteRows.filter((_, idx) => idx !== i));
  const updateValue = (ri, tid, val) => { const nr = [...athleteRows]; nr[ri] = { ...nr[ri], values: { ...nr[ri].values, [tid]: val } }; setAthleteRows(nr); };

  const handleSubmit = async () => {
    if (selectedTests.length === 0) { alert('Select at least one test'); return; }
    const toLog = [];
    athleteRows.forEach(row => {
      selectedTests.forEach(tid => {
        const val = row.values[tid];
        if (val === '' || val === undefined) return;
        const testDef = getTestById(tid);
        let v = parseFloat(val);
        if (testDef && testDef.unit === 'weight' && useKg) v = Math.round(v * 2.205);
        if (testDef && testDef.conversion_formula) v = applyConversion(testDef, parseFloat(val));
        toLog.push({ athleteId: row.athleteId, testId: tid, testDate, value: v });
      });
    });
    if (toLog.length === 0) { alert('Enter at least one value'); return; }
    setSubmitting(true);
    const logged = await logResults(toLog);
    setSubmittedResults(logged.map(r => {
      const a = athletes.find(x => x.id === r.athlete_id);
      const t = getTestById(r.custom_test_id);
      return { athlete: a ? `${a.first_name} ${a.last_name}` : 'Unknown', test: t?.name || '', value: r.value, testDef: t, isPR: r.is_pr };
    }));
    setShowSummary(true); setSubmitting(false);
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  if (showSummary) {
    const prs = submittedResults.filter(r => r.isPR);
    const rest = submittedResults.filter(r => !r.isPR);
    return (
      <div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Results Logged</h1>
        {prs.length > 0 && (
          <div style={{ background: 'rgba(0,255,136,0.1)', borderRadius: 12, padding: 24, border: '1px solid rgba(0,255,136,0.4)', marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#00ff88' }}>🏆 {prs.length} New PR{prs.length > 1 ? 's' : ''}</h2>
            {prs.map((r, i) => (<div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>{r.athlete} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>— {r.test}</span></span><span style={{ color: '#00ff88', fontWeight: 800, fontSize: 18 }}>{formatResultWithUnit(r.testDef, r.value)}</span></div>))}
          </div>
        )}
        {rest.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
            {rest.map((r, i) => (<div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}><span>{r.athlete} — {r.test}</span><span style={{ color: accentColor }}>{formatResultWithUnit(r.testDef, r.value)}</span></div>))}
          </div>
        )}
        <button onClick={() => { setAthleteRows([]); setSubmittedResults([]); setShowSummary(false); }} style={{ width: '100%', padding: '20px', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: 'pointer', letterSpacing: 2 }}>+ Start Next Group</button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 24 }}>Test Entry</h1>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...iStyle, width: 220 }} />
        </div>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#aaa' }}>Select Tests</label>
        {Object.entries(testSet).map(([cat, tests]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tests.map(t => { const active = selectedTests.includes(t.id); return <button key={t.id} onClick={() => toggleTest(t.id)} style={{ padding: '8px 16px', background: active ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>; })}
            </div>
          </div>
        ))}
        {selectedTests.some(tid => { const t = getTestById(tid); return t && (t.name === 'Max Velocity' || (t.display_unit === 'MPH' && t.conversion_formula)); }) && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(0,212,255,0.08)', borderRadius: 8, border: '1px solid rgba(0,212,255,0.2)', fontSize: 13, color: '#aaa' }}>
            <span style={{ color: accentColor, fontWeight: 600 }}>Max Velocity</span> — MPH calculated from a 10-yard split, typically with a 30-yard lead-in. Most coaches use the last 10 of a 40 for this. Enter the split time in seconds.
          </div>
        )}
      </div>
      {selectedTests.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: accentColor, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Add Athletes & Enter Results</h3>
          <div style={{ marginBottom: 16 }}><AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => { if (id) addAthleteRow(id); }} excludeIds={athleteRows.map(r => r.athleteId)} placeholder="Search & add athlete..." /></div>
          {athleteRows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, minWidth: 'fit-content' }}>
                <div style={{ minWidth: 140, fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 1 }}>Name</div>
                {selectedTests.map(tid => { const t = getTestById(tid); return <div key={tid} style={{ minWidth: (t && t.unit === 'distance') ? 130 : 100, flex: 1, fontSize: 11, color: accentColor, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{t?.name || tid}</div>; })}
                <div style={{ width: 32 }}></div>
              </div>
              {athleteRows.map((row, ri) => {
                const ath = athletes.find(a => a.id === row.athleteId);
                return (
                  <div key={row.athleteId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: 'fit-content' }}>
                    <div style={{ minWidth: 140 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{ath?.first_name}</div><div style={{ fontSize: 11, color: '#666' }}>{ath?.last_name}</div></div>
                    {selectedTests.map(tid => {
                      const t = getTestById(tid);
                      const pr = getPR(row.athleteId, tid);
                      return (
                        <div key={tid} style={{ minWidth: (t && t.unit === 'distance') ? 130 : 100, flex: 1 }}>
                          {t && t.unit === 'distance' ? (
                            <FeetInchesInput value={row.values[tid]} onChange={(val) => updateValue(ri, tid, val)} />
                          ) : (
                            <input type="number" step="0.01" placeholder={t?.display_unit || t?.unit || 'val'} value={row.values[tid] || ''} onChange={(e) => updateValue(ri, tid, e.target.value)} onWheel={preventScrollChange} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' }} />
                          )}
                          {pr !== null && <div style={{ fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 }}>PR: {formatResultWithUnit(t, pr)}</div>}
                        </div>
                      );
                    })}
                    <button onClick={() => removeRow(ri)} style={{ width: 32, padding: '4px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {selectedTests.length > 0 && athleteRows.length > 0 && (
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '20px', background: submitting ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', letterSpacing: 2 }}>
          {submitting ? 'Saving...' : 'Submit All Results'}
        </button>
      )}
    </div>
  );
}

/* ===================== ATHLETES (COMBINED PROFILE) ===================== */
function KMAthletesPage({ athletes, setAthletes, addAthlete, updateAthlete, deleteAthlete, results, setResults, logResults, getPR, getTestById, customTests, getTestsByCategory, deleteResult, updateResult, accentColor, gymId, showNotification }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState(''); const [gender, setGender] = useState('Male');
  const [sport, setSport] = useState('');
  const [profileTab, setProfileTab] = useState('prs');
  const [selectedTest, setSelectedTest] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editDate, setEditDate] = useState(''); const [editValue, setEditValue] = useState('');

  // CSV Import state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1=select tests, 2=upload, 3=preview, 4=done
  const [importTests, setImportTests] = useState([]);
  const [importData, setImportData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const toggleImportTest = (id) => {
    setImportTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generateTemplate = () => {
    const headers = ['first_name', 'last_name', 'gender', 'birthday', 'sport'];
    importTests.forEach(tid => {
      const t = getTestById(tid);
      if (t) headers.push(t.name);
    });
    const csv = headers.join(',') + '\n' + headers.map((h, i) => i === 0 ? 'John' : i === 1 ? 'Smith' : i === 2 ? 'Male' : i === 3 ? '2008-05-15' : i === 4 ? 'Football' : '').join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'athlete_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map(line => {
      const vals = [];
      let current = ''; let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) { vals.push(current.trim()); current = ''; }
        else { current += line[i]; }
      }
      vals.push(current.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    }).filter(row => row.first_name || row.last_name);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) { alert('No valid rows found. Make sure first_name and last_name columns exist.'); return; }
      setImportData(parsed);
      setImportStep(3);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    setImporting(true);
    let athletesAdded = 0; let resultsLogged = 0;
    const testDate = new Date().toISOString().split('T')[0];
    const newAthletes = [];
    const newResults = [];

    for (const row of importData) {
      if (!row.first_name && !row.last_name) continue;
      // Insert athlete
      const { data: ath, error: athErr } = await supabase.from('athletes').insert([{
        gym_id: gymId, first_name: row.first_name || '', last_name: row.last_name || '',
        date_of_birth: row.birthday || null, gender: row.gender || null, sport: row.sport || null
      }]).select();
      if (athErr || !ath) continue;
      newAthletes.push(ath[0]);
      athletesAdded++;

      // Insert test results for this athlete
      for (const tid of importTests) {
        const t = getTestById(tid);
        if (!t) continue;
        const rawVal = row[t.name];
        if (!rawVal || rawVal === '') continue;
        let v = parseFloat(rawVal);
        if (isNaN(v)) continue;
        if (t.conversion_formula) v = applyConversion(t, v);
        const { data: resData } = await supabase.from('test_results').insert([{
          gym_id: gymId, athlete_id: ath[0].id, custom_test_id: tid,
          test_type: t.name, value: v, tested_at: testDate, is_pr: true
        }]).select();
        if (resData) { newResults.push(resData[0]); resultsLogged++; }
      }
    }

    // Update local state
    setAthletes(prev => [...prev, ...newAthletes].sort((a, b) => a.first_name.localeCompare(b.first_name)));
    setResults(prev => [...prev, ...newResults]);
    setImportResults({ athletes: athletesAdded, results: resultsLogged });
    setImportStep(4);
    setImporting(false);
    showNotification(athletesAdded + ' athletes imported!' + (resultsLogged > 0 ? ' ' + resultsLogged + ' results logged.' : ''));
  };

  const resetImport = () => { setShowImport(false); setImportStep(1); setImportTests([]); setImportData([]); setImportResults(null); };

  const athlete = athletes.find(a => a.id === selectedAthlete);
  const testSet = getTestsByCategory();
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === selectedAthlete) : [];
  const athleteScore = selectedAthlete ? calculateAthleteScore(selectedAthlete, athletes, results, customTests) : null;
  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  const handleAdd = (e) => { e.preventDefault(); if (!firstName || !lastName) return; addAthlete({ firstName, lastName, birthday, gender, sport }); setFirstName(''); setLastName(''); setBirthday(''); setGender('Male'); setSport(''); setShowAdd(false); };
  const startEdit = () => { if (!athlete) return; setFirstName(athlete.first_name); setLastName(athlete.last_name); setBirthday(athlete.date_of_birth ? String(athlete.date_of_birth).slice(0, 10) : ''); setGender(athlete.gender || 'Male'); setSport(athlete.sport || ''); setEditingInfo(true); };
  const saveEdit = () => { updateAthlete(selectedAthlete, { firstName, lastName, birthday, gender, sport, active: true }); setEditingInfo(false); };

  const filteredHistory = historyFilter ? athleteResults.filter(r => r.custom_test_id === historyFilter) : athleteResults;
  const sortedHistory = [...filteredHistory].sort((a, b) => new Date(b.tested_at) - new Date(a.tested_at));
  const testDef = selectedTest ? getTestById(selectedTest) : null;
  const chartData = selectedTest ? athleteResults.filter(r => r.custom_test_id === selectedTest).sort((a, b) => new Date(a.tested_at) - new Date(b.tested_at)).map(r => ({ date: new Date(r.tested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: parseFloat(r.value) })) : [];
  const filtered = athletes.filter(a => a.active !== false).filter(a => !searchTerm || `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, margin: 0 }}>Athletes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowImport(true); setImportStep(1); }} style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}66`, borderRadius: 8, color: accentColor, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Import CSV</button>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Athlete</button>
        </div>
      </div>

      {/* CSV IMPORT FLOW */}
      {showImport && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${accentColor}44` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>Import Athletes</h3>
            <button onClick={resetImport} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['Select Tests', 'Upload CSV', 'Preview', 'Done'].map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 4, borderRadius: 2, background: importStep > i ? accentColor : 'rgba(255,255,255,0.1)', marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: importStep > i ? accentColor : '#555' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Step 1: Select tests to include */}
          {importStep === 1 && (
            <div>
              <p style={{ color: '#888', fontSize: 14, marginTop: 0, marginBottom: 16 }}>Do you have existing test data to include? Select any tests you want columns for in the CSV. If you just want to import a roster with no test data, skip this step.</p>
              {Object.entries(getTestsByCategory()).map(([cat, tests]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {tests.map(t => { const active = importTests.includes(t.id); return (
                      <button key={t.id} onClick={() => toggleImportTest(t.id)} style={{ padding: '8px 16px', background: active ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>
                    ); })}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button onClick={() => setImportStep(2)} style={{ flex: 1, padding: '14px', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  {importTests.length > 0 ? 'Next: Upload CSV' : 'Skip: Import Roster Only'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Download template & upload */}
          {importStep === 2 && (
            <div>
              <p style={{ color: '#888', fontSize: 14, marginTop: 0, marginBottom: 16 }}>Download the template, fill it in with your athletes{importTests.length > 0 ? ' and test data' : ''}, then upload the completed file. Gender, birthday, and sport are optional.</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button onClick={generateTemplate} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${accentColor}44`, borderRadius: 8, color: accentColor, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Download CSV Template</button>
              </div>
              <div style={{ padding: 24, border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 12, textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ color: '#aaa', fontSize: 14 }}>Click to upload your CSV file</div>
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>Accepts .csv files</div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button onClick={() => setImportStep(1)} style={{ marginTop: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13 }}>← Back</button>
            </div>
          )}

          {/* Step 3: Preview */}
          {importStep === 3 && (
            <div>
              <p style={{ color: '#888', fontSize: 14, marginTop: 0, marginBottom: 16 }}>Found <span style={{ color: accentColor, fontWeight: 700 }}>{importData.length}</span> athletes. Review and confirm.</p>
              <div style={{ maxHeight: 300, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 1 }}>Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: accentColor }}>Gender</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: accentColor }}>Sport</th>
                      {importTests.map(tid => { const t = getTestById(tid); return <th key={tid} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: accentColor }}>{t?.name}</th>; })}
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 20).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 14, color: '#fff' }}>{row.first_name} {row.last_name}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, color: '#888' }}>{row.gender || '-'}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, color: '#888' }}>{row.sport || '-'}</td>
                        {importTests.map(tid => { const t = getTestById(tid); const val = t ? row[t.name] : ''; return <td key={tid} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13, color: val ? '#00ff88' : '#555' }}>{val || '-'}</td>; })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importData.length > 20 && <div style={{ padding: '8px 12px', color: '#666', fontSize: 12, textAlign: 'center' }}>...and {importData.length - 20} more</div>}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setImportStep(2); setImportData([]); }} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>← Back</button>
                <button onClick={handleImport} disabled={importing} style={{ flex: 1, padding: '14px', background: importing ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: importing ? 'wait' : 'pointer' }}>
                  {importing ? 'Importing...' : 'Import ' + importData.length + ' Athletes'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {importStep === 4 && importResults && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: '#00ff88', marginBottom: 8 }}>Import Complete</h3>
              <p style={{ color: '#888', fontSize: 16, marginBottom: 24 }}>{importResults.athletes} athletes added{importResults.results > 0 ? ', ' + importResults.results + ' test results logged' : ''}</p>
              <button onClick={resetImport} style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          )}
        </div>
      )}
      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${accentColor}44` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={iStyle} />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={iStyle} />
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ width: '100%', ...iStyle }} /></div>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={iStyle}><option>Male</option><option>Female</option></select>
            <input type="text" placeholder="Sport (optional)" value={sport} onChange={(e) => setSport(e.target.value)} style={iStyle} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button type="submit" style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer' }}>Add</button>
            <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}
      {!selectedAthlete && (
        <>
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...iStyle, width: 280, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(a => {
              const ar = results.filter(r => r.athlete_id === a.id);
              const age = calculateAge(a.date_of_birth);
              return (
                <div key={a.id} onClick={() => { setSelectedAthlete(a.id); setProfileTab('prs'); setSelectedTest(''); }} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>{a.first_name} {a.last_name}</h3>
                  <p style={{ margin: 0, color: '#888', fontSize: 14 }}>{age && (age + ' yrs')}{a.gender && (' · ' + a.gender)}{a.sport && (' · ' + a.sport)}</p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 20 }}>
                    <div><span style={{ fontSize: 22, fontWeight: 700, color: accentColor }}>{ar.length}</span> <span style={{ fontSize: 12, color: '#888' }}>tests</span></div>
                    <div><span style={{ fontSize: 22, fontWeight: 700, color: '#00ff88' }}>{ar.filter(r => r.is_pr).length}</span> <span style={{ fontSize: 12, color: '#888' }}>PRs</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {athlete && (
        <div>
          <button onClick={() => { setSelectedAthlete(null); setEditingInfo(false); }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back</button>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
            {editingInfo ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={iStyle} />
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={iStyle} />
                  <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={iStyle} />
                  <select value={gender} onChange={(e) => setGender(e.target.value)} style={iStyle}><option>Male</option><option>Female</option></select>
                  <input type="text" placeholder="Sport" value={sport} onChange={(e) => setSport(e.target.value)} style={iStyle} />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}><button onClick={saveEdit} style={{ padding: '8px 20px', background: '#00ff88', border: 'none', borderRadius: 6, color: '#0a1628', fontWeight: 700, cursor: 'pointer' }}>Save</button><button onClick={() => setEditingInfo(false)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Cancel</button></div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 28, fontFamily: "'Archivo Black', sans-serif" }}>{athlete.first_name} {athlete.last_name}</h2>
                  <p style={{ margin: 0, color: '#888', fontSize: 14 }}>{calculateAge(athlete.date_of_birth) && calculateAge(athlete.date_of_birth) + ' yrs'}{athlete.gender && ' · ' + athlete.gender}{athlete.sport && ' · ' + athlete.sport} · {athleteResults.length} tests</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={startEdit} style={{ padding: '8px 16px', background: `rgba(0,212,255,0.15)`, border: `1px solid ${accentColor}44`, borderRadius: 6, color: accentColor, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
                  <button onClick={() => { deleteAthlete(athlete.id, athlete.first_name + ' ' + athlete.last_name); setSelectedAthlete(null); }} style={{ padding: '8px 16px', background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 6, color: '#ff6666', cursor: 'pointer', fontSize: 13 }}>Delete</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['prs', 'history', 'progress'].map(tab => (
              <button key={tab} onClick={() => setProfileTab(tab)} style={{ padding: '10px 20px', background: profileTab === tab ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: profileTab === tab ? '#0a1628' : '#aaa', fontWeight: profileTab === tab ? 700 : 500, cursor: 'pointer', fontSize: 14, textTransform: 'capitalize' }}>{tab === 'prs' ? 'Personal Records' : tab === 'history' ? 'Test History' : 'Progress'}</button>
            ))}
          </div>
          {profileTab === 'prs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {Object.entries(testSet).map(([cat, tests]) => (
                <div key={cat}>
                  <h4 style={{ color: accentColor, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{cat}</h4>
                  {tests.map(t => { const pr = getPR(athlete.id, t.id); return (
                    <div key={t.id} onClick={() => { setProfileTab('progress'); setSelectedTest(t.id); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14, cursor: 'pointer' }}>
                      <span style={{ color: '#aaa' }}>{t.name}</span><span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>{pr !== null ? formatResultWithUnit(t, pr) : '-'}</span>
                    </div>
                  ); })}
                </div>
              ))}
            </div>
          )}
          {profileTab === 'history' && (
            <div>
              <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} style={{ ...iStyle, width: 260, marginBottom: 16 }}>
                <option value="">All Tests</option>
                {customTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {sortedHistory.length > 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  {sortedHistory.map(r => {
                    const t = getTestById(r.custom_test_id);
                    const isEd = editingResult === r.id;
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, flexWrap: 'wrap' }}>
                        {isEd ? (
                          <>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${accentColor}88`, borderRadius: 6, color: '#fff', fontSize: 14 }} />
                            <span style={{ color: accentColor, fontWeight: 600 }}>{t?.name}</span>
                            <input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: 100, padding: '8px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${accentColor}88`, borderRadius: 6, color: '#fff', fontSize: 14 }} />
                            <button onClick={() => { updateResult(r.id, { testId: r.custom_test_id, testDate: editDate, rawValue: parseFloat(editValue) }); setEditingResult(null); }} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.3)', border: 'none', borderRadius: 4, color: '#00ff88', cursor: 'pointer', fontSize: 12 }}>Save</button>
                            <button onClick={() => setEditingResult(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <div style={{ width: 100, fontSize: 13, color: '#888' }}>{new Date(r.tested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div style={{ flex: 1, color: accentColor, fontSize: 14, fontWeight: 600 }}>{t?.name || r.test_type}</div>
                            <div style={{ fontWeight: 700, color: r.is_pr ? '#ffd700' : '#00ff88' }}>{t ? formatResultWithUnit(t, r.value) : r.value}{r.is_pr && ' 🏆'}</div>
                            <button onClick={() => { setEditingResult(r.id); setEditDate(String(r.tested_at).slice(0, 10)); setEditValue(String(r.value)); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                            <button onClick={() => { if (window.confirm('Delete?')) deleteResult(r.id); }} style={{ padding: '6px 12px', background: 'rgba(255,100,100,0.2)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12 }}>Del</button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No results.</div>}
            </div>
          )}
          {profileTab === 'progress' && (
            <div>
              <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={{ ...iStyle, width: 280, marginBottom: 20 }}>
                <option value="">Choose a test...</option>
                {customTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {chartData.length > 0 && testDef ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ margin: '0 0 16px 0' }}>{testDef.name} Progress</h3>
                  <SimpleChart data={chartData} direction={testDef.direction} testDef={testDef} />
                </div>
              ) : selectedTest ? <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No data yet</div> : <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>Select a test</div>}
            </div>
          )}
          {profileTab === 'score' && athleteScore && (
            <div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 12, padding: 24, border: '1px solid rgba(168,85,247,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: scoreLabel(athleteScore.score).color, lineHeight: 1 }}>{athleteScore.score}</div>
                  <div style={{ fontSize: 13, color: scoreLabel(athleteScore.score).color, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{scoreLabel(athleteScore.score).label}</div>
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>{athleteScore.testsUsed} of {athleteScore.totalTests} tests scored</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {athleteScore.breakdown.map(item => { const sl = scoreLabel(item.tScore); return (
                  <div key={item.key} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${sl.color}30` }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{item.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: sl.color }}>{item.tScore}</span>
                      <span style={{ fontSize: 12, color: '#666' }}>{item.best.toFixed(item.unit === 'sec' ? 2 : (item.unit === 'in' ? 1 : 0))}{item.unit ? ' ' + item.unit : ''}</span>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}
          {profileTab === 'score' && !athleteScore && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>Not enough data for an Athlete Score.</div>}
        </div>
      )}
    </div>
  );
}

/* ===================== RECENT PRS ===================== */
function KMRecentPRsPage({ athletes, results, getTestById, customTests, accentColor }) {
  const [timeFrame, setTimeFrame] = useState('week');
  const now = new Date(); const cutoff = new Date(now);
  if (timeFrame === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else if (timeFrame === 'month') cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setDate(cutoff.getDate() - 90);
  const prs = results.filter(r => r.is_pr && new Date(r.tested_at) >= cutoff).sort((a, b) => new Date(b.tested_at) - new Date(a.tested_at));
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 24 }}>Recent PRs</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['week', 'month', 'quarter'].map(tf => (<button key={tf} onClick={() => setTimeFrame(tf)} style={{ padding: '10px 20px', background: timeFrame === tf ? `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: timeFrame === tf ? '#0a1628' : '#aaa', fontWeight: timeFrame === tf ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{tf === 'week' ? '1 Week' : tf === 'month' ? '1 Month' : '3 Months'}</button>))}
        <div style={{ padding: '10px 16px', background: 'rgba(0,255,136,0.15)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>{prs.length} PRs</div>
      </div>
      {prs.length > 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          {prs.map(r => { const a = athletes.find(x => x.id === r.athlete_id); const t = getTestById(r.custom_test_id); return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}>
              <div style={{ fontSize: 24 }}>🏆</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16 }}>{a ? `${a.first_name} ${a.last_name}` : 'Unknown'}</div><div style={{ color: '#888', fontSize: 13 }}>{t?.name} · {new Date(r.tested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div></div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#00ff88' }}>{t ? formatResultWithUnit(t, r.value) : r.value}</div>
            </div>
          ); })}
        </div>
      ) : <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No PRs in this time frame.</div>}
    </div>
  );
}

/* ===================== RANKINGS ===================== */
function KMRankingsPage({ athletes, results, customTests, accentColor }) {
  const [genderFilter, setGenderFilter] = useState('all');
  const scored = athletes.filter(a => a.active !== false)
    .map(a => { const s = calculateAthleteScore(a.id, athletes, results, customTests); return s ? { athlete: a, ...s } : null; })
    .filter(Boolean)
    .filter(r => { if (genderFilter === 'all') return true; const g = (r.athlete.gender || '').toLowerCase(); return genderFilter === 'female' ? g === 'female' : g !== 'female'; })
    .sort((a, b) => b.score - a.score);
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 24 }}>Rankings</h1>
      <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 28, width: 'fit-content' }}>
        {[['all','All'],['male','Boys'],['female','Girls']].map(([v, l]) => (
          <button key={v} onClick={() => setGenderFilter(v)} style={{ padding: '10px 20px', background: genderFilter === v ? `${accentColor}33` : 'transparent', border: 'none', borderBottom: genderFilter === v ? `2px solid ${accentColor}` : '2px solid transparent', color: genderFilter === v ? accentColor : '#666', fontWeight: genderFilter === v ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{l}</button>
        ))}
      </div>
      {scored.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No athletes scored yet.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scored.map((row, i) => {
            const sl = scoreLabel(row.score); const rank = i + 1;
            const rc = rank === 1 ? '#C8963E' : rank === 2 ? '#A0A0B0' : rank === 3 ? '#A0622A' : '#555';
            return (
              <div key={row.athlete.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${rank <= 3 ? rc + '40' : 'rgba(255,255,255,0.07)'}` }}>
                <div style={{ width: 40, textAlign: 'center', fontSize: rank <= 3 ? 22 : 18, color: rc }}>{rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</div>
                <div style={{ flex: '0 0 180px' }}><div style={{ fontWeight: 700, fontSize: 16 }}>{row.athlete.first_name} {row.athlete.last_name}</div><div style={{ fontSize: 12, color: '#666' }}>{calculateAge(row.athlete.date_of_birth) && calculateAge(row.athlete.date_of_birth) + ' yrs'}{row.athlete.sport && ' · ' + row.athlete.sport}</div></div>
                <div style={{ flex: '0 0 100px', textAlign: 'center' }}><div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Archivo Black'", color: sl.color, lineHeight: 1 }}>{row.score}</div><div style={{ fontSize: 11, color: sl.color, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{sl.label}</div></div>
                <div style={{ flex: 1 }}><div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${row.score}%`, background: `linear-gradient(90deg, #7c3aed, ${sl.color})`, borderRadius: 4 }} /></div><div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{row.testsUsed}/{row.totalTests} tests</div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== RECORD BOARD ===================== */
function KMRecordBoardPage({ athletes, results, customTests, getTestById, gym, accentColor }) {
  const [tvMode, setTvMode] = useState(false);

  const boardTests = customTests.filter(t => t.show_on_record_board && t.active);
  const speedTests = boardTests.filter(t => t.category === 'speed' || t.category === 'agility' || t.category === 'power');
  const strengthTests = boardTests.filter(t => t.category === 'strength');

  const buildRecords = (tests) => {
    const records = {};
    tests.forEach(test => {
      const entries = [];
      results.forEach(r => {
        if (r.custom_test_id !== test.id) return;
        const a = athletes.find(x => x.id === r.athlete_id);
        if (!a) return;
        const val = parseFloat(r.value); if (isNaN(val)) return;
        entries.push({ name: `${a.first_name} ${(a.last_name || '').charAt(0)}`, value: val });
      });
      entries.sort((a, b) => test.direction === 'lower' ? a.value - b.value : b.value - a.value);
      const seen = new Set();
      records[test.id] = entries.filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; }).slice(0, 5);
    });
    return records;
  };

  const wakeLockRef = useRef(null);
  useEffect(() => {
    if (!tvMode) { if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; } return; }
    const req = async () => { try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {} };
    req();
    const h = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', h);
    return () => { document.removeEventListener('visibilitychange', h); if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {}); };
  }, [tvMode]);

  useEffect(() => { if (!tvMode) return; const i = setInterval(() => { document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: Math.random() * 1920, clientY: Math.random() * 1080 })); }, 600000); return () => clearInterval(i); }, [tvMode]);

  const speedRecs = buildRecords(speedTests);
  const strRecs = buildRecords(strengthTests);
  const gold = '#C8963E';
  const rankColors = [gold, '#A0A0B0', '#A0622A', '#888', '#666'];

  const renderCard = (test, records, isTv) => {
    const list = records[test.id] || [];
    return (
      <div key={test.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: isTv ? 10 : 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', fontSize: isTv ? 14 : 16, fontWeight: 700, paddingBottom: 8, marginBottom: 8, borderBottom: `2px solid ${gold}`, letterSpacing: 1 }}>{test.name}</div>
        {list.length > 0 ? list.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', margin: '2px 0', borderRadius: 4, ...(i === 0 ? { background: `linear-gradient(90deg, ${gold}44 0%, ${gold}0d 100%)`, borderLeft: `3px solid ${gold}` } : {}) }}>
            <span style={{ fontWeight: 600, fontSize: isTv ? 13 : 14, color: rankColors[i] || '#666' }}>{formatTestValueByDef(test, r.value)}</span>
            <span style={{ color: '#888', fontSize: isTv ? 12 : 13 }}>{r.name}</span>
          </div>
        )) : <div style={{ color: '#444', textAlign: 'center', fontSize: 13, padding: 8 }}>No data yet</div>}
      </div>
    );
  };

  if (tvMode) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a1628', zIndex: 9999, padding: '8px 6px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: `4px solid ${accentColor}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: accentColor, letterSpacing: 3, fontFamily: "'Archivo Black'" }}>{(gym?.name || 'KAIMETRIC').toUpperCase()}</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4, color: gold }}>RECORD BOARD</div>
          <button onClick={() => setTvMode(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12 }}>EXIT</button>
        </div>
        {speedTests.length > 0 && (<><div style={{ fontSize: 18, color: accentColor, letterSpacing: 3, borderLeft: `4px solid ${accentColor}`, paddingLeft: 10, marginBottom: 8 }}>SPEED & POWER</div><div style={{ display: 'grid', gridTemplateColumns: `repeat(${speedTests.length}, 1fr)`, gap: 8, marginBottom: 10 }}>{speedTests.map(t => renderCard(t, speedRecs, true))}</div></>)}
        {strengthTests.length > 0 && (<><div style={{ fontSize: 18, color: accentColor, letterSpacing: 3, borderLeft: `4px solid ${accentColor}`, paddingLeft: 10, marginBottom: 8 }}>STRENGTH</div><div style={{ display: 'grid', gridTemplateColumns: `repeat(${strengthTests.length}, 1fr)`, gap: 8 }}>{strengthTests.map(t => renderCard(t, strRecs, true))}</div></>)}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, margin: 0 }}>Record Board</h1>
        <button onClick={() => setTvMode(true)} style={{ padding: '10px 16px', background: `linear-gradient(135deg, ${gold} 0%, #A87A2E 100%)`, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>TV Mode</button>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, letterSpacing: 4, fontFamily: "'Archivo Black'", color: gold }}>TOP 5 ALL-TIME</div>
      {speedTests.length > 0 && (<div style={{ marginBottom: 24 }}><div style={{ fontSize: 14, color: accentColor, letterSpacing: 3, borderLeft: `4px solid ${accentColor}`, paddingLeft: 12, marginBottom: 12 }}>SPEED & POWER</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>{speedTests.map(t => renderCard(t, speedRecs, false))}</div></div>)}
      {strengthTests.length > 0 && (<div><div style={{ fontSize: 14, color: accentColor, letterSpacing: 3, borderLeft: `4px solid ${accentColor}`, paddingLeft: 12, marginBottom: 12 }}>STRENGTH</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>{strengthTests.map(t => renderCard(t, strRecs, false))}</div></div>)}
      {boardTests.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No tests configured for the record board. Go to Settings to enable them.</div>}
    </div>
  );
}

/* ===================== SETTINGS ===================== */
function KMSettingsPage({ gym, setGym, customTests, setCustomTests, gymId, showNotification, user, accentColor }) {
  const [editingTest, setEditingTest] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('time');
  const [formDirection, setFormDirection] = useState('lower');
  const [formCategory, setFormCategory] = useState('speed');
  const [formBoard, setFormBoard] = useState(true);

  // Gym settings state
  const [editingGym, setEditingGym] = useState(false);
  const [gymFormName, setGymFormName] = useState('');
  const [gymFormColor, setGymFormColor] = useState('');
  const [gymFormLetter, setGymFormLetter] = useState('');
  const [gymFormLogoUrl, setGymFormLogoUrl] = useState('');
  const [savingGym, setSavingGym] = useState(false);
  const logoFileRef = useRef(null);

  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'].includes(file.type)) { alert('Please upload a PNG, JPG, GIF, or SVG'); return; }
    if (file.size > 500000) { alert('File must be under 500KB'); return; }
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (ev) => setGymFormLogoUrl(ev.target.result);
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 200;
        let w = img.width, h = img.height;
        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setGymFormLogoUrl(canvas.toDataURL('image/png', 0.9));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const startEditGym = () => {
    setGymFormName(gym?.name || '');
    setGymFormColor(gym?.primary_color || '#00d4ff');
    setGymFormLetter(gym?.logo_letter || '');
    setGymFormLogoUrl(gym?.logo_url || '');
    setEditingGym(true);
  };

  const saveGym = async () => {
    if (!gymFormName.trim()) { alert('Gym name is required'); return; }
    setSavingGym(true);
    const updates = {
      name: gymFormName.trim(),
      primary_color: gymFormColor,
      logo_letter: gymFormLetter || gymFormName.charAt(0).toUpperCase(),
      logo_url: gymFormLogoUrl || null
    };
    const { error } = await supabase.from('gyms').update(updates).eq('id', gymId);
    if (!error) {
      setGym({ ...gym, ...updates });
      showNotification('Gym settings updated!');
      setEditingGym(false);
    } else {
      showNotification('Error: ' + error.message, 'error');
    }
    setSavingGym(false);
  };

  const colorOptions = ['#00d4ff', '#e63946', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db', '#ff6b35', '#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#f1c40f', '#e84393', '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#636e72', '#b71540', '#0c2461', '#079992'];

  const resetForm = () => { setFormName(''); setFormUnit('time'); setFormDirection('lower'); setFormCategory('speed'); setFormBoard(true); };

  const startEdit = (t) => { setEditingTest(t.id); setFormName(t.name); setFormUnit(t.unit); setFormDirection(t.direction); setFormCategory(t.category); setFormBoard(t.show_on_record_board); setShowAdd(false); };

  const handleSave = async () => {
    if (!formName) return;
    const data = { name: formName, unit: formUnit, direction: formDirection, category: formCategory, show_on_record_board: formBoard };
    if (editingTest) {
      const { error } = await supabase.from('custom_tests').update(data).eq('id', editingTest);
      if (!error) { setCustomTests(customTests.map(t => t.id === editingTest ? { ...t, ...data } : t)); showNotification('Updated!'); setEditingTest(null); resetForm(); }
    } else {
      const maxSort = customTests.length > 0 ? Math.max(...customTests.map(t => t.sort_order || 0)) : 0;
      const { data: newTest, error } = await supabase.from('custom_tests').insert([{ gym_id: gymId, ...data, sort_order: maxSort + 1, active: true }]).select();
      if (newTest) { setCustomTests([...customTests, newTest[0]]); showNotification('Added!'); setShowAdd(false); resetForm(); }
      if (error) showNotification('Error: ' + error.message, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const { error } = await supabase.from('custom_tests').update({ active: false }).eq('id', id);
    if (!error) { setCustomTests(customTests.filter(t => t.id !== id)); showNotification(name + ' removed'); }
  };

  const iStyle = { padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, width: '100%' };
  const catLabels = { speed: 'Speed', agility: 'Agility', strength: 'Strength', power: 'Power', other: 'Other' };
  const grouped = {};
  customTests.forEach(t => { const c = catLabels[t.category] || t.category; if (!grouped[c]) grouped[c] = []; grouped[c].push(t); });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Settings</h1>
          <p style={{ color: '#888' }}>{gym?.name} · {customTests.length} tests · {user?.email}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingTest(null); resetForm(); }} style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`, border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Test</button>
      </div>

      {/* ===== GYM SETTINGS SECTION ===== */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingGym ? 20 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {gym?.logo_url ? (
              <img src={gym.logo_url} alt="Logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: 48, height: 48, background: `linear-gradient(135deg, ${gym?.primary_color || accentColor} 0%, ${gym?.primary_color || accentColor}cc 100%)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: '#0a1628' }}>{gym?.logo_letter || 'K'}</div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{gym?.name || 'Your Gym'}</div>
              <div style={{ fontSize: 13, color: '#666' }}>Brand color: <span style={{ color: gym?.primary_color || accentColor }}>{gym?.primary_color || accentColor}</span></div>
            </div>
          </div>
          {!editingGym && <button onClick={startEditGym} style={{ padding: '8px 20px', background: `${accentColor}22`, border: `1px solid ${accentColor}44`, borderRadius: 6, color: accentColor, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit Gym</button>}
        </div>
        {editingGym && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#888' }}>Gym / Program Name</label>
                <input type="text" value={gymFormName} onChange={(e) => setGymFormName(e.target.value)} style={iStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#888' }}>Logo Letter</label>
                <input type="text" maxLength={2} value={gymFormLetter} onChange={(e) => setGymFormLetter(e.target.value.toUpperCase())} placeholder={gymFormName ? gymFormName.charAt(0).toUpperCase() : 'K'} style={{ ...iStyle, width: 80, textAlign: 'center', fontSize: 20, fontWeight: 700 }} />
                <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Fallback if no logo uploaded</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#888' }}>Logo Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {gymFormLogoUrl ? (
                  <div style={{ position: 'relative' }}>
                    <img src={gymFormLogoUrl} alt="Logo" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <button onClick={() => setGymFormLogoUrl('')} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: '#ff4444', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 11, textAlign: 'center' }}>No logo</div>
                )}
                <div>
                  <input ref={logoFileRef} type="file" accept="image/png,image/jpeg,image/gif,image/svg+xml" onChange={handleLogoFile} style={{ display: 'none' }} />
                  <button onClick={() => logoFileRef.current?.click()} style={{ padding: '8px 20px', background: `${accentColor}22`, border: `1px solid ${accentColor}44`, borderRadius: 6, color: accentColor, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{gymFormLogoUrl ? 'Change Logo' : 'Upload Logo'}</button>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>PNG, JPG, GIF, or SVG · Max 500KB</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#888' }}>Brand Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {colorOptions.map(c => (
                  <div key={c} onClick={() => setGymFormColor(c)} style={{ width: 36, height: 36, borderRadius: 8, background: c, cursor: 'pointer', border: gymFormColor === c ? '3px solid #fff' : '3px solid transparent', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={saveGym} disabled={savingGym} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: savingGym ? 'wait' : 'pointer' }}>{savingGym ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setEditingGym(false)} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {(showAdd || editingTest) && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${accentColor}44` }}>
          <h3 style={{ margin: '0 0 16px 0', color: accentColor }}>{editingTest ? 'Edit Test' : 'Add New Test'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Name</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. 40-Yard Dash" style={iStyle} /></div>
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Unit</label>
              <select value={formUnit} onChange={(e) => { setFormUnit(e.target.value); if (e.target.value === 'time') setFormDirection('lower'); else setFormDirection('higher'); }} style={iStyle}>
                <option value="time">Time (seconds)</option><option value="weight">Weight (lbs)</option><option value="distance">Distance (inches)</option><option value="score">Score/Reps</option>
              </select>
            </div>
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Better is...</label>
              <select value={formDirection} onChange={(e) => setFormDirection(e.target.value)} style={iStyle}><option value="lower">Lower</option><option value="higher">Higher</option></select>
            </div>
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={iStyle}><option value="speed">Speed</option><option value="agility">Agility</option><option value="power">Power</option><option value="strength">Strength</option></select>
            </div>
            <div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer', marginTop: 20 }}><input type="checkbox" checked={formBoard} onChange={(e) => setFormBoard(e.target.checked)} /> Show on Record Board</label></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button onClick={handleSave} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer' }}>{editingTest ? 'Save' : 'Add'}</button>
            <button onClick={() => { setEditingTest(null); setShowAdd(false); resetForm(); }} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, tests]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: accentColor, textTransform: 'uppercase', letterSpacing: 2, borderLeft: `3px solid ${accentColor}`, paddingLeft: 10, marginBottom: 12 }}>{cat}</div>
          {tests.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: editingTest === t.id ? `${accentColor}11` : 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 6, gap: 12 }}>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span><span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>{t.unit} · {t.direction === 'lower' ? '↓ lower' : '↑ higher'}</span></div>
              {t.show_on_record_board && <span style={{ fontSize: 11, background: 'rgba(200,150,62,0.15)', color: '#C8963E', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>Board</span>}
              <button onClick={() => startEdit(t)} style={{ padding: '6px 14px', background: `${accentColor}22`, border: 'none', borderRadius: 4, color: accentColor, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button>
              <button onClick={() => handleDelete(t.id, t.name)} style={{ padding: '6px 14px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ===================== ADMIN PAGE ===================== */
function KMAdminPage({ accentColor }) {
  const [gyms, setGyms] = useState([]);
  const [gymUsers, setGymUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: g } = await supabase.from('gyms').select('*').order('created_at', { ascending: false });
      const { data: gu } = await supabase.from('gym_users').select('*');
      if (g) setGyms(g);
      if (gu) setGymUsers(gu);
      setLoading(false);
    };
    load();
  }, []);

  const getOwnerEmail = (gymId) => {
    const owner = gymUsers.find(gu => gu.gym_id === gymId && gu.role === 'admin');
    return owner?.email || '—';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return (<div style={{ textAlign: 'center', padding: 48, color: '#888' }}>Loading admin data...</div>);

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Admin Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>All Kaimetric gym signups</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div style={{ padding: '20px 28px', background: `${accentColor}15`, borderRadius: 12, border: `1px solid ${accentColor}30` }}>
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: accentColor }}>{gyms.length}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Total Gyms</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 16, padding: '14px 24px', borderBottom: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Gym Name</div>
          <div style={{ fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Owner Email</div>
          <div style={{ fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Signed Up</div>
        </div>
        {gyms.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>No gyms yet.</div>
        ) : gyms.map(g => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 16, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{g.slug}</div>
            </div>
            <div style={{ fontSize: 14, color: '#aaa' }}>{getOwnerEmail(g.id)}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{formatDate(g.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}