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
    { id: 'overhead', name: 'Overhead', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'deadlift', name: 'Deadlift', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'clean', name: 'Clean', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'snatch', name: 'Snatch', unit: 'lbs', direction: 'higher', allowKg: true },
    { id: 'chin_up', name: 'Chin-Up', unit: 'reps', direction: 'higher' },
  ]}
};

const getAllTests = () => { const all = []; Object.values(TESTS).forEach(c => c.tests.forEach(t => all.push(t))); return all; };
const getTestById = (id) => getAllTests().find(t => t.id === id);
const calculateAge = (birthday) => { if (!birthday) return null; const today = new Date(); const birth = new Date(String(birthday).slice(0,10)+'T00:00:00'); let age = today.getFullYear() - birth.getFullYear(); const m = today.getMonth() - birth.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--; return age; };

function AthleteSearchPicker({ athletes, value, onChange, excludeIds = [], placeholder = 'Search athlete...' }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = React.useRef(null);
  const selectedAthlete = athletes.find(a => a.id === value);
  const filtered = athletes.filter(a => a.status === 'Active' && !excludeIds.includes(a.id)).filter(a => !search || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (athlete) => { onChange(athlete.id); setSearch(''); setIsOpen(false); };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i+1, filtered.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i-1, 0)); }
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
      {isOpen && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 250, overflowY: 'auto', background: '#1a2744', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, marginTop: 4, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        {filtered.slice(0, 30).map((a, i) => (<div key={a.id} onClick={() => handleSelect(a)} onMouseEnter={() => setHighlightIndex(i)} style={{ padding: '10px 16px', cursor: 'pointer', background: i === highlightIndex ? 'rgba(0,212,255,0.2)' : 'transparent', color: '#fff', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{a.first_name} {a.last_name} {a.birthday && <span style={{ color: '#888', fontSize: 12 }}>• {calculateAge(a.birthday)} yrs</span>}</div>))}
        {filtered.length === 0 && <div style={{ padding: '10px 16px', color: '#666', fontSize: 14 }}>No athletes found</div>}
      </div>)}
    </div>
  );
}

/* ===================== FEET+INCHES INPUT COMPONENT ===================== */
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
      if (initialized) {
        setFeet('');
        setInches('');
      }
    }
  }, [value, initialized]);

  const handleChange = (newFeet, newInches) => {
    setFeet(newFeet);
    setInches(newInches);
    const f = newFeet !== '' ? parseInt(newFeet) : 0;
    const i = newInches !== '' ? parseFloat(newInches) : 0;
    if (newFeet === '' && newInches === '') {
      onChange('');
    } else {
      onChange(String(f * 12 + i));
    }
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

  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 4000); };

  const addAthlete = async (athlete) => {
    const age = athlete.birthday ? calculateAge(athlete.birthday) : null;
    const { data, error } = await supabase.from('athletes').insert([{ first_name: athlete.firstName, last_name: athlete.lastName, email: athlete.email||'', phone: athlete.phone||'', birthday: athlete.birthday||null, age, gender: athlete.gender, status: 'Active' }]).select();
    if (data) { setAthletes([...athletes, data[0]].sort((a,b) => a.first_name.localeCompare(b.first_name))); showNotification(athlete.firstName + ' ' + athlete.lastName + ' added!'); }
    if (error) showNotification('Error adding athlete','error');
  };

  const updateAthlete = async (id, updates) => {
    const age = updates.birthday ? calculateAge(updates.birthday) : null;
    const { error } = await supabase.from('athletes').update({ first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday||null, age, gender: updates.gender, status: updates.status }).eq('id', id);
    if (!error) { setAthletes(athletes.map(a => a.id === id ? { ...a, first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday, age, gender: updates.gender, status: updates.status } : a)); showNotification('Athlete updated!'); }
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
    if (!error) { setResults(results.map(r => r.id === resultId ? { ...r, test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv } : r)); showNotification('Result updated!'); }
  };

  const logResults = async (resultsToLog) => {
    let prCount = 0; const newResults = [];
    for (const result of resultsToLog) {
      const test = getTestById(result.testId);
      const prev = results.filter(r => r.athlete_id === result.athleteId && r.test_id === result.testId);
      let isPR = prev.length === 0;
      if (!isPR) { const best = test.direction === 'higher' ? Math.max(...prev.map(r => parseFloat(r.converted_value))) : Math.min(...prev.map(r => parseFloat(r.converted_value))); isPR = test.direction === 'higher' ? result.convertedValue > best : result.convertedValue < best; }
      const { data } = await supabase.from('results').insert([{ athlete_id: result.athleteId, test_id: result.testId, test_date: result.testDate, raw_value: result.rawValue, converted_value: result.convertedValue, unit: result.unit, is_pr: isPR }]).select();
      if (data) { newResults.push(data[0]); if (isPR) prCount++; }
    }
    setResults([...results, ...newResults]);
    if (prCount > 0) showNotification('🏆 ' + prCount + ' NEW PR' + (prCount>1?'s':'') + '! Results logged!', 'pr');
    else showNotification(resultsToLog.length + ' result' + (resultsToLog.length>1?'s':'') + ' logged!');
    return newResults;
  };

  const getAthleteById = (id) => athletes.find(a => a.id === id);
  const getPR = (athleteId, testId) => {
    const test = getTestById(testId);
    const ar = results.filter(r => r.athlete_id === athleteId && r.test_id === testId);
    if (ar.length === 0) return null;
    return test.direction === 'higher' ? Math.max(...ar.map(r => parseFloat(r.converted_value))) : Math.min(...ar.map(r => parseFloat(r.converted_value)));
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20 }}>Loading...</div>;

  const navItems = [
    { id: 'entry', label: 'Test Entry' },
    { id: 'athletes', label: 'Athletes' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'recentprs', label: '🔥 Recent PRs' },
    { id: 'manage', label: '⚙️ Manage' },
    { id: 'jumpcalc', label: '📏 Jump Calc' },
    { id: 'recordboard', label: '🏆 Record Board' }
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
      {notification && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', background: notification.type === 'pr' ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, color: '#0a1628', fontWeight: 700, fontSize: 16, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,212,255,0.3)' }}>{notification.message}</div>}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && <TestEntryPage athletes={athletes} logResults={logResults} getPR={getPR} getAthleteById={getAthleteById} />}
        {page === 'athletes' && <AthletesPage athletes={athletes} addAthlete={addAthlete} updateAthlete={updateAthlete} deleteAthlete={deleteAthlete} results={results} />}
        {page === 'dashboard' && <DashboardPage athletes={athletes} results={results} getPR={getPR} />}
        {page === 'recentprs' && <RecentPRsPage athletes={athletes} results={results} getAthleteById={getAthleteById} />}
        {page === 'manage' && <ManagePage athletes={athletes} results={results} getAthleteById={getAthleteById} deleteResult={deleteResult} updateResult={updateResult} />}
        {page === 'jumpcalc' && <JumpCalcPage athletes={athletes} setAthletes={setAthletes} results={results} logResults={logResults} getPR={getPR} showNotification={showNotification} />}
        {page === 'recordboard' && <RecordBoardPage athletes={athletes} results={results} />}
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
        if (test.allowKg && useKg) cv = Math.round(raw * 2.205 * 10) / 10;
        if (test.convert) cv = parseFloat(test.convert(raw));
        toLog.push({ athleteId: row.athleteId, testId, testDate, rawValue: raw, convertedValue: cv, unit: test.allowKg && useKg ? 'kg' : test.unit });
      });
    });
    if (toLog.length === 0) { alert('Please enter at least one value'); return; }
    setSubmitting(true);
    const logged = await logResults(toLog);
    setSubmittedResults(logged.map(r => {
      const a = getAthleteById(r.athlete_id);
      const t = getTestById(r.test_id);
      return { athlete: (a ? a.first_name + ' ' + a.last_name : 'Unknown'), test: t ? t.name : r.test_id, value: r.converted_value, testId: r.test_id, unit: t ? (t.displayUnit || t.unit) : '', isPR: r.is_pr };
    }));
    setAthleteRows(athleteRows.map(row => {
      const values = {};
      selectedTests.forEach(tid => { values[tid] = ''; });
      return { ...row, values };
    }));
    setSubmitting(false);
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Test Entry</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Select your tests, add athletes, enter results</p>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Session Setup</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label>
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ ...iStyle, width: 220 }} />
        </div>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 14, color: '#aaa' }}>Select Tests for This Session</label>
        {Object.entries(TESTS).map(([key, category]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{category.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {category.tests.map(t => {
                const active = selectedTests.includes(t.id);
                return <button key={t.id} onClick={() => toggleTest(t.id)} style={{ padding: '8px 16px', background: active ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: active ? 'none' : '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: active ? '#0a1628' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{t.name}</button>;
              })}
            </div>
          </div>
        ))}
        {anyStrength && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Strength Unit</label>
            <div style={{ display: 'flex', gap: 8, width: 200 }}>
              <button onClick={() => setUseKg(false)} style={{ flex: 1, padding: '10px', background: !useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: !useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>LBS</button>
              <button onClick={() => setUseKg(true)} style={{ flex: 1, padding: '10px', background: useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>KG</button>
            </div>
          </div>
        )}
      </div>

      {selectedTests.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Add Athletes & Enter Results</h3>
          <div style={{ marginBottom: 16 }}>
            <AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => { if (id) addAthleteRow(id); }} excludeIds={usedAthleteIds} placeholder="Search & add athlete..." />
          </div>

          {athleteRows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8, minWidth: 'fit-content' }}>
                <div style={{ minWidth: 140, fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Athlete</div>
                {selectedTests.map(tid => {
                  const t = getTestById(tid);
                  return <div key={tid} style={{ minWidth: isFeetInchesTest(tid) ? 130 : 100, flex: 1, fontSize: 11, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{t ? t.name : tid}</div>;
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
                      const useFeetInches = isFeetInchesTest(tid);
                      return (
                        <div key={tid} style={{ minWidth: useFeetInches ? 130 : 100, flex: 1 }}>
                          {useFeetInches ? (
                            <FeetInchesInput value={row.values[tid]} onChange={(val) => updateValue(rowIndex, tid, val)} />
                          ) : (
                            <input type="number" step="0.01" placeholder={t ? t.unit : 'val'} value={row.values[tid] || ''} onChange={(e) => updateValue(rowIndex, tid, e.target.value)} onWheel={preventScrollChange} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 14, textAlign: 'center' }} />
                          )}
                          {pr !== null && <div style={{ fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 }}>PR: {useFeetInches ? formatFeetInches(pr) : pr}</div>}
                        </div>
                      );
                    })}
                    <button onClick={() => removeAthleteRow(rowIndex)} style={{ width: 32, padding: '4px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          {athleteRows.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>Search and add athletes above</div>}
        </div>
      )}

      {selectedTests.length > 0 && athleteRows.length > 0 && (
        <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: '20px 32px', background: submitting ? '#555' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: '0 4px 20px rgba(0,255,136,0.3)' }}>{submitting ? 'Saving...' : '✓ Submit All Results'}</button>
      )}

      {submittedResults.length > 0 && (
        <div style={{ marginTop: 24, background: 'rgba(0,255,136,0.1)', borderRadius: 12, padding: 24, border: '1px solid rgba(0,255,136,0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00ff88' }}>✓ Just Logged</h3>
          {submittedResults.map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
              <span><span style={{ fontWeight: 600 }}>{r.athlete}</span> — {r.test}</span>
              <span>{isFeetInchesTest(r.testId) ? formatFeetInches(r.value) : r.value} {!isFeetInchesTest(r.testId) && r.unit} {r.isPR && <span style={{ color: '#00ff88', fontWeight: 700 }}>🏆 NEW PR!</span>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ATHLETES PAGE ===================== */
function AthletesPage({ athletes, addAthlete, updateAthlete, deleteAthlete, results }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Active');

  const resetForm = () => { setFirstName(''); setLastName(''); setBirthday(''); setGender('Male'); setEmail(''); setPhone(''); setStatus('Active'); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    if (editingId) {
      updateAthlete(editingId, { firstName, lastName, birthday, gender, email, phone, status });
      setEditingId(null);
    } else {
      addAthlete({ firstName, lastName, birthday, gender, email, phone });
    }
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (a) => {
    setEditingId(a.id);
    setFirstName(a.first_name);
    setLastName(a.last_name);
    setBirthday(a.birthday ? String(a.birthday).slice(0,10) : '');
    setGender(a.gender || 'Male');
    setEmail(a.email || '');
    setPhone(a.phone || '');
    setStatus(a.status || 'Active');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  const filteredAthletes = athletes.filter(a => {
    if (!searchTerm) return true;
    return (a.first_name + ' ' + a.last_name).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athletes</h1>
          <p style={{ color: '#888' }}>{athletes.length} athletes registered</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Athlete</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input type="text" placeholder="Search athletes by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', maxWidth: 400, ...iStyle }} />
        {searchTerm && <span style={{ marginLeft: 12, color: '#888', fontSize: 14 }}>{filteredAthletes.length} result{filteredAthletes.length !== 1 ? 's' : ''}</span>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>{editingId ? 'Edit Athlete' : 'New Athlete'}</h3>
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
            <button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Save Changes' : 'Add Athlete'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filteredAthletes.map(athlete => {
          const ar = results.filter(r => r.athlete_id === athlete.id);
          const prs = ar.filter(r => r.is_pr).length;
          const age = calculateAge(athlete.birthday);
          return (
            <div key={athlete.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{athlete.first_name} {athlete.last_name}</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>
                    {age && (age + ' yrs')}
                    {athlete.gender && (' • ' + athlete.gender)}
                    {athlete.birthday && <span style={{ color: '#666' }}> • {new Date(String(athlete.birthday).slice(0,10)+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => handleEdit(athlete)} style={{ padding: '4px 10px', background: 'rgba(0,212,255,0.2)', border: 'none', borderRadius: 4, color: '#00d4ff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteAthlete(athlete.id, `${athlete.first_name} ${athlete.last_name}`)} style={{ padding: '4px 10px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
                  <span style={{ padding: '4px 10px', background: athlete.status === 'Active' ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)', color: athlete.status === 'Active' ? '#00ff88' : '#888', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{athlete.status}</span>
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

/* ===================== IMPROVED CHART ===================== */
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
  for (let v = chartMin; v <= chartMax + step * 0.01; v += step) {
    yLabels.push(Math.round(v * 100) / 100);
  }
  const width = 100;
  const height = 200;
  const pointSpacing = data.length > 1 ? width / (data.length - 1) : width / 2;
  const getY = (val) => height - ((val - chartMin) / chartRange) * height;
  const points = data.map((d, i) => ({ x: data.length === 1 ? width/2 : i * pointSpacing, y: getY(d.value), ...d }));
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
  const bestValue = direction === 'lower' ? minVal : maxVal;
  const useFtIn = isFeetInchesTest(testId);
  const formatVal = (v) => useFtIn ? formatFeetInches(v) : v;

  return (
    <div style={{ padding: '20px 0' }}>
      <svg viewBox={'-40 -15 ' + (width + 70) + ' ' + (height + 45)} style={{ width: '100%', height: 280 }}>
        {yLabels.map((val, i) => {
          const y = getY(val);
          if (y < -5 || y > height + 5) return null;
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={-8} y={y + 4} fill="#888" fontSize="9" textAnchor="end">{useFtIn ? formatFeetInches(val) : (Number.isInteger(val) ? val : val.toFixed(1))}</text>
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
  const test = selectedTest ? getTestById(selectedTest) : null;
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === selectedAthlete) : [];
  const testResults = selectedTest && selectedAthlete ? athleteResults.filter(r => r.test_id === selectedTest).sort((a,b) => new Date(a.test_date) - new Date(b.test_date)).map(r => ({ date: new Date(r.test_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}), value: parseFloat(r.converted_value), isPR: r.is_pr })) : [];
  const currentPR = selectedAthlete && selectedTest ? getPR(selectedAthlete, selectedTest) : null;
  const iStyle = { width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>View individual athlete performance and progress</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete</label>
          <AthleteSearchPicker athletes={athletes} value={selectedAthlete} onChange={(id) => { setSelectedAthlete(id); setSelectedTest(''); }} placeholder="Search athlete..." />
        </div>
        {selectedAthlete && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Test for Graph</label>
            <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={iStyle}>
              <option value="">Choose a test...</option>
              {Object.entries(TESTS).map(([k,c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}
            </select>
          </div>
        )}
      </div>
      {athlete && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>{athlete.first_name} {athlete.last_name}'s Personal Records</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {Object.entries(TESTS).map(([k,c]) => (
              <div key={k}>
                <h4 style={{ color: '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{c.label}</h4>
                {c.tests.map(t => {
                  const pr = getPR(athlete.id, t.id);
                  const useFtIn = isFeetInchesTest(t.id);
                  return (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}>
                      <span style={{ color: '#aaa' }}>{t.name}</span>
                      <span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>{pr !== null ? (useFtIn ? formatFeetInches(pr) : (pr + ' ' + (t.displayUnit||t.unit))) : '-'}</span>
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
            {currentPR && <div style={{ padding: '8px 16px', background: 'rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>{'🏆 PR: ' + (isFeetInchesTest(selectedTest) ? formatFeetInches(currentPR) : (currentPR + ' ' + (test ? (test.displayUnit||test.unit) : '')))}</div>}
          </div>
          <SimpleChart data={testResults} direction={test ? test.direction : 'higher'} testId={selectedTest} />
          <div style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
            {testResults.length + ' test' + (testResults.length!==1?'s':'') + ' recorded'}
            {test && test.direction === 'lower' && ' • Lower is better'}
            {test && test.direction === 'higher' && ' • Higher is better'}
          </div>
        </div>
      )}
      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select an athlete above to view their dashboard.</p></div>}
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
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>🔥 Recent PRs</h1>
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
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Athlete</label>
          <AthleteSearchPicker athletes={athletes} value={filterAthlete} onChange={(id) => setFilterAthlete(id)} placeholder="All athletes..." />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label>
          <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} style={{ ...iStyle, width: 220 }}>
            <option value="">All Tests</option>
            {Object.entries(TESTS).map(([k, c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}
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
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}>
                <div style={{ fontSize: 24 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{a ? `${a.first_name} ${a.last_name}` : 'Unknown'}</div>
                  <div style={{ color: '#888', fontSize: 13 }}>{age && `${age} yrs • `}{t?.name} • {dateStr}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#00ff88' }}>{useFtIn ? formatFeetInches(parseFloat(r.converted_value)) : r.converted_value} <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>{!useFtIn && (t?.displayUnit || t?.unit)}</span></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
          <p style={{ fontSize: 18 }}>No PRs in the {timeFrame === 'week' ? 'last 7 days' : timeFrame === 'month' ? 'last 30 days' : 'last 3 months'}{filterTest ? ` for ${getTestById(filterTest)?.name}` : ''}{filterAthlete ? ` for ${(() => { const a = getAthleteById(filterAthlete); return a ? `${a.first_name} ${a.last_name}` : ''; })()}` : ''}.</p>
        </div>
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
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === parseInt(selectedAthlete)) : [];
  const filteredResults = selectedTest ? athleteResults.filter(r => r.test_id === selectedTest) : athleteResults;
  const sortedResults = [...filteredResults].sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  const handleEdit = (r) => { setEditingResult(r.id); setEditDate(String(r.test_date).slice(0, 10)); setEditValue(String(r.raw_value)); };
  const handleSaveEdit = (r) => { updateResult(r.id, { testId: r.test_id, testDate: editDate, rawValue: parseFloat(editValue) }); setEditingResult(null); };
  const iStyle = { width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>⚙️ Manage</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Edit or delete test results</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete</label><select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); setSelectedTest(''); }} style={iStyle}><option value="">Choose an athlete...</option>{athletes.map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}</select></div>
        {selectedAthlete && (<div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={iStyle}><option value="">All Tests</option>{Object.entries(TESTS).map(([k, c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}</select></div>)}
      </div>
      {selectedAthlete && sortedResults.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          {sortedResults.map(r => {
            const test = getTestById(r.test_id);
            const isEd = editingResult === r.id;
            const useFtIn = isFeetInchesTest(r.test_id);
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, flexWrap: 'wrap' }}>
                {isEd ? (
                  <>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                    <span style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name || r.test_id}</span>
                    <input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} onWheel={preventScrollChange} style={{ width: 100, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} />
                    {useFtIn && editValue && <span style={{ color: '#888', fontSize: 12 }}>= {formatFeetInches(parseFloat(editValue))}</span>}
                    <button onClick={() => handleSaveEdit(r)} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.3)', border: 'none', borderRadius: 4, color: '#00ff88', cursor: 'pointer', fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditingResult(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div style={{ width: 100, fontSize: 13, color: '#888' }}>{new Date(r.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div style={{ flex: 1, color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name || r.test_id}</div>
                    <div style={{ fontWeight: 700, color: r.is_pr ? '#ffd700' : '#00ff88' }}>{useFtIn ? formatFeetInches(parseFloat(r.converted_value)) : r.converted_value} <span style={{ fontSize: 12, color: '#888' }}>{!useFtIn && (test?.displayUnit || test?.unit)}</span> {r.is_pr && '🏆'}</div>
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
      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select an athlete to manage their results.</p></div>}
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
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>📏 Jump Calculator</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Calculate approach jumps for the whole class</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Add Athletes</label><AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => addRow(id)} excludeIds={usedIds} placeholder="Search & add athlete..." /></div>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', ...iStyle }} /></div>
        </div>
        {rows.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: '#888' }}>{rows.length} athlete{rows.length !== 1 ? 's' : ''} added</div>}
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
              <div><div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{athlete?.first_name}</div><div style={{ fontSize: 11, color: '#666' }}>{athlete?.last_name}</div></div>
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
                    {!row.saved && isNewPR && <span style={{ fontSize: 10, color: '#ffd700', display: 'block' }}>🏆 PR!</span>}
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
        <button onClick={saveAll} disabled={saving} style={{ width: '100%', padding: '20px 32px', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: saving ? 'default' : 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: saving ? 'none' : '0 4px 20px rgba(0,255,136,0.3)' }}>
          {saving ? 'Saving...' : `✓ Save ${readyCount} Result${readyCount !== 1 ? 's' : ''}`}
        </button>
      )}
      {savedCount > 0 && readyCount === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#00ff88', fontWeight: 600 }}>✓ All {savedCount} results saved!</div>}
      {rows.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Add athletes above to start calculating jumps.</p></div>}
    </div>
  );
}

/* ===================== RECORD BOARD PAGE ===================== */
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
    { id: 'overhead', name: 'Overhead', unit: 'lbs', direction: 'higher', format: v => Math.round(v) },
    { id: 'chin_up', name: 'Chin-Up', unit: 'reps', direction: 'higher', format: v => Math.round(v) },
  ];

  const EXCLUDED = ['matt secrest'];

  const getAgeAtTest = (birthday, testDate) => {
    if (!birthday || !testDate) return null;
    const b = new Date(String(birthday).slice(0,10)+'T00:00:00');
    const t = new Date(testDate);
    let age = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
    return age;
  };

  const buildRecords = (tests) => {
    const athleteMap = {};
    athletes.forEach(a => { athleteMap[a.id] = a; });
    const records = {};

    tests.forEach(test => {
      records[test.id] = { hs: [], ms: [] };

      results.forEach(r => {
        if (r.test_id !== test.id) return;
        const a = athleteMap[r.athlete_id];
        if (!a) return;
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
    const cardBg = 'rgba(255,255,255,0.03)';
    const cardBorder = isTv ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.1)';

    const renderRows = (list) => list.length > 0 ? list.map((r, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', margin: '2px 0', borderRadius: 4, ...(i === 0 ? { background: 'linear-gradient(90deg, rgba(200,150,62,0.3) 0%, rgba(200,150,62,0.05) 100%)', borderLeft: '3px solid #C8963E' } : {}) }}>
        <span style={{ fontWeight: 600, fontSize: isTv ? 13 : 14, color: i === 0 ? '#C8963E' : '#e8e8e8' }}>{test.format(r.value)}</span>
        <span style={{ color: '#888', fontSize: isTv ? 12 : 13, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
      </div>
    )) : <div style={{ color: '#444', textAlign: 'center', fontSize: 13, padding: 4 }}>—</div>;

    return (
      <div key={test.id} style={{ background: cardBg, borderRadius: 10, padding: isTv ? 10 : 12, border: cardBorder }}>
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
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>🏆 Record Board</h1>
          <p style={{ color: '#888' }}>Top 5 records across all athletes — put this on your gym TV!</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setGender(g => g === 'boys' ? 'girls' : 'boys')} style={{ padding: '10px 20px', background: 'rgba(0,212,255,0.15)', border: '2px solid #00d4ff', borderRadius: 6, color: '#00d4ff', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
            {gender === 'boys' ? 'SWITCH TO GIRLS' : 'SWITCH TO BOYS'}
          </button>
          <button onClick={() => setAutoSwitch(a => !a)} style={{ padding: '10px 20px', background: autoSwitch ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', border: `2px solid ${autoSwitch ? '#00ff88' : '#666'}`, borderRadius: 6, color: autoSwitch ? '#00ff88' : '#888', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
            {autoSwitch ? '⏸ PAUSE' : '▶ AUTO (60s)'}
          </button>
          <button onClick={() => { setAutoSwitch(true); setTvMode(true); }} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #C8963E 0%, #A87A2E 100%)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', letterSpacing: 1 }}>
            📺 TV MODE
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
