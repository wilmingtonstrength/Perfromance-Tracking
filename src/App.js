import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxtomnbvinxuvnrrqnqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dG9tbmJ2aW54dXZucnJxbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk5MTksImV4cCI6MjA4NTc5NTkxOX0.Ty-KRgr9JsYr7ZEZtvm7lB2TxcdWeW1CCsJQdWyFND8';
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
const formatRowTime = (totalSeconds) => {
  if (!totalSeconds) return '-';
  const s = parseFloat(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`;
};
const formatTestValueByDef = (testDef, value) => {
  if (value === null || value === undefined) return '-';
  const v = parseFloat(value);
  if (isNaN(v)) return '-';
  if (!testDef) return String(v);
  if (testDef.feet_inches) return formatFeetInches(v);
  if (testDef.row_time) return formatRowTime(v);
  const fmt = testDef.record_board_format;
  if (fmt === 'fixed2' || testDef.unit === 'sec' || testDef.unit === 'ratio') return v.toFixed(2);
  if (fmt === 'fixed1' || testDef.display_unit === 'MPH') return v.toFixed(1);
  if (testDef.unit === 'inches') return String(Math.round(v * 10) / 10);
  if (testDef.unit === '%') return String(v);
  return String(Math.round(v));
};
const formatResultWithUnit = (testDef, value) => {
  if (!testDef) return String(value);
  const formatted = formatTestValueByDef(testDef, value);
  if (testDef.feet_inches || testDef.row_time) return formatted;
  const unit = testDef.display_unit || testDef.unit;
  return formatted + (unit ? ' ' + unit : '');
};
const formatWithRaw = (testDef, convertedValue, rawValue) => {
  const main = formatResultWithUnit(testDef, convertedValue);
  if (!testDef || !testDef.convert_formula) return main;
  const raw = parseFloat(rawValue);
  if (isNaN(raw)) return main;
  return main + ' (' + raw.toFixed(2) + 's)';
};
const applyConversion = (testDef, rawValue) => {
  if (!testDef || !testDef.convert_formula) return rawValue;
  try {
    const v = parseFloat(rawValue);
    const fn = new Function('v', 'return ' + testDef.convert_formula);
    return parseFloat(fn(v).toFixed(4));
  } catch { return rawValue; }
};

/* ===================== ATHLETE SCORE (TSA) ===================== */
const TSA_TEST_IDS = [
  { id: 'vertical_jump', label: 'Vertical Jump', direction: 'higher', unit: 'in' },
  { id: 'clean', label: 'Clean', direction: 'higher', unit: 'lbs' },
  { id: '_best_squat', label: 'Best Squat', direction: 'higher', unit: 'lbs', rollupIds: ['back_squat', 'front_squat'] },
  { id: '5_10_fly', label: '5-10 Fly', direction: 'lower', unit: 'sec' },
  { id: 'max_velocity', label: 'Max Velocity', direction: 'higher', unit: 'MPH' },
  { id: '5_0_5', label: '5-0-5', direction: 'lower', unit: 'sec' },
  { id: 'rsi', label: 'RSI', direction: 'higher', unit: '' },
];
const normalCDF = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const cdf = z > 0 ? 1 - p : p;
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
};
const scoreLabel = (score) => {
  if (score >= 90) return { label: 'Elite', color: '#ffd700' };
  if (score >= 75) return { label: 'Above Average', color: '#00ff88' };
  if (score >= 40) return { label: 'Average', color: '#00d4ff' };
  if (score >= 20) return { label: 'Below Average', color: '#FFA500' };
  return { label: 'Developing', color: '#ff6666' };
};
const calculateAthleteScore = (athleteId, allAthletes, allResults) => {
  const youthAthletes = allAthletes.filter(a => (a.type || 'athlete') === 'athlete');
  const getBest = (aId, t) => {
    const ids = t.rollupIds || [t.id];
    const vals = allResults.filter(r => r.athlete_id === aId && ids.includes(r.test_id)).map(r => parseFloat(r.converted_value)).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return t.direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
  };
  const popStats = {};
  TSA_TEST_IDS.forEach(t => {
    const vals = [];
    youthAthletes.forEach(a => { const best = getBest(a.id, t); if (best !== null) vals.push(best); });
    if (vals.length < 5) { popStats[t.id] = null; return; }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length) || 1;
    popStats[t.id] = { mean, sd, n: vals.length };
  });
  const zScores = []; const breakdown = [];
  TSA_TEST_IDS.forEach(t => {
    if (!popStats[t.id]) return;
    const best = getBest(athleteId, t);
    if (best === null) return;
    const { mean, sd } = popStats[t.id];
    const z = t.direction === 'lower' ? (mean - best) / sd : (best - mean) / sd;
    const tScore = normalCDF(z);
    zScores.push(z);
    breakdown.push({ testId: t.id, label: t.label, unit: t.unit, z, tScore, best, n: popStats[t.id].n });
  });
  if (zScores.length === 0) return null;
  const avgZ = zScores.reduce((s, v) => s + v, 0) / zScores.length;
  const overall = normalCDF(avgZ);
  return { score: overall, testsUsed: zScores.length, totalTests: TSA_TEST_IDS.length, breakdown, avgZ };
};

/* ===================== SEARCH PICKER ===================== */
function AthleteSearchPicker({ athletes, value, onChange, excludeIds = [], placeholder = 'Search athlete...', filterType = null }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = React.useRef(null);
  const selectedAthlete = athletes.find(a => a.id === value);
  const filtered = athletes
    .filter(a => (a.status === 'Active' || a.status === 'active') && !excludeIds.includes(a.id))
    .filter(a => !filterType || (a.type || 'athlete') === filterType)
    .filter(a => !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()));
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
              {a.birthday && <span style={{ color: '#888', fontSize: 12 }}> • {calculateAge(a.birthday)} yrs</span>}
              {(a.type === 'adult') && <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>ADULT</span>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '10px 16px', color: '#666', fontSize: 14 }}>No athletes found</div>}
        </div>
      )}
    </div>
  );
}

/* ===================== FEET+INCHES INPUT ===================== */
function FeetInchesInput({ value, onChange, style = {} }) {
  const [feet, setFeet] = useState(''); const [inches, setInches] = useState(''); const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && value !== '' && value !== undefined && value !== null) { const total = parseFloat(value); if (!isNaN(total)) { setFeet(String(Math.floor(total / 12))); setInches(String(parseFloat((total % 12).toFixed(1)))); } setInitialized(true); }
    else if (value === '' || value === undefined || value === null) { if (initialized) { setFeet(''); setInches(''); } }
  }, [value, initialized]);
  const handleChange = (nf, ni) => { setFeet(nf); setInches(ni); const f = nf !== '' ? parseInt(nf) : 0; const i = ni !== '' ? parseFloat(ni) : 0; onChange(nf === '' && ni === '' ? '' : String(f * 12 + i)); };
  const s = { width: 44, padding: '8px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center', ...style };
  return (<div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}><input type="number" min="0" max="12" placeholder="ft" value={feet} onChange={(e) => handleChange(e.target.value, inches)} onWheel={preventScrollChange} style={s} /><span style={{ color: '#666', fontSize: 14 }}>'</span><input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={inches} onChange={(e) => handleChange(feet, e.target.value)} onWheel={preventScrollChange} style={s} /><span style={{ color: '#666', fontSize: 14 }}>"</span></div>);
}

/* ===================== ROW TIME INPUT ===================== */
function RowTimeInput({ value, onChange }) {
  const [minutes, setMinutes] = useState(''); const [seconds, setSeconds] = useState(''); const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && value !== '' && value !== undefined && value !== null) { const total = parseFloat(value); if (!isNaN(total)) { setMinutes(String(Math.floor(total / 60))); setSeconds(String((total % 60).toFixed(1))); } setInitialized(true); }
    else if (!value) { if (initialized) { setMinutes(''); setSeconds(''); } }
  }, [value, initialized]);
  const handleChange = (m, s) => { setMinutes(m); setSeconds(s); const mVal = m !== '' ? parseInt(m) : 0; const sVal = s !== '' ? parseFloat(s) : 0; onChange(m === '' && s === '' ? '' : String(mVal * 60 + sVal)); };
  const s = { width: 50, padding: '8px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' };
  return (<div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}><input type="number" min="0" max="5" placeholder="min" value={minutes} onChange={(e) => handleChange(e.target.value, seconds)} onWheel={preventScrollChange} style={s} /><span style={{ color: '#666', fontSize: 14 }}>:</span><input type="number" min="0" max="59.9" step="0.1" placeholder="sec" value={seconds} onChange={(e) => handleChange(minutes, e.target.value)} onWheel={preventScrollChange} style={{ ...s, width: 60 }} /></div>);
}

/* ===================== SIMPLE CHART ===================== */
function SimpleChart({ data, direction, testDef, onPointClick }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value); const minVal = Math.min(...values); const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1; const rawStep = range / 4;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
  const step = niceSteps.find(s => s >= rawStep) || rawStep;
  const chartMin = Math.floor(minVal / step) * step - step; const chartMax = Math.ceil(maxVal / step) * step + step;
  const chartRange = chartMax - chartMin || 1; const yLabels = [];
  for (let v = chartMin; v <= chartMax + step * 0.01; v += step) { yLabels.push(Math.round(v * 100) / 100); }
  const width = 100; const height = 200;
  const pointSpacing = data.length > 1 ? width / (data.length - 1) : width / 2;
  const getY = (val) => height - ((val - chartMin) / chartRange) * height;
  const points = data.map((d, i) => ({ x: data.length === 1 ? width / 2 : i * pointSpacing, y: getY(d.value), ...d }));
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
  const bestValue = direction === 'lower' ? minVal : maxVal;
  const formatVal = (v) => testDef ? formatTestValueByDef(testDef, v) : v;
  const formatYLabel = (val) => { if (testDef && testDef.feet_inches) return formatFeetInches(val); if (testDef && testDef.row_time) return formatRowTime(val); return Number.isInteger(val) ? val : val.toFixed(1); };
  return (
    <div style={{ padding: '20px 0' }}>
      <svg viewBox={'-40 -15 ' + (width + 70) + ' ' + (height + 45)} style={{ width: '100%', height: 280 }}>
        {yLabels.map((val, i) => { const y = getY(val); if (y < -5 || y > height + 5) return null; return (<g key={i}><line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" /><text x={-8} y={y + 4} fill="#888" fontSize="9" textAnchor="end">{formatYLabel(val)}</text></g>); })}
        <line x1={0} y1={getY(bestValue)} x2={width} y2={getY(bestValue)} stroke="#00ff88" strokeWidth="1.5" strokeDasharray="4,4" />
        <text x={width + 3} y={getY(bestValue) + 4} fill="#00ff88" fontSize="9">{'PR: ' + formatVal(bestValue)}</text>
        <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" />
        {points.map((p, i) => (<g key={i} style={{ cursor: onPointClick ? 'pointer' : 'default' }} onClick={() => onPointClick && onPointClick(p)}><circle cx={p.x} cy={p.y} r={p.value === bestValue ? 7 : 5} fill={p.value === bestValue ? '#00ff88' : '#00d4ff'} /><text x={p.x} y={p.y - 12} fill={p.value === bestValue ? '#00ff88' : '#fff'} fontSize="10" fontWeight="700" textAnchor="middle">{formatVal(p.value)}</text><text x={p.x} y={height + 18} fill="#888" fontSize="8" textAnchor="middle">{p.date}</text></g>))}
      </svg>
    </div>
  );
}

/* ===================== MAIN APP ===================== */
export default function App() {
  const [page, setPage] = useState('entry');
  const [athletes, setAthletes] = useState([]);
  const [results, setResults] = useState([]);
  const [testDefs, setTestDefs] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const getTestById = (id) => testDefs.find(t => t.id === id) || null;
  const getYouthTests = () => testDefs.filter(t => t.athlete_type === 'athlete' || t.athlete_type === 'both');
  const getAdultTests = () => testDefs.filter(t => t.athlete_type === 'adult' || t.athlete_type === 'both');
  const getTestsForType = (type) => {
    const list = type === 'adult' ? getAdultTests() : getYouthTests();
    const grouped = {};
    list.forEach(t => { const cat = t.category_label || t.category; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(t); });
    return grouped;
  };

  const loadData = async () => {
    setLoading(true);
    const { data: td } = await supabase.from('tests').select('*').eq('active', true).order('sort_order');
    if (td) setTestDefs(td);
    const { data: ad } = await supabase.from('athletes').select('*').order('first_name');
    let allResults = []; let from = 0;
    while (true) {
      const { data: batch } = await supabase.from('results').select('*').range(from, from + 499);
      if (batch && batch.length > 0) allResults = [...allResults, ...batch];
      if (!batch || batch.length < 500) break;
      from += 500;
    }
    if (ad) setAthletes(ad);
    setResults(allResults);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 4000); };

  const addAthlete = async (athlete) => {
    const age = athlete.birthday ? calculateAge(athlete.birthday) : null;
    const { data, error } = await supabase.from('athletes').insert([{ first_name: athlete.firstName, last_name: athlete.lastName, email: athlete.email || '', phone: athlete.phone || '', birthday: athlete.birthday || null, age, gender: athlete.gender, status: 'Active', type: athlete.type || 'athlete' }]).select();
    if (data) { setAthletes([...athletes, data[0]].sort((a, b) => a.first_name.localeCompare(b.first_name))); showNotification(athlete.firstName + ' ' + athlete.lastName + ' added!'); }
    if (error) showNotification('Error adding athlete', 'error');
  };

  const updateAthlete = async (id, updates) => {
    const age = updates.birthday ? calculateAge(updates.birthday) : null;
    const { error } = await supabase.from('athletes').update({ first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday || null, age, gender: updates.gender, status: updates.status, type: updates.type || 'athlete' }).eq('id', id);
    if (!error) { setAthletes(athletes.map(a => a.id === id ? { ...a, first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday, age, gender: updates.gender, status: updates.status, type: updates.type || 'athlete' } : a)); showNotification('Athlete updated!'); }
  };

  const deleteAthlete = async (id, athleteName) => {
    if (!window.confirm(`Delete ${athleteName} and ALL their test results? This cannot be undone.`)) return;
    await supabase.from('results').delete().eq('athlete_id', id);
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (!error) { setAthletes(athletes.filter(a => a.id !== id)); setResults(results.filter(r => r.athlete_id !== id)); showNotification(`${athleteName} deleted`); }
  };

  const deleteResult = async (resultId) => {
    const { error } = await supabase.from('results').delete().eq('id', resultId);
    if (!error) { setResults(results.filter(r => r.id !== resultId)); showNotification('Result deleted'); }
  };

  const updateResult = async (resultId, updates) => {
    const td = getTestById(updates.testId);
    const cv = td && td.convert_formula ? applyConversion(td, updates.rawValue) : updates.rawValue;
    const { error } = await supabase.from('results').update({ test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv }).eq('id', resultId);
    if (!error) { setResults(results.map(r => r.id === resultId ? { ...r, test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv } : r)); showNotification('Result updated!'); }
  };

  const logResults = async (resultsToLog) => {
    let prCount = 0; const newResults = [];
    for (const result of resultsToLog) {
      const td = getTestById(result.testId);
      const prev = results.filter(r => r.athlete_id === result.athleteId && r.test_id === result.testId);
      let isPR = prev.length === 0;
      if (!isPR && td) {
        const best = td.direction === 'higher' ? Math.max(...prev.map(r => parseFloat(r.converted_value))) : Math.min(...prev.map(r => parseFloat(r.converted_value)));
        isPR = td.direction === 'higher' ? result.convertedValue > best : result.convertedValue < best;
      }
      const { data } = await supabase.from('results').insert([{ athlete_id: result.athleteId, test_id: result.testId, test_date: result.testDate, raw_value: result.rawValue, converted_value: result.convertedValue, unit: result.unit, is_pr: isPR }]).select();
      if (data) { newResults.push(data[0]); if (isPR) prCount++; }
    }
    setResults([...results, ...newResults]);
    if (prCount > 0) showNotification('🏆 ' + prCount + ' NEW PR' + (prCount > 1 ? 's' : '') + '! Results logged!', 'pr');
    else showNotification(resultsToLog.length + ' result' + (resultsToLog.length > 1 ? 's' : '') + ' logged!');
    return newResults;
  };

  const getPR = (athleteId, testId) => {
    const td = getTestById(testId);
    if (!td) return null;
    const ar = results.filter(r => r.athlete_id === athleteId && r.test_id === testId);
    if (ar.length === 0) return null;
    return td.direction === 'higher' ? Math.max(...ar.map(r => parseFloat(r.converted_value))) : Math.min(...ar.map(r => parseFloat(r.converted_value)));
  };

  const getPRResult = (athleteId, testId) => {
    const td = getTestById(testId);
    if (!td) return null;
    const ar = results.filter(r => r.athlete_id === athleteId && r.test_id === testId);
    if (ar.length === 0) return null;
    const sorted = [...ar].sort((a, b) => td.direction === 'higher' ? parseFloat(b.converted_value) - parseFloat(a.converted_value) : parseFloat(a.converted_value) - parseFloat(b.converted_value));
    return sorted[0];
  };

  if (loading) return (<div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20 }}>Loading...</div>);

  const navItems = [
    { id: 'entry', label: 'Test Entry' },
    { id: 'athletes', label: 'Athletes' },
    { id: 'profiles', label: '📊 Profiles' },
    { id: 'recentprs', label: '🔥 Recent PRs' },
    { id: 'jumpcalc', label: '📏 Jump Calc' },
    { id: 'recordboard', label: '🏆 Record Board' },
    { id: 'testsettings', label: '⚙️ Tests' },
    { id: 'progressreports', label: '📋 Reports' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: "'Archivo', 'Helvetica Neue', sans-serif", color: '#e8e8e8' }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      <header style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#0a1628' }}>W</div>
            <div><div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, letterSpacing: 1 }}>WILMINGTON STRENGTH</div><div style={{ fontSize: 11, color: '#00d4ff', letterSpacing: 2, textTransform: 'uppercase' }}>Performance Tracking</div></div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {navItems.map(item => (<button key={item.id} onClick={() => setPage(item.id)} style={{ padding: '10px 20px', background: page === item.id ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: page === item.id ? '#0a1628' : '#e8e8e8', fontWeight: page === item.id ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>{item.label}</button>))}
          </nav>
        </div>
      </header>
      {notification && (<div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', background: notification.type === 'pr' ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, color: '#0a1628', fontWeight: 700, fontSize: 16, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,212,255,0.3)' }}>{notification.message}</div>)}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && <TestEntryPage athletes={athletes} logResults={logResults} getPR={getPR} getPRResult={getPRResult} getTestById={getTestById} getTestsForType={getTestsForType} />}
        {page === 'athletes' && <AthletesPage athletes={athletes} addAthlete={addAthlete} updateAthlete={updateAthlete} deleteAthlete={deleteAthlete} results={results} getPR={getPR} getPRResult={getPRResult} getTestById={getTestById} getTestsForType={getTestsForType} testDefs={testDefs} deleteResult={deleteResult} updateResult={updateResult} />}
        {page === 'recentprs' && <RecentPRsPage athletes={athletes} results={results} getTestById={getTestById} testDefs={testDefs} />}
        {page === 'jumpcalc' && <JumpCalcPage athletes={athletes} setAthletes={setAthletes} results={results} logResults={logResults} getPR={getPR} showNotification={showNotification} />}
        {page === 'profiles' && <AthleteProfilePage athletes={athletes} results={results} />}
        {page === 'recordboard' && <RecordBoardPage athletes={athletes} results={results} testDefs={testDefs} getTestById={getTestById} />}
        {page === 'testsettings' && <TestSettingsPage testDefs={testDefs} setTestDefs={setTestDefs} showNotification={showNotification} />}
        {page === 'progressreports' && <ProgressReportsPage athletes={athletes} results={results} testDefs={testDefs} getTestById={getTestById} showNotification={showNotification} />}
      </main>
      <style>{`* { box-sizing: border-box; } input, select, button { font-family: inherit; } input:focus, select:focus { outline: 2px solid #00d4ff; outline-offset: 2px; } input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; appearance: textfield; }`}</style>
    </div>
  );
}

/* ===================== TEST ENTRY PAGE ===================== */
function TestEntryPage({ athletes, logResults, getPR, getPRResult, getTestById, getTestsForType }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [useKg, setUseKg] = useState(false);
  const [athleteRows, setAthleteRows] = useState([]);
  const [submittedResults, setSubmittedResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [entryMode, setEntryMode] = useState('athlete');

  const testSet = getTestsForType(entryMode);
  const anyStrength = selectedTests.some(tid => { const t = getTestById(tid); return t && t.allow_kg; });
  const toggleTest = (testId) => {
    if (selectedTests.includes(testId)) { setSelectedTests(selectedTests.filter(t => t !== testId)); setAthleteRows(athleteRows.map(row => { const nv = { ...row.values }; delete nv[testId]; return { ...row, values: nv }; })); }
    else { setSelectedTests([...selectedTests, testId]); setAthleteRows(athleteRows.map(row => ({ ...row, values: { ...row.values, [testId]: '' } }))); }
  };
  const switchMode = (mode) => { setEntryMode(mode); setSelectedTests([]); setAthleteRows([]); };
  const addAthleteRow = (athleteId) => { if (!athleteId || athleteRows.find(r => r.athleteId === athleteId)) return; const values = {}; selectedTests.forEach(tid => { values[tid] = ''; }); setAthleteRows([...athleteRows, { athleteId, values }]); };
  const removeAthleteRow = (index) => setAthleteRows(athleteRows.filter((_, i) => i !== index));
  const updateValue = (rowIndex, testId, value) => { const nr = [...athleteRows]; nr[rowIndex] = { ...nr[rowIndex], values: { ...nr[rowIndex].values, [testId]: value } }; setAthleteRows(nr); };
  const usedAthleteIds = athleteRows.map(r => r.athleteId);
  const startNextGroup = () => { setAthleteRows([]); setSubmittedResults([]); setShowSummary(false); };

  const handleSubmit = async () => {
    if (selectedTests.length === 0 || !testDate) { alert('Please select at least one test and a date'); return; }
    const toLog = [];
    athleteRows.forEach(row => {
      selectedTests.forEach(testId => {
        const val = row.values[testId]; if (val === '' || val === undefined) return;
        const testDef = getTestById(testId); let raw = parseFloat(val); let cv = raw;
        if (testDef.allow_kg && useKg) { cv = Math.round(raw * 2.205); }
        if (testDef.convert_formula) cv = applyConversion(testDef, raw);
        toLog.push({ athleteId: row.athleteId, testId, testDate, rawValue: raw, convertedValue: cv, unit: testDef.allow_kg && useKg ? 'kg' : testDef.unit });
      });
    });
    if (toLog.length === 0) { alert('Please enter at least one value'); return; }
    setSubmitting(true);
    const logged = await logResults(toLog);
    setSubmittedResults(logged.map(r => { const a = athletes.find(x => x.id === r.athlete_id); const t = getTestById(r.test_id); return { athlete: (a ? a.first_name + ' ' + a.last_name : 'Unknown'), test: t ? t.name : r.test_id, value: r.converted_value, rawValue: r.raw_value, testDef: t, unit: t ? (t.display_unit || t.unit) : '', isPR: r.is_pr }; }));
    setShowSummary(true); setSubmitting(false);
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  if (showSummary) {
    const prResults = submittedResults.filter(r => r.isPR); const nonPRResults = submittedResults.filter(r => !r.isPR);
    return (
      <div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Results Logged</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>{submittedResults.length} result{submittedResults.length !== 1 ? 's' : ''} saved</p>
        {prResults.length > 0 && (<div style={{ background: 'rgba(0,255,136,0.1)', borderRadius: 12, padding: 24, border: '1px solid rgba(0,255,136,0.4)', marginBottom: 16 }}><h2 style={{ margin: '0 0 16px 0', color: '#00ff88', fontSize: 22 }}>🏆 New PRs — {prResults.length}</h2>{prResults.map((r, i) => (<div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 700, fontSize: 16 }}>{r.athlete} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>— {r.test}</span></span><span style={{ color: '#00ff88', fontWeight: 800, fontSize: 18 }}>{r.testDef && r.testDef.convert_formula ? formatWithRaw(r.testDef, r.value, r.rawValue) : formatResultWithUnit(r.testDef, r.value)}</span></div>))}</div>)}
        {nonPRResults.length > 0 && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}><h3 style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: 16 }}>Other Results</h3>{nonPRResults.map((r, i) => (<div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}><span><span style={{ fontWeight: 600 }}>{r.athlete}</span> — {r.test}</span><span style={{ color: '#00d4ff' }}>{r.testDef && r.testDef.convert_formula ? formatWithRaw(r.testDef, r.value, r.rawValue) : formatResultWithUnit(r.testDef, r.value)}</span></div>))}</div>)}
        <button onClick={startNextGroup} style={{ width: '100%', padding: '20px 32px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>+ Start Next Group</button>
        <p style={{ textAlign: 'center', marginTop: 12, color: '#555', fontSize: 13 }}>Need to fix an entry? Go to Athletes tab to edit or delete results.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Test Entry</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Select your tests, add athletes, enter results</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => switchMode('athlete')} style={{ padding: '10px 24px', background: entryMode === 'athlete' ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: entryMode === 'athlete' ? '#0a1628' : '#aaa', fontWeight: entryMode === 'athlete' ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>Youth Athletes</button>
        <button onClick={() => switchMode('adult')} style={{ padding: '10px 24px', background: entryMode === 'adult' ? 'linear-gradient(135deg, #FFA500 0%, #cc8400 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: entryMode === 'adult' ? '#0a1628' : '#aaa', fontWeight: entryMode === 'adult' ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>Adult Clients</button>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${entryMode === 'adult' ? 'rgba(255,165,0,0.2)' : 'rgba(255,255,255,0.1)'}` }}>
        <h3 style={{ margin: '0 0 16px 0', color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Session Setup</h3>
        <div style={{ marginBottom: 16 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...iStyle, width: 220 }} /></div>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#aaa' }}>Select Tests</label>
        {Object.entries(testSet).map(([catLabel, tests]) => (
          <div key={catLabel} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{catLabel}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tests.map(t => { const active = selectedTests.includes(t.id); const activeBg = entryMode === 'adult' ? 'linear-gradient(135deg, #FFA500 0%, #cc8400 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)'; return <button key={t.id} onClick={() => toggleTest(t.id)} style={{ padding: '8px 16px', background: active ? activeBg : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>; })}
            </div>
          </div>
        ))}
        {anyStrength && (<div style={{ marginTop: 16 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Strength Unit <span style={{ color: '#555', fontSize: 12 }}>(always stored as lbs)</span></label><div style={{ display: 'flex', gap: 8, width: 200 }}><button onClick={() => setUseKg(false)} style={{ flex: 1, padding: '10px', background: !useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: !useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>LBS</button><button onClick={() => setUseKg(true)} style={{ flex: 1, padding: '10px', background: useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>KG</button></div>{useKg && <div style={{ marginTop: 8, fontSize: 12, color: '#00d4ff' }}>Entering in kg — auto-converts to lbs on save</div>}</div>)}
      </div>
      {selectedTests.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Add {entryMode === 'adult' ? 'Clients' : 'Athletes'} & Enter Results</h3>
          <div style={{ marginBottom: 16 }}><AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => { if (id) addAthleteRow(id); }} excludeIds={usedAthleteIds} placeholder={`Search & add ${entryMode === 'adult' ? 'client' : 'athlete'}...`} filterType={entryMode} /></div>
          {athleteRows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, minWidth: 'fit-content' }}>
                <div style={{ minWidth: 140, fontSize: 12, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Name</div>
                {selectedTests.map(tid => { const t = getTestById(tid); const headerUnit = t && t.allow_kg && useKg ? 'kg' : ''; return (<div key={tid} style={{ minWidth: (t && t.feet_inches) ? 130 : (t && t.row_time) ? 120 : 100, flex: 1, fontSize: 11, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{t ? t.name : tid}{headerUnit && <span style={{ color: '#f0a500', display: 'block', fontSize: 10 }}>{headerUnit}</span>}</div>); })}
                <div style={{ width: 32 }}></div>
              </div>
              {athleteRows.map((row, rowIndex) => {
                const athlete = athletes.find(a => a.id === row.athleteId);
                return (
                  <div key={row.athleteId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: 'fit-content' }}>
                    <div style={{ minWidth: 140 }}><div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{athlete ? athlete.first_name : ''}</div><div style={{ fontSize: 11, color: '#666' }}>{athlete ? athlete.last_name : ''}</div></div>
                    {selectedTests.map(tid => {
                      const t = getTestById(tid); const pr = getPR(row.athleteId, tid); const prR = getPRResult(row.athleteId, tid);
                      const useFtIn = t && t.feet_inches; const isRowTest = t && t.row_time;
                      const prDisplay = pr !== null ? (t && t.allow_kg && useKg ? Math.round(pr / 2.205) + ' kg' : (prR && t.convert_formula ? formatWithRaw(t, pr, prR.raw_value) : formatResultWithUnit(t, pr))) : null;
                      return (<div key={tid} style={{ minWidth: useFtIn ? 130 : isRowTest ? 120 : 100, flex: 1 }}>
                        {useFtIn ? <FeetInchesInput value={row.values[tid]} onChange={(val) => updateValue(rowIndex, tid, val)} /> : isRowTest ? <RowTimeInput value={row.values[tid]} onChange={(val) => updateValue(rowIndex, tid, val)} /> : <input type="number" step="0.01" placeholder={t && t.allow_kg && useKg ? 'kg' : (t ? t.unit : 'val')} value={row.values[tid] || ''} onChange={(e) => updateValue(rowIndex, tid, e.target.value)} onWheel={preventScrollChange} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' }} />}
                        {prDisplay !== null && <div style={{ fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 }}>PR: {prDisplay}</div>}
                      </div>);
                    })}
                    <button onClick={() => removeAthleteRow(rowIndex)} style={{ width: 32, padding: '4px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          {athleteRows.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>Search and add {entryMode === 'adult' ? 'clients' : 'athletes'} above</div>}
        </div>
      )}
      {selectedTests.length > 0 && athleteRows.length > 0 && (<button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '20px 32px', background: submitting ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: '0 4px 20px rgba(0,255,136,0.3)' }}>{submitting ? 'Saving...' : 'Submit All Results'}</button>)}
    </div>
  );
}

/* ===================== COMBINED ATHLETES PAGE ===================== */
function AthletesPage({ athletes, addAthlete, updateAthlete, deleteAthlete, results, getPR, getPRResult, getTestById, getTestsForType, testDefs, deleteResult, updateResult }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState(''); const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active'); const [type, setType] = useState('athlete');
  const [profileTab, setProfileTab] = useState('prs');
  const [selectedTest, setSelectedTest] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editDate, setEditDate] = useState(''); const [editValue, setEditValue] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');

  const athlete = athletes.find(a => a.id === selectedAthlete);
  const isAdult = athlete && athlete.type === 'adult';
  const testSet = isAdult ? getTestsForType('adult') : getTestsForType('athlete');
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === selectedAthlete) : [];
  const athleteScore = (!isAdult && selectedAthlete) ? calculateAthleteScore(selectedAthlete, athletes, results) : null;
  const resetForm = () => { setFirstName(''); setLastName(''); setBirthday(''); setGender('Male'); setEmail(''); setPhone(''); setStatus('Active'); setType('athlete'); };
  const handleAdd = (e) => { e.preventDefault(); if (!firstName || !lastName) return; addAthlete({ firstName, lastName, birthday, gender, email, phone, type }); resetForm(); setShowAddForm(false); };
  const startEditInfo = () => { if (!athlete) return; setFirstName(athlete.first_name); setLastName(athlete.last_name); setBirthday(athlete.birthday ? String(athlete.birthday).slice(0, 10) : ''); setGender(athlete.gender || 'Male'); setEmail(athlete.email || ''); setPhone(athlete.phone || ''); setStatus(athlete.status || 'Active'); setType(athlete.type || 'athlete'); setEditingInfo(true); };
  const saveEditInfo = () => { updateAthlete(selectedAthlete, { firstName, lastName, birthday, gender, email, phone, status, type }); setEditingInfo(false); };
  const handleSelectAthlete = (id) => { setSelectedAthlete(id); setEditingInfo(false); setProfileTab('prs'); setSelectedTest(''); setEditingResult(null); setHistoryFilter(''); };
  const handleEditResult = (r) => { setEditingResult(r.id); setEditDate(String(r.test_date).slice(0, 10)); setEditValue(String(r.raw_value)); };
  const handleSaveResult = (r) => { updateResult(r.id, { testId: r.test_id, testDate: editDate, rawValue: parseFloat(editValue) }); setEditingResult(null); };
  const filteredAthletes = athletes.filter(a => { const nm = !searchTerm || (a.first_name + ' ' + a.last_name).toLowerCase().includes(searchTerm.toLowerCase()); const tm = filterType === 'all' || (a.type || 'athlete') === filterType; return nm && tm; });
  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  const athleteCount = athletes.filter(a => (a.type || 'athlete') === 'athlete').length;
  const adultCount = athletes.filter(a => a.type === 'adult').length;
  const filteredHistory = historyFilter ? athleteResults.filter(r => r.test_id === historyFilter) : athleteResults;
  const sortedHistory = [...filteredHistory].sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  const testDef = selectedTest ? getTestById(selectedTest) : null;
  const chartData = selectedTest && selectedAthlete ? athleteResults.filter(r => r.test_id === selectedTest).sort((a, b) => new Date(a.test_date) - new Date(b.test_date)).map(r => ({ date: new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: parseFloat(r.converted_value), id: r.id })) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div><h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athletes</h1><p style={{ color: '#888' }}>{athleteCount} athletes · {adultCount} adult clients</p></div>
        <button onClick={() => { setShowAddForm(!showAddForm); resetForm(); setSelectedAthlete(null); }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Person</button>
      </div>
      {showAddForm && (
        <form onSubmit={handleAdd} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>New Person</h3>
          <div style={{ marginBottom: 20 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#888' }}>Type</label><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => setType('athlete')} style={{ padding: '10px 20px', background: type === 'athlete' ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: type === 'athlete' ? '#0a1628' : '#aaa', fontWeight: type === 'athlete' ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>Youth Athlete</button><button type="button" onClick={() => setType('adult')} style={{ padding: '10px 20px', background: type === 'adult' ? 'linear-gradient(135deg, #FFA500 0%, #cc8400 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: type === 'adult' ? '#0a1628' : '#aaa', fontWeight: type === 'adult' ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>Adult Client</button></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={iStyle} />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={iStyle} />
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ width: '100%', ...iStyle }} /></div>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={iStyle}><option>Male</option><option>Female</option></select>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}><button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Add Person</button><button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button></div>
        </form>
      )}
      {!selectedAthlete && (<>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...iStyle, width: 260 }} />
          <div style={{ display: 'flex', gap: 8 }}>{['all', 'athlete', 'adult'].map(t => (<button key={t} onClick={() => setFilterType(t)} style={{ padding: '10px 16px', background: filterType === t ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)', border: filterType === t ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: filterType === t ? '#00d4ff' : '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: filterType === t ? 600 : 400 }}>{t === 'all' ? 'All' : t === 'athlete' ? 'Youth' : 'Adults'}</button>))}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredAthletes.map(a => { const ar = results.filter(r => r.athlete_id === a.id); const prs = ar.filter(r => r.is_pr).length; const age = calculateAge(a.birthday); const isAd = a.type === 'adult'; return (
            <div key={a.id} onClick={() => handleSelectAthlete(a.id)} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${isAd ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><div><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}><h3 style={{ margin: 0, fontSize: 18 }}>{a.first_name} {a.last_name}</h3>{isAd && <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>ADULT</span>}</div><p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>{age && (age + ' yrs')}{a.gender && (' · ' + a.gender)}</p></div><span style={{ padding: '4px 10px', background: (a.status === 'Active' || a.status === 'active') ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)', color: (a.status === 'Active' || a.status === 'active') ? '#00ff88' : '#888', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{a.status}</span></div>
              <div style={{ marginTop: 16, display: 'flex', gap: 24 }}><div><div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{ar.length}</div><div style={{ fontSize: 12, color: '#888' }}>Tests</div></div><div><div style={{ fontSize: 24, fontWeight: 700, color: '#00ff88' }}>{prs}</div><div style={{ fontSize: 12, color: '#888' }}>PRs</div></div></div>
            </div>); })}
        </div>
      </>)}
      {athlete && (<div>
        <button onClick={() => { setSelectedAthlete(null); setEditingInfo(false); }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back to list</button>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${isAdult ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.1)'}` }}>
          {editingInfo ? (<div><h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>Edit Info</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}><input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={iStyle} /><input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={iStyle} /><div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ width: '100%', ...iStyle }} /></div><select value={gender} onChange={(e) => setGender(e.target.value)} style={iStyle}><option>Male</option><option>Female</option></select><select value={status} onChange={(e) => setStatus(e.target.value)} style={iStyle}><option>Active</option><option>Inactive</option></select><select value={type} onChange={(e) => setType(e.target.value)} style={iStyle}><option value="athlete">Youth Athlete</option><option value="adult">Adult Client</option></select></div><div style={{ marginTop: 16, display: 'flex', gap: 12 }}><button onClick={saveEditInfo} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer' }}>Save</button><button onClick={() => setEditingInfo(false)} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button></div></div>
          ) : (<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}><div><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}><h2 style={{ margin: 0, fontSize: 28, fontFamily: "'Archivo Black', sans-serif" }}>{athlete.first_name} {athlete.last_name}</h2>{isAdult && <span style={{ fontSize: 12, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>ADULT</span>}</div><p style={{ margin: 0, color: '#888', fontSize: 14 }}>{calculateAge(athlete.birthday) && (calculateAge(athlete.birthday) + ' yrs')}{athlete.gender && (' · ' + athlete.gender)}{' · ' + athleteResults.length + ' tests'}{' · ' + athleteResults.filter(r => r.is_pr).length + ' PRs'}</p></div><div style={{ display: 'flex', gap: 8 }}><button onClick={startEditInfo} style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, color: '#00d4ff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit Info</button><button onClick={() => { deleteAthlete(athlete.id, `${athlete.first_name} ${athlete.last_name}`); setSelectedAthlete(null); }} style={{ padding: '8px 16px', background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 6, color: '#ff6666', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button></div></div>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ id: 'prs', label: 'Personal Records' }, { id: 'history', label: 'Test History' }, { id: 'progress', label: 'Progress Charts' }, ...(!isAdult ? [{ id: 'score', label: 'Athlete Score' }] : [])].map(tab => (<button key={tab.id} onClick={() => setProfileTab(tab.id)} style={{ padding: '10px 20px', background: profileTab === tab.id ? (tab.id === 'score' ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)') : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: profileTab === tab.id ? (tab.id === 'score' ? '#fff' : '#0a1628') : '#aaa', fontWeight: profileTab === tab.id ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>{tab.label}</button>))}
        </div>
        {profileTab === 'prs' && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>{Object.entries(testSet).map(([catLabel, tests]) => (<div key={catLabel}><h4 style={{ color: isAdult ? '#FFA500' : '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{catLabel}</h4>{tests.map(t => { const pr = getPR(athlete.id, t.id); const prR = getPRResult(athlete.id, t.id); return (<div key={t.id} onClick={() => { setProfileTab('progress'); setSelectedTest(t.id); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14, cursor: 'pointer' }}><span style={{ color: '#aaa' }}>{t.name}</span><span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>{pr !== null ? (prR && t.convert_formula ? formatWithRaw(t, pr, prR.raw_value) : formatResultWithUnit(t, pr)) : '-'}</span></div>); })}</div>))}</div></div>)}
        {profileTab === 'history' && (<div><div style={{ marginBottom: 16 }}><select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} style={{ ...iStyle, width: 260 }}><option value="">All Tests</option>{Object.entries(testSet).map(([catLabel, tests]) => (<optgroup key={catLabel} label={catLabel}>{tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>))}</select></div>
          {sortedHistory.length > 0 ? (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>{sortedHistory.map(r => { const t = getTestById(r.test_id); const isEd = editingResult === r.id; return (<div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, flexWrap: 'wrap' }}>{isEd ? (<><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} /><span style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{t?.name || r.test_id}</span><input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} onWheel={preventScrollChange} style={{ width: 100, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} />{t && t.feet_inches && editValue && <span style={{ color: '#888', fontSize: 12 }}>= {formatFeetInches(parseFloat(editValue))}</span>}{t && t.row_time && editValue && <span style={{ color: '#888', fontSize: 12 }}>= {formatRowTime(parseFloat(editValue))}</span>}<button onClick={() => handleSaveResult(r)} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.3)', border: 'none', borderRadius: 4, color: '#00ff88', cursor: 'pointer', fontSize: 12 }}>Save</button><button onClick={() => setEditingResult(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button></>) : (<><div style={{ width: 100, fontSize: 13, color: '#888' }}>{new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div style={{ flex: 1, color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{t?.name || r.test_id}</div><div style={{ fontWeight: 700, color: r.is_pr ? '#ffd700' : '#00ff88' }}>{t ? (t.convert_formula ? formatWithRaw(t, r.converted_value, r.raw_value) : formatResultWithUnit(t, r.converted_value)) : r.converted_value}{r.is_pr && ' 🏆'}</div><button onClick={() => handleEditResult(r)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Edit</button><button onClick={() => { if (window.confirm('Delete this result?')) deleteResult(r.id); }} style={{ padding: '6px 12px', background: 'rgba(255,100,100,0.2)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12 }}>Delete</button></>)}</div>); })}</div>) : (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No results found.</div>)}</div>)}
        {profileTab === 'progress' && (<div><div style={{ marginBottom: 20 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Test</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={{ ...iStyle, width: 280 }}><option value="">Choose a test...</option>{Object.entries(testSet).map(([catLabel, tests]) => (<optgroup key={catLabel} label={catLabel}>{tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>))}</select></div>{chartData.length > 0 && testDef ? (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}><h3 style={{ margin: 0, fontSize: 20 }}>{testDef.name} Progress</h3>{getPR(selectedAthlete, selectedTest) !== null && (() => { const prVal = getPR(selectedAthlete, selectedTest); const prR = getPRResult(selectedAthlete, selectedTest); return (<div style={{ padding: '8px 16px', background: 'rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>PR: {prR && testDef.convert_formula ? formatWithRaw(testDef, prVal, prR.raw_value) : formatResultWithUnit(testDef, prVal)}</div>); })()}</div><SimpleChart data={chartData} direction={testDef.direction} testDef={testDef} onPointClick={() => { setProfileTab('history'); setHistoryFilter(selectedTest); }} /><div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Click chart to view/edit individual results</div></div>) : selectedTest ? (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No data yet for {testDef?.name}</div>) : (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}>Select a test above to view progress</div>)}</div>)}
        {profileTab === 'score' && !isAdult && (<div style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 12, padding: 24, border: '1px solid rgba(168,85,247,0.25)' }}>{athleteScore ? (<><div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 80, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: scoreLabel(athleteScore.score).color, lineHeight: 1 }}>{athleteScore.score}</div><div style={{ fontSize: 13, color: scoreLabel(athleteScore.score).color, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{scoreLabel(athleteScore.score).label}</div></div><div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{athleteScore.testsUsed} of {athleteScore.totalTests} tests scored · compared against {athletes.filter(a => (a.type || 'athlete') === 'athlete').length} youth athletes</div><div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>Score = percentile rank · 50 = gym average · 90+ = elite</div></div></div><div style={{ marginBottom: 28 }}><div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}><div style={{ height: '100%', width: `${athleteScore.score}%`, background: `linear-gradient(90deg, #7c3aed, ${scoreLabel(athleteScore.score).color})`, borderRadius: 6 }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 4 }}><span>1st %ile</span><span>25th</span><span>50th avg</span><span>75th</span><span>99th</span></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>{athleteScore.breakdown.map(item => { const sl = scoreLabel(item.tScore); const displayVal = item.testId === 'max_velocity' ? item.best.toFixed(1) + ' MPH' : item.unit ? item.best.toFixed(item.unit === 'sec' ? 2 : (item.unit === 'in' ? 1 : 0)) + ' ' + item.unit : item.best.toFixed(2); return (<div key={item.testId} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${sl.color}30` }}><div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{item.label}</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 22, fontWeight: 800, color: sl.color }}>{item.tScore}</span><span style={{ fontSize: 12, color: '#666' }}>{displayVal}</span></div><div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${item.tScore}%`, background: sl.color, borderRadius: 2 }} /></div></div>); })}{TSA_TEST_IDS.filter(t => !athleteScore.breakdown.find(b => b.testId === t.id)).map(t => (<div key={t.id} style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.5 }}><div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{t.label}</div><div style={{ fontSize: 13, color: '#444' }}>No data</div></div>))}</div></>) : (<div style={{ textAlign: 'center', padding: 32, color: '#666' }}><p style={{ fontSize: 16, marginBottom: 8 }}>Not enough data to calculate an Athlete Score.</p><p style={{ fontSize: 13 }}>Needs at least one result in 1 of the 7 scored tests.</p></div>)}</div>)}
      </div>)}
      {!selectedAthlete && !showAddForm && filteredAthletes.length === 0 && (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No athletes found matching your search.</div>)}
    </div>
  );
}

/* ===================== RECENT PRS PAGE ===================== */
function RecentPRsPage({ athletes, results, getTestById, testDefs }) {
  const [timeFrame, setTimeFrame] = useState('week');
  const [filterTest, setFilterTest] = useState('');
  const [filterAthlete, setFilterAthlete] = useState(null);
  const now = new Date(); const cutoff = new Date(now);
  if (timeFrame === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else if (timeFrame === 'month') cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setDate(cutoff.getDate() - 90);
  const recentPRs = results.filter(r => r.is_pr && new Date(r.test_date) >= cutoff).filter(r => !filterTest || r.test_id === filterTest).filter(r => !filterAthlete || r.athlete_id === filterAthlete).sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  const timeLabels = { week: '1 Week', month: '1 Month', quarter: '3 Months' };
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Recent PRs</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>See who's been setting personal records</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'end' }}>
        <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Time Frame</label><div style={{ display: 'flex', gap: 8 }}>{['week', 'month', 'quarter'].map(tf => (<button key={tf} onClick={() => setTimeFrame(tf)} style={{ padding: '12px 24px', background: timeFrame === tf ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: timeFrame === tf ? '#0a1628' : '#aaa', fontWeight: timeFrame === tf ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{timeLabels[tf]}</button>))}</div></div>
        <div style={{ flex: '1 1 200px', maxWidth: 300 }}><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Person</label><AthleteSearchPicker athletes={athletes} value={filterAthlete} onChange={(id) => setFilterAthlete(id)} placeholder="All people..." /></div>
        <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label><select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} style={{ ...iStyle, width: 220 }}><option value="">All Tests</option>{testDefs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div style={{ padding: '12px 20px', background: 'rgba(0,255,136,0.15)', borderRadius: 8, color: '#00ff88', fontWeight: 700, fontSize: 18 }}>{recentPRs.length} PR{recentPRs.length !== 1 ? 's' : ''}</div>
      </div>
      {recentPRs.length > 0 ? (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>{recentPRs.map((r) => { const a = athletes.find(x => x.id === r.athlete_id); const t = getTestById(r.test_id); const age = a ? calculateAge(a.birthday) : null; const dateStr = new Date(r.test_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); const isAdult = a && a.type === 'adult'; return (<div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}><div style={{ fontSize: 24 }}>🏆</div><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>{a ? `${a.first_name} ${a.last_name}` : 'Unknown'}{isAdult && <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>ADULT</span>}</div><div style={{ color: '#888', fontSize: 13 }}>{age && `${age} yrs · `}{t?.name} · {dateStr}</div></div><div style={{ fontSize: 22, fontWeight: 800, color: '#00ff88' }}>{t ? (t.convert_formula ? formatWithRaw(t, r.converted_value, r.raw_value) : formatResultWithUnit(t, r.converted_value)) : r.converted_value}</div></div>); })}</div>) : (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>No PRs in the selected time frame.</p></div>)}
    </div>
  );
}

/* ===================== JUMP CALCULATOR ===================== */
function JumpCalcPage({ athletes, setAthletes, results, logResults, getPR, showNotification }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]); const [saving, setSaving] = useState(false);
  const addRow = (athleteId) => { const athlete = athletes.find(a => a.id === athleteId); if (!athlete || rows.find(r => r.athleteId === athleteId)) return; const reach = athlete.standing_reach || null; setRows([...rows, { athleteId, reachFeet: reach ? String(Math.floor(reach / 12)) : '', reachInches: reach ? String(parseFloat((reach % 12).toFixed(1))) : '', touchFeet: '', touchInches: '', saved: false }]); };
  const updateRow = (index, field, value) => { const nr = [...rows]; nr[index][field] = value; nr[index].saved = false; setRows(nr); };
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));
  const getReachTotal = (row) => (row.reachFeet !== '' && row.reachInches !== '') ? parseInt(row.reachFeet) * 12 + parseFloat(row.reachInches) : null;
  const getTouchTotal = (row) => (row.touchFeet !== '' && row.touchInches !== '') ? parseInt(row.touchFeet) * 12 + parseFloat(row.touchInches) : null;
  const getJumpResult = (row) => { const r = getReachTotal(row); const t = getTouchTotal(row); return (r !== null && t !== null && t > r) ? parseFloat((t - r).toFixed(1)) : null; };
  const usedIds = rows.map(r => r.athleteId);
  const saveAll = async () => {
    setSaving(true);
    const toSave = rows.filter(r => getJumpResult(r) !== null && !r.saved);
    for (const row of toSave) { const athlete = athletes.find(a => a.id === row.athleteId); const reachTotal = getReachTotal(row); if (reachTotal !== null && reachTotal !== athlete?.standing_reach) { await supabase.from('athletes').update({ standing_reach: reachTotal }).eq('id', row.athleteId); setAthletes(prev => prev.map(a => a.id === row.athleteId ? { ...a, standing_reach: reachTotal } : a)); } }
    const resultsToLog = toSave.map(row => ({ athleteId: row.athleteId, testId: 'approach_jump', testDate, rawValue: getJumpResult(row), convertedValue: getJumpResult(row), unit: 'inches' }));
    if (resultsToLog.length > 0) await logResults(resultsToLog);
    setRows(rows.map(r => ({ ...r, saved: getJumpResult(r) !== null ? true : r.saved }))); setSaving(false);
  };
  const savedCount = rows.filter(r => r.saved).length; const readyCount = rows.filter(r => getJumpResult(r) !== null && !r.saved).length;
  const iStyle = { padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, textAlign: 'center' };
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Jump Calculator</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Calculate approach jumps for the whole class</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}><div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Add Athletes</label><AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => addRow(id)} excludeIds={usedIds} placeholder="Search & add athlete..." /></div><div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', ...iStyle }} /></div></div></div>
      {rows.length > 0 && (<div style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: '0 12px', marginBottom: 8, alignItems: 'center' }}><span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Athlete</span><span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Reach</span><span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Touch Height</span><span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Result</span><span></span></div>)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {rows.map((row, index) => { const athlete = athletes.find(a => a.id === row.athleteId); const jumpResult = getJumpResult(row); const currentPR = getPR(row.athleteId, 'approach_jump'); const isNewPR = jumpResult !== null && currentPR !== null && jumpResult > currentPR; const isFirst = jumpResult !== null && currentPR === null; return (
          <div key={row.athleteId} style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: 12, borderRadius: 10, alignItems: 'center', background: row.saved ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${row.saved ? 'rgba(0,255,136,0.2)' : (isNewPR || isFirst) && jumpResult ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{athlete?.first_name}</div><div style={{ fontSize: 11, color: '#666' }}>{athlete?.last_name}</div></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="number" min="0" max="10" placeholder="ft" value={row.reachFeet} onChange={(e) => updateRow(index, 'reachFeet', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 4px', fontSize: 14 }} /><span style={{ color: '#666', fontSize: 14 }}>'</span><input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.reachInches} onChange={(e) => updateRow(index, 'reachInches', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 4px', fontSize: 14 }} /><span style={{ color: '#666', fontSize: 14 }}>"</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="number" min="0" max="12" placeholder="ft" value={row.touchFeet} onChange={(e) => updateRow(index, 'touchFeet', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 6px' }} /><span style={{ color: '#888', fontSize: 16 }}>'</span><input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.touchInches} onChange={(e) => updateRow(index, 'touchInches', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 6px' }} /><span style={{ color: '#888', fontSize: 16 }}>"</span></div>
            <div style={{ textAlign: 'center' }}>{jumpResult !== null ? (<div><span style={{ fontSize: 22, fontWeight: 800, color: row.saved ? '#00ff88' : (isNewPR || isFirst) ? '#ffd700' : '#00d4ff' }}>{jumpResult}"</span>{row.saved && <span style={{ fontSize: 11, color: '#00ff88', display: 'block' }}>✓</span>}{!row.saved && isNewPR && <span style={{ fontSize: 10, color: '#ffd700', display: 'block' }}>PR!</span>}{!row.saved && currentPR !== null && !isNewPR && <span style={{ fontSize: 10, color: '#666', display: 'block' }}>PR: {currentPR}"</span>}</div>) : <span style={{ color: '#444' }}>—</span>}</div>
            <button onClick={() => removeRow(index)} style={{ padding: '4px 8px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>); })}
      </div>
      {readyCount > 0 && (<button onClick={saveAll} disabled={saving} style={{ width: '100%', padding: '20px 32px', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: saving ? 'default' : 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>{saving ? 'Saving...' : `Save ${readyCount} Result${readyCount !== 1 ? 's' : ''}`}</button>)}
      {savedCount > 0 && readyCount === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#00ff88', fontWeight: 600 }}>All {savedCount} results saved!</div>}
      {rows.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Add athletes above to start calculating jumps.</p></div>}
    </div>
  );
}

/* ===================== ATHLETE PROFILE PAGE ===================== */
const PROFILE_ATTRS = [
  { id: 'rsi', label: 'RSI', shortLabel: 'RSI', direction: 'higher', type: 'direct', testIds: ['rsi'] },
  { id: 'elastic_util', label: 'Elastic Util', shortLabel: 'Elastic', direction: 'higher', type: 'computed', compute: 'elastic' },
  { id: 'symmetry', label: 'Symmetry', shortLabel: 'Symm', direction: 'higher', type: 'computed', compute: 'symmetry' },
  { id: 'acceleration', label: 'Acceleration', shortLabel: 'Accel', direction: 'lower', type: 'direct', testIds: ['5_10_fly'] },
  { id: 'max_velocity', label: 'Max Velocity', shortLabel: 'MaxVel', direction: 'higher', type: 'direct', testIds: ['max_velocity'] },
  { id: 'cod', label: 'COD', shortLabel: 'COD', direction: 'lower', type: 'computed', compute: 'cod' },
  { id: 'clean', label: 'Clean', shortLabel: 'Clean', direction: 'higher', type: 'direct', testIds: ['clean'] },
  { id: 'squat', label: 'Squat', shortLabel: 'Squat', direction: 'higher', type: 'rollup', testIds: ['back_squat', 'front_squat'] },
];

function AthleteProfilePage({ athletes, results }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [genderFilter, setGenderFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const youthAthletes = athletes.filter(a => (a.type || 'athlete') === 'athlete');

  const getBestVal = (athleteId, testIds, direction) => {
    const vals = results.filter(r => r.athlete_id === athleteId && testIds.includes(r.test_id)).map(r => parseFloat(r.converted_value)).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
  };

  const getAttrRaw = (athleteId) => {
    const raw = {};
    PROFILE_ATTRS.forEach(attr => {
      if (attr.type === 'direct') {
        raw[attr.id] = getBestVal(athleteId, attr.testIds, attr.direction);
      } else if (attr.type === 'rollup') {
        raw[attr.id] = getBestVal(athleteId, attr.testIds, attr.direction);
      } else if (attr.compute === 'elastic') {
        const aj = getBestVal(athleteId, ['approach_jump'], 'higher');
        const vj = getBestVal(athleteId, ['vertical_jump'], 'higher');
        raw[attr.id] = (aj !== null && vj !== null && vj > 0) ? (aj / vj) * 100 : null;
      } else if (attr.compute === 'symmetry') {
        const left = getBestVal(athleteId, ['sl_rsi_left'], 'higher');
        const right = getBestVal(athleteId, ['sl_rsi_right'], 'higher');
        raw[attr.id] = (left !== null && right !== null && Math.max(left, right) > 0) ? (Math.min(left, right) / Math.max(left, right)) * 100 : null;
      } else if (attr.compute === 'cod') {
        const fly = getBestVal(athleteId, ['5_10_fly'], 'lower');
        const fiveOFive = getBestVal(athleteId, ['5_0_5'], 'lower');
        raw[attr.id] = (fly !== null && fiveOFive !== null && fly > 0) ? ((fiveOFive - fly) / fly) * 100 : null;
      }
    });
    return raw;
  };

  const popStats = {};
  PROFILE_ATTRS.forEach(attr => {
    const vals = [];
    youthAthletes.forEach(a => {
      const raw = getAttrRaw(a.id);
      if (raw[attr.id] !== null) vals.push(raw[attr.id]);
    });
    if (vals.length < 5) { popStats[attr.id] = null; return; }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length) || 1;
    popStats[attr.id] = { mean, sd, n: vals.length };
  });

  const scoreAthlete = (athleteId) => {
    const raw = getAttrRaw(athleteId);
    const attrScores = [];
    PROFILE_ATTRS.forEach(attr => {
      if (!popStats[attr.id] || raw[attr.id] === null) return;
      const { mean, sd } = popStats[attr.id];
      const z = attr.direction === 'lower' ? (mean - raw[attr.id]) / sd : (raw[attr.id] - mean) / sd;
      const pct = normalCDF(z);
      attrScores.push({ attr, rawValue: raw[attr.id], z, pct });
    });
    if (attrScores.length === 0) return null;
    const avgZ = attrScores.reduce((s, a) => s + a.z, 0) / attrScores.length;
    const overall = normalCDF(avgZ);
    return { overall, attrScores, testsUsed: attrScores.length };
  };

  const allScored = youthAthletes.map(a => {
    const s = scoreAthlete(a.id);
    return s ? { athlete: a, ...s } : null;
  }).filter(Boolean)
    .filter(row => { if (genderFilter === 'all') return true; const g = (row.athlete.gender || '').toLowerCase(); return genderFilter === 'female' ? g === 'female' : g !== 'female'; })
    .filter(row => !searchTerm || `${row.athlete.first_name} ${row.athlete.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.overall - a.overall);

  const formatAttrVal = (attr, val) => {
    if (val === null || val === undefined) return '-';
    if (attr.id === 'rsi') return val.toFixed(2);
    if (attr.id === 'elastic_util' || attr.id === 'symmetry') return val.toFixed(1) + '%';
    if (attr.id === 'acceleration') return val.toFixed(2) + 's';
    if (attr.id === 'max_velocity') return val.toFixed(1) + ' MPH';
    if (attr.id === 'cod') return val.toFixed(1) + '%';
    if (attr.id === 'clean' || attr.id === 'squat') return Math.round(val) + ' lbs';
    return String(val);
  };

  /* ---- DETAIL VIEW ---- */
  if (selectedAthlete) {
    const athlete = athletes.find(a => a.id === selectedAthlete);
    if (!athlete) { setSelectedAthlete(null); return null; }
    const profile = scoreAthlete(selectedAthlete);
    const age = calculateAge(athlete.birthday);

    if (!profile) {
      return (
        <div>
          <button onClick={() => setSelectedAthlete(null)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back to list</button>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28 }}>{athlete.first_name} {athlete.last_name}</h2>
          <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 16 }}>Not enough data to generate a profile.</p><p style={{ fontSize: 13 }}>Needs at least one scored attribute with 5+ athletes in the population.</p></div>
        </div>
      );
    }

    const sl = scoreLabel(profile.overall);

    /* Radar chart */
    const radarSize = 300;
    const cx = radarSize / 2;
    const cy = radarSize / 2;
    const maxR = radarSize / 2 - 40;
    const numAxes = 8;
    const angleStep = (2 * Math.PI) / numAxes;
    const startAngle = -Math.PI / 2;

    const getPoint = (index, pct) => {
      const angle = startAngle + index * angleStep;
      const r = (pct / 100) * maxR;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    const gridLevels = [20, 40, 60, 80, 100];
    const radarValues = PROFILE_ATTRS.map(attr => {
      const found = profile.attrScores.find(s => s.attr.id === attr.id);
      return found ? found.pct : null;
    });

    const polygonPoints = radarValues.map((pct, i) => {
      if (pct === null) return null;
      return getPoint(i, pct);
    });
    const validPoints = polygonPoints.filter(p => p !== null);
    const polygonStr = validPoints.map(p => `${p.x},${p.y}`).join(' ');

    /* Training buckets */
    const getAttrPct = (attrId) => { const found = profile.attrScores.find(s => s.attr.id === attrId); return found ? found.pct : null; };
    const below35 = (attrId) => { const p = getAttrPct(attrId); return p !== null && p < 35; };
    const buckets = [];
    if (below35('rsi')) buckets.push({ label: 'Needs Spring', color: '#ff6ec7', desc: 'Low RSI — reactive strength deficit', rx: 'Swap last accessory for: Pogo hops, altitude drops, or depth jumps' });
    if (below35('elastic_util') && below35('cod')) buckets.push({ label: 'Needs Eccentric', color: '#FFA500', desc: 'Poor elastic utilization + poor COD', rx: 'Swap last accessory for: Eccentric squats, Nordic curls, or drop-catch landing drills' });
    if (below35('rsi') && below35('elastic_util')) buckets.push({ label: 'Needs Force', color: '#ff4444', desc: 'Low RSI + low elastic utilization', rx: 'Swap last accessory for: Weighted jumps, trap bar jumps, or heavy sled marches' });
    if (below35('clean') && below35('squat')) buckets.push({ label: 'Needs Strength', color: '#a855f7', desc: 'Low clean + squat scores', rx: 'Swap last accessory for: Heavy goblet squats, DB lunges, or pause squats' });
    if (below35('acceleration') && below35('max_velocity')) buckets.push({ label: 'Needs Speed', color: '#00d4ff', desc: 'Low acceleration + max velocity', rx: 'Swap last accessory for: 10-yd sprints, wicket runs, or sled sprints (10-15% BW)' });
    const showWellRounded = buckets.length === 0 && profile.testsUsed >= 4;

    return (
      <div>
        <button onClick={() => setSelectedAthlete(null)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back to list</button>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: sl.color, lineHeight: 1 }}>{profile.overall}</div>
            <div style={{ fontSize: 14, color: sl.color, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>{sl.label}</div>
          </div>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontSize: 28 }}>{athlete.first_name} {athlete.last_name}</h2>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>{age && `${age} yrs`}{athlete.gender && ` · ${athlete.gender}`} · {profile.testsUsed}/8 attributes scored</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ flex: '0 0 auto' }}>
            <svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
              {gridLevels.map(lvl => {
                const pts = Array.from({ length: numAxes }, (_, i) => getPoint(i, lvl));
                return React.createElement('polygon', { key: lvl, points: pts.map(p => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 });
              })}
              {PROFILE_ATTRS.map((_, i) => {
                const end = getPoint(i, 100);
                return React.createElement('line', { key: i, x1: cx, y1: cy, x2: end.x, y2: end.y, stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 });
              })}
              {validPoints.length >= 3 && React.createElement('polygon', { points: polygonStr, fill: 'rgba(0,212,255,0.15)', stroke: '#00d4ff', strokeWidth: 2 })}
              {radarValues.map((pct, i) => {
                if (pct === null) return null;
                const p = getPoint(i, pct);
                const slc = scoreLabel(pct);
                return React.createElement('g', { key: i },
                  React.createElement('circle', { cx: p.x, cy: p.y, r: 5, fill: slc.color }),
                  React.createElement('text', { x: p.x, y: p.y - 10, fill: slc.color, fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, pct)
                );
              })}
              {PROFILE_ATTRS.map((attr, i) => {
                const labelPt = getPoint(i, 118);
                return React.createElement('text', { key: attr.id, x: labelPt.x, y: labelPt.y, fill: '#888', fontSize: 10, fontWeight: 600, textAnchor: 'middle', dominantBaseline: 'middle' }, attr.shortLabel);
              })}
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2 }}>Attribute Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROFILE_ATTRS.map(attr => {
                const found = profile.attrScores.find(s => s.attr.id === attr.id);
                const pct = found ? found.pct : null;
                const raw = found ? found.rawValue : null;
                const slc = pct !== null ? scoreLabel(pct) : null;
                return (
                  <div key={attr.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: '#ccc' }}>{attr.label}</div>
                    <div style={{ width: 44, textAlign: 'center', fontSize: 18, fontWeight: 800, color: slc ? slc.color : '#444' }}>{pct !== null ? pct : '—'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        {pct !== null && React.createElement('div', { style: { height: '100%', width: `${pct}%`, background: slc.color, borderRadius: 3 } })}
                      </div>
                    </div>
                    <div style={{ width: 80, textAlign: 'right', fontSize: 12, color: '#666' }}>{raw !== null ? formatAttrVal(attr, raw) : 'No data'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {(buckets.length > 0 || showWellRounded) && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2 }}>Training Priorities</h3>
            {showWellRounded && (
              <div style={{ padding: '16px 20px', background: 'rgba(0,255,136,0.08)', borderRadius: 10, border: '1px solid rgba(0,255,136,0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div><div style={{ fontWeight: 700, color: '#00ff88', fontSize: 16 }}>Well-Rounded</div><div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>No major deficits detected across scored attributes</div></div>
              </div>
            )}
            {buckets.map((b, i) => (
              <div key={i} style={{ padding: '16px 20px', background: `${b.color}10`, borderRadius: 10, border: `1px solid ${b.color}30`, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ padding: '3px 10px', background: `${b.color}25`, borderRadius: 6, color: b.color, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>{b.label}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{b.desc}</span>
                </div>
                <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>{b.rx}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---- LIST VIEW ---- */
  return (
    <div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athlete Profiles</h1><p style={{ color: '#888' }}>{allScored.length} of {youthAthletes.length} youth athletes scored</p></div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, width: 240 }} />
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>{[['all','All'],['male','Boys'],['female','Girls']].map(([val, label]) => (
          <button key={val} onClick={() => setGenderFilter(val)} style={{ padding: '10px 20px', background: genderFilter === val ? 'rgba(0,212,255,0.2)' : 'transparent', border: 'none', borderBottom: genderFilter === val ? '2px solid #00d4ff' : '2px solid transparent', color: genderFilter === val ? '#00d4ff' : '#666', fontWeight: genderFilter === val ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{label}</button>
        ))}</div>
      </div>
      {allScored.length === 0 ? (<div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>No athletes with enough data to score.</p><p style={{ fontSize: 13 }}>Attributes need at least 5 athletes in the population.</p></div>) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allScored.map((row) => { const sl = scoreLabel(row.overall); const age = calculateAge(row.athlete.birthday); return (
            <div key={row.athlete.id} onClick={() => setSelectedAthlete(row.athlete.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: `${sl.color}20`, border: `2px solid ${sl.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: sl.color }}>{row.overall}</span>
              </div>
              <div style={{ flex: '0 0 160px' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{row.athlete.first_name} {row.athlete.last_name}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{age && `${age} yrs`}{row.athlete.gender && ` · ${row.athlete.gender}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {PROFILE_ATTRS.map(attr => {
                  const found = row.attrScores.find(s => s.attr.id === attr.id);
                  const pct = found ? found.pct : null;
                  const slc = pct !== null ? scoreLabel(pct) : null;
                  return (
                    <div key={attr.id} title={attr.label} style={{ width: 40, height: 40, borderRadius: 6, background: slc ? `${slc.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${slc ? slc.color + '44' : 'rgba(255,255,255,0.06)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: slc ? slc.color : '#333' }}>{pct !== null ? pct : '—'}</span>
                      <span style={{ fontSize: 7, color: '#555', textAlign: 'center', lineHeight: 1, marginTop: 1 }}>{attr.shortLabel}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: '#555', flexShrink: 0 }}>{row.testsUsed}/8</div>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

/* ===================== RECORD BOARD ===================== */
function RecordBoardPage({ athletes, results, testDefs, getTestById }) {
  const [section, setSection] = useState('boys');
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const boardSpeed = testDefs.filter(t => t.show_on_record_board && t.record_board_section === 'speed' && t.active);
  const boardStrength = testDefs.filter(t => t.show_on_record_board && t.record_board_section === 'strength' && t.active);
  const boardAdult = testDefs.filter(t => t.show_on_adult_board && t.active);

  const EXCLUDED = ['matt secrest'];

  const getAgeAtTest = (birthday, testDate) => {
    if (!birthday || !testDate) return null;
    const b = new Date(String(birthday).slice(0, 10) + 'T00:00:00'); const t = new Date(testDate);
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age;
  };

  const ROLLUP_MAP = {
    '_overhead_rollup': ['press', 'push_press', 'jerk', 'overhead'],
    '_squat_rollup': ['back_squat', 'front_squat'],
  };

  const getRollupBest = (athleteId, rollupIds) => {
    const vals = results.filter(r => r.athlete_id === athleteId && rollupIds.includes(r.test_id)).map(r => parseFloat(r.converted_value || r.raw_value)).filter(v => !isNaN(v));
    return vals.length > 0 ? Math.max(...vals) : null;
  };

  const formatBoardValue = (testDef, value) => {
    const fmt = testDef.record_board_format;
    if (fmt === 'feetinches') return formatFeetInches(value);
    if (fmt === 'rowtime') return formatRowTime(value);
    if (fmt === 'fixed1') return value.toFixed(1);
    if (fmt === 'fixed2') return value.toFixed(2);
    return Math.round(value);
  };

  const buildRecords = (tests, genderFilter) => {
    const athleteMap = {}; athletes.forEach(a => { athleteMap[a.id] = a; });
    const records = {};
    tests.forEach(test => {
      records[test.id] = { hs: [], ms: [] };
      const rollupIds = ROLLUP_MAP[test.id];
      if (rollupIds) {
        athletes.forEach(a => {
          if (a.type === 'adult') return;
          const fullName = `${(a.first_name || '').trim()} ${(a.last_name || '').trim()}`.toLowerCase();
          if (EXCLUDED.includes(fullName)) return;
          const g = (a.gender || '').toLowerCase();
          const isMatch = genderFilter === 'boys' ? g !== 'female' : g === 'female';
          if (!isMatch) return;
          const best = getRollupBest(a.id, rollupIds);
          if (best === null) return;
          const entry = { name: `${a.first_name} ${(a.last_name || '').charAt(0)}`, value: best };
          records[test.id]['hs'].push(entry);
          const rollupResults = results.filter(r => r.athlete_id === a.id && rollupIds.includes(r.test_id));
          const firstDate = rollupResults.length > 0 ? rollupResults.sort((x, y) => new Date(x.test_date) - new Date(y.test_date))[0].test_date : null;
          const age = firstDate ? getAgeAtTest(a.birthday, firstDate) : null;
          if (age !== null && age < 15) records[test.id]['ms'].push(entry);
        });
      } else {
        results.forEach(r => {
          if (r.test_id !== test.id) return;
          const a = athleteMap[r.athlete_id]; if (!a || a.type === 'adult') return;
          const fullName = `${(a.first_name || '').trim()} ${(a.last_name || '').trim()}`.toLowerCase();
          if (EXCLUDED.includes(fullName)) return;
          const g = (a.gender || '').toLowerCase();
          const isMatch = genderFilter === 'boys' ? g !== 'female' : g === 'female';
          if (!isMatch) return;
          const val = parseFloat(r.converted_value || r.raw_value); if (isNaN(val)) return;
          const age = getAgeAtTest(a.birthday, r.test_date);
          const isMSAge = age !== null && age < 15;
          const entry = { name: `${a.first_name} ${(a.last_name || '').charAt(0)}`, value: val };
          records[test.id]['hs'].push(entry);
          if (isMSAge) records[test.id]['ms'].push(entry);
        });
      }
      ['hs', 'ms'].forEach(cat => {
        records[test.id][cat].sort((a, b) => test.direction === 'lower' ? a.value - b.value : b.value - a.value);
        const seen = new Set();
        records[test.id][cat] = records[test.id][cat].filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; }).slice(0, 5);
      });
    });
    return records;
  };

  const buildAdultRecords = (test, genderFilter) => {
    const adultAthletes = athletes.filter(a => a.type === 'adult');
    const entries = [];
    const rollupIds = ROLLUP_MAP[test.id];
    adultAthletes.forEach(a => {
      const g = (a.gender || '').toLowerCase();
      const matches = genderFilter === 'men' ? g !== 'female' : g === 'female';
      if (!matches) return;
      let best = null;
      if (rollupIds) {
        const vals = results.filter(r => r.athlete_id === a.id && rollupIds.includes(r.test_id)).map(r => parseFloat(r.converted_value)).filter(v => !isNaN(v));
        if (vals.length > 0) best = Math.max(...vals);
      } else {
        const vals = results.filter(r => r.athlete_id === a.id && r.test_id === test.id).map(r => parseFloat(r.converted_value)).filter(v => !isNaN(v));
        if (vals.length > 0) best = test.direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
      }
      if (best !== null) entries.push({ name: `${a.first_name} ${(a.last_name || '').charAt(0)}.`, value: best });
    });
    entries.sort((a, b) => test.direction === 'higher' ? b.value - a.value : a.value - b.value);
    const seen = new Set();
    return entries.filter(e => { if (seen.has(e.name)) return false; seen.add(e.name); return true; }).slice(0, 5);
  };

  const SECTIONS = ['boys', 'girls', 'adults'];
  const speedRecords = buildRecords(boardSpeed, section);
  const strengthRecords = buildRecords(boardStrength, section);

  useEffect(() => { if (!autoSwitch) return; const interval = setInterval(() => setSection(s => { const i = SECTIONS.indexOf(s); return SECTIONS[(i + 1) % SECTIONS.length]; }), 60000); return () => clearInterval(interval); }, [autoSwitch]);

  const wakeLockRef = useRef(null);
  useEffect(() => { if (!tvMode) { if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; } return; } const req = async () => { try { if ('wakeLock' in navigator) { wakeLockRef.current = await navigator.wakeLock.request('screen'); } } catch {} }; req(); const h = () => { if (document.visibilityState === 'visible') req(); }; document.addEventListener('visibilitychange', h); return () => { document.removeEventListener('visibilitychange', h); if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); } }; }, [tvMode]);

  const tvContentRef = useRef(null); const tvContainerRef = useRef(null); const [tvScale, setTvScale] = useState(1);
  useEffect(() => { if (!tvMode) return; const recalc = () => { const content = tvContentRef.current; const container = tvContainerRef.current; if (!content || !container) return; content.style.transform = 'none'; content.style.width = container.clientWidth + 'px'; const naturalH = content.scrollHeight; const availH = container.clientHeight; const scale = Math.min(availH / naturalH, 1); setTvScale(scale); content.style.width = (container.clientWidth / scale) + 'px'; content.style.transform = `scale(${scale})`; }; const timer = setTimeout(recalc, 50); window.addEventListener('resize', recalc); return () => { clearTimeout(timer); window.removeEventListener('resize', recalc); }; }, [tvMode, section]);

  useEffect(() => { if (!tvMode) return; const keepAlive = setInterval(() => { document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: Math.floor(Math.random() * 1920), clientY: Math.floor(Math.random() * 1080) })); }, 600000); return () => clearInterval(keepAlive); }, [tvMode]);

  const renderTestCard = (test, records, isTv) => {
    const hs = records[test.id]?.hs || []; const ms = records[test.id]?.ms || [];
    const renderRows = (list) => list.length > 0 ? list.map((r, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', margin: '2px 0', borderRadius: 4, ...(i === 0 ? { background: 'linear-gradient(90deg, rgba(200,150,62,0.3) 0%, rgba(200,150,62,0.05) 100%)', borderLeft: '3px solid #C8963E' } : {}) }}><span style={{ fontWeight: 600, fontSize: isTv ? 13 : 14, color: i === 0 ? '#C8963E' : '#e8e8e8' }}>{formatBoardValue(test, r.value)}</span><span style={{ color: '#888', fontSize: isTv ? 12 : 13, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span></div>)) : <div style={{ color: '#444', textAlign: 'center', fontSize: 13, padding: 4 }}>—</div>;
    return (<div key={test.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: isTv ? 10 : 12, border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ textAlign: 'center', fontSize: isTv ? 15 : 16, fontWeight: 700, paddingBottom: 8, marginBottom: 8, borderBottom: '2px solid #C8963E', letterSpacing: 1 }}>{test.name}</div><div style={{ fontSize: 11, color: '#00d4ff', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>15+</div>{renderRows(hs)}<div style={{ fontSize: 11, color: '#00d4ff', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>14 & UNDER</div>{renderRows(ms)}</div>);
  };

  const gold = '#C8963E'; const rankColors = [gold, '#A0A0B0', '#A0622A', '#888', '#666']; const rankLabels = ['1st', '2nd', '3rd', '4th', '5th'];

  const renderAdultCard = (test, isTv) => {
    const men = buildAdultRecords(test, 'men'); const women = buildAdultRecords(test, 'women');
    const renderRows = (list) => list.length > 0 ? list.map((r, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', margin: '2px 0', borderRadius: 4, background: i === 0 ? 'rgba(200,150,62,0.12)' : 'transparent' }}><span style={{ fontSize: 10, fontWeight: 700, color: rankColors[i], width: 24, textAlign: 'center' }}>{rankLabels[i]}</span><span style={{ flex: 1, fontSize: isTv ? 12 : 13, color: i === 0 ? '#e8e8e8' : '#aaa', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span><span style={{ fontSize: isTv ? 12 : 13, fontWeight: 700, color: rankColors[i], whiteSpace: 'nowrap' }}>{formatBoardValue(test, r.value)}{test.record_board_format === 'round' ? ' ' + (test.display_unit || test.unit) : ''}</span></div>)) : <div style={{ color: '#444', textAlign: 'center', fontSize: 12, padding: '4px 0' }}>—</div>;
    return (<div key={test.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: isTv ? 10 : 12, border: '1px solid rgba(200,150,62,0.2)' }}><div style={{ textAlign: 'center', fontSize: isTv ? 13 : 15, fontWeight: 700, paddingBottom: 8, marginBottom: 8, borderBottom: `2px solid ${gold}`, letterSpacing: 1, textTransform: 'uppercase' }}>{test.name}</div><div style={{ fontSize: 10, color: '#FFA500', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>MEN</div>{renderRows(men)}<div style={{ fontSize: 10, color: '#FFA500', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>WOMEN</div>{renderRows(women)}</div>);
  };

  const sectionLabels = { boys: 'BOYS RECORDS', girls: 'GIRLS RECORDS', adults: 'ADULT RECORDS' };
  const sectionColors = { boys: '#00d4ff', girls: '#ff6ec7', adults: '#C8963E' };

  if (tvMode) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a1628', zIndex: 9999, padding: '8px 6px', overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: `4px solid ${sectionColors[section]}` }}><div style={{ fontSize: 20, fontWeight: 700, color: '#00d4ff', letterSpacing: 3, fontFamily: "'Archivo Black', sans-serif" }}>WILMINGTON STRENGTH</div><div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 4, color: sectionColors[section] }}>{sectionLabels[section]}</div><button onClick={() => setTvMode(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12 }}>EXIT TV</button></div>
        <div ref={tvContainerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div ref={tvContentRef} style={{ transformOrigin: 'top left', transform: `scale(${tvScale})` }}>
            {section !== 'adults' && (<><div style={{ fontSize: 20, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 10, marginBottom: 8 }}>SPEED & POWER</div><div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSpeed.length}, 1fr)`, gap: 8, marginBottom: 10 }}>{boardSpeed.map(t => renderTestCard(t, speedRecords, true))}</div><div style={{ fontSize: 20, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 10, marginBottom: 8 }}>STRENGTH</div><div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardStrength.length}, 1fr)`, gap: 8 }}>{boardStrength.map(t => renderTestCard(t, strengthRecords, true))}</div></>)}
            {section === 'adults' && (<div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(boardAdult.length, 5)}, 1fr)`, gap: 10 }}>{boardAdult.map(t => renderAdultCard(t, true))}</div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}><div><h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Record Board</h1><p style={{ color: '#888' }}>Top 5 all-time records</p></div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button onClick={() => setAutoSwitch(a => !a)} style={{ padding: '10px 20px', background: autoSwitch ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', border: `2px solid ${autoSwitch ? '#00ff88' : '#666'}`, borderRadius: 6, color: autoSwitch ? '#00ff88' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{autoSwitch ? 'Pause Auto' : 'Auto (60s)'}</button><button onClick={() => { setAutoSwitch(true); setTvMode(true); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #C8963E 0%, #A87A2E 100%)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>TV Mode</button></div></div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content' }}>{[{ id: 'boys', label: 'Boys', color: '#00d4ff' }, { id: 'girls', label: 'Girls', color: '#ff6ec7' }, { id: 'adults', label: 'Adults', color: '#C8963E' }].map(s => (<button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '14px 36px', background: section === s.id ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderBottom: section === s.id ? `3px solid ${s.color}` : '3px solid transparent', color: section === s.id ? s.color : '#666', fontWeight: section === s.id ? 700 : 400, cursor: 'pointer', fontSize: 16, fontFamily: "'Archivo Black', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</button>))}</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, letterSpacing: 4, fontFamily: "'Archivo Black', sans-serif", color: sectionColors[section] }}>{sectionLabels[section]}</div>
      {section !== 'adults' && (<><div style={{ marginBottom: 24 }}><div style={{ fontSize: 14, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12, textTransform: 'uppercase' }}>Speed & Power</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>{boardSpeed.map(t => renderTestCard(t, speedRecords, false))}</div></div><div><div style={{ fontSize: 14, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12, textTransform: 'uppercase' }}>Strength</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>{boardStrength.map(t => renderTestCard(t, strengthRecords, false))}</div></div></>)}
      {section === 'adults' && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>{boardAdult.map(t => renderAdultCard(t, false))}</div>)}
    </div>
  );
}

/* ===================== TEST SETTINGS PAGE ===================== */
function TestSettingsPage({ testDefs, setTestDefs, showNotification }) {
  const [editingTest, setEditingTest] = useState(null); const [showAddForm, setShowAddForm] = useState(false);
  const [formId, setFormId] = useState(''); const [formName, setFormName] = useState(''); const [formUnit, setFormUnit] = useState('sec');
  const [formDirection, setFormDirection] = useState('lower'); const [formCategory, setFormCategory] = useState('speed');
  const [formCategoryLabel, setFormCategoryLabel] = useState('Speed & Acceleration'); const [formDisplayUnit, setFormDisplayUnit] = useState('');
  const [formAllowKg, setFormAllowKg] = useState(false); const [formFeetInches, setFormFeetInches] = useState(false);
  const [formRowTime, setFormRowTime] = useState(false); const [formAthleteType, setFormAthleteType] = useState('athlete');
  const [formShowOnBoard, setFormShowOnBoard] = useState(false); const [formBoardSection, setFormBoardSection] = useState('');
  const [formBoardFormat, setFormBoardFormat] = useState('fixed2');
  const categoryLabels = { speed: 'Speed & Acceleration', agility: 'Change of Direction', power: 'Power', strength: 'Strength', conditioning: 'Conditioning', body_comp: 'Body Composition' };
  const resetForm = () => { setFormId(''); setFormName(''); setFormUnit('sec'); setFormDirection('lower'); setFormCategory('speed'); setFormCategoryLabel('Speed & Acceleration'); setFormDisplayUnit(''); setFormAllowKg(false); setFormFeetInches(false); setFormRowTime(false); setFormAthleteType('athlete'); setFormShowOnBoard(false); setFormBoardSection(''); setFormBoardFormat('fixed2'); };
  const startEdit = (t) => { setEditingTest(t.id); setFormId(t.id); setFormName(t.name); setFormUnit(t.unit); setFormDirection(t.direction); setFormCategory(t.category); setFormCategoryLabel(t.category_label || ''); setFormDisplayUnit(t.display_unit || ''); setFormAllowKg(t.allow_kg || false); setFormFeetInches(t.feet_inches || false); setFormRowTime(t.row_time || false); setFormAthleteType(t.athlete_type || 'athlete'); setFormShowOnBoard(t.show_on_record_board || false); setFormBoardSection(t.record_board_section || ''); setFormBoardFormat(t.record_board_format || 'fixed2'); setShowAddForm(false); };
  const handleSave = async () => {
    if (!formName) { alert('Test name is required'); return; }
    const testData = { name: formName, unit: formUnit, direction: formDirection, category: formCategory, category_label: formCategoryLabel || categoryLabels[formCategory], display_unit: formDisplayUnit || null, allow_kg: formAllowKg, feet_inches: formFeetInches, row_time: formRowTime, athlete_type: formAthleteType, show_on_record_board: formShowOnBoard, record_board_section: formShowOnBoard ? formBoardSection : null, record_board_format: formBoardFormat };
    if (editingTest) {
      const { error } = await supabase.from('tests').update(testData).eq('id', editingTest);
      if (!error) { setTestDefs(testDefs.map(t => t.id === editingTest ? { ...t, ...testData } : t)); showNotification(formName + ' updated!'); setEditingTest(null); resetForm(); }
      else { showNotification('Error saving', 'error'); }
    } else {
      const newId = formId || formName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (testDefs.find(t => t.id === newId)) { alert('A test with this ID already exists'); return; }
      const maxSort = testDefs.length > 0 ? Math.max(...testDefs.map(t => t.sort_order || 0)) : 0;
      const { data, error } = await supabase.from('tests').insert([{ id: newId, ...testData, sort_order: maxSort + 1, active: true }]).select();
      if (data) { setTestDefs([...testDefs, data[0]]); showNotification(formName + ' added!'); setShowAddForm(false); resetForm(); }
      if (error) showNotification('Error adding test: ' + error.message, 'error');
    }
  };
  const handleDelete = async (testId, testName) => { if (!window.confirm(`Delete "${testName}"? This won't delete existing results but the test won't appear in the app anymore.`)) return; const { error } = await supabase.from('tests').update({ active: false }).eq('id', testId); if (!error) { setTestDefs(testDefs.filter(t => t.id !== testId)); showNotification(testName + ' removed'); } };
  const iStyle = { padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, width: '100%' };
  const grouped = {}; testDefs.forEach(t => { const cat = t.category_label || t.category; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(t); });
  const renderForm = () => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>{editingTest ? `Edit: ${formName}` : 'Add New Test'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Test Name *</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. 40-Yard Dash" style={iStyle} /></div>
        <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Unit</label><select value={formUnit} onChange={(e) => { setFormUnit(e.target.value); if (e.target.value === 'sec') { setFormDirection('lower'); setFormBoardFormat('fixed2'); } if (e.target.value === 'lbs') { setFormDirection('higher'); setFormAllowKg(true); setFormBoardFormat('round'); } if (e.target.value === 'inches') { setFormDirection('higher'); setFormBoardFormat('fixed1'); } }} style={iStyle}><option value="sec">Seconds (time)</option><option value="lbs">Pounds (weight)</option><option value="inches">Inches (distance)</option><option value="reps">Reps</option><option value="ratio">Ratio/Score</option><option value="%">Percentage</option></select></div>
        <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Better is...</label><select value={formDirection} onChange={(e) => setFormDirection(e.target.value)} style={iStyle}><option value="lower">Lower (faster times)</option><option value="higher">Higher (heavier/taller)</option></select></div>
        <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Category</label><select value={formCategory} onChange={(e) => { setFormCategory(e.target.value); setFormCategoryLabel(categoryLabels[e.target.value]); }} style={iStyle}><option value="speed">Speed</option><option value="agility">Agility / COD</option><option value="power">Power</option><option value="strength">Strength</option><option value="conditioning">Conditioning</option><option value="body_comp">Body Composition</option></select></div>
        <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>For</label><select value={formAthleteType} onChange={(e) => setFormAthleteType(e.target.value)} style={iStyle}><option value="athlete">Youth Athletes Only</option><option value="adult">Adult Clients Only</option><option value="both">Both</option></select></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><label style={{ fontSize: 12, color: '#888' }}>Options</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer' }}><input type="checkbox" checked={formAllowKg} onChange={(e) => setFormAllowKg(e.target.checked)} /> Allow kg entry</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer' }}><input type="checkbox" checked={formFeetInches} onChange={(e) => setFormFeetInches(e.target.checked)} /> Feet & inches input</label><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer' }}><input type="checkbox" checked={formShowOnBoard} onChange={(e) => setFormShowOnBoard(e.target.checked)} /> Show on record board</label></div>
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}><button onClick={handleSave} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>{editingTest ? 'Save Changes' : 'Add Test'}</button><button onClick={() => { setEditingTest(null); setShowAddForm(false); resetForm(); }} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button></div>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}><div><h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Test Settings</h1><p style={{ color: '#888' }}>{testDefs.length} active tests — add, edit, or remove tests here</p></div><button onClick={() => { setShowAddForm(true); setEditingTest(null); resetForm(); }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Test</button></div>
      {(showAddForm || editingTest) && renderForm()}
      {Object.entries(grouped).map(([catLabel, tests]) => (
        <div key={catLabel} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2, borderLeft: '3px solid #00d4ff', paddingLeft: 10, marginBottom: 12 }}>{catLabel}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tests.map(t => (<div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: editingTest === t.id ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 8, border: editingTest === t.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(255,255,255,0.07)', gap: 12 }}><div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span><span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>{t.unit} · {t.direction === 'lower' ? '↓ lower is better' : '↑ higher is better'}</span></div><div style={{ display: 'flex', gap: 6 }}>{t.show_on_record_board && <span style={{ fontSize: 11, background: 'rgba(200,150,62,0.15)', color: '#C8963E', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>Board</span>}{t.athlete_type === 'adult' && <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.15)', color: '#FFA500', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>Adult</span>}{t.athlete_type === 'both' && <span style={{ fontSize: 11, background: 'rgba(0,212,255,0.15)', color: '#00d4ff', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>Both</span>}</div><button onClick={() => startEdit(t)} style={{ padding: '6px 14px', background: 'rgba(0,212,255,0.15)', border: 'none', borderRadius: 4, color: '#00d4ff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button><button onClick={() => handleDelete(t.id, t.name)} style={{ padding: '6px 14px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button></div>))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===================== PROGRESS REPORTS PAGE ===================== */
const TEST_DESCRIPTIONS = {
  '5_10_fly': 'their acceleration — how quickly they get up to speed',
  'max_velocity': 'how fast they can run at top-end speed',
  '5_0_5': 'agility — how quickly they can change direction',
  '5_10_5': 'change of direction speed',
  'rsi': 'reactive strength — how springy and elastic they are off the ground',
  'approach_jump': 'their running jump',
  'sl_rsi_left': 'single-leg ground contact (left)',
  'sl_rsi_right': 'single-leg ground contact (right)',
};

function ProgressReportsPage({ athletes, results, testDefs, getTestById, showNotification }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [sentReports, setSentReports] = useState([]);
  const [copied, setCopied] = useState(false);
  const [minPRs, setMinPRs] = useState(5);
  const [daysBack, setDaysBack] = useState(90);

  const COACH_PIN = '1234';

  useEffect(() => {
    const loadSent = async () => {
      const { data } = await supabase.from('progress_reports').select('*').order('sent_at', { ascending: false });
      if (data) setSentReports(data);
    };
    if (unlocked) loadSent();
  }, [unlocked]);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const getRecentPRs = (athleteId) => {
    const athleteResults = results.filter(r => r.athlete_id === athleteId);
    const prsByTest = {};
    athleteResults.forEach(r => {
      const td = getTestById(r.test_id);
      if (!td) return;
      const testResults = athleteResults.filter(ar => ar.test_id === r.test_id).sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
      if (testResults.length < 2) return;
      const vals = testResults.map(tr => ({ date: tr.test_date, value: parseFloat(tr.converted_value), raw: parseFloat(tr.raw_value) })).filter(v => !isNaN(v.value));
      if (vals.length < 2) return;
      const latest = vals[vals.length - 1];
      const latestDate = new Date(latest.date);
      if (latestDate < cutoffDate) return;
      let bestBefore = null;
      for (let i = vals.length - 2; i >= 0; i--) {
        if (bestBefore === null) { bestBefore = vals[i]; continue; }
        if (td.direction === 'higher' && vals[i].value > bestBefore.value) bestBefore = vals[i];
        if (td.direction === 'lower' && vals[i].value < bestBefore.value) bestBefore = vals[i];
      }
      if (!bestBefore) return;
      const improved = td.direction === 'higher' ? latest.value > bestBefore.value : latest.value < bestBefore.value;
      if (!improved) return;
      const best = td.direction === 'higher' ? Math.max(...vals.map(v => v.value)) : Math.min(...vals.map(v => v.value));
      if (latest.value === best) {
        prsByTest[r.test_id] = { testId: r.test_id, testName: td.name, direction: td.direction, unit: td.display_unit || td.unit, oldValue: bestBefore.value, newValue: latest.value, date: latest.date, description: TEST_DESCRIPTIONS[r.test_id] || '', feetInches: td.feet_inches, convertFormula: td.convert_formula, oldRaw: bestBefore.raw, newRaw: latest.raw };
      }
    });
    return Object.values(prsByTest);
  };

  const youthAthletes = athletes.filter(a => (a.type || 'athlete') === 'athlete');
  const flaggedAthletes = youthAthletes.map(a => {
    const prs = getRecentPRs(a.id);
    const lastSent = sentReports.find(sr => sr.athlete_id === a.id);
    return { athlete: a, prs, lastSent };
  }).filter(a => a.prs.length >= minPRs).sort((a, b) => b.prs.length - a.prs.length);

  const formatVal = (pr) => {
    if (pr.feetInches) return formatFeetInches(pr.newValue);
    if (pr.unit === 'sec') return pr.newValue.toFixed(2) + 's';
    if (pr.unit === 'MPH') return pr.newValue.toFixed(1) + ' MPH';
    if (pr.unit === 'inches') return pr.newValue.toFixed(1) + '"';
    if (pr.unit === 'lbs') return Math.round(pr.newValue) + ' lbs';
    return pr.newValue.toFixed(1);
  };
  const formatOldVal = (pr) => {
    if (pr.feetInches) return formatFeetInches(pr.oldValue);
    if (pr.unit === 'sec') return pr.oldValue.toFixed(2) + 's';
    if (pr.unit === 'MPH') return pr.oldValue.toFixed(1) + ' MPH';
    if (pr.unit === 'inches') return pr.oldValue.toFixed(1) + '"';
    if (pr.unit === 'lbs') return Math.round(pr.oldValue) + ' lbs';
    return pr.oldValue.toFixed(1);
  };
  const improvementText = (pr) => {
    const diff = Math.abs(pr.newValue - pr.oldValue);
    if (pr.unit === 'sec') return diff.toFixed(2) + 's faster';
    if (pr.unit === 'MPH') return diff.toFixed(1) + ' MPH faster';
    if (pr.unit === 'inches') return diff.toFixed(1) + '" higher';
    if (pr.unit === 'lbs') return Math.round(diff) + ' lbs stronger';
    if (pr.feetInches) return formatFeetInches(diff) + ' further';
    return diff.toFixed(1) + ' better';
  };

  const generateMessage = (athleteData) => {
    const a = athleteData.athlete;
    const prs = athleteData.prs;
    const name = a.first_name;
    let msg = `Hey! Just wanted to give you a quick progress update on ${name}. Over the last few months ${name} has been putting in great work and it's showing:\n\n`;
    prs.forEach(pr => {
      const desc = pr.description ? ` — ${pr.description}` : '';
      msg += `- ${pr.testName}: improved from ${formatOldVal(pr)} to ${formatVal(pr)} (${improvementText(pr)})${desc}\n`;
    });
    msg += `\n${name} is making real progress. Keep up the great work!`;
    return msg;
  };

  const markAsSent = async (athleteData) => {
    const msg = generateMessage(athleteData);
    const { data, error } = await supabase.from('progress_reports').insert([{
      athlete_id: athleteData.athlete.id,
      pr_count: athleteData.prs.length,
      pr_summary: athleteData.prs.map(p => p.testName).join(', '),
      message_text: msg,
    }]).select();
    if (data) {
      setSentReports([data[0], ...sentReports]);
      showNotification('Marked as sent!');
    }
    if (error) showNotification('Error: ' + error.message, 'error');
  };

  const copyMessage = (athleteData) => {
    const msg = generateMessage(athleteData);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotification('Copied to clipboard!');
  };

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, marginBottom: 8 }}>Coach Access</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>Enter PIN to access progress reports</p>
        <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value); if (e.target.value === COACH_PIN) setUnlocked(true); }} placeholder="Enter PIN" style={{ width: 200, padding: '16px 24px', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(0,212,255,0.3)', borderRadius: 12, color: '#fff', fontSize: 32, textAlign: 'center', letterSpacing: 12 }} />
        {pin.length === 4 && pin !== COACH_PIN && <p style={{ color: '#ff6666', marginTop: 12, fontSize: 14 }}>Incorrect PIN</p>}
      </div>
    );
  }

  if (selectedAthlete) {
    const athleteData = flaggedAthletes.find(a => a.athlete.id === selectedAthlete);
    if (!athleteData) { setSelectedAthlete(null); return null; }
    const msg = generateMessage(athleteData);
    const age = calculateAge(athleteData.athlete.birthday);
    const wasSent = sentReports.some(sr => sr.athlete_id === selectedAthlete);

    return (
      <div>
        <button onClick={() => setSelectedAthlete(null)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back to list</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, margin: 0 }}>{athleteData.athlete.first_name} {athleteData.athlete.last_name}</h2>
            <p style={{ color: '#888', margin: '4px 0' }}>{age && `${age} yrs`}{athleteData.athlete.gender && ` · ${athleteData.athlete.gender}`} · {athleteData.prs.length} PRs in last {daysBack} days</p>
          </div>
          {wasSent && <span style={{ padding: '6px 14px', background: 'rgba(0,255,136,0.15)', borderRadius: 6, color: '#00ff88', fontSize: 13, fontWeight: 600 }}>Previously sent</span>}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2 }}>PR Improvements</h3>
            <button onClick={() => {
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              const w = 600, rowH = 52, padTop = 80, padBot = 40;
              const h = padTop + athleteData.prs.length * rowH + padBot;
              svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
              let svgContent = `<rect width="${w}" height="${h}" fill="#0a1628" rx="16"/>`;
              svgContent += `<text x="30" y="36" fill="#00d4ff" font-family="Arial Black,sans-serif" font-size="22" font-weight="900">WILMINGTON STRENGTH</text>`;
              svgContent += `<text x="30" y="60" fill="#888" font-family="Arial,sans-serif" font-size="14">${athleteData.athlete.first_name} ${athleteData.athlete.last_name} — Progress Report</text>`;
              athleteData.prs.forEach((pr, i) => {
                const y = padTop + i * rowH;
                svgContent += `<rect x="20" y="${y}" width="${w-40}" height="${rowH-8}" fill="rgba(0,255,136,0.08)" rx="8"/>`;
                svgContent += `<text x="34" y="${y+22}" fill="#00ff88" font-family="Arial,sans-serif" font-size="14" font-weight="700">${pr.testName}</text>`;
                svgContent += `<text x="34" y="${y+40}" fill="#888" font-family="Arial,sans-serif" font-size="12">${formatOldVal(pr)}  →  ${formatVal(pr)}  (${improvementText(pr)})</text>`;
              });
              svgContent += `<text x="${w/2}" y="${h-14}" fill="#444" font-family="Arial,sans-serif" font-size="10" text-anchor="middle">wilmington-strength-app.netlify.app</text>`;
              svg.innerHTML = svgContent;
              const svgData = new XMLSerializer().serializeToString(svg);
              const canvas = document.createElement('canvas'); canvas.width = w * 2; canvas.height = h * 2;
              const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
              const img = new Image();
              img.onload = () => { ctx.drawImage(img, 0, 0); const link = document.createElement('a'); link.download = `${athleteData.athlete.first_name}_${athleteData.athlete.last_name}_progress.png`; link.href = canvas.toDataURL('image/png'); link.click(); };
              img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            }} style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, color: '#00d4ff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save Image</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {athleteData.prs.map(pr => (
              <div key={pr.testId} style={{ background: 'rgba(0,255,136,0.06)', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(0,255,136,0.2)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#00ff88', marginBottom: 4 }}>{pr.testName}</div>
                {pr.description && <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{pr.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#666', fontSize: 16 }}>{formatOldVal(pr)}</span>
                  <span style={{ color: '#00ff88', fontSize: 18 }}>→</span>
                  <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 20 }}>{formatVal(pr)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#00ff88', marginTop: 4 }}>{improvementText(pr)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 2 }}>Message to Parent</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => copyMessage(athleteData)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{copied ? 'Copied!' : 'Copy Text'}</button>
              <button onClick={() => markAsSent(athleteData)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Mark as Sent</button>
            </div>
          </div>
          <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 20, color: '#ccc', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordWrap: 'break-word', border: '1px solid rgba(255,255,255,0.1)', margin: 0 }}>{msg}</pre>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Progress Reports</h1>
          <p style={{ color: '#888' }}>{flaggedAthletes.length} athletes ready for a progress report</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#666' }}>Min PRs:</div>
          {[3, 4, 5, 6].map(n => (<button key={n} onClick={() => setMinPRs(n)} style={{ width: 36, height: 36, background: minPRs === n ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)', border: minPRs === n ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: minPRs === n ? '#00d4ff' : '#666', cursor: 'pointer', fontSize: 14, fontWeight: minPRs === n ? 700 : 400 }}>{n}+</button>))}
          <div style={{ fontSize: 13, color: '#666', marginLeft: 12 }}>Days:</div>
          {[30, 60, 90, 180].map(d => (<button key={d} onClick={() => setDaysBack(d)} style={{ padding: '6px 12px', background: daysBack === d ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)', border: daysBack === d ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: daysBack === d ? '#00d4ff' : '#666', cursor: 'pointer', fontSize: 13, fontWeight: daysBack === d ? 700 : 400 }}>{d}</button>))}
        </div>
      </div>

      {flaggedAthletes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>No athletes with {minPRs}+ PRs in the last {daysBack} days.</p><p style={{ fontSize: 13 }}>Try lowering the minimum PRs or increasing the time range.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flaggedAthletes.map(({ athlete, prs, lastSent }) => {
            const age = calculateAge(athlete.birthday);
            const wasSent = !!lastSent;
            const sentDate = lastSent ? new Date(lastSent.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
            return (
              <div key={athlete.id} onClick={() => setSelectedAthlete(athlete.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: wasSent ? 'rgba(0,255,136,0.03)' : 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${wasSent ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(0,255,136,0.15)', border: '2px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", color: '#00ff88' }}>{prs.length}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{athlete.first_name} {athlete.last_name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{age && `${age} yrs`}{athlete.gender && ` · ${athlete.gender}`} · PRs: {prs.map(p => p.testName).join(', ')}</div>
                </div>
                {wasSent ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}><span style={{ fontSize: 12, color: '#00ff88', fontWeight: 600 }}>Sent {sentDate}</span></div>
                ) : (
                  <div style={{ padding: '6px 14px', background: 'rgba(255,165,0,0.15)', borderRadius: 6, color: '#FFA500', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Needs Report</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sentReports.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ color: '#666', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Recently Sent ({sentReports.length})</h3>
          {sentReports.slice(0, 10).map(sr => {
            const a = athletes.find(x => x.id === sr.athlete_id);
            return (
              <div key={sr.id} style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                <span>{a ? `${a.first_name} ${a.last_name}` : 'Unknown'} — {sr.pr_count} PRs ({sr.pr_summary})</span>
                <span>{new Date(sr.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
