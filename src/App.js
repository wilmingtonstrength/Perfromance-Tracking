import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxtomnbvinxuvnrrqnqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dG9tbmJ2aW54dXZucnJxbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk5MTksImV4cCI6MjA4NTc5NTkxOX0.Ty-KRgr9JsYr7ZEZtvm7lB2TxcdWeW1CCsJQdWyFND8';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    { id: 'sl_rsi_left', name: 'Single-Leg RSI Left', unit: 'ratio', direction: 'higher' },
    { id: 'sl_rsi_right', name: 'Single-Leg RSI Right', unit: 'ratio', direction: 'higher' },
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
  const selectedAthlete = athletes.find(a => a.id === value);
  const filtered = athletes.filter(a => a.status === 'Active' && !excludeIds.includes(a.id) && (search === '' || `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase())));
  const handleSelect = (athlete) => { onChange(athlete.id); setSearch(''); setIsOpen(false); };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i+1, filtered.length-1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i-1, 0)); }
    else if (e.key === 'Enter' && filtered[highlightIndex]) { e.preventDefault(); handleSelect(filtered[highlightIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); }
  };
  return (
    <div style={{ position: 'relative', flex: '2 1 200px' }}>
      {value && !isOpen ? (
        <div onClick={() => { setIsOpen(true); setSearch(''); }} style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer' }}>{selectedAthlete ? `${selectedAthlete.first_name} ${selectedAthlete.last_name}` : 'Select athlete...'}</div>
      ) : (
        <input type="text" value={search} placeholder={placeholder} onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }} onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown} autoFocus={isOpen} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 8, color: '#fff', fontSize: 16 }} />
      )}
      {isOpen && (<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, marginTop: 4, zIndex: 50 }}>
        {filtered.slice(0, 20).map((a, i) => (<div key={a.id} onClick={() => handleSelect(a)} style={{ padding: '10px 16px', cursor: 'pointer', background: i === highlightIndex ? 'rgba(0,212,255,0.2)' : 'transparent', color: '#fff', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{a.first_name} {a.last_name} {a.birthday && <span style={{ color: '#888', fontSize: 12 }}>• {calculateAge(a.birthday)} yrs</span>}</div>))}
        {filtered.length === 0 && <div style={{ padding: '10px 16px', color: '#666', fontSize: 14 }}>No athletes found</div>}
      </div>)}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('entry');
  const [athletes, setAthletes] = useState([]);
  const [results, setResults] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => { setLoading(true); const { data: ad } = await supabase.from('athletes').select('*').order('first_name'); const { data: rd } = await supabase.from('results').select('*'); if (ad) setAthletes(ad); if (rd) setResults(rd); setLoading(false); };
  useEffect(() => { loadData(); }, []);
  const showNotification = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 4000); };

  const addAthlete = async (athlete) => { const age = athlete.birthday ? calculateAge(athlete.birthday) : null; const { data, error } = await supabase.from('athletes').insert([{ first_name: athlete.firstName, last_name: athlete.lastName, email: athlete.email||'', phone: athlete.phone||'', birthday: athlete.birthday||null, age, gender: athlete.gender, status: 'Active' }]).select(); if (data) { setAthletes([...athletes, data[0]].sort((a,b) => a.first_name.localeCompare(b.first_name))); showNotification(`${athlete.firstName} ${athlete.lastName} added!`); } if (error) showNotification('Error adding athlete','error'); };

  const updateAthlete = async (id, updates) => { const age = updates.birthday ? calculateAge(updates.birthday) : null; const { error } = await supabase.from('athletes').update({ first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday||null, age, gender: updates.gender, status: updates.status }).eq('id', id); if (!error) { setAthletes(athletes.map(a => a.id === id ? { ...a, first_name: updates.firstName, last_name: updates.lastName, email: updates.email, phone: updates.phone, birthday: updates.birthday, age, gender: updates.gender, status: updates.status } : a)); showNotification('Athlete updated!'); } };

  const deleteResult = async (resultId) => { const { error } = await supabase.from('results').delete().eq('id', resultId); if (!error) { setResults(results.filter(r => r.id !== resultId)); showNotification('Result deleted'); } };

  const updateResult = async (resultId, updates) => { const test = getTestById(updates.testId); const cv = test && test.convert ? parseFloat(test.convert(updates.rawValue)) : updates.rawValue; const { error } = await supabase.from('results').update({ test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv }).eq('id', resultId); if (!error) { setResults(results.map(r => r.id === resultId ? { ...r, test_date: updates.testDate, raw_value: updates.rawValue, converted_value: cv } : r)); showNotification('Result updated!'); } };

  const logResults = async (resultsToLog) => { let prCount = 0; const newResults = []; for (const result of resultsToLog) { const test = getTestById(result.testId); const prev = results.filter(r => r.athlete_id === result.athleteId && r.test_id === result.testId); let isPR = prev.length === 0; if (!isPR) { const best = test.direction === 'higher' ? Math.max(...prev.map(r => r.converted_value)) : Math.min(...prev.map(r => r.converted_value)); isPR = test.direction === 'higher' ? result.convertedValue > best : result.convertedValue < best; } const { data } = await supabase.from('results').insert([{ athlete_id: result.athleteId, test_id: result.testId, test_date: result.testDate, raw_value: result.rawValue, converted_value: result.convertedValue, unit: result.unit, is_pr: isPR }]).select(); if (data) { newResults.push(data[0]); if (isPR) prCount++; } } setResults([...results, ...newResults]); if (prCount > 0) showNotification(`🏆 ${prCount} NEW PR${prCount>1?'s':''}! Results logged!`, 'pr'); else showNotification(`${resultsToLog.length} result${resultsToLog.length>1?'s':''} logged!`); return newResults; };

  const getAthleteById = (id) => athletes.find(a => a.id === id);
  const getPR = (athleteId, testId) => { const test = getTestById(testId); const ar = results.filter(r => r.athlete_id === athleteId && r.test_id === testId); if (ar.length === 0) return null; return test.direction === 'higher' ? Math.max(...ar.map(r => r.converted_value)) : Math.min(...ar.map(r => r.converted_value)); };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontSize: 20 }}>Loading...</div>;

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
            {[{ id: 'entry', label: 'Test Entry' },{ id: 'athletes', label: 'Athletes' },{ id: 'dashboard', label: 'Dashboard' },{ id: 'records', label: 'Records' },{ id: 'manage', label: '⚙️ Manage' },{ id: 'jumpcalc', label: '📏 Jump Calc' }].map(item => (<button key={item.id} onClick={() => setPage(item.id)} style={{ padding: '10px 20px', background: page === item.id ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: page === item.id ? '#0a1628' : '#e8e8e8', fontWeight: page === item.id ? 700 : 500, cursor: 'pointer', fontSize: 14 }}>{item.label}</button>))}
          </nav>
        </div>
      </header>
      {notification && <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', padding: '16px 32px', background: notification.type === 'pr' ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', borderRadius: 8, color: '#0a1628', fontWeight: 700, fontSize: 16, zIndex: 1000, boxShadow: '0 10px 40px rgba(0,212,255,0.3)' }}>{notification.message}</div>}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && <TestEntryPage athletes={athletes} logResults={logResults} getPR={getPR} getAthleteById={getAthleteById} />}
        {page === 'athletes' && <AthletesPage athletes={athletes} addAthlete={addAthlete} updateAthlete={updateAthlete} results={results} />}
        {page === 'dashboard' && <DashboardPage athletes={athletes} results={results} getPR={getPR} />}
        {page === 'records' && <RecordsPage athletes={athletes} results={results} getAthleteById={getAthleteById} />}
        {page === 'manage' && <ManagePage athletes={athletes} results={results} getAthleteById={getAthleteById} deleteResult={deleteResult} updateResult={updateResult} />}
        {page === 'jumpcalc' && <JumpCalcPage athletes={athletes} setAthletes={setAthletes} results={results} logResults={logResults} getPR={getPR} showNotification={showNotification} />}
      </main>
      <style>{`* { box-sizing: border-box; } input, select, button { font-family: inherit; } input:focus, select:focus { outline: 2px solid #00d4ff; outline-offset: 2px; }`}</style>
    </div>
  );
}

function TestEntryPage({ athletes, logResults, getPR, getAthleteById }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTest, setSelectedTest] = useState('');
  const [useKg, setUseKg] = useState(false);
  const [entries, setEntries] = useState([{ athleteId: '', value: '' }]);
  const [submittedResults, setSubmittedResults] = useState([]);
  const test = selectedTest ? getTestById(selectedTest) : null;
  const handleAddRow = () => setEntries([...entries, { athleteId: '', value: '' }]);
  const handleRemoveRow = (i) => { if (entries.length > 1) setEntries(entries.filter((_,idx) => idx !== i)); };
  const handleEntryChange = (i, f, v) => { const n = [...entries]; n[i][f] = v; setEntries(n); };
  const getUsedIds = (ci) => entries.filter((_,i) => i !== ci).map(e => parseInt(e.athleteId)).filter(id => !isNaN(id));

  const handleSubmit = async () => {
    if (!selectedTest || !testDate) { alert('Please select a test and date'); return; }
    const valid = entries.filter(e => e.athleteId && e.value);
    if (valid.length === 0) { alert('Please enter at least one result'); return; }
    const toLog = valid.map(e => { let raw = parseFloat(e.value); let cv = raw; if (test.allowKg && useKg) cv = Math.round(raw*2.205*10)/10; if (test.convert) cv = parseFloat(test.convert(raw)); return { athleteId: parseInt(e.athleteId), testId: selectedTest, testDate, rawValue: raw, convertedValue: cv, unit: test.allowKg && useKg ? 'kg' : test.unit }; });
    const logged = await logResults(toLog);
    setSubmittedResults(logged.map(r => { const a = getAthleteById(r.athlete_id); return { athlete: `${a?.first_name} ${a?.last_name}`, value: r.converted_value, isPR: r.is_pr }; }));
    setEntries([{ athleteId: '', value: '' }]);
  };

  const inputStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Test Entry</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Enter results for multiple athletes at once</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Session Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label><input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', ...inputStyle }} /></div>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Type</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={{ width: '100%', ...inputStyle }}><option value="">Select a test...</option>{Object.entries(TESTS).map(([k,c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}</select></div>
          {test?.allowKg && (<div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Unit</label><div style={{ display: 'flex', gap: 8 }}><button onClick={() => setUseKg(false)} style={{ flex: 1, padding: '12px', background: !useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: !useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>LBS</button><button onClick={() => setUseKg(true)} style={{ flex: 1, padding: '12px', background: useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: useKg ? '#0a1628' : '#fff', fontWeight: 600, cursor: 'pointer' }}>KG</button></div></div>)}
        </div>
      </div>
      {selectedTest && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Enter Results - {test?.name}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry, index) => { const currentPR = entry.athleteId ? getPR(parseInt(entry.athleteId), selectedTest) : null; return (
            <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <AthleteSearchPicker athletes={athletes} value={parseInt(entry.athleteId)||null} onChange={(id) => handleEntryChange(index,'athleteId',String(id))} excludeIds={getUsedIds(index)} />
              <input type="number" step="0.01" placeholder={`Enter ${test?.unit||'value'}`} value={entry.value} onChange={(e) => handleEntryChange(index,'value',e.target.value)} style={{ flex: '1 1 120px', ...inputStyle }} />
              <div style={{ width: 100, fontSize: 13, color: '#888' }}>{currentPR !== null ? `PR: ${currentPR}` : 'No PR'}</div>
              {entries.length > 1 && <button onClick={() => handleRemoveRow(index)} style={{ padding: '8px 12px', background: 'rgba(255,100,100,0.2)', border: 'none', borderRadius: 6, color: '#ff6666', cursor: 'pointer', fontSize: 16 }}>×</button>}
            </div>); })}
        </div>
        <button onClick={handleAddRow} style={{ marginTop: 16, padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', width: '100%' }}>+ Add Another Athlete</button>
      </div>)}
      {selectedTest && <button onClick={handleSubmit} style={{ width: '100%', padding: '20px 32px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: '0 4px 20px rgba(0,255,136,0.3)' }}>✓ Submit All Results</button>}
      {submittedResults.length > 0 && (<div style={{ marginTop: 24, background: 'rgba(0,255,136,0.1)', borderRadius: 12, padding: 24, border: '1px solid rgba(0,255,136,0.3)' }}><h3 style={{ margin: '0 0 16px 0', color: '#00ff88' }}>✓ Just Logged</h3>{submittedResults.map((r,i) => (<div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}><span style={{ fontWeight: 600 }}>{r.athlete}</span>: {r.value} {r.isPR && <span style={{ color: '#00ff88', fontWeight: 700 }}>🏆 NEW PR!</span>}</div>))}</div>)}
    </div>
  );
}

function AthletesPage({ athletes, addAthlete, updateAthlete, results }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState(''); const [gender, setGender] = useState('Male');
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [status, setStatus] = useState('Active');
  const resetForm = () => { setFirstName(''); setLastName(''); setBirthday(''); setGender('Male'); setEmail(''); setPhone(''); setStatus('Active'); };
  const handleSubmit = (e) => { e.preventDefault(); if (!firstName||!lastName) return; if (editingId) { updateAthlete(editingId, { firstName, lastName, birthday, gender, email, phone, status }); setEditingId(null); } else { addAthlete({ firstName, lastName, birthday, gender, email, phone }); } resetForm(); setShowForm(false); };
  const handleEdit = (a) => { setEditingId(a.id); setFirstName(a.first_name); setLastName(a.last_name); setBirthday(a.birthday ? String(a.birthday).slice(0,10) : ''); setGender(a.gender||'Male'); setEmail(a.email||''); setPhone(a.phone||''); setStatus(a.status||'Active'); setShowForm(true); };
  const inputStyle = { padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div><h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athletes</h1><p style={{ color: '#888' }}>{athletes.length} athletes registered</p></div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Add Athlete</button>
      </div>
      {showForm && (<form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(0,212,255,0.3)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>{editingId ? 'Edit Athlete' : 'New Athlete'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
          <div><label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>Birthday</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ width: '100%', ...inputStyle }} /></div>
          <select value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}><option>Male</option><option>Female</option></select>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          {editingId && <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}><option>Active</option><option>Inactive</option></select>}
        </div>
        <button type="submit" style={{ marginTop: 16, padding: '12px 32px', background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 8, color: '#0a1628', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{editingId ? 'Update Athlete' : 'Save Athlete'}</button>
      </form>)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {athletes.map(athlete => { const ar = results.filter(r => r.athlete_id === athlete.id); const prs = ar.filter(r => r.is_pr).length; const age = calculateAge(athlete.birthday); return (
          <div key={athlete.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div><h3 style={{ margin: 0, fontSize: 18 }}>{athlete.first_name} {athlete.last_name}</h3><p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>{age && `${age} yrs • `}{athlete.gender}{athlete.birthday && <span style={{ color: '#666' }}> • {new Date(String(athlete.birthday).slice(0,10)+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}</p></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button onClick={() => handleEdit(athlete)} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Edit</button><span style={{ padding: '4px 10px', background: athlete.status==='Active' ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)', color: athlete.status==='Active' ? '#00ff88' : '#888', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{athlete.status}</span></div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 24 }}><div><div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{ar.length}</div><div style={{ fontSize: 12, color: '#888' }}>Tests</div></div><div><div style={{ fontSize: 24, fontWeight: 700, color: '#00ff88' }}>{prs}</div><div style={{ fontSize: 12, color: '#888' }}>PRs</div></div></div>
          </div>); })}
      </div>
    </div>
  );
}

function SimpleChart({ data, direction }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value); const minVal = Math.min(...values); const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1; const padding = range * 0.1;
  const chartMin = minVal - padding; const chartMax = maxVal + padding; const chartRange = chartMax - chartMin;
  const width = 100; const height = 200;
  const pointSpacing = data.length > 1 ? width / (data.length - 1) : width / 2;
  const getY = (val) => height - ((val - chartMin) / chartRange) * height;
  const points = data.map((d, i) => ({ x: i * pointSpacing, y: getY(d.value), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const bestValue = direction === 'lower' ? minVal : maxVal;
  const bestY = getY(bestValue);
  return (<div style={{ padding: '20px 0' }}><svg viewBox={`-30 -10 ${width + 60} ${height + 40}`} style={{ width: '100%', height: 250 }}>
    {[0,0.25,0.5,0.75,1].map((pct,i) => (<g key={i}><line x1={0} y1={height*pct} x2={width} y2={height*pct} stroke="rgba(255,255,255,0.1)" strokeWidth="1" /><text x={-10} y={height*pct+4} fill="#888" fontSize="10" textAnchor="end">{(chartMax - pct * chartRange).toFixed(2)}</text></g>))}
    <line x1={0} y1={bestY} x2={width} y2={bestY} stroke="#00ff88" strokeWidth="2" strokeDasharray="5,5" /><text x={width+5} y={bestY+4} fill="#00ff88" fontSize="10">PR</text>
    <path d={linePath} fill="none" stroke="#00d4ff" strokeWidth="3" />
    {points.map((p,i) => (<g key={i}><circle cx={p.x} cy={p.y} r={p.value === bestValue ? 8 : 6} fill={p.value === bestValue ? "#00ff88" : "#00d4ff"} /><text x={p.x} y={height+20} fill="#888" fontSize="9" textAnchor="middle">{p.date}</text></g>))}
  </svg></div>);
}

function DashboardPage({ athletes, results, getPR }) {
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const athlete = athletes.find(a => a.id === parseInt(selectedAthlete));
  const test = selectedTest ? getTestById(selectedTest) : null;
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === parseInt(selectedAthlete)) : [];
  const testResults = selectedTest && selectedAthlete ? athleteResults.filter(r => r.test_id === selectedTest).sort((a,b) => new Date(a.test_date) - new Date(b.test_date)).map(r => ({ date: new Date(r.test_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}), value: r.converted_value, isPR: r.is_pr })) : [];
  const currentPR = selectedAthlete && selectedTest ? getPR(parseInt(selectedAthlete), selectedTest) : null;
  const inputStyle = { width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>View individual athlete performance and progress</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete</label><select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); setSelectedTest(''); }} style={inputStyle}><option value="">Choose an athlete...</option>{athletes.map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}</select></div>
        {selectedAthlete && (<div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Test for Graph</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={inputStyle}><option value="">Choose a test...</option>{Object.entries(TESTS).map(([k,c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}</select></div>)}
      </div>
      {athlete && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>{athlete.first_name} {athlete.last_name}'s Personal Records</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {Object.entries(TESTS).map(([k,c]) => (<div key={k}><h4 style={{ color: '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{c.label}</h4>{c.tests.map(t => { const pr = getPR(athlete.id, t.id); return (<div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 14 }}><span style={{ color: '#aaa' }}>{t.name}</span><span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>{pr !== null ? `${pr} ${t.displayUnit||t.unit}` : '-'}</span></div>); })}</div>))}
        </div>
      </div>)}
      {testResults.length > 0 && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}><h2 style={{ margin: 0, fontSize: 20 }}>{test?.name} Progress</h2>{currentPR && <div style={{ padding: '8px 16px', background: 'rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontWeight: 700 }}>🏆 PR: {currentPR} {test?.displayUnit||test?.unit}</div>}</div>
        <SimpleChart data={testResults} direction={test?.direction} />
        <div style={{ marginTop: 16, fontSize: 13, color: '#888' }}>{testResults.length} test{testResults.length!==1?'s':''} recorded{test?.direction==='lower' && ' • Lower is better'}{test?.direction==='higher' && ' • Higher is better'}</div>
      </div>)}
      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select an athlete above to view their dashboard.</p></div>}
    </div>
  );
}

function RecordsPage({ athletes, results, getAthleteById }) {
  const [selectedTest, setSelectedTest] = useState('');
  const [ageGroup, setAgeGroup] = useState('all');
  const [gender, setGender] = useState('all');
  const test = selectedTest ? getTestById(selectedTest) : null;
  const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };
  const getTopFive = () => {
    if (!selectedTest) return [];
    const bests = {};
    results.filter(r => r.test_id === selectedTest).forEach(r => { const a = getAthleteById(r.athlete_id); if (!a) return; if (gender !== 'all' && a.gender !== gender) return; const age = calculateAge(a.birthday); if (ageGroup === '13under' && (!age || age > 13)) return; if (ageGroup === '14up' && (!age || age < 14)) return; const c = bests[r.athlete_id]; if (!c) bests[r.athlete_id] = r; else if (test.direction === 'higher' && r.converted_value > c.converted_value) bests[r.athlete_id] = r; else if (test.direction === 'lower' && r.converted_value < c.converted_value) bests[r.athlete_id] = r; });
    return Object.values(bests).sort((a,b) => test.direction === 'higher' ? b.converted_value - a.converted_value : a.converted_value - b.converted_value).slice(0,5);
  };
  const topFive = getTopFive();
  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>🏆 Records</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Top 5 performances by test, age group, and gender</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={inputStyle}><option value="">Select a test...</option>{Object.entries(TESTS).map(([k,c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}</select></div>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Age Group</label><select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} style={inputStyle}><option value="all">All Ages</option><option value="13under">13 & Under</option><option value="14up">14 & Up</option></select></div>
          <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Gender</label><select value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}><option value="all">All</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
        </div>
      </div>
      {selectedTest && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(0,153,204,0.2) 100%)', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}><h2 style={{ margin: 0, fontSize: 20 }}>Top 5 - {test?.name}{ageGroup !== 'all' && ` (${ageGroup==='13under'?'13 & Under':'14 & Up'})`}{gender !== 'all' && ` - ${gender}`}</h2><p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>{test?.direction === 'lower' ? 'Fastest times' : 'Best results'}</p></div>
        {topFive.length > 0 ? (<div>{topFive.map((r,i) => { const a = getAthleteById(r.athlete_id); const age = a ? calculateAge(a.birthday) : null; const medals = ['🥇','🥈','🥉','4th','5th']; return (<div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: i===0 ? 'rgba(255,215,0,0.1)' : 'transparent' }}><div style={{ width: 50, fontSize: i<3?28:18, fontWeight: 700, color: i<3?'#fff':'#888' }}>{medals[i]}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16 }}>{a ? `${a.first_name} ${a.last_name}` : 'Unknown'}</div><div style={{ color: '#888', fontSize: 13 }}>{age && `${age} yrs • `}{a?.gender}{' • '}{new Date(r.test_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div><div style={{ fontSize: 24, fontWeight: 800, color: i===0?'#ffd700':'#00ff88' }}>{r.converted_value} <span style={{ fontSize: 14, fontWeight: 500, color: '#888' }}>{test?.displayUnit||test?.unit}</span></div></div>); })}</div>) : <div style={{ padding: 48, textAlign: 'center', color: '#666' }}>No results found for this filter combination.</div>}
      </div>)}
      {!selectedTest && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select a test above to view the leaderboard.</p></div>}
    </div>
  );
}

function ManagePage({ athletes, results, getAthleteById, deleteResult, updateResult }) {
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [editingResult, setEditingResult] = useState(null);
  const [editDate, setEditDate] = useState(''); const [editValue, setEditValue] = useState('');
  const athleteResults = selectedAthlete ? results.filter(r => r.athlete_id === parseInt(selectedAthlete)) : [];
  const filteredResults = selectedTest ? athleteResults.filter(r => r.test_id === selectedTest) : athleteResults;
  const sortedResults = [...filteredResults].sort((a,b) => new Date(b.test_date) - new Date(a.test_date));
  const handleEdit = (r) => { setEditingResult(r.id); setEditDate(String(r.test_date).slice(0,10)); setEditValue(String(r.raw_value)); };
  const handleSaveEdit = (r) => { updateResult(r.id, { testId: r.test_id, testDate: editDate, rawValue: parseFloat(editValue) }); setEditingResult(null); };
  const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16 };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>⚙️ Manage</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Edit or delete test results</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete</label><select value={selectedAthlete} onChange={(e) => { setSelectedAthlete(e.target.value); setSelectedTest(''); }} style={inputStyle}><option value="">Choose an athlete...</option>{athletes.map(a => (<option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>))}</select></div>
        {selectedAthlete && (<div><label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Filter by Test</label><select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} style={inputStyle}><option value="">All Tests</option>{Object.entries(TESTS).map(([k,c]) => (<optgroup key={k} label={c.label}>{c.tests.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</optgroup>))}</select></div>)}
      </div>
      {selectedAthlete && sortedResults.length > 0 && (<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        {sortedResults.map(r => { const test = getTestById(r.test_id); const isEd = editingResult === r.id; return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 12, flexWrap: 'wrap' }}>
            {isEd ? (<><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} /><span style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name||r.test_id}</span><input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: 100, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.5)', borderRadius: 6, color: '#fff', fontSize: 14 }} /><button onClick={() => handleSaveEdit(r)} style={{ padding: '6px 12px', background: 'rgba(0,255,136,0.3)', border: 'none', borderRadius: 4, color: '#00ff88', cursor: 'pointer', fontSize: 12 }}>Save</button><button onClick={() => setEditingResult(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Cancel</button></>) : (<><div style={{ width: 100, fontSize: 13, color: '#888' }}>{new Date(r.test_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div><div style={{ flex: 1, color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>{test?.name||r.test_id}</div><div style={{ fontWeight: 700, color: r.is_pr ? '#ffd700' : '#00ff88' }}>{r.converted_value} <span style={{ fontSize: 12, color: '#888' }}>{test?.displayUnit||test?.unit}</span> {r.is_pr && '🏆'}</div><button onClick={() => handleEdit(r)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Edit</button><button onClick={() => { if (window.confirm('Delete this result?')) deleteResult(r.id); }} style={{ padding: '6px 12px', background: 'rgba(255,100,100,0.2)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 12 }}>Delete</button></>)}
          </div>); })}
      </div>)}
      {selectedAthlete && sortedResults.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>No results found.</div>}
      {!selectedAthlete && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Select an athlete to manage their results.</p></div>}
    </div>
  );
}

function JumpCalcPage({ athletes, setAthletes, results, logResults, getPR, showNotification }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const addRow = (athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete || rows.find(r => r.athleteId === athleteId)) return;
    const reach = athlete.standing_reach || null;
    setRows([...rows, {
      athleteId,
      reachFeet: reach ? String(Math.floor(reach / 12)) : '',
      reachInches: reach ? String(parseFloat((reach % 12).toFixed(1))) : '',
      touchFeet: '', touchInches: '', saved: false
    }]);
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows]; newRows[index][field] = value; newRows[index].saved = false; setRows(newRows);
  };

  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));

  const getReachTotal = (row) => (row.reachFeet !== '' && row.reachInches !== '') ? parseInt(row.reachFeet) * 12 + parseFloat(row.reachInches) : null;
  const getTouchTotal = (row) => (row.touchFeet !== '' && row.touchInches !== '') ? parseInt(row.touchFeet) * 12 + parseFloat(row.touchInches) : null;
  const getJumpResult = (row) => { const r = getReachTotal(row); const t = getTouchTotal(row); return (r !== null && t !== null && t > r) ? parseFloat((t - r).toFixed(1)) : null; };

  const usedIds = rows.map(r => r.athleteId);

  const saveAll = async () => {
    setSaving(true);
    const toSave = rows.filter(r => getJumpResult(r) !== null && !r.saved);
    // Save reaches first
    for (const row of toSave) {
      const athlete = athletes.find(a => a.id === row.athleteId);
      const reachTotal = getReachTotal(row);
      if (reachTotal !== null && reachTotal !== athlete?.standing_reach) {
        await supabase.from('athletes').update({ standing_reach: reachTotal }).eq('id', row.athleteId);
        setAthletes(prev => prev.map(a => a.id === row.athleteId ? { ...a, standing_reach: reachTotal } : a));
      }
    }
    // Save jump results
    const resultsToLog = toSave.map(row => ({ athleteId: row.athleteId, testId: 'approach_jump', testDate, rawValue: getJumpResult(row), convertedValue: getJumpResult(row), unit: 'inches' }));
    if (resultsToLog.length > 0) await logResults(resultsToLog);
    setRows(rows.map(r => ({ ...r, saved: getJumpResult(r) !== null ? true : r.saved })));
    setSaving(false);
  };

  const savedCount = rows.filter(r => r.saved).length;
  const readyCount = rows.filter(r => getJumpResult(r) !== null && !r.saved).length;
  const inputStyle = { padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 16, textAlign: 'center' };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>📏 Jump Calculator</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Calculate approach jumps for the whole class</p>

      {/* Date & Add Athletes */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Add Athletes</label>
            <AthleteSearchPicker athletes={athletes} value={null} onChange={(id) => addRow(id)} excludeIds={usedIds} placeholder="Search & add athlete..." />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label>
            <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={{ width: '100%', ...inputStyle }} />
          </div>
        </div>
        {rows.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: '#888' }}>{rows.length} athlete{rows.length !== 1 ? 's' : ''} added</div>}
      </div>

      {/* Column Headers */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: '0 12px', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Athlete</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Reach</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Touch Height</span>
          <span style={{ fontSize: 12, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 1 }}>Result</span>
          <span></span>
        </div>
      )}

      {/* Athlete Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {rows.map((row, index) => {
          const athlete = athletes.find(a => a.id === row.athleteId);
          const jumpResult = getJumpResult(row);
          const currentPR = getPR(row.athleteId, 'approach_jump');
          const isNewPR = jumpResult !== null && currentPR !== null && jumpResult > currentPR;
          const isFirst = jumpResult !== null && currentPR === null;
          return (
            <div key={row.athleteId} style={{ display: 'grid', gridTemplateColumns: '160px 140px 160px 100px 40px', gap: 8, padding: 12, borderRadius: 10, alignItems: 'center', background: row.saved ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${row.saved ? 'rgba(0,255,136,0.2)' : (isNewPR || isFirst) && jumpResult ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
              {/* Name */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{athlete?.first_name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{athlete?.last_name}</div>
              </div>
              {/* Reach */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" min="0" max="10" placeholder="ft" value={row.reachFeet} onChange={(e) => updateRow(index, 'reachFeet', e.target.value)} style={{ width: 48, ...inputStyle, padding: '8px 4px', fontSize: 14 }} />
                <span style={{ color: '#666', fontSize: 14 }}>'</span>
                <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.reachInches} onChange={(e) => updateRow(index, 'reachInches', e.target.value)} style={{ width: 48, ...inputStyle, padding: '8px 4px', fontSize: 14 }} />
                <span style={{ color: '#666', fontSize: 14 }}>"</span>
              </div>
              {/* Touch */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="number" min="0" max="12" placeholder="ft" value={row.touchFeet} onChange={(e) => updateRow(index, 'touchFeet', e.target.value)} style={{ width: 48, ...inputStyle, padding: '8px 6px' }} />
                <span style={{ color: '#888', fontSize: 16 }}>'</span>
                <input type="number" min="0" max="11.9" step="0.5" placeholder="in" value={row.touchInches} onChange={(e) => updateRow(index, 'touchInches', e.target.value)} style={{ width: 48, ...inputStyle, padding: '8px 6px' }} />
                <span style={{ color: '#888', fontSize: 16 }}>"</span>
              </div>
              {/* Result */}
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
              {/* Remove */}
              <button onClick={() => removeRow(index)} style={{ padding: '4px 8px', background: 'rgba(255,100,100,0.15)', border: 'none', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          );
        })}
      </div>

      {/* Save All Button */}
      {readyCount > 0 && (
        <button onClick={saveAll} disabled={saving} style={{ width: '100%', padding: '20px 32px', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)', border: 'none', borderRadius: 12, color: '#0a1628', fontSize: 20, fontWeight: 800, cursor: saving ? 'default' : 'pointer', textTransform: 'uppercase', letterSpacing: 2, boxShadow: saving ? 'none' : '0 4px 20px rgba(0,255,136,0.3)' }}>
          {saving ? 'Saving...' : `✓ Save ${readyCount} Result${readyCount !== 1 ? 's' : ''}`}
        </button>
      )}
      {savedCount > 0 && readyCount === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#00ff88', fontWeight: 600 }}>✓ All {savedCount} results saved!</div>
      )}

      {rows.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#666' }}><p style={{ fontSize: 18 }}>Add athletes above to start calculating jumps.</p></div>}
    </div>
  );
}
