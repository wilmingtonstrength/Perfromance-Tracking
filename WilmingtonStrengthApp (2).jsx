import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Storage utility functions
const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
};

const loadData = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Error loading data:', e);
    return defaultValue;
  }
};

// Your exact test list
const TESTS = {
  speed: {
    label: 'Speed & Acceleration',
    tests: [
      { id: 'max_velocity', name: 'Max Velocity', unit: 'split sec', direction: 'higher', convert: (v) => (20.45 / v).toFixed(2), displayUnit: 'MPH' },
      { id: '5_10_fly', name: '5-10 Fly', unit: 'sec', direction: 'lower' },
      { id: '40_yard', name: '40-Yard Dash', unit: 'sec', direction: 'lower' },
      { id: '60_yard', name: '60-Yard Dash', unit: 'sec', direction: 'lower' },
    ]
  },
  agility: {
    label: 'Change of Direction',
    tests: [
      { id: '5_10_5', name: '5-10-5', unit: 'sec', direction: 'lower' },
      { id: '5_0_5', name: '5-0-5', unit: 'sec', direction: 'lower' },
    ]
  },
  power: {
    label: 'Power',
    tests: [
      { id: 'broad_jump', name: 'Broad Jump', unit: 'inches', direction: 'higher' },
      { id: 'vertical_jump', name: 'Vertical Jump', unit: 'inches', direction: 'higher' },
      { id: 'approach_jump', name: 'Approach Jump', unit: 'inches', direction: 'higher' },
      { id: 'rsi', name: 'RSI', unit: 'ratio', direction: 'higher' },
      { id: 'sl_rsi_left', name: 'Single-Leg RSI Left', unit: 'ratio', direction: 'higher' },
      { id: 'sl_rsi_right', name: 'Single-Leg RSI Right', unit: 'ratio', direction: 'higher' },
    ]
  },
  strength: {
    label: 'Strength',
    tests: [
      { id: 'back_squat', name: 'Back Squat', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'front_squat', name: 'Front Squat', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'bench_press', name: 'Bench Press', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'deadlift', name: 'Deadlift', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'clean', name: 'Clean', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'snatch', name: 'Snatch', unit: 'lbs', direction: 'higher', allowKg: true },
      { id: 'chin_up', name: 'Chin-Up', unit: 'lbs', direction: 'higher', allowKg: true },
    ]
  }
};

const getAllTests = () => {
  const all = [];
  Object.values(TESTS).forEach(category => {
    category.tests.forEach(test => all.push(test));
  });
  return all;
};

const getTestById = (id) => getAllTests().find(t => t.id === id);

// Sample data for Matt Seacrest
const createSampleData = () => {
  const mattId = 1;
  const sampleAthletes = [
    { id: mattId, firstName: 'Matt', lastName: 'Seacrest', age: 17, gender: 'Male', status: 'Active', dateAdded: '2024-01-01' },
    { id: 2, firstName: 'Sarah', lastName: 'Johnson', age: 16, gender: 'Female', status: 'Active', dateAdded: '2024-01-15' },
    { id: 3, firstName: 'Jake', lastName: 'Thompson', age: 14, gender: 'Male', status: 'Active', dateAdded: '2024-02-01' },
    { id: 4, firstName: 'Emma', lastName: 'Davis', age: 12, gender: 'Female', status: 'Active', dateAdded: '2024-02-15' },
  ];

  const sampleResults = [
    // Matt's 5-10 Fly times
    { id: 1, athleteId: mattId, testId: '5_10_fly', testDate: '2024-06-01', rawValue: 1.34, convertedValue: 1.34, unit: 'sec', isPR: true, loggedAt: '2024-06-01' },
    { id: 2, athleteId: mattId, testId: '5_10_fly', testDate: '2024-07-01', rawValue: 1.33, convertedValue: 1.33, unit: 'sec', isPR: true, loggedAt: '2024-07-01' },
    { id: 3, athleteId: mattId, testId: '5_10_fly', testDate: '2024-08-01', rawValue: 1.32, convertedValue: 1.32, unit: 'sec', isPR: true, loggedAt: '2024-08-01' },
    { id: 4, athleteId: mattId, testId: '5_10_fly', testDate: '2024-09-01', rawValue: 1.29, convertedValue: 1.29, unit: 'sec', isPR: true, loggedAt: '2024-09-01' },
    { id: 5, athleteId: mattId, testId: '5_10_fly', testDate: '2024-10-01', rawValue: 1.34, convertedValue: 1.34, unit: 'sec', isPR: false, loggedAt: '2024-10-01' },
    { id: 6, athleteId: mattId, testId: '5_10_fly', testDate: '2024-11-01', rawValue: 1.35, convertedValue: 1.35, unit: 'sec', isPR: false, loggedAt: '2024-11-01' },
    { id: 7, athleteId: mattId, testId: '5_10_fly', testDate: '2024-12-01', rawValue: 1.27, convertedValue: 1.27, unit: 'sec', isPR: true, loggedAt: '2024-12-01' },
    
    // Matt's Clean numbers
    { id: 8, athleteId: mattId, testId: 'clean', testDate: '2024-06-15', rawValue: 200, convertedValue: 200, unit: 'lbs', isPR: true, loggedAt: '2024-06-15' },
    { id: 9, athleteId: mattId, testId: 'clean', testDate: '2024-08-15', rawValue: 215, convertedValue: 215, unit: 'lbs', isPR: true, loggedAt: '2024-08-15' },
    { id: 10, athleteId: mattId, testId: 'clean', testDate: '2024-10-15', rawValue: 225, convertedValue: 225, unit: 'lbs', isPR: true, loggedAt: '2024-10-15' },
    { id: 11, athleteId: mattId, testId: 'clean', testDate: '2024-12-15', rawValue: 245, convertedValue: 245, unit: 'lbs', isPR: true, loggedAt: '2024-12-15' },

    // Some data for other athletes for records comparison
    { id: 12, athleteId: 2, testId: '5_10_fly', testDate: '2024-09-01', rawValue: 1.38, convertedValue: 1.38, unit: 'sec', isPR: true, loggedAt: '2024-09-01' },
    { id: 13, athleteId: 3, testId: '5_10_fly', testDate: '2024-09-01', rawValue: 1.31, convertedValue: 1.31, unit: 'sec', isPR: true, loggedAt: '2024-09-01' },
    { id: 14, athleteId: 4, testId: '5_10_fly', testDate: '2024-09-01', rawValue: 1.42, convertedValue: 1.42, unit: 'sec', isPR: true, loggedAt: '2024-09-01' },
    { id: 15, athleteId: 2, testId: 'clean', testDate: '2024-10-01', rawValue: 135, convertedValue: 135, unit: 'lbs', isPR: true, loggedAt: '2024-10-01' },
    { id: 16, athleteId: 3, testId: 'clean', testDate: '2024-10-01', rawValue: 185, convertedValue: 185, unit: 'lbs', isPR: true, loggedAt: '2024-10-01' },
  ];

  return { sampleAthletes, sampleResults };
};

// Initialize with sample data if empty
const initializeData = () => {
  const existingAthletes = loadData('ws_athletes', null);
  const existingResults = loadData('ws_results', null);
  
  if (!existingAthletes || existingAthletes.length === 0) {
    const { sampleAthletes, sampleResults } = createSampleData();
    saveData('ws_athletes', sampleAthletes);
    saveData('ws_results', sampleResults);
    return { athletes: sampleAthletes, results: sampleResults };
  }
  
  return { 
    athletes: existingAthletes || [], 
    results: existingResults || [] 
  };
};

// Main App Component
export default function App() {
  const [page, setPage] = useState('entry');
  const [initialized, setInitialized] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [results, setResults] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const data = initializeData();
    setAthletes(data.athletes);
    setResults(data.results);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      saveData('ws_athletes', athletes);
    }
  }, [athletes, initialized]);

  useEffect(() => {
    if (initialized) {
      saveData('ws_results', results);
    }
  }, [results, initialized]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const addAthlete = (athlete) => {
    const newId = athletes.length > 0 ? Math.max(...athletes.map(a => a.id)) + 1 : 1;
    setAthletes([...athletes, { ...athlete, id: newId }]);
    showNotification(`${athlete.firstName} ${athlete.lastName} added!`);
  };

  const logResults = (resultsToLog) => {
    const newResults = [];
    let prCount = 0;

    resultsToLog.forEach(result => {
      const test = getTestById(result.testId);
      const previousResults = results.filter(r => r.athleteId === result.athleteId && r.testId === result.testId);
      
      let isPR = previousResults.length === 0;
      if (!isPR && previousResults.length > 0) {
        const previousBest = test.direction === 'higher' 
          ? Math.max(...previousResults.map(r => r.convertedValue))
          : Math.min(...previousResults.map(r => r.convertedValue));
        
        isPR = test.direction === 'higher' 
          ? result.convertedValue > previousBest
          : result.convertedValue < previousBest;
      }

      const newId = results.length + newResults.length + 1;
      newResults.push({
        ...result,
        id: newId,
        isPR,
        loggedAt: new Date().toISOString()
      });

      if (isPR) prCount++;
    });

    setResults([...results, ...newResults]);
    
    if (prCount > 0) {
      showNotification(`🏆 ${prCount} NEW PR${prCount > 1 ? 's' : ''}! Results logged successfully!`, 'pr');
    } else {
      showNotification(`${resultsToLog.length} result${resultsToLog.length > 1 ? 's' : ''} logged successfully!`);
    }

    return newResults;
  };

  const getAthleteById = (id) => athletes.find(a => a.id === id);

  const getPR = (athleteId, testId) => {
    const test = getTestById(testId);
    const athleteResults = results.filter(r => r.athleteId === athleteId && r.testId === testId);
    if (athleteResults.length === 0) return null;
    
    return test.direction === 'higher'
      ? Math.max(...athleteResults.map(r => r.convertedValue))
      : Math.min(...athleteResults.map(r => r.convertedValue));
  };

  if (!initialized) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>Loading...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Archivo', 'Helvetica Neue', sans-serif",
      color: '#e8e8e8'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 22,
              color: '#0a1628'
            }}>W</div>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, letterSpacing: 1 }}>WILMINGTON STRENGTH</div>
              <div style={{ fontSize: 11, color: '#00d4ff', letterSpacing: 2, textTransform: 'uppercase' }}>Performance Tracking</div>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'entry', label: 'Test Entry' },
              { id: 'athletes', label: 'Athletes' },
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'records', label: 'Records' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  padding: '10px 20px',
                  background: page === item.id ? 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 6,
                  color: page === item.id ? '#0a1628' : '#e8e8e8',
                  fontWeight: page === item.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: 14
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 32px',
          background: notification.type === 'pr' 
            ? 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)' 
            : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
          borderRadius: 8,
          color: '#0a1628',
          fontWeight: 700,
          fontSize: 16,
          zIndex: 1000,
          boxShadow: '0 10px 40px rgba(0,212,255,0.3)',
          animation: 'slideDown 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {page === 'entry' && (
          <TestEntryPage 
            athletes={athletes} 
            logResults={logResults}
            getPR={getPR}
            getAthleteById={getAthleteById}
          />
        )}
        {page === 'athletes' && (
          <AthletesPage 
            athletes={athletes} 
            addAthlete={addAthlete}
            results={results}
          />
        )}
        {page === 'dashboard' && (
          <DashboardPage 
            athletes={athletes}
            results={results}
            getPR={getPR}
          />
        )}
        {page === 'records' && (
          <RecordsPage 
            athletes={athletes}
            results={results}
            getAthleteById={getAthleteById}
          />
        )}
      </main>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: 2px solid #00d4ff; outline-offset: 2px; }
      `}</style>
    </div>
  );
}

// Test Entry Page - Now supports MULTIPLE athletes at once
function TestEntryPage({ athletes, logResults, getPR, getAthleteById }) {
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTest, setSelectedTest] = useState('');
  const [useKg, setUseKg] = useState(false);
  const [entries, setEntries] = useState([{ athleteId: '', value: '' }]);
  const [submittedResults, setSubmittedResults] = useState([]);

  const test = selectedTest ? getTestById(selectedTest) : null;

  const handleAddRow = () => {
    setEntries([...entries, { athleteId: '', value: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = () => {
    if (!selectedTest || !testDate) {
      alert('Please select a test and date');
      return;
    }

    const validEntries = entries.filter(e => e.athleteId && e.value);
    if (validEntries.length === 0) {
      alert('Please enter at least one result');
      return;
    }

    const resultsToLog = validEntries.map(entry => {
      let rawValue = parseFloat(entry.value);
      let convertedValue = rawValue;

      if (test.allowKg && useKg) {
        convertedValue = Math.round(rawValue * 2.205 * 10) / 10;
      }
      
      if (test.convert) {
        convertedValue = parseFloat(test.convert(rawValue));
      }

      return {
        athleteId: parseInt(entry.athleteId),
        testId: selectedTest,
        testDate,
        rawValue,
        convertedValue,
        unit: test.allowKg && useKg ? 'kg' : test.unit
      };
    });

    const logged = logResults(resultsToLog);
    
    const displayResults = logged.map(r => {
      const athlete = getAthleteById(r.athleteId);
      return {
        athlete: `${athlete?.firstName} ${athlete?.lastName}`,
        value: r.convertedValue,
        isPR: r.isPR
      };
    });

    setSubmittedResults(displayResults);
    setEntries([{ athleteId: '', value: '' }]);
  };

  // Get athletes not yet in the entry list
  const getAvailableAthletes = (currentIndex) => {
    const usedIds = entries
      .filter((_, i) => i !== currentIndex)
      .map(e => e.athleteId)
      .filter(id => id !== '');
    return athletes.filter(a => a.status === 'Active' && !usedIds.includes(String(a.id)));
  };

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Test Entry</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Enter results for multiple athletes at once</p>

      {/* Session Settings */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>Session Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Date</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test Type</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option value="">Select a test...</option>
              {Object.entries(TESTS).map(([key, category]) => (
                <optgroup key={key} label={category.label}>
                  {category.tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {test?.allowKg && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Unit</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setUseKg(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: !useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    color: !useKg ? '#0a1628' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >LBS</button>
                <button
                  onClick={() => setUseKg(true)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: useKg ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    color: useKg ? '#0a1628' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >KG</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entry Rows */}
      {selectedTest && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>
            Enter Results - {test?.name}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map((entry, index) => {
              const currentPR = entry.athleteId ? getPR(parseInt(entry.athleteId), selectedTest) : null;
              return (
                <div key={index} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={entry.athleteId}
                    onChange={(e) => handleEntryChange(index, 'athleteId', e.target.value)}
                    style={{
                      flex: '2 1 200px',
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 16
                    }}
                  >
                    <option value="">Select athlete...</option>
                    {getAvailableAthletes(index).map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Enter ${test?.unit || 'value'}`}
                    value={entry.value}
                    onChange={(e) => handleEntryChange(index, 'value', e.target.value)}
                    style={{
                      flex: '1 1 120px',
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 16
                    }}
                  />
                  <div style={{ width: 100, fontSize: 13, color: '#888' }}>
                    {currentPR !== null ? `PR: ${currentPR}` : 'No PR'}
                  </div>
                  {entries.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(index)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,100,100,0.2)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#ff6666',
                        cursor: 'pointer',
                        fontSize: 16
                      }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAddRow}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px dashed rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
              width: '100%'
            }}
          >+ Add Another Athlete</button>
        </div>
      )}

      {/* Submit Button */}
      {selectedTest && (
        <button
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '20px 32px',
            background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
            border: 'none',
            borderRadius: 12,
            color: '#0a1628',
            fontSize: 20,
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: 2,
            boxShadow: '0 4px 20px rgba(0,255,136,0.3)'
          }}
        >
          ✓ Submit All Results
        </button>
      )}

      {/* Recent Submissions */}
      {submittedResults.length > 0 && (
        <div style={{
          marginTop: 24,
          background: 'rgba(0,255,136,0.1)',
          borderRadius: 12,
          padding: 24,
          border: '1px solid rgba(0,255,136,0.3)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00ff88' }}>✓ Just Logged</h3>
          {submittedResults.map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontWeight: 600 }}>{r.athlete}</span>: {r.value} {r.isPR && <span style={{ color: '#00ff88', fontWeight: 700 }}>🏆 NEW PR!</span>}
            </div>
          ))}
        </div>
      )}

      {athletes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
          <p style={{ fontSize: 18 }}>No athletes yet.</p>
          <p>Go to the Athletes page to add your first athlete.</p>
        </div>
      )}
    </div>
  );
}

// Athletes Page
function AthletesPage({ athletes, addAthlete, results }) {
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    
    addAthlete({
      firstName,
      lastName,
      age: parseInt(age) || null,
      gender,
      status: 'Active',
      dateAdded: new Date().toISOString()
    });
    
    setFirstName('');
    setLastName('');
    setAge('');
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Athletes</h1>
          <p style={{ color: '#888' }}>{athletes.length} athletes registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
            border: 'none',
            borderRadius: 8,
            color: '#0a1628',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >+ Add Athlete</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid rgba(0,212,255,0.3)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#00d4ff' }}>New Athlete</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            />
            <input
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <button
            type="submit"
            style={{
              marginTop: 16,
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#0a1628',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >Save Athlete</button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {athletes.map(athlete => {
          const athleteResults = results.filter(r => r.athleteId === athlete.id);
          const prCount = athleteResults.filter(r => r.isPR).length;
          return (
            <div key={athlete.id} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{athlete.firstName} {athlete.lastName}</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>
                    {athlete.age && `${athlete.age} yrs • `}{athlete.gender}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px',
                  background: athlete.status === 'Active' ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)',
                  color: athlete.status === 'Active' ? '#00ff88' : '#888',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}>{athlete.status}</span>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{athleteResults.length}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Tests</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#00ff88' }}>{prCount}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>PRs</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage({ athletes, results, getPR }) {
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedTest, setSelectedTest] = useState('');

  const athlete = athletes.find(a => a.id === parseInt(selectedAthlete));
  const test = selectedTest ? getTestById(selectedTest) : null;

  const athleteResults = selectedAthlete 
    ? results.filter(r => r.athleteId === parseInt(selectedAthlete))
    : [];

  const testResults = selectedTest && selectedAthlete
    ? athleteResults
        .filter(r => r.testId === selectedTest)
        .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))
        .map(r => ({
          date: new Date(r.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: r.convertedValue,
          isPR: r.isPR
        }))
    : [];

  const currentPR = selectedAthlete && selectedTest ? getPR(parseInt(selectedAthlete), selectedTest) : null;

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>View individual athlete performance and progress</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Athlete</label>
          <select
            value={selectedAthlete}
            onChange={(e) => { setSelectedAthlete(e.target.value); setSelectedTest(''); }}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16
            }}
          >
            <option value="">Choose an athlete...</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
            ))}
          </select>
        </div>
        
        {selectedAthlete && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Select Test for Graph</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option value="">Choose a test...</option>
              {Object.entries(TESTS).map(([key, category]) => (
                <optgroup key={key} label={category.label}>
                  {category.tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      {athlete && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>
            {athlete.firstName} {athlete.lastName}'s Personal Records
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {Object.entries(TESTS).map(([key, category]) => (
              <div key={key}>
                <h4 style={{ color: '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                  {category.label}
                </h4>
                {category.tests.map(t => {
                  const pr = getPR(athlete.id, t.id);
                  return (
                    <div key={t.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: 14
                    }}>
                      <span style={{ color: '#aaa' }}>{t.name}</span>
                      <span style={{ fontWeight: 600, color: pr !== null ? '#00ff88' : '#555' }}>
                        {pr !== null ? `${pr} ${t.displayUnit || t.unit}` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{test?.name} Progress</h2>
            {currentPR && (
              <div style={{
                padding: '8px 16px',
                background: 'rgba(0,255,136,0.2)',
                borderRadius: 8,
                color: '#00ff88',
                fontWeight: 700
              }}>
                🏆 PR: {currentPR} {test?.displayUnit || test?.unit}
              </div>
            )}
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testResults}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a1a2e', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8
                  }}
                />
                {currentPR && (
                  <ReferenceLine 
                    y={currentPR} 
                    stroke="#00ff88" 
                    strokeDasharray="5 5"
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00d4ff" 
                  strokeWidth={3}
                  dot={{ fill: '#00d4ff', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: '#00ff88' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
            {testResults.length} test{testResults.length !== 1 ? 's' : ''} recorded
            {test?.direction === 'lower' && ' • Lower is better'}
            {test?.direction === 'higher' && ' • Higher is better'}
          </div>
        </div>
      )}

      {!selectedAthlete && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
          <p style={{ fontSize: 18 }}>Select an athlete above to view their dashboard.</p>
        </div>
      )}
    </div>
  );
}

// Records Page - With filters for test, age group, gender
function RecordsPage({ athletes, results, getAthleteById }) {
  const [selectedTest, setSelectedTest] = useState('');
  const [ageGroup, setAgeGroup] = useState('all');
  const [gender, setGender] = useState('all');

  const test = selectedTest ? getTestById(selectedTest) : null;

  // Get top 5 for selected test with filters
  const getTopFive = () => {
    if (!selectedTest) return [];

    // Get best result per athlete for this test
    const athleteBests = {};
    
    results
      .filter(r => r.testId === selectedTest)
      .forEach(r => {
        const athlete = getAthleteById(r.athleteId);
        if (!athlete) return;

        // Apply filters
        if (gender !== 'all' && athlete.gender !== gender) return;
        if (ageGroup === '13under' && athlete.age > 13) return;
        if (ageGroup === '14up' && athlete.age < 14) return;

        const current = athleteBests[r.athleteId];
        if (!current) {
          athleteBests[r.athleteId] = r;
        } else {
          if (test.direction === 'higher' && r.convertedValue > current.convertedValue) {
            athleteBests[r.athleteId] = r;
          } else if (test.direction === 'lower' && r.convertedValue < current.convertedValue) {
            athleteBests[r.athleteId] = r;
          }
        }
      });

    // Sort and get top 5
    const sorted = Object.values(athleteBests).sort((a, b) => {
      if (test.direction === 'higher') {
        return b.convertedValue - a.convertedValue;
      } else {
        return a.convertedValue - b.convertedValue;
      }
    });

    return sorted.slice(0, 5);
  };

  const topFive = getTopFive();

  return (
    <div>
      <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, marginBottom: 8 }}>🏆 Records</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>Top 5 performances by test, age group, and gender</p>

      {/* Filters */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Test</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option value="">Select a test...</option>
              {Object.entries(TESTS).map(([key, category]) => (
                <optgroup key={key} label={category.label}>
                  {category.tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Age Group</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option value="all">All Ages</option>
              <option value="13under">13 & Under</option>
              <option value="14up">14 & Up</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#aaa' }}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16
              }}
            >
              <option value="all">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top 5 Leaderboard */}
      {selectedTest && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(0,153,204,0.2) 100%)',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Top 5 - {test?.name}
              {ageGroup !== 'all' && ` (${ageGroup === '13under' ? '13 & Under' : '14 & Up'})`}
              {gender !== 'all' && ` - ${gender}`}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 14 }}>
              {test?.direction === 'lower' ? 'Fastest times' : 'Best results'}
            </p>
          </div>

          {topFive.length > 0 ? (
            <div>
              {topFive.map((r, i) => {
                const athlete = getAthleteById(r.athleteId);
                const medals = ['🥇', '🥈', '🥉', '4th', '5th'];
                return (
                  <div key={r.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: i === 0 ? 'rgba(255,215,0,0.1)' : 'transparent'
                  }}>
                    <div style={{
                      width: 50,
                      fontSize: i < 3 ? 28 : 18,
                      fontWeight: 700,
                      color: i < 3 ? '#fff' : '#888'
                    }}>{medals[i]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        {athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown'}
                      </div>
                      <div style={{ color: '#888', fontSize: 13 }}>
                        {athlete?.age && `${athlete.age} yrs • `}{athlete?.gender}
                        {' • '}{new Date(r.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: i === 0 ? '#ffd700' : '#00ff88'
                    }}>
                      {r.convertedValue} <span style={{ fontSize: 14, fontWeight: 500, color: '#888' }}>{test?.displayUnit || test?.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: '#666' }}>
              No results found for this filter combination.
            </div>
          )}
        </div>
      )}

      {!selectedTest && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666' }}>
          <p style={{ fontSize: 18 }}>Select a test above to view the leaderboard.</p>
        </div>
      )}
    </div>
  );
}
