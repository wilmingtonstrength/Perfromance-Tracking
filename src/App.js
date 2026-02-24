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

const FEET_INCHES_TESTS = ['broad_jump'];
const isFeetInchesTest = (testId) => FEET_INCHES_TESTS.includes(testId);

const formatTestValue = (testId, value) => {
  if (value === null || value === undefined) return '-';
  if (isFeetInchesTest(testId)) return formatFeetInches(value);
  return value;
};

const preventScrollChange = (e) => { e.target.blur(); };

const TESTS = {
  speed: { label: 'Speed & Acceleration', tests: [
    { id: 'max_velocity', name: 'Max Velocity', unit: 'split sec', direction: 'higher', convert: (v) => (20.45 / v).toFixed(2), displayUnit: 'MPH' },
    { id: '5_10_fly', name: '5-10 Fly', unit: 'sec', direction: 'lower' },
    { id: '10_20_fly', name: '10-20 Fly', unit: 'sec', direction: 'lower' },
    { id: '20_10_fly', name: '20-10 Fly', unit: 'sec', direction: 'lower' },
    { id: '40_yard', name: '40-Yard Dash', unit: 'sec', direction: 'lower' },
    { id: '60_yard', name: '60-Yard Dash', unit: 'sec', direction: 'lower' },
    { id: '80m', name: '80m', unit: 'sec', direction: 'lower' },
    { id: '100m', name: '100m', unit: 'sec', direction: 'lower' },
    { id: '150m', name: '150m', unit: 'sec', direction: 'lower' },
  ]},
  agility: { label: 'Change of Direction', tests: [
    { id: '5_10_5', name: '5-10-5', unit: 'sec', direction: 'lower' },
    { id: '5_0_5', name: '5-0-5', unit: 'sec', direction: 'lower' },
  ]},
  power: { label: 'Power', tests: [
    { id: 'broad_jump', name: 'Broad Jump', unit: 'inches', direction: 'higher' },
    { id: 'vertical_jump', name: 'Vertical Jump', unit: 'inches', direction: 'higher' },
    { id: 'approach_jump', name: 'Approach Jump', unit: 'inches', direction: 'higher' },
    { id: 'rsi', name: 'RSI', unit: 'ratio', direction: 'higher' },
    { id: 'sl_rsi_l', name: 'Single-Leg RSI Left', unit: 'ratio', direction: 'higher' },
    { id: 'sl_rsi_r', name: 'Single-Leg RSI Right', unit: 'ratio', direction: 'higher' },
  ]},
  strength: { label: 'Strength', tests: [
    { id: 'back_squat', name: 'Back Squat', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'front_squat', name: 'Front Squat', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'bench_press', name: 'Bench Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'press', name: 'Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'push_press', name: 'Push Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'jerk', name: 'Jerk', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'overhead', name: 'Overhead (legacy)', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'deadlift', name: 'Deadlift', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'clean', name: 'Clean', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'snatch', name: 'Snatch', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'chin_up', name: 'Chin-Up', unit: 'reps', direction: 'higher' },
  ]}
};

const ADULT_TESTS = {
  performance: { label: 'Performance', tests: [
    { id: '5_0_5', name: '5-0-5', unit: 'sec', direction: 'lower' },
    { id: 'broad_jump', name: 'Broad Jump', unit: 'inches', direction: 'higher' },
    { id: '5_10_fly', name: '5-10 Fly', unit: 'sec', direction: 'lower' },
    { id: 'vertical_jump', name: 'Vertical Jump', unit: 'inches', direction: 'higher' },
  ]},
  conditioning: { label: 'Conditioning', tests: [
    { id: '500m_row', name: '500m Row', unit: 'sec', direction: 'lower' },
  ]},
  body_comp: { label: 'Body Composition', tests: [
    { id: 'body_weight', name: 'Body Weight', unit: 'lbs', direction: 'lower' },
    { id: 'body_fat_pct', name: 'Body Fat %', unit: '%', direction: 'lower' },
    { id: 'lean_muscle_mass', name: 'Skeletal Muscle Mass', unit: 'lbs', direction: 'higher' },
  ]},
  strength: { label: 'Strength', tests: [
    { id: 'back_squat', name: 'Back Squat', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'front_squat', name: 'Front Squat', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'bench_press', name: 'Bench Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'deadlift', name: 'Deadlift', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'press', name: 'Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'push_press', name: 'Push Press', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'jerk', name: 'Jerk', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'clean', name: 'Clean', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'snatch', name: 'Snatch', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'chin_up', name: 'Chin-Up', unit: 'reps', direction: 'higher' },
  ]}
};

const ALL_TEST_DEFS = {};
Object.values(TESTS).forEach(c => c.tests.forEach(t => { ALL_TEST_DEFS[t.id] = t; }));
Object.values(ADULT_TESTS).forEach(c => c.tests.forEach(t => { if (!ALL_TEST_DEFS[t.id]) ALL_TEST_DEFS[t.id] = t; }));

const getAllTests = () => Object.values(ALL_TEST_DEFS);
const getTestById = (id) => ALL_TEST_DEFS[id] || null;

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

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && value !== '' && value !== undefined && value !== null) {
      const total = parseFloat(value);
      if (!isNaN(total)) {
        setFeet(String(Math.floor(total / 12)));
        setInches(String(parseFloat((total % 12).toFixed(1))));
      }
      setInitialized(true);
    } else if (value === '' || value === undefined || value === null) {
      if (initialized) { setFeet(''); setInches(''); }
    }
  }, [value, initialized]);

  const handleChange = (newFeet, newInches) => {
    setFeet(newFeet);
    setInches(newInches);
    const f = newFeet !== '' ? parseInt(newFeet) : 0;
    const i = newInches !== '' ? parseFloat(newInches) : 0;
    onChange(newFeet === '' && newInches === '' ? '' : String(f * 12 + i));
  };

  const inputStyle = { width: 44, padding: '8px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center', ...style };

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
      <input type="number" min="0" max="12" placeholder="ft" value={feet} onChange={(e) => handleChange(e.target.value, inches)} onWheel={preventScrollChange} style={inputStyle} />
      <span style={{ color: '#666', fontSize: 14 }}>'</span>
      <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={inches} onChange={(e) => handleChange(feet, e.target.value)} onWheel={preventScrollChange} style={inputStyle} />
      <span style={{ color: '#666', fontSize: 14 }}>"</span>
    </div>
  );
}

/* ===================== ROW TIME INPUT ===================== */
function RowTimeInput({ value, onChange }) {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && value !== '' && value !== undefined && value !== null) {
      const total = parseFloat(value);
      if (!isNaN(total)) {
        setMinutes(String(Math.floor(total / 60)));
        setSeconds(String((total % 60).toFixed(1)));
      }
      setInitialized(true);
    } else if (!value) {
      if (initialized) { setMinutes(''); setSeconds(''); }
    }
  }, [value, initialized]);

  const handleChange = (m, s) => {
    setMinutes(m);
    setSeconds(s);
    const mVal = m !== '' ? parseInt(m) : 0;
    const sVal = s !== '' ? parseFloat(s) : 0;
    onChange(m === '' && s === '' ? '' : String(mVal * 60 + sVal));
  };

  const inputStyle = { width: 50, padding: '8px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' };

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
      <input type="number" min="0" max="5" placeholder="min" value={minutes} onChange={(e) => handleChange(e.target.value, seconds)} onWheel={preventScrollChange} style={inputStyle} />
      <span style={{ color: '#666', fontSize: 14 }}>:</span>
      <input type="number" min="0" max="59.9" step="0.1" placeholder="sec" value={seconds} onChange={(e) => handleChange(minutes, e.target.value)} onWheel={preventScrollChange} style={{ ...inputStyle, width: 60 }} />
    </div>
  );
}

/* ===================== MAIN APP ===================== */
export default function App() {
  const [page, setPage] = useState('entry');
  const [athletes, setAthletes] = useState([]);
  const [results, setResults] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data: ad } = await supabase.from('athletes').select('*').order('first_name');
    let allResults = [];
    let from = 0;
    const step = 500;
    while (true) {
      const { data: batch } = await supabase.from('results').select('*').range(from, from + step - 1);
      if (batch && batch.length > 0) allResults = [...allResults, ...batch];
      if (!batch || batch.length < step) break;
      from += step;
    }
    if (ad) setAthletes(ad);
    setResults(allResults);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const addAthlete = async (athlete) => {
    const age = athlete.birthday ? calculateAge(athlete.birthday) : null;
    const { data, error } = await supabase.from('athletes').insert([{
      first_name: athlete.firstName, last_name: athlete.lastName,
      email: athlete.email || '', phone: athlete.phone || '',
      birthday: athlete.birthday || null, age, gender: athlete.gender,
      status: 'Active', type: athlete.type || 'athlete'
    }]).select();
    if (data) { setAthletes([...athletes, data[0]].sort((a, b) => a.first_name.localeCompare(b.first_name))); showNotification(athlete.firstName + ' ' + athlete.lastName + ' added!'); }
    if (error) showNotification('Error adding athlete', 'error');
  };

  const updateAthlete = async (id, updates) => {
    const age = updates.birthday ? calculateAge(updates.birthday) : null;
    const { error } = await supabase.from('athletes').update({
      first_name: updates.firstName, last_name: updates.lastName,
      email: updates.email, phone: updates.phone,
      birthday: updates.birthday || null, age, gender: updates.gender,
      status: updates.status, type: updates.type || 'athlete'
    }).eq('id', id);
    if (!error) {
      setAthletes(athletes.map(a => a.id === id ? { ...a, first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday, age, gender: updates.gender, status: updates.status, type: updates.type || 'athlete' } : a));
      showNotification('Athlete updated!');
    }
  };

  const deleteAthlete = async (id, athleteName) => {
    if (!window.confirm(`Delete ${athleteName} and ALL their test results? This cannot be undone.`)) return;
    const { error: resultsError } = await supabase.from('results').delete().eq('athlete_id', id);
    if (resultsError) { showNotification('Error deleting results', 'error'); return; }
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (error) { showNotification('Error deleting athlete', 'error'); return; }
    setAthletes(athletes.filter(a => a.id !== id));
    setResults(results.filter(r => r.athlete_id !== id));
    showNotification(`${athleteName} deleted`);
  };

  const deleteResult = async (resultId) => {
    const { error } = await supabase.from('results').delete().eq('id', resultId);
    if (!error) { setResults(results.filter(r => r.id !== resultId)); showNotification('Result deleted'); }
  };

  const updateResult = async (resultId, updates) => {
    const test = getTestById(updates.testId);
    const cv = test && test.convert ? parseFloat(test.convert(updates.rawValue)) : updates.rawValue;
    const { error } = await supabase.from('results').update({ test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv }).eq('id', resultId);
    if (!error) {
      setResults(results.map(r => r.id === resultId ? { ...r, test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv } : r));
      showNotification('Result updated!');
    }
  };

  const logResults = async (resultsToLog) => {
    let prCount = 0;
    const newResults = [];
    for (const result of resultsToLog) {
      const test = getTestById(result.testId);
      const prev = results.filter(r => r.athlete_id === result.athleteId && r.test_id === result.testId);
      let isPR = prev.length === 0;
      if (!isPR) {
        const best = test.direction === 'higher' ? Math.max(...prev.map(r => parseFloat(r.converted_value))) : Math.min(...prev.map(r => parseFloat(r.converted_value)));
        isPR = test.direction === 'higher' ? result.convertedValue > best : result.convertedValue < best;
      }
      const { data } = await supabase.from('results').insert([{ athlete_id: result.athleteId, test_id: result.testId, test_date: result.testDate, raw_value: result.rawValue, converted_value: result.convertedValue, unit: result.unit, is_pr: isPR }]).select();
      if (data) { newResults.push(data[0]); if (isPR) prCount++; }
    }
    setResults([...results, ...newResults]);
    if (prCount > 0) showNotification('🏆 ' + prCount + ' NEW PR' + (prCount > 1 ? 's' : '') + '! Results logged!', 'pr');
    else showNotification(resultsToLog.length + ' result' + (resultsToLog.length > 1 ? 's' : '') + ' logged!');
    return newResults;
  };

  const getAthleteById = (id) => athletes.find(a => a.id === id);
  const getPR = (athleteId, testId) => {
    const test = getTestById(testId);
    if (!test) return null;
    const ar = results.filter(r => r.athlete_id === athleteId && r.test_id === testId);
    if (ar.length === 0) return null;
    return test.direction === 'higher' ? Math.max(...ar.map(r => parseFloat(r.converted_value))) : Math.min(...ar.map(r => parseFloat(r.converted_value)));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20 }}>Loading...</div>
  );

  const navItems = [
    { id: 'entry', label: 'Test Entry' },
    { id: 'athletes', label: 'Athletes' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'recentprs', label: '🔥 Recent PRs' },
    { id: 'manage', label: '⚙️ Manage' },
    { id: 'jumpcalc', label: '📏 Jump Calc' },
    { id: 'recordboard', label: '🏆 Record Board' },
    { id: 'adultclients', label: '👤 Adult Clients' },
    { id: 'adultrecordboard', label: '🥇 Adult Records' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: "'Archivo', 'Helvetica Neue', sans-serif", color: '#e8e8e8' }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      <header style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#0a1628' }}>W</div>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, letterSpacing: 1 }}>WILMINGTON STRENGTH</div>
              <div style={{ fontSize: 11, color: '#00d4ff', letterSpacing: 2, textTransform: 'uppercase' }}>Performance Tracking</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)} style={{ padding: '10px 20px', background: page === item.id ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: page === item.id ? '#0a1628' : '#e8e8e8', fontWeight: page === item.id ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>{item.label}</button>
            ))}
          </nav>
        </div>
      </header>

      {notification && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', background: notification.type === 'pr' ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, color: '#0a1628', fontWeight: 700, fontSize: 16, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,212,255,0.3)' }}>
          {notification.message}
        </div>
      )}

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && <TestEntryPage athletes={athletes} logResults={logResults} getPR={getPR} getAthleteById={getAthleteById} />}
        {page === 'athletes' && <AthletesPage athletes={athletes} addAthlete={addAthlete} updateAthlete={updateAthlete} deleteAthlete={deleteAthlete} results={results} />}
        {page === 'dashboard' && <DashboardPage athletes={athletes} results={results} getPR={getPR} />}
        {page === 'recentprs' && <RecentPRsPage athletes={athletes} results={results} getAthleteById={getAthleteById} />}
        {page === 'manage' && <ManagePage athletes={athletes} results={results} getAthleteById={getAthleteById} deleteResult={deleteResult} updateResult={updateResult} />}
        {page === 'jumpcalc' && <JumpCalcPage athletes={athletes} setAthletes={setAthletes} results={results} logResults={logResults} getPR={getPR} showNotification={showNotification} />}
        {page === 'recordboard' && <RecordBoardPage athletes={athletes} results={results} />}
        {page === 'adultclients' && <AdultClientsPage athletes={athletes} results={results} getPR={getPR} logResults={logResults} getAthleteById={getAthleteById} />}
        {page === 'adultrecordboard' && <AdultRecordBoardPage athletes={athletes} results={results} />}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: 2px solid #00d4ff; outline-offset: 2px; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }
      `}</style>
    </div>
  );
}

/* ===================== TEST ENTRY PAGE ===================== */
function TestEntryPage({ athletes, logResults, getPR, getAthleteById }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [useKg, setUseKg] = useState(false);
  const [athleteRows, setAthleteRows] = useState([]);
  const [submittedResults, setSubmittedResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [entryMode, setEntryMode] = useState('athlete');

  const testSet = entryMode === 'adult' ? ADULT_TESTS : TESTS;
  const anyStrength = selectedTests.some(tid => { const t = getTestById(tid); return t && t.allowKg; });

  const toggleTest = (testId) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter(t => t !== testId));
      setAthleteRows(athleteRows.map(row => { const nv = { ...row.values }; delete nv[testId]; return { ...row, values: nv }; }));
    } else {
      setSelectedTests([...selectedTests, testId]);
      setAthleteRows(athleteRows.map(row => ({ ...row, values: { ...row.values, [testId]: '' } })));
    }
  };

  const switchMode = (mode) => { setEntryMode(mode); setSelectedTests([]); setAthleteRows([]); };

  const addAthleteRow = (athleteId) => {
    if (!athleteId || athleteRows.find(r => r.athleteId === athleteId)) return;
    const values = {};
    selectedTests.forEach(tid => { values[tid] = ''; });
    setAthleteRows([...athleteRows, { athleteId, values }]);
  };

  const removeAthleteRow = (index) => setAthleteRows(athleteRows.filter((_, i) => i !== index));

  const updateValue = (rowIndex, testId, value) => {
    const nr = [...athleteRows];
    nr[rowIndex] = { ...nr[rowIndex], values: { ...nr[rowIndex].values, [testId]: value } };
    setAthleteRows(nr);
  };

  const usedAthleteIds = athleteRows.map(r => r.athleteId);

  const startNextGroup = () => { setAthleteRows([]); setSubmittedResults([]); setShowSummary(false); };

  const handleSubmit = async () => {
    if (selectedTests.length === 0 || !testDate) { alert('Please select at least one test and a date'); return; }
    const toLog = [];
    athleteRows.forEach(row => {
      selectedTests.forEach(testId => {
        const val = row.values[testId];
        if (val === '' || val === undefined) return;
        const test = getTestById(testId);
        let raw = parseFloat(val);
        let cv = raw;
        if (test.allowKg && useKg) { cv = Math.round(raw * 2.205); }
        if (test.convert) cv = parseFloat(test.convert(raw));
        toLog.push({ athleteId: row.athleteId, testId, testDate, rawValue: raw, convertedValue: cv, unit: test.allowKg && useKg ? 'kg' : test.unit });
      });
    });
    if (toLog.length === 0) { alert('Please enter at least one value'); return; }
    setSubmitting(true);
    const logged = await logResults(toLog);
    const summary = logged.map(r => {
      const a = getAthleteById(r.athlete_id);
      const t = getTestById(r.test_id);
      return { athlete: (a ? a.first_name + ' ' + a.last_name : 'Unknown'), test: t ? t.name : r.test_id, value: r.converted_value, testId: r.test_id, unit: t ? (t.displayUnit || t.unit) : '', isPR: r.is_pr };
    });
    setSubmittedResults(summary);
    setShowSummary(true);
    setSubmitting(false);
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  if (showSummary) {
    const prResults = submittedResults.filter(r => r.isPR);
    const nonPRResults = submittedResults.filter(r => !r.isPR);
    return (
      <div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Results Logged</h1>
        <p style={{ color: '#888', marginBottom: 24 }}>{submittedResults.length} result{submittedResults.length !== 1 ? 's' : ''} saved</p>
        {prResults.length > 0 && (
          <div style={{ background: 'rgba(0,255,136,0.1)', borderRadius: 12, padding: 24, border: '1px solid rgba(0,255,136,0.4)', marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#00ff88', fontSize: 22 }}>🏆 New PRs — {prResults.length}</h2>
            {prResults.map((r, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{r.athlete} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>— {r.test}</span></span>
                <span style={{ color: '#00ff88', fontWeight: 800, fontSize: 18 }}>
                  {r.testId === '500m_row' ? formatRowTime(r.value) : isFeetInchesTest(r.testId) ? formatFeetInches(r.value) : Math.round(r.value)} {!isFeetInchesTest(r.testId) && r.testId !== '500m_row' && r.unit}
                </span>
              </div>
            ))}
          </div>
        )}
        {nonPRResults.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: 16 }}>Other Results</h3>
            {nonPRResults.map((r, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span><span style={{ fontWeight: 600 }}>{r.athlete}</span> — {r.test}</span>
                <span style={{ color: '#00d4ff' }}>
                  {r.testId === '500m_row' ? formatRowTime(r.value) : isFeetInchesTest(r.testId) ? formatFeetInches(r.value) : Math.round(r.value)} {!isFeetInchesTest(r.testId) && r.testId !== '500m_row' && r.unit}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={startNextGroup} style={{ width: '100%', padding: '20px 32px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
          + Start Next Group
        </button>
        <p style={{ textAlign: 'center', marginTop: 12, color: '#555', fontSize: 13 }}>Need to fix an entry? Go to Manage to edit or delete results.</p>
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
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...iStyle, width: 220 }} />
        </div>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#aaa' }}>Select Tests</label>
        {Object.entries(testSet).map(([key, category]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{category.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {category.tests.map(t => {
                const active = selectedTests.includes(t.id);
                const activeBg = entryMode === 'adult' ? 'linear-gradient(135deg, #FFA500 0%, #cc8400 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)';
                return <button key={t.id} onClick={() => toggleTest(t.id)} style={{ padding: '8px 16px', background: active ? activeBg : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>;
              })}
            </div>
          </div>
        ))}
        {anyStrength && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Strength Unit <span style={{ color: '#555', fontSize: 12 }}>(always stored as lbs)</span></label>
            <div style={{ display: 'flex', gap: 8, width: 200 }}>
              <button onClick={() => setUseKg(false)} style={{ flex: 1, padding: '10px', background: !useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: !useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>LBS</button>
              <button onClick={() => setUseKg(true)} style={{ flex: 1, padding: '10px', background: useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>KG</button>
            </div>
            {useKg && <div style={{ marginTop: 8, fontSize: 12, color: '#00d4ff' }}>Entering in kg — auto-converts to lbs on save</div>}
          </div>
        )}
      </div>

      {selectedTests.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Add {entryMode === 'adult' ? 'Clients' : 'Athletes'} & Enter Results</h3>
          <div style={{ marginBottom: 16 }}>
            <AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => { if (id) addAthleteRow(id); }} excludeIds={usedAthleteIds} placeholder={`Search & add ${entryMode === 'adult' ? 'client' : 'athlete'}...`} filterType={entryMode} />
          </div>

          {athleteRows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, minWidth: 'fit-content' }}>
                <div style={{ minWidth: 140, fontSize: 12, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Name</div>
                {selectedTests.map(tid => {
                  const t = getTestById(tid);
                  const headerUnit = t && t.allowKg && useKg ? 'kg' : '';
                  const isRowTest = tid === '500m_row';
                  return (
                    <div key={tid} style={{ minWidth: isFeetInchesTest(tid) ? 130 : isRowTest ? 120 : 100, flex: 1, fontSize: 11, color: entryMode === 'adult' ? '#FFA500' : '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
                      {t ? t.name : tid}
                      {headerUnit && <span style={{ color: '#f0a500', display: 'block', fontSize: 10 }}>{headerUnit}</span>}
                    </div>
                  );
                })}
                <div style={{ width: 32 }}></div>
              </div>

              {athleteRows.map((row, rowIndex) => {
                const athlete = athletes.find(a => a.id === row.athleteId);
                return (
                  <div key={row.athleteId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: 'fit-content' }}>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{athlete ? athlete.first_name : ''}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{athlete ? athlete.last_name : ''}</div>
                    </div>
                    {selectedTests.map(tid => {
                      const t = getTestById(tid);
                      const pr = getPR(row.athleteId, tid);
                      const useFtIn = isFeetInchesTest(tid);
                      const isRowTest = tid === '500m_row';
                      const prDisplay = pr !== null
                        ? (t && t.allowKg && useKg ? Math.round(pr / 2.205) + ' kg' : (useFtIn ? formatFeetInches(pr) : isRowTest ? formatRowTime(pr) : pr + ' ' + (t ? t.unit : '')))
                        : null;
                      return (
                        <div key={tid} style={{ minWidth: useFtIn ? 130 : isRowTest ? 120 : 100, flex: 1 }}>
                          {useFtIn ? (
                            <FeetInchesInput value={row.values[tid]} onChange={(val) => updateValue(rowIndex, tid, val)} />
                          ) : isRowTest ? (
                            <RowTimeInput value={row.values[tid]} onChange={(val) => updateValue(rowIndex, tid, val)} />
                          ) : (
                            <input type="number" step="0.01" placeholder={t && t.allowKg && useKg ? 'kg' : (t ? t.unit : 'val')} value={row.values[tid] || ''} onChange={(e) => updateValue(rowIndex, tid, e.target.value)} onWheel={preventScrollChange} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' }} />
                          )}
                          {prDisplay !== null && <div style={{ fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 }}>PR: {prDisplay}</div>}
                        </div>
                      );
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

      {selectedTests.length > 0 && athleteRows.length > 0 && (
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '20px 32px', background: submitting ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: '0 4px 20px rgba(0,255,136,0.3)' }}>
          {submitting ? 'Saving...' : 'Submit All Results'}
        </button>
      )}
    </div>
  );
}

/* ===================== ATHLETES PAGE ===================== */
function AthletesPage({ athletes, addAthlete, updateAthlete, deleteAthlete, results }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');
  const [type, setType] = useState('athlete');

  const resetForm = () => { setFirstName(''); setLastName(''); setBirthday(''); setGender('Male'); setEmail(''); setPhone(''); setStatus('Active'); setType('athlete'); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    if (editingId) { updateAthlete(editingId, { firstName, lastName, birthday, gender, email, phone, status, type }); setEditingId(null); }
    else { addAthlete({ firstName, lastName, birthday, gender, email, phone, type }); }
    resetForm(); setShowForm(false);
  };

  const handleEdit = (a) => {
    setEditingId(a.id); setFirstName(a.first_name); setLastName(a.last_name);
    setBirthday(a.birthday ? String(a.birthday).slice(0, 10) : '');
    setGender(a.gender || 'Male'); setEmail(a.email || ''); setPhone(a.phone || '');
    setStatus(a.status || 'Active'); setType(a.type || 'athlete');
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  const filteredAthletes = athletes.filter(a => {
    const nameMatch = !searchTerm || (a.first_name + ' ' + a.last_name).toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = filterType === 'all' || (a.type || 'athlete') === filterType;
    return nameMatch && typeMatch;
  });

  const athleteCount = athletes.filter(a => (a.type || 'athlete') === 'athlete').length;
  const adultCount = athletes.filter(a => a.type === 'adult').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athletes & Clients</h1>
          <p style={{ color: '#888' }}>{athleteCount} athletes · {adultCount} adult clients</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Person</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...iStyle, width: 260 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'athlete', 'adult'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ padding: '10px 16px', background: filterType === t ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)', border: filterType === t ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: filterType === t ? '#00d4ff' : '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: filterType === t ? 600 : 400 }}>
              {t === 'all' ? 'All' : t === 'athlete' ? 'Youth Athletes' : 'Adult Clients'}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>{editingId ? 'Edit Person' : 'New Person'}</h3>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#888' }}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setType('athlete')} style={{ padding: '10px 20px', background: type === 'athlete' ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: type === 'athlete' ? '#0a1628' : '#aaa', fontWeight: type === 'athlete' ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>Youth Athlete</button>
              <button type="button" onClick={() => setType('adult')} style={{ padding: '10px 20px', background: type === 'adult' ? 'linear-gradient(135deg, #FFA500 0%, #cc8400 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: type === 'adult' ? '#0a1628' : '#aaa', fontWeight: type === 'adult' ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>Adult Client</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={iStyle} />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={iStyle} />
            <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ width: '100%', ...iStyle }} /></div>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={iStyle}><option>Male</option><option>Female</option></select>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={iStyle} />
            <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={iStyle} />
            {editingId && <select value={status} onChange={(e) => setStatus(e.target.value)} style={iStyle}><option>Active</option><option>Inactive</option></select>}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Save Changes' : 'Add Person'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filteredAthletes.map(athlete => {
          const ar = results.filter(r => r.athlete_id === athlete.id);
          const prs = ar.filter(r => r.is_pr).length;
          const age = calculateAge(athlete.birthday);
          const isAdult = athlete.type === 'adult';
          return (
            <div key={athlete.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${isAdult ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{athlete.first_name} {athlete.last_name}</h3>
                    {isAdult && <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>ADULT</span>}
                  </div>
                  <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>{age && (age + ' yrs')}{athlete.gender && (' · ' + athlete.gender)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(athlete)} style={{ padding: '4px 10px', background: 'rgba(0,212,255,0.2)', border: 'none', borderRadius: 4, color: '#00d4ff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteAthlete(athlete.id, `${athlete.first_name} ${athlete.last_name}`)} style={{ padding: '4px 10px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
                  <span style={{ padding: '4px 10px', background: (athlete.status === 'Active' || athlete.status === 'active') ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)', color: (athlete.status === 'Active' || athlete.status === 'active') ? '#00ff88' : '#888', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{athlete.status}</span>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{ar.length}</div><div style={{ fontSize: 12, color: '#888' }}>Tests</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: '#00ff88' }}>{prs}</div><div style={{ fontSize: 12, color: '#888' }}>PRs</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== SIMPLE CHART ===================== */
function SimpleChart({ data, direction, testId }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const rawStep = range / 4;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
  const step = niceSteps.find(s => s >= rawStep) || rawStep;
  const chartMin = Math.floor(minVal / step) * step - step;
  const chartMax = Math.ceil(maxVal / step) * step + step;
  const chartRange = chartMax - chartMin || 1;
  const yLabels = [];
  for (let v = chartMin; v <= chartMax + step * 0.01; v += step) { yLabels.push(Math.round(v * 100) / 100); }
  const width = 100;
  const height = 200;
  const pointSpacing = data.length > 1 ? width / (data.length - 1) : width / 2;
  const getY = (val) => height - ((val - chartMin) / chartRange) * height;
  const points = data.map((d, i) => ({ x: data.length === 1 ? width / 2 : i * pointSpacing, y: getY(d.value), ...d }));
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
  const bestValue = direction === 'lower' ? minVal : maxVal;
  const useFtIn = isFeetInchesTest(testId);
  const isRowTest = testId === '500m_row';
  const formatVal = (v) => useFtIn ? formatFeetInches(v) : isRowTest ? formatRowTime(v) : v;

  return (
    <div style={{ padding: '20px 0' }}>
      <svg viewBox={'-40 -15 ' + (width + 70) + ' ' + (height + 45)} style={{ width: '100%', height: 280 }}>
        {yLabels.map((val, i) => {
          const y = getY(val);
          if (y < -5 || y > height + 5) return null;
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={-8} y={y + 4} fill="#888" fontSize="9" textAnchor="end">{useFtIn ? formatFeetInches(val) : isRowTest ? formatRowTime(val) : (Number.isInteger(val) ? val : val.toFixed(1))}</text>
            </g>
          );
        })}
        <line x1={0} y1={getY(bestValue)} x2={width} y2={getY(bestValue)} stroke="#00ff88" strokeWidth="1.5" strokeDasharray="4,4" />
        <text x={width + 3} y={getY(bestValue) + 4} fill="#00ff88" fontSize="9">{'PR: ' + formatVal(bestValue)}</text>
        <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="2.5" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.value === bestValue ? 7 : 5} fill={p.value === bestValue ? '#00ff88' : '#00d4ff'} />
            <text x={p.x} y={p.y - 12} fill={p.value === bestValue ? '#00ff88' : '#fff'} fontSize="10" fontWeight="700" textAnchor="middle">{formatVal(p.value)}</text>
            <text x={p.x} y={height + 18} fill="#888" fontSize="8" textAnchor="middle">{p.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ===================== DASHBOARD ===================== */
function DashboardPage({ athletes, results, getPR }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedTest, setSelectedTest] = useState('');
  const athlete = athletes.find(a => a.id === selectedAthlete);
  const isAdult = athlete && athlete.type === 'adult';
  const testSet = isAdult ? ADULT_TESTS : TESTS;
  const test = selectedTest ? getTestById(selectedTest) : null;
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === selectedAthlete) : [];
  const testResults = selectedTest && selectedAthlete ? athleteResults.filter(r => r.test_id === selectedTest).sort((a, b) => new Date(a.test_date) - new Date(b.test_date)).map(r => ({ date: new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: parseFloat(r.converted_value), isPR: r.is_pr })) : [];
  const currentPR = selectedAthlete && selectedTest ? getPR(selectedAthlete, selectedTest) : null;
  const iStyle = { width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  const formatPRDisplay = (t, pr) => {
    if (pr === null) return '-';
    if (isFeetInchesTest(t.id)) return formatFeetInches(pr);
    if (t.id === '500m_row') return formatRowTime(pr);
    return pr + ' ' + (t.displayUnit || t.unit);
  };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>View individual performance and progress</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete / Client</label>
          <AthleteSearchPicker athletes={athletes} value={selectedAthlete} onChange={(id) => { setSelectedAthlete(id); setSelectedTest(''); }} placeholder="Search..." />
        </div>
        {selectedAthlete && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Test for Graph</label>
            <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={iStyle}>
              <option value="">Choose a test...</option>
              {Object.entries(testSet).map(([k, c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}
            </select>
          </div>
        )}
      </div>

      {athlete && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: `1px solid ${isAdult ? 'rgba(255,165,0,0.15)' : 'rgba(255,255,255,0.1)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{athlete.first_name} {athlete.last_name}'s Personal Records</h2>
            {isAdult && <span style={{ fontSize: 12, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>ADULT CLIENT</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {Object.entries(testSet).map(([k, c]) => (
              <div key={k}>
                <h4 style={{ color: isAdult ? '#FFA500' : '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{c.label}</h4>
                {c.tests.map(t => {
                  const pr = getPR(athlete.id, t.id);
                  return (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
                      <span style={{ color: '#aaa' }}>{t.name}</span>
                      <span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>{formatPRDisplay(t, pr)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{test ? test.name : ''} Progress</h2>
            {currentPR && <div style={{ padding: '8px 16px', background: 'rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>{'PR: ' + (isFeetInchesTest(selectedTest) ? formatFeetInches(currentPR) : selectedTest === '500m_row' ? formatRowTime(currentPR) : (currentPR + ' ' + (test ? (test.displayUnit || test.unit) : '')))}</div>}
          </div>
          <SimpleChart data={testResults} direction={test ? test.direction : 'higher'} testId={selectedTest} />
        </div>
      )}

      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select an athlete or client above to view their dashboard.</p></div>}
    </div>
  );
}

/* ===================== RECENT PRS PAGE ===================== */
function RecentPRsPage({ athletes, results, getAthleteById }) {
  const [timeFrame, setTimeFrame] = useState('week');
  const [filterTest, setFilterTest] = useState('');
  const [filterAthlete, setFilterAthlete] = useState(null);
  const now = new Date();
  const cutoff = new Date(now);
  if (timeFrame === 'week') cutoff.setDate(cutoff.getDate() - 7);
  else if (timeFrame === 'month') cutoff.setDate(cutoff.getDate() - 30);
  else cutoff.setDate(cutoff.getDate() - 90);

  const recentPRs = results
    .filter(r => r.is_pr && new Date(r.test_date) >= cutoff)
    .filter(r => !filterTest || r.test_id === filterTest)
    .filter(r => !filterAthlete || r.athlete_id === filterAthlete)
    .sort((a, b) => new Date(b.test_date) - new Date(a.test_date));

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  const timeLabels = { week: '1 Week', month: '1 Month', quarter: '3 Months' };
  const allTestsForFilter = [...Object.values(TESTS), ...Object.values(ADULT_TESTS)].flatMap(c => c.tests).filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Recent PRs</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>See who's been setting personal records</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Time Frame</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['week', 'month', 'quarter'].map(tf => (
              <button key={tf} onClick={() => setTimeFrame(tf)} style={{ padding: '12px 24px', background: timeFrame === tf ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: timeFrame === tf ? '#0a1628' : '#aaa', fontWeight: timeFrame === tf ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{timeLabels[tf]}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Person</label>
          <AthleteSearchPicker athletes={athletes} value={filterAthlete} onChange={(id) => setFilterAthlete(id)} placeholder="All people..." />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label>
          <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} style={{ ...iStyle, width: 220 }}>
            <option value="">All Tests</option>
            {allTestsForFilter.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(0,255,136,0.15)', borderRadius: 8, color: '#00ff88', fontWeight: 700, fontSize: 18 }}>
          {recentPRs.length} PR{recentPRs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {recentPRs.length > 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          {recentPRs.map((r, i) => {
            const a = getAthleteById(r.athlete_id);
            const t = getTestById(r.test_id);
            const age = a ? calculateAge(a.birthday) : null;
            const dateStr = new Date(r.test_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const useFtIn = isFeetInchesTest(r.test_id);
            const isRowTest = r.test_id === '500m_row';
            const isAdult = a && a.type === 'adult';
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}>
                <div style={{ fontSize: 24 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a ? `${a.first_name} ${a.last_name}` : 'Unknown'}
                    {isAdult && <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>ADULT</span>}
                  </div>
                  <div style={{ color: '#888', fontSize: 13 }}>{age && `${age} yrs · `}{t?.name} · {dateStr}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#00ff88' }}>
                  {isRowTest ? formatRowTime(parseFloat(r.converted_value)) : useFtIn ? formatFeetInches(parseFloat(r.converted_value)) : Math.round(r.converted_value)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}> {!useFtIn && !isRowTest && (t?.displayUnit || t?.unit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>No PRs in the selected time frame.</p></div>
      )}
    </div>
  );
}

/* ===================== MANAGE ===================== */
function ManagePage({ athletes, results, getAthleteById, deleteResult, updateResult }) {
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editValue, setEditValue] = useState('');

  const selectedAthleteObj = athletes.find(a => a.id === parseInt(selectedAthlete));
  const isAdult = selectedAthleteObj && selectedAthleteObj.type === 'adult';
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === parseInt(selectedAthlete)) : [];
  const filteredResults = selectedTest ? athleteResults.filter(r => r.test_id === selectedTest) : athleteResults;
  const sortedResults = [...filteredResults].sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  const handleEdit = (r) => { setEditingResult(r.id); setEditDate(String(r.test_date).slice(0, 10)); setEditValue(String(r.raw_value)); };
  const handleSaveEdit = (r) => { updateResult(r.id, { testId: r.test_id, testDate: editDate, rawValue: parseFloat(editValue) }); setEditingResult(null); };
  const iStyle = { width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Manage</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Edit or delete test results</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete / Client</label>
          <select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); setSelectedTest(''); }} style={iStyle}>
            <option value="">Choose a person...</option>
            <optgroup label="Youth Athletes">{athletes.filter(a => (a.type || 'athlete') === 'athlete').map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}</optgroup>
            <optgroup label="Adult Clients">{athletes.filter(a => a.type === 'adult').map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}</optgroup>
          </select>
        </div>
        {selectedAthlete && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label>
            <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={iStyle}>
              <option value="">All Tests</option>
              {Object.entries(isAdult ? ADULT_TESTS : TESTS).map(([k, c]) => (
                <optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedAthlete && sortedResults.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          {sortedResults.map(r => {
            const test = getTestById(r.test_id);
            const isEd = editingResult === r.id;
            const useFtIn = isFeetInchesTest(r.test_id);
            const isRowTest = r.test_id === '500m_row';
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, flexWrap: 'wrap' }}>
                {isEd ? (
                  <>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                    <span style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name || r.test_id}</span>
                    <input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} onWheel={preventScrollChange} style={{ width: 100, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                    {useFtIn && editValue && <span style={{ color: '#888', fontSize: 12 }}>= {formatFeetInches(parseFloat(editValue))}</span>}
                    {isRowTest && editValue && <span style={{ color: '#888', fontSize: 12 }}>= {formatRowTime(parseFloat(editValue))}</span>}
                    <button onClick={() => handleSaveEdit(r)} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.3)', border: 'none', borderRadius: 4, color: '#00ff88', cursor: 'pointer', fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditingResult(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 100, fontSize: 13, color: '#888' }}>{new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div style={{ flex: 1, color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name || r.test_id}</div>
                    <div style={{ fontWeight: 700, color: r.is_pr ? '#ffd700' : '#00ff88' }}>
                      {isRowTest ? formatRowTime(parseFloat(r.converted_value)) : useFtIn ? formatFeetInches(parseFloat(r.converted_value)) : r.converted_value}
                      <span style={{ fontSize: 12, color: '#888' }}> {!useFtIn && !isRowTest && (test?.displayUnit || test?.unit)}</span>
                      {r.is_pr && ' 🏆'}
                    </div>
                    <button onClick={() => handleEdit(r)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    <button onClick={() => { if (window.confirm('Delete this result?')) deleteResult(r.id); }} style={{ padding: '6px 12px', background: 'rgba(255,100,100,0.2)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedAthlete && sortedResults.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No results found.</div>}
      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select a person to manage their results.</p></div>}
    </div>
  );
}

/* ===================== JUMP CALCULATOR ===================== */
function JumpCalcPage({ athletes, setAthletes, results, logResults, getPR, showNotification }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const addRow = (athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete || rows.find(r => r.athleteId === athleteId)) return;
    const reach = athlete.standing_reach || null;
    setRows([...rows, { athleteId, reachFeet: reach ? String(Math.floor(reach / 12)) : '', reachInches: reach ? String(parseFloat((reach % 12).toFixed(1))) : '', touchFeet: '', touchInches: '', saved: false }]);
  };

  const updateRow = (index, field, value) => { const nr = [...rows]; nr[index][field] = value; nr[index].saved = false; setRows(nr); };
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));
  const getReachTotal = (row) => (row.reachFeet !== '' && row.reachInches !== '') ? parseInt(row.reachFeet) * 12 + parseFloat(row.reachInches) : null;
  const getTouchTotal = (row) => (row.touchFeet !== '' && row.touchInches !== '') ? parseInt(row.touchFeet) * 12 + parseFloat(row.touchInches) : null;
  const getJumpResult = (row) => { const r = getReachTotal(row); const t = getTouchTotal(row); return (r !== null && t !== null && t > r) ? parseFloat((t - r).toFixed(1)) : null; };
  const usedIds = rows.map(r => r.athleteId);

  const saveAll = async () => {
    setSaving(true);
    const toSave = rows.filter(r => getJumpResult(r) !== null && !r.saved);
    for (const row of toSave) {
      const athlete = athletes.find(a => a.id === row.athleteId);
      const reachTotal = getReachTotal(row);
      if (reachTotal !== null && reachTotal !== athlete?.standing_reach) {
        await supabase.from('athletes').update({ standing_reach: reachTotal }).eq('id', row.athleteId);
        setAthletes(prev => prev.map(a => a.id === row.athleteId ? { ...a, standing_reach: reachTotal } : a));
      }
    }
    const resultsToLog = toSave.map(row => ({ athleteId: row.athleteId, testId: 'approach_jump', testDate, rawValue: getJumpResult(row), convertedValue: getJumpResult(row), unit: 'inches' }));
    if (resultsToLog.length > 0) await logResults(resultsToLog);
    setRows(rows.map(r => ({ ...r, saved: getJumpResult(r) !== null ? true : r.saved })));
    setSaving(false);
  };

  const savedCount = rows.filter(r => r.saved).length;
  const readyCount = rows.filter(r => getJumpResult(r) !== null && !r.saved).length;
  const iStyle = { padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, textAlign: 'center' };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Jump Calculator</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Calculate approach jumps for the whole class</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Add Athletes</label><AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => addRow(id)} excludeIds={usedIds} placeholder="Search & add athlete..." /></div>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', ...iStyle }} /></div>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: '0 12px', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Athlete</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Reach</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Touch Height</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Result</span>
          <span></span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {rows.map((row, index) => {
          const athlete = athletes.find(a => a.id === row.athleteId);
          const jumpResult = getJumpResult(row);
          const currentPR = getPR(row.athleteId, 'approach_jump');
          const isNewPR = jumpResult !== null && currentPR !== null && jumpResult > currentPR;
          const isFirst = jumpResult !== null && currentPR === null;
          return (
            <div key={row.athleteId} style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: 12, borderRadius: 10, alignItems: 'center', background: row.saved ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${row.saved ? 'rgba(0,255,136,0.2)' : (isNewPR || isFirst) && jumpResult ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{athlete?.first_name}</div><div style={{ fontSize: 11, color: '#666' }}>{athlete?.last_name}</div></div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" min="0" max="10" placeholder="ft" value={row.reachFeet} onChange={(e) => updateRow(index, 'reachFeet', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 4px', fontSize: 14 }} />
                <span style={{ color: '#666', fontSize: 14 }}>'</span>
                <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.reachInches} onChange={(e) => updateRow(index, 'reachInches', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 4px', fontSize: 14 }} />
                <span style={{ color: '#666', fontSize: 14 }}>"</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" min="0" max="12" placeholder="ft" value={row.touchFeet} onChange={(e) => updateRow(index, 'touchFeet', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 6px' }} />
                <span style={{ color: '#888', fontSize: 16 }}>'</span>
                <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.touchInches} onChange={(e) => updateRow(index, 'touchInches', e.target.value)} onWheel={preventScrollChange} style={{ width: 48, ...iStyle, padding: '8px 6px' }} />
                <span style={{ color: '#888', fontSize: 16 }}>"</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                {jumpResult !== null ? (
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: row.saved ? '#00ff88' : (isNewPR || isFirst) ? '#ffd700' : '#00d4ff' }}>{jumpResult}"</span>
                    {row.saved && <span style={{ fontSize: 11, color: '#00ff88', display: 'block' }}>✓</span>}
                    {!row.saved && isNewPR && <span style={{ fontSize: 10, color: '#ffd700', display: 'block' }}>PR!</span>}
                    {!row.saved && currentPR !== null && !isNewPR && <span style={{ fontSize: 10, color: '#666', display: 'block' }}>PR: {currentPR}"</span>}
                  </div>
                ) : <span style={{ color: '#444' }}>—</span>}
              </div>
              <button onClick={() => removeRow(index)} style={{ padding: '4px 8px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          );
        })}
      </div>

      {readyCount > 0 && (
        <button onClick={saveAll} disabled={saving} style={{ width: '100%', padding: '20px 32px', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: saving ? 'default' : 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
          {saving ? 'Saving...' : `Save ${readyCount} Result${readyCount !== 1 ? 's' : ''}`}
        </button>
      )}
      {savedCount > 0 && readyCount === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#00ff88', fontWeight: 600 }}>All {savedCount} results saved!</div>}
      {rows.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Add athletes above to start calculating jumps.</p></div>}
    </div>
  );
}

/* ===================== RECORD BOARD ===================== */
function RecordBoardPage({ athletes, results }) {
  const [gender, setGender] = useState('boys');
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const BOARD_SPEED = [
    { id: 'max_velocity', name: 'Max Velocity', unit: 'MPH', direction: 'higher', format: v => v.toFixed(1) },
    { id: '5_10_fly', name: '5-10 Fly', unit: 'sec', direction: 'lower', format: v => v.toFixed(2) },
    { id: '5_0_5', name: '5-0-5', unit: 'sec', direction: 'lower', format: v => v.toFixed(2) },
    { id: 'broad_jump', name: 'Broad Jump', unit: '', direction: 'higher', format: v => formatFeetInches(v) },
    { id: 'vertical_jump', name: 'Vertical', unit: 'in', direction: 'higher', format: v => Math.round(v * 10) / 10 },
    { id: 'approach_jump', name: 'Approach', unit: 'in', direction: 'higher', format: v => Math.round(v * 10) / 10 },
    { id: 'rsi', name: 'RSI', unit: '', direction: 'higher', format: v => v.toFixed(2) },
  ];

  const BOARD_STRENGTH = [
    { id: 'clean', name: 'Clean', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'snatch', name: 'Snatch', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'front_squat', name: 'Front Squat', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'bench_press', name: 'Bench', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'deadlift', name: 'Deadlift', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: '_overhead_rollup', name: 'Overhead', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'chin_up', name: 'Chin-Up', unit: 'reps', direction: 'higher', format: v => Math.round(v) },
  ];

  const EXCLUDED = ['matt secrest'];

  const getAgeAtTest = (birthday, testDate) => {
    if (!birthday || !testDate) return null;
    const b = new Date(String(birthday).slice(0, 10) + 'T00:00:00');
    const t = new Date(testDate);
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age;
  };

  const getOverheadBestForAthlete = (athleteId) => {
    const overheadIds = ['press', 'push_press', 'jerk', 'overhead'];
    const vals = results
      .filter(r => r.athlete_id === athleteId && overheadIds.includes(r.test_id))
      .map(r => parseFloat(r.converted_value || r.raw_value))
      .filter(v => !isNaN(v));
    return vals.length > 0 ? Math.max(...vals) : null;
  };

  const buildRecords = (tests) => {
    const athleteMap = {};
    athletes.forEach(a => { athleteMap[a.id] = a; });
    const records = {};

    tests.forEach(test => {
      records[test.id] = { hs: [], ms: [] };

      if (test.id === '_overhead_rollup') {
        athletes.forEach(a => {
          if (a.type === 'adult') return;
          const fullName = `${(a.first_name || '').trim()} ${(a.last_name || '').trim()}`.toLowerCase();
          if (EXCLUDED.includes(fullName)) return;
          const g = (a.gender || '').toLowerCase();
          const isMatch = gender === 'boys' ? g !== 'female' : g === 'female';
          if (!isMatch) return;
          const best = getOverheadBestForAthlete(a.id);
          if (best === null) return;
          const overheadIds = ['press', 'push_press', 'jerk', 'overhead'];
          const overheadResults = results.filter(r => r.athlete_id === a.id && overheadIds.includes(r.test_id));
          const firstDate = overheadResults.length > 0 ? overheadResults.sort((x, y) => new Date(x.test_date) - new Date(y.test_date))[0].test_date : null;
          const age = firstDate ? getAgeAtTest(a.birthday, firstDate) : null;
          const entry = { name: `${a.first_name} ${(a.last_name || '').charAt(0)}`, value: best };
          records[test.id]['hs'].push(entry);
          if (age !== null && age < 15) records[test.id]['ms'].push(entry);
        });
      } else {
        results.forEach(r => {
          if (r.test_id !== test.id) return;
          const a = athleteMap[r.athlete_id];
          if (!a) return;
          if (a.type === 'adult') return;
          const fullName = `${(a.first_name || '').trim()} ${(a.last_name || '').trim()}`.toLowerCase();
          if (EXCLUDED.includes(fullName)) return;
          const g = (a.gender || '').toLowerCase();
          const isMatch = gender === 'boys' ? g !== 'female' : g === 'female';
          if (!isMatch) return;
          const val = parseFloat(r.converted_value || r.raw_value);
          if (isNaN(val)) return;
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
        records[test.id][cat] = records[test.id][cat].filter(r => {
          if (seen.has(r.name)) return false;
          seen.add(r.name);
          return true;
        }).slice(0, 5);
      });
    });
    return records;
  };

  const speedRecords = buildRecords(BOARD_SPEED);
  const strengthRecords = buildRecords(BOARD_STRENGTH);

  useEffect(() => {
    if (!autoSwitch) return;
    const interval = setInterval(() => setGender(g => g === 'boys' ? 'girls' : 'boys'), 60000);
    return () => clearInterval(interval);
  }, [autoSwitch]);

  const renderTestCard = (test, records, isTv) => {
    const hs = records[test.id]?.hs || [];
    const ms = records[test.id]?.ms || [];

    const renderRows = (list) => list.length > 0 ? list.map((r, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', margin: '2px 0', borderRadius: 4, ...(i === 0 ? { background: 'linear-gradient(90deg, rgba(200,150,62,0.3) 0%, rgba(200,150,62,0.05) 100%)', borderLeft: '3px solid #C8963E' } : {}) }}>
        <span style={{ fontWeight: 600, fontSize: isTv ? 13 : 14, color: i === 0 ? '#C8963E' : '#e8e8e8' }}>{test.format(r.value)}</span>
        <span style={{ color: '#888', fontSize: isTv ? 12 : 13, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
      </div>
    )) : <div style={{ color: '#444', textAlign: 'center', fontSize: 13, padding: 4 }}>—</div>;

    return (
      <div key={test.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: isTv ? 10 : 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', fontSize: isTv ? 15 : 16, fontWeight: 700, paddingBottom: 8, marginBottom: 8, borderBottom: '2px solid #C8963E', letterSpacing: 1 }}>{test.name}</div>
        <div style={{ fontSize: 11, color: '#00d4ff', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>15+</div>
        {renderRows(hs)}
        <div style={{ fontSize: 11, color: '#00d4ff', textAlign: 'center', fontWeight: 700, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>14 & UNDER</div>
        {renderRows(ms)}
      </div>
    );
  };

  if (tvMode) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a1628', zIndex: 9999, padding: 20, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '4px solid #C8963E' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#00d4ff', letterSpacing: 3, fontFamily: "'Archivo Black', sans-serif" }}>WILMINGTON STRENGTH</div>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: 4 }}>{gender === 'boys' ? 'BOYS' : 'GIRLS'} RECORDS</div>
          <button onClick={() => setTvMode(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', borderRadius: 6, color: '#888', cursor: 'pointer', fontSize: 12 }}>EXIT TV</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 22, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12 }}>SPEED & POWER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {BOARD_SPEED.map(t => renderTestCard(t, speedRecords, true))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 22, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12 }}>STRENGTH</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {BOARD_STRENGTH.map(t => renderTestCard(t, strengthRecords, true))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Record Board</h1>
          <p style={{ color: '#888' }}>Top 5 records — youth athletes only</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setGender(g => g === 'boys' ? 'girls' : 'boys')} style={{ padding: '10px 20px', background: 'rgba(0,212,255,0.15)', border: '2px solid #00d4ff', borderRadius: 6, color: '#00d4ff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {gender === 'boys' ? 'Switch to Girls' : 'Switch to Boys'}
          </button>
          <button onClick={() => setAutoSwitch(a => !a)} style={{ padding: '10px 20px', background: autoSwitch ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', border: `2px solid ${autoSwitch ? '#00ff88' : '#666'}`, borderRadius: 6, color: autoSwitch ? '#00ff88' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {autoSwitch ? 'Pause' : 'Auto (60s)'}
          </button>
          <button onClick={() => { setAutoSwitch(true); setTvMode(true); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #C8963E 0%, #A87A2E 100%)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
            TV Mode
          </button>
        </div>
      </div>

      <div style={{ fontSize: 36, fontWeight: 700, textAlign: 'center', marginBottom: 24, letterSpacing: 4 }}>
        {gender === 'boys' ? 'BOYS' : 'GIRLS'} RECORDS
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12, textTransform: 'uppercase' }}>Speed & Power</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {BOARD_SPEED.map(t => renderTestCard(t, speedRecords, false))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 20, color: '#00d4ff', letterSpacing: 3, borderLeft: '4px solid #00d4ff', paddingLeft: 12, marginBottom: 12, textTransform: 'uppercase' }}>Strength</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {BOARD_STRENGTH.map(t => renderTestCard(t, strengthRecords, false))}
        </div>
      </div>
    </div>
  );
}

/* ===================== ADULT CLIENTS PAGE ===================== */
function AdultClientsPage({ athletes, results, getPR, logResults, getAthleteById }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTest, setSelectedTest] = useState('');
  const [view, setView] = useState('overview');

  const adultClients = athletes.filter(a => (a.type === 'adult') && (a.status === 'Active' || a.status === 'active'));
  const client = adultClients.find(a => a.id === selectedClient);
  const clientResults = selectedClient ? results.filter(r => r.athlete_id === selectedClient) : [];
  const testResults = selectedTest && selectedClient
    ? clientResults.filter(r => r.test_id === selectedTest)
      .sort((a, b) => new Date(a.test_date) - new Date(b.test_date))
      .map(r => ({ date: new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: parseFloat(r.converted_value) }))
    : [];

  const test = selectedTest ? getTestById(selectedTest) : null;
  const currentPR = selectedClient && selectedTest ? getPR(selectedClient, selectedTest) : null;

  const formatVal = (t, v) => {
    if (v === null || v === undefined) return '-';
    if (isFeetInchesTest(t.id)) return formatFeetInches(v);
    if (t.id === '500m_row') return formatRowTime(v);
    if (t.id === 'body_fat_pct') return v + '%';
    return v + ' ' + (t.displayUnit || t.unit);
  };

  const getMostRecent = (clientId, testId) => {
    const ar = results.filter(r => r.athlete_id === clientId && r.test_id === testId).sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
    return ar.length > 0 ? parseFloat(ar[0].converted_value) : null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Adult Clients</h1>
          <p style={{ color: '#888' }}>{adultClients.length} active clients</p>
        </div>
      </div>

      {adultClients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,165,0,0.15)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <p style={{ fontSize: 18, color: '#aaa', marginBottom: 8 }}>No adult clients yet</p>
          <p style={{ color: '#666', fontSize: 14 }}>Add adult clients from the Athletes page by setting their type to "Adult Client"</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
            {adultClients.map(c => {
              const cr = results.filter(r => r.athlete_id === c.id);
              const recentWeight = getMostRecent(c.id, 'body_weight');
              const recentBF = getMostRecent(c.id, 'body_fat_pct');
              const recentSMM = getMostRecent(c.id, 'lean_muscle_mass');
              const prRow = getPR(c.id, '500m_row');
              const age = calculateAge(c.birthday);
              const isSelected = selectedClient === c.id;

              return (
                <div key={c.id} onClick={() => setSelectedClient(isSelected ? null : c.id)}
                  style={{ background: isSelected ? 'rgba(255,165,0,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `2px solid ${isSelected ? '#FFA500' : 'rgba(255,165,0,0.15)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{c.first_name} {c.last_name}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 13 }}>{age && `${age} yrs`}{c.gender && ` · ${c.gender}`}</p>
                    </div>
                    <span style={{ fontSize: 11, background: 'rgba(255,165,0,0.2)', color: '#FFA500', padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>ADULT</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: recentWeight ? '#e8e8e8' : '#555' }}>{recentWeight ? Math.round(recentWeight) : '—'}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>lbs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: recentBF ? '#e8e8e8' : '#555' }}>{recentBF ? recentBF + '%' : '—'}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>BF%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: recentSMM ? '#e8e8e8' : '#555' }}>{recentSMM ? Math.round(recentSMM) : '—'}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>SMM lbs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: prRow ? '#00ff88' : '#555' }}>{prRow ? formatRowTime(prRow) : '—'}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>500m Row</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {client && (
            <div style={{ background: 'rgba(255,165,0,0.05)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,165,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 24, color: '#FFA500' }}>{client.first_name} {client.last_name}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['overview', 'progress'].map(v => (
                    <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', background: view === v ? 'rgba(255,165,0,0.3)' : 'rgba(255,255,255,0.05)', border: view === v ? '1px solid #FFA500' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: view === v ? '#FFA500' : '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: view === v ? 600 : 400, textTransform: 'capitalize' }}>{v}</button>
                  ))}
                </div>
              </div>

              {view === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                  {Object.entries(ADULT_TESTS).map(([k, cat]) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16 }}>
                      <h4 style={{ color: '#FFA500', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, margin: '0 0 12px 0' }}>{cat.label}</h4>
                      {cat.tests.map(t => {
                        const pr = getPR(client.id, t.id);
                        const recent = getMostRecent(client.id, t.id);
                        const allForTest = results.filter(r => r.athlete_id === client.id && r.test_id === t.id).sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
                        const lastDate = allForTest.length > 0 ? new Date(allForTest[0].test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
                        return (
                          <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ color: '#aaa', fontSize: 14 }}>{t.name}</span>
                              <span style={{ fontWeight: 700, fontSize: 16, color: recent !== null ? '#00ff88' : '#555' }}>{formatVal(t, recent)}</span>
                            </div>
                            {pr !== null && recent !== null && pr !== recent && (
                              <div style={{ fontSize: 11, color: '#888', textAlign: 'right' }}>PR: {formatVal(t, pr)}</div>
                            )}
                            {lastDate && <div style={{ fontSize: 11, color: '#555', textAlign: 'right' }}>{lastDate}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {view === 'progress' && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Metric</label>
                    <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, width: 280 }}>
                      <option value="">Choose a test...</option>
                      {Object.entries(ADULT_TESTS).map(([k, c]) => (
                        <optgroup key={k} label={c.label}>
                          {c.tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {testResults.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0 }}>{test?.name} Progress</h3>
                        {currentPR && <div style={{ padding: '8px 16px', background: 'rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>Best: {formatVal(test, currentPR)}</div>}
                      </div>
                      <SimpleChart data={testResults} direction={test?.direction || 'lower'} testId={selectedTest} />
                      <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>{testResults.length} test{testResults.length !== 1 ? 's' : ''} recorded · {test?.direction === 'lower' ? 'Lower is better' : 'Higher is better'}</div>
                    </div>
                  ) : selectedTest ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>No data yet for {test?.name}</div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>Select a metric above to view progress</div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===================== ADULT RECORD BOARD ===================== */
function AdultRecordBoardPage({ athletes, results }) {
  const [gender, setGender] = useState('men');

  const gold   = '#C8963E';
  const silver = '#A0A0B0';
  const bronze = '#A0622A';
  const rankColors = [gold, silver, bronze, '#888', '#666'];
  const rankLabels = ['1st', '2nd', '3rd', '4th', '5th'];

  const ADULT_BOARD_TESTS = [
    { id: 'clean',         name: 'Clean',       direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: 'snatch',        name: 'Snatch',       direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: 'front_squat',   name: 'Front Squat',  direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: 'back_squat',    name: 'Back Squat',   direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: 'bench_press',   name: 'Bench Press',  direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: 'deadlift',      name: 'Deadlift',     direction: 'higher', format: v => Math.round(v) + ' lbs' },
    { id: '_overhead',     name: 'Overhead',     direction: 'higher', format: v => Math.round(v) + ' lbs', rollupIds: ['press','push_press','jerk','overhead'] },
    { id: 'chin_up',       name: 'Chin-Up',      direction: 'higher', format: v => Math.round(v) + ' reps' },
    { id: '500m_row',      name: '500m Row',     direction: 'lower',  format: v => formatRowTime(v) },
  ];

  const buildRecords = (test) => {
    const adultAthletes = athletes.filter(a => a.type === 'adult');
    const entries = [];

    adultAthletes.forEach(a => {
      const g = (a.gender || '').toLowerCase();
      const matches = gender === 'men' ? g !== 'female' : g === 'female';
      if (!matches) return;

      let best = null;
      if (test.rollupIds) {
        const vals = results
          .filter(r => r.athlete_id === a.id && test.rollupIds.includes(r.test_id))
          .map(r => parseFloat(r.converted_value))
          .filter(v => !isNaN(v));
        if (vals.length > 0) best = Math.max(...vals);
      } else {
        const vals = results
          .filter(r => r.athlete_id === a.id && r.test_id === test.id)
          .map(r => parseFloat(r.converted_value))
          .filter(v => !isNaN(v));
        if (vals.length > 0) best = test.direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
      }

      if (best !== null) {
        entries.push({ name: `${a.first_name} ${(a.last_name || '').charAt(0)}.`, value: best });
      }
    });

    entries.sort((a, b) => test.direction === 'higher' ? b.value - a.value : a.value - b.value);
    const seen = new Set();
    return entries.filter(e => {
      if (seen.has(e.name)) return false;
      seen.add(e.name);
      return true;
    }).slice(0, 5);
  };

  const renderCard = (test) => {
    const records = buildRecords(test);
    return (
      <div key={test.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(200,150,62,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: '#e8e8e8', paddingBottom: 12, marginBottom: 12, borderBottom: `2px solid ${gold}` }}>
          {test.name}
        </div>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', fontSize: 13, padding: '12px 0' }}>No data yet</div>
        ) : (
          records.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 6, marginBottom: 2, background: i === 0 ? 'rgba(200,150,62,0.12)' : 'transparent' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: rankColors[i], width: 28, textAlign: 'center', letterSpacing: 0.5 }}>
                {rankLabels[i]}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: i === 0 ? '#e8e8e8' : '#aaa', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ fontSize: i === 0 ? 16 : 14, fontWeight: 800, color: rankColors[i], whiteSpace: 'nowrap' }}>
                {test.format(r.value)}
              </span>
            </div>
          ))
        )}
        {records.length > 0 && records.length < 5 && Array.from({ length: 5 - records.length }).map((_, i) => (
          <div key={'empty-' + i} style={{ padding: '8px 6px', marginBottom: 2 }}>
            <span style={{ fontSize: 11, color: '#2a2a2a' }}>{rankLabels[records.length + i]}</span>
          </div>
        ))}
      </div>
    );
  };

  const menCount   = athletes.filter(a => a.type === 'adult' && (a.gender || '').toLowerCase() !== 'female').length;
  const womenCount = athletes.filter(a => a.type === 'adult' && (a.gender || '').toLowerCase() === 'female').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Adult Record Board</h1>
          <p style={{ color: '#888' }}>{menCount} men · {womenCount} women</p>
        </div>
        <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(200,150,62,0.3)' }}>
          {['men', 'women'].map(g => (
            <button key={g} onClick={() => setGender(g)} style={{ padding: '12px 32px', background: gender === g ? 'linear-gradient(135deg, #C8963E 0%, #A87A2E 100%)' : 'rgba(255,255,255,0.03)', border: 'none', color: gender === g ? '#fff' : '#888', fontWeight: gender === g ? 700 : 400, fontSize: 15, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'Archivo Black', sans-serif" }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, color: gold, textTransform: 'uppercase', letterSpacing: 3, borderLeft: `4px solid ${gold}`, paddingLeft: 12, marginBottom: 20 }}>
        {gender === 'men' ? 'Men' : 'Women'} · Top 5 All-Time
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {ADULT_BOARD_TESTS.map(test => renderCard(test))}
      </div>
    </div>
  );
}
