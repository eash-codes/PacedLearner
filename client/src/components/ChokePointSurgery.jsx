import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import BloubAvatar from './BloubAvatar.jsx';
import { speakWithVoiceStudio, stopPaceyAudio } from '../bot/voiceStudioClient.js';
import { useMascot } from './MascotCompanion.jsx';

const API_BASE = 'http://localhost:4100/api';
const TOTAL_SURGERY_TIME_MS = 90000; // 90 seconds limit

export default function ChokePointSurgery({
  allProblems = [],
  onSelectProblem,
  onBackToReviews
}) {
  const mascot = useMascot();

  // Mode: 'VAULT' | 'DRILL'
  const [viewMode, setViewMode] = useState('VAULT');
  const [chokePoints, setChokePoints] = useState([]);
  const [duePoints, setDuePoints] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    due: 0,
    total_reviews: 0,
    pass_rate: 100,
    avg_elapsed_seconds: 0
  });
  const [loading, setLoading] = useState(true);

  // Active Surgery Drill State
  const [activeChoke, setActiveChoke] = useState(null);
  const [userCode, setUserCode] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [paceyVerdict, setPaceyVerdict] = useState(null);
  const [isDrillCompleted, setIsDrillCompleted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Pacey avatar reaction in surgery room
  const [avatarExpr, setAvatarExpr] = useState('attentif');
  const [avatarState, setAvatarState] = useState('idle');

  // Extraction Modal State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [extractCustomCode, setExtractCustomCode] = useState('');
  const [extractTitle, setExtractTitle] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const editorRef = useRef(null);

  // Fetch all choke points and stats
  const fetchChokeData = useCallback(async () => {
    try {
      setLoading(true);
      const [allRes, dueRes, statRes] = await Promise.all([
        fetch(`${API_BASE}/choke-points`),
        fetch(`${API_BASE}/choke-points/due`),
        fetch(`${API_BASE}/choke-points/stats`)
      ]);

      if (allRes.ok) {
        const data = await allRes.json();
        setChokePoints(data.choke_points || []);
      }
      if (dueRes.ok) {
        const data = await dueRes.json();
        setDuePoints(data.choke_points || []);
      }
      if (statRes.ok) {
        const data = await statRes.json();
        setStats(data.stats || {
          total: 0,
          due: 0,
          total_reviews: 0,
          pass_rate: 100,
          avg_elapsed_seconds: 0
        });
      }
    } catch (err) {
      console.error('[ChokePoint Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChokeData();
  }, [fetchChokeData]);

  // Clean audio & timers on unmount
  useEffect(() => {
    return () => {
      stopPaceyAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer loop for active drill
  useEffect(() => {
    if (isTimerRunning && !isDrillCompleted) {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = now - startTimeRef.current;
        setElapsedMs(currentElapsed);

        const remainingMs = Math.max(0, TOTAL_SURGERY_TIME_MS - currentElapsed);

        // Pacey reaction based on urgency
        if (remainingMs <= 15000 && remainingMs > 0) {
          setAvatarExpr('effraye');
          setAvatarState('alert');
        } else if (remainingMs <= 30000 && remainingMs > 15000) {
          setAvatarExpr('mefiant');
          setAvatarState('wide');
        }

        // Time expired
        if (currentElapsed >= TOTAL_SURGERY_TIME_MS) {
          clearInterval(timerRef.current);
          setIsTimerRunning(false);
          handleTimeExpired();
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, isDrillCompleted]);

  // Start a surgery drill on a specific choke point
  const handleStartDrill = (choke) => {
    setActiveChoke(choke);
    setUserCode('');
    setElapsedMs(0);
    setTestResults(null);
    setPaceyVerdict(null);
    setIsDrillCompleted(false);
    setIsRevealed(false);
    setAvatarExpr('attentif');
    setAvatarState('idle');
    setViewMode('DRILL');
    setIsTimerRunning(true);

    if (mascot) {
      mascot.react('alert', { msg: `SURGERY INITIALIZED: ${choke.title}` });
    }

    // Auto-focus editor after switch
    setTimeout(() => {
      if (editorRef.current) editorRef.current.focus();
    }, 150);
  };

  // Run dry tests (Ctrl+Enter)
  const handleRunTests = async () => {
    if (!activeChoke || isRunningTest) return;

    try {
      setIsRunningTest(true);
      const res = await fetch(`${API_BASE}/choke-points/${activeChoke.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: userCode })
      });

      const data = await res.json();
      if (data.success) {
        setTestResults(data.test_run);
        if (data.test_run.passed) {
          setAvatarExpr('heureux');
          setAvatarState('wink');
        } else {
          setAvatarExpr('colere');
          setAvatarState('exclaim');
        }
      }
    } catch (err) {
      console.error('[Run Tests Error]:', err);
    } finally {
      setIsRunningTest(false);
    }
  };

  // Finalize surgery (submits to FSRS, records review, triggers Pacey critique)
  const handleFinalizeSurgery = async () => {
    if (!activeChoke || isRunningTest || isDrillCompleted) return;

    try {
      setIsRunningTest(true);
      setIsTimerRunning(false);

      const res = await fetch(`${API_BASE}/choke-points/${activeChoke.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_code: userCode,
          elapsed_ms: elapsedMs
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResults(data.test_run);
        setPaceyVerdict(data.pacey_verdict);
        setIsDrillCompleted(true);

        if (data.test_run.passed) {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.7 } });
          setAvatarExpr(data.pacey_verdict.expression || 'fier');
          setAvatarState(data.pacey_verdict.state || 'orbit');
        } else {
          setAvatarExpr(data.pacey_verdict.expression || 'mefiant');
          setAvatarState(data.pacey_verdict.state || 'exclaim');
        }

        // Speak Pacey critique aloud
        if (data.pacey_verdict?.critique) {
          speakWithVoiceStudio(data.pacey_verdict.critique, {
            onStart: () => setAvatarState('orbit'),
            onEnd: () => setAvatarState('idle')
          });
        }

        fetchChokeData();
      }
    } catch (err) {
      console.error('[Finalize Surgery Error]:', err);
      setIsTimerRunning(true);
    } finally {
      setIsRunningTest(false);
    }
  };

  // Time expired handler
  const handleTimeExpired = async () => {
    if (!activeChoke || isDrillCompleted) return;
    setIsDrillCompleted(true);
    setAvatarExpr('colere');
    setAvatarState('burst');

    try {
      const res = await fetch(`${API_BASE}/choke-points/${activeChoke.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_code: userCode,
          elapsed_ms: TOTAL_SURGERY_TIME_MS,
          explicit_rating: 1 // Again / Lapse
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResults(data.test_run);
        setPaceyVerdict(data.pacey_verdict);
        if (data.pacey_verdict?.critique) {
          speakWithVoiceStudio(data.pacey_verdict.critique, {
            onStart: () => setAvatarState('burst'),
            onEnd: () => setAvatarState('idle')
          });
        }
        fetchChokeData();
      }
    } catch (err) {
      console.error('[Time Expired Review Error]:', err);
    }
  };

  // Reveal canonical choke code
  const handleRevealAnswer = () => {
    setIsRevealed(true);
    setIsTimerRunning(false);
    setIsDrillCompleted(true);
    setAvatarExpr('hilare');
    setAvatarState('burst');

    const msg = 'YOU SURRENDERED. Canonical hinge revealed. FSRS marked as lapsed.';
    speakWithVoiceStudio(msg, {});

    // Log a lapsed review
    fetch(`${API_BASE}/choke-points/${activeChoke.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_code: userCode || '// SURRENDERED',
        elapsed_ms: elapsedMs,
        explicit_rating: 1
      })
    }).then(fetchChokeData);
  };

  // Advance to next due surgery
  const handleNextSurgery = () => {
    const remainingDue = duePoints.filter(cp => cp.id !== activeChoke?.id);
    if (remainingDue.length > 0) {
      handleStartDrill(remainingDue[0]);
    } else {
      setViewMode('VAULT');
      setActiveChoke(null);
    }
  };

  // Keydown handler in the editor: Tab for 2 spaces, Ctrl+Enter to test
  const handleEditorKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setUserCode(newValue);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunTests();
    }
  };

  // Extraction logic from modal
  const handleExtractChokePoint = async () => {
    try {
      setIsExtracting(true);
      setExtractError(null);

      let codeToExtract = extractCustomCode;
      let problemTitle = extractTitle;
      let problemId = null;

      if (selectedProblemId) {
        const prob = allProblems.find(p => p.id === selectedProblemId);
        if (prob) {
          codeToExtract = prob.code_snippet || prob.codeSnippet || codeToExtract;
          problemTitle = prob.title || problemTitle;
          problemId = prob.id;
        }
      }

      if (!codeToExtract || !codeToExtract.trim()) {
        throw new Error('Please enter or select a problem code snippet to extract.');
      }

      const res = await fetch(`${API_BASE}/choke-points/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToExtract,
          title: problemTitle || 'Algorithmic Problem',
          problemId,
          language: 'javascript'
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      // Save to database
      const saveRes = await fetch(`${API_BASE}/choke-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.choke_point)
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Failed to save choke point');

      await fetchChokeData();
      setIsExtractModalOpen(false);
      setExtractCustomCode('');
      setExtractTitle('');
      setSelectedProblemId('');

      // Auto-start drill on newly created point
      handleStartDrill(saveData.choke_point);
    } catch (err) {
      console.error('[Extract Error]:', err);
      setExtractError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  // Helper: split scaffold code into top and bottom parts around the placeholder
  const getScaffoldParts = (scaffoldCode = '') => {
    const placeholderRegex = /(\/\/\s*___CHOKE_POINT___|\/\*\s*___CHOKE_POINT___\s*\*\/|___CHOKE_POINT___)/;
    const parts = scaffoldCode.split(placeholderRegex);
    if (parts.length >= 2) {
      return { top: parts[0], bottom: parts.slice(2).join('') };
    }
    return { top: scaffoldCode, bottom: '' };
  };

  const remainingSeconds = Math.max(0, Math.ceil((TOTAL_SURGERY_TIME_MS - elapsedMs) / 1000));
  const progressPct = Math.min(100, Math.max(0, ((TOTAL_SURGERY_TIME_MS - elapsedMs) / TOTAL_SURGERY_TIME_MS) * 100));

  const timerColor = remainingSeconds > 45 ? 'var(--text)' : remainingSeconds > 20 ? '#FFCC00' : 'var(--error)';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* ============================================================== */}
      {/* MODE 1: SURGERY DRILL ARENA (CODE OR DIE) */}
      {/* ============================================================== */}
      {viewMode === 'DRILL' && activeChoke && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Status & Timer Bar */}
          <div style={{
            border: '4px solid var(--border)',
            background: 'var(--bg)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '2px',
                color: timerColor,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: timerColor,
                  borderRadius: '50%'
                }} />
                [ SURGERY ROOM // CHOKE-POINT DRILL ]
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                textTransform: 'uppercase',
                margin: 0,
                letterSpacing: '-0.5px'
              }}>
                {activeChoke.title}
              </h2>
            </div>

            {/* Live 90s Countdown & Pacey Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  letterSpacing: '1px',
                  color: 'var(--text-muted)'
                }}>
                  TIME REMAINING
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  color: timerColor,
                  lineHeight: 1
                }}>
                  {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                </div>
              </div>

              {/* 3D Pacey Watcher */}
              <div style={{
                width: '64px',
                height: '64px',
                border: '3px solid var(--border)',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <BloubAvatar
                  size={58}
                  expression={avatarExpr}
                  state={avatarState}
                  lookAt={{ x: 0.5, y: 0.5 }}
                  isDark={true}
                />
              </div>
            </div>
          </div>

          {/* Adrenaline Timer Bar */}
          <div style={{
            width: '100%',
            height: '8px',
            border: '2px solid var(--border)',
            background: 'var(--bg-card)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: timerColor,
              transition: 'width 0.1s linear, background-color 0.3s ease'
            }} />
          </div>

          {/* Algorithmic Hinge Objective Banner */}
          <div style={{
            background: 'var(--bg-card)',
            border: '3px solid var(--border)',
            padding: '1rem 1.25rem'
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '1.5px',
              color: 'var(--text-muted)',
              marginBottom: '4px'
            }}>
              HINGE OBJECTIVE // COMPLETE FROM MEMORY:
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              {activeChoke.description}
            </div>
          </div>

          {/* The Code Arena: Scaffold Context + Surgery Box */}
          <div style={{
            border: '4px solid var(--border)',
            background: '#0D0D0D',
            color: '#ECECEC',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.92rem'
          }}>
            {/* Scaffold Top (Read-only) */}
            <div style={{
              padding: '1rem 1.25rem',
              opacity: 0.5,
              whiteSpace: 'pre',
              userSelect: 'none',
              overflowX: 'auto',
              borderBottom: '2px dashed #333'
            }}>
              {getScaffoldParts(activeChoke.scaffold_code).top}
            </div>

            {/* Active Surgery Box */}
            <div style={{
              background: '#000',
              borderTop: '3px solid #FF3B30',
              borderBottom: '3px solid #FF3B30',
              padding: '0.5rem 1.25rem',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '0.7rem',
                color: '#FF3B30',
                fontWeight: 900,
                letterSpacing: '1px',
                marginBottom: '6px'
              }}>
                ▼ SURGERY ZONE // WRITE ONLY THE 3-8 CRITICAL LINES:
              </div>
              <textarea
                ref={editorRef}
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                disabled={isDrillCompleted}
                placeholder="// Type only the algorithmic hinge lines here from muscle memory...&#10;// Hotkey: [Ctrl+Enter] to run tests instantly."
                rows={6}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.98rem',
                  lineHeight: '1.5',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  caretColor: '#FF3B30'
                }}
              />
            </div>

            {/* Scaffold Bottom (Read-only) */}
            <div style={{
              padding: '1rem 1.25rem',
              opacity: 0.5,
              whiteSpace: 'pre',
              userSelect: 'none',
              overflowX: 'auto',
              borderTop: '2px dashed #333'
            }}>
              {getScaffoldParts(activeChoke.scaffold_code).bottom}
            </div>
          </div>

          {/* Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleRunTests}
                disabled={isRunningTest || isDrillCompleted}
                className="btn btn-secondary"
                style={{
                  border: '3px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800
                }}
              >
                {isRunningTest ? 'TESTING...' : '⚡ RUN TESTS [Ctrl+Enter]'}
              </button>

              <button
                onClick={handleFinalizeSurgery}
                disabled={isRunningTest || isDrillCompleted}
                className="btn btn-primary"
                style={{
                  border: '3px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  background: 'var(--text)',
                  color: 'var(--bg)'
                }}
              >
                🔥 FINALIZE SURGERY
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isDrillCompleted && (
                <button
                  onClick={handleRevealAnswer}
                  className="btn btn-ghost"
                  style={{
                    border: '2px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--error)'
                  }}
                >
                  🏳️ GIVE UP / REVEAL
                </button>
              )}

              <button
                onClick={() => {
                  stopPaceyAudio();
                  setViewMode('VAULT');
                }}
                className="btn btn-ghost"
                style={{
                  border: '2px solid var(--border)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                EXIT TO VAULT
              </button>
            </div>
          </div>

          {/* Canonical Code Reveal (if given up or completed) */}
          {isRevealed && (
            <div style={{
              border: '3px solid var(--error)',
              background: 'var(--bg-card)',
              padding: '1.25rem'
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--error)',
                marginBottom: '8px'
              }}>
                CANONICAL HINGE SOLUTION:
              </div>
              <pre style={{
                background: '#000',
                color: '#34C759',
                padding: '1rem',
                fontFamily: 'var(--font-mono)',
                margin: 0,
                overflowX: 'auto'
              }}>
                {activeChoke.choke_code}
              </pre>
            </div>
          )}

          {/* Live Test Results Console */}
          {testResults && (
            <div style={{
              border: '3px solid var(--border)',
              background: 'var(--bg-card)',
              padding: '1.25rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '0.5rem'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 900
                }}>
                  ASSERTION RESULTS // {testResults.passedCount} OF {testResults.total} PASSED ({testResults.executionTimeMs}ms)
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  color: testResults.passed ? '#34C759' : 'var(--error)'
                }}>
                  {testResults.passed ? '● ALL PASSED' : '▲ VERIFICATION FAILED'}
                </span>
              </div>

              {testResults.syntaxError && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 59, 48, 0.1)',
                  border: '2px solid var(--error)',
                  color: 'var(--error)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {testResults.syntaxError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {testResults.results.map((r, i) => (
                  <div key={i} style={{
                    padding: '0.75rem 1rem',
                    border: `2px solid ${r.passed ? '#34C759' : 'var(--error)'}`,
                    background: r.passed ? 'rgba(52, 199, 89, 0.05)' : 'rgba(255, 59, 48, 0.05)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>{r.description}</span>
                      <span style={{ color: r.passed ? '#34C759' : 'var(--error)' }}>
                        {r.passed ? '[PASS]' : '[FAIL]'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Input: {JSON.stringify(r.input)}
                    </div>
                    <div style={{ fontSize: '0.78rem' }}>
                      Expected: <code style={{ color: '#34C759' }}>{JSON.stringify(r.expected)}</code> |
                      Actual: <code style={{ color: r.passed ? '#34C759' : 'var(--error)' }}>{JSON.stringify(r.actual)}</code>
                    </div>
                    {r.error && (
                      <div style={{ color: 'var(--error)', fontSize: '0.75rem' }}>
                        Error: {r.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debrief & Pacey Psychological Verdict Banner */}
          {isDrillCompleted && paceyVerdict && (
            <div style={{
              border: '4px solid var(--border)',
              background: 'var(--bg)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.3rem',
                color: testResults?.passed ? '#34C759' : 'var(--error)',
                letterSpacing: '-0.5px'
              }}>
                {paceyVerdict.verdict}
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                padding: '1rem',
                background: 'var(--bg-card)',
                border: '2px solid var(--border)'
              }}>
                <span style={{ fontWeight: 800, color: 'var(--text)' }}>PACEY: </span>
                "{paceyVerdict.critique}"
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  FSRS Stability: <strong>{activeChoke.fsrs_stability?.toFixed(1) || '2.0'}</strong> ➔{' '}
                  <span style={{ color: testResults?.passed ? '#34C759' : 'var(--error)' }}>
                    {testResults?.passed ? 'BOOSTED' : 'LAPSED'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleNextSurgery}
                    className="btn btn-primary"
                    style={{
                      border: '3px solid var(--border)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800
                    }}
                  >
                    NEXT SURGERY ➔
                  </button>
                  <button
                    onClick={() => {
                      stopPaceyAudio();
                      setViewMode('VAULT');
                    }}
                    className="btn btn-secondary"
                    style={{
                      border: '3px solid var(--border)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    BACK TO VAULT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: CHOKE-POINT VAULT & DRILL MANAGER */}
      {/* ============================================================== */}
      {viewMode === 'VAULT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Header & Stats Banner */}
          <div style={{
            border: '4px solid var(--border)',
            background: 'var(--bg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: 'var(--text-muted)'
                }}>
                  [ ACTIVE RECALL SYSTEM // ZERO BS ]
                </div>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.2rem',
                  textTransform: 'uppercase',
                  margin: '4px 0 0 0',
                  letterSpacing: '-1px'
                }}>
                  CHOKE-POINT SURGERY
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {duePoints.length > 0 && (
                  <button
                    onClick={() => handleStartDrill(duePoints[0])}
                    className="btn btn-primary"
                    style={{
                      border: '3px solid var(--border)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      background: 'var(--error)',
                      color: '#FFF'
                    }}
                  >
                    🩸 OPERATE ON DUE ({duePoints.length})
                  </button>
                )}

                <button
                  onClick={() => setIsExtractModalOpen(true)}
                  className="btn btn-secondary"
                  style={{
                    border: '3px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800
                  }}
                >
                  + EXTRACT NEW CHOKE POINT
                </button>
              </div>
            </div>

            {/* Brutalist Stats Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              borderTop: '2px solid var(--border)',
              paddingTop: '1.25rem'
            }}>
              <div style={{ border: '2px solid var(--border)', padding: '0.75rem 1rem', background: 'var(--bg-card)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>SURGERIES DUE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 900, color: duePoints.length > 0 ? 'var(--error)' : 'var(--text)' }}>
                  {duePoints.length}
                </div>
              </div>

              <div style={{ border: '2px solid var(--border)', padding: '0.75rem 1rem', background: 'var(--bg-card)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL IN VAULT</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 900 }}>
                  {stats.total || chokePoints.length}
                </div>
              </div>

              <div style={{ border: '2px solid var(--border)', padding: '0.75rem 1rem', background: 'var(--bg-card)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACCURACY RATE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 900, color: '#34C759' }}>
                  {stats.pass_rate}%
                </div>
              </div>

              <div style={{ border: '2px solid var(--border)', padding: '0.75rem 1rem', background: 'var(--bg-card)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>AVG SURGERY TIME</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 900 }}>
                  {stats.avg_elapsed_seconds}s
                </div>
              </div>
            </div>
          </div>

          {/* Choke Points List */}
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              letterSpacing: '-0.5px'
            }}>
              ALL EXTRACTED HINGES ({chokePoints.length})
            </div>

            {loading ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                border: '3px dashed var(--border)'
              }}>
                LOADING CHOKE POINTS...
              </div>
            ) : chokePoints.length === 0 ? (
              <div style={{
                padding: '3.5rem 2rem',
                textAlign: 'center',
                border: '4px dashed var(--border)',
                background: 'var(--bg-card)'
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  marginBottom: '8px'
                }}>
                  NO CHOKE POINTS EXTRACTED YET
                </div>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  maxWidth: '540px',
                  margin: '0 auto 1.5rem auto'
                }}>
                  Choke-Point Surgery eliminates passive flashcards. Extract the 4-8 line mathematical hinge from your problems and drill them in 90-second sprints.
                </p>
                <button
                  onClick={() => setIsExtractModalOpen(true)}
                  className="btn btn-primary"
                  style={{
                    border: '3px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800
                  }}
                >
                  + EXTRACT FIRST CHOKE POINT
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                {chokePoints.map((cp) => (
                  <div
                    key={cp.id}
                    style={{
                      border: `3px solid ${cp.is_due ? 'var(--error)' : 'var(--border)'}`,
                      background: 'var(--bg-card)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: cp.is_due ? '4px 4px 0px var(--error)' : '4px 4px 0px var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          background: cp.is_due ? 'var(--error)' : 'var(--text)',
                          color: 'var(--bg)'
                        }}>
                          {cp.is_due ? 'DUE FOR SURGERY' : 'RETAINED'}
                        </span>

                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)'
                        }}>
                          {cp.language}
                        </span>
                      </div>

                      <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.15rem',
                        margin: '0 0 6px 0',
                        textTransform: 'uppercase'
                      }}>
                        {cp.title}
                      </h3>

                      <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        {cp.description}
                      </p>
                    </div>

                    <div style={{
                      borderTop: '2px dashed var(--border)',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        Stability: <strong>{cp.fsrs_stability?.toFixed(1) || '2.0'}</strong>
                      </div>

                      <button
                        onClick={() => handleStartDrill(cp)}
                        className="btn btn-secondary"
                        style={{
                          border: '2px solid var(--border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '4px 10px'
                        }}
                      >
                        ⚡ OPERATE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EXTRACT / CREATE CHOKE POINT MODAL */}
      {/* ============================================================== */}
      {isExtractModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg)',
            border: '5px solid var(--border)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '8px 8px 0px #000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  [ SURGICAL CARVER // AI & AST ]
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
                  EXTRACT CHOKE POINT
                </h2>
              </div>
              <button
                onClick={() => setIsExtractModalOpen(false)}
                className="btn btn-ghost"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}
              >
                [X]
              </button>
            </div>

            {extractError && (
              <div style={{
                background: 'rgba(255, 59, 48, 0.1)',
                border: '2px solid var(--error)',
                color: 'var(--error)',
                padding: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {extractError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Option A: Select from Problem Vault */}
              {allProblems.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>
                    SELECT FROM EXISTING PROBLEM VAULT:
                  </label>
                  <select
                    value={selectedProblemId}
                    onChange={(e) => {
                      setSelectedProblemId(e.target.value);
                      const p = allProblems.find(x => x.id === e.target.value);
                      if (p) {
                        setExtractTitle(p.title);
                        setExtractCustomCode(p.code_snippet || p.codeSnippet || '');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-card)',
                      border: '2px solid var(--border)',
                      color: 'var(--text)'
                    }}
                  >
                    <option value="">-- Choose a Problem --</option>
                    {allProblems.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Problem Title */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>
                  PROBLEM TITLE:
                </label>
                <input
                  type="text"
                  value={extractTitle}
                  onChange={(e) => setExtractTitle(e.target.value)}
                  placeholder="e.g. Longest Substring Without Repeating Characters"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    color: 'var(--text)'
                  }}
                />
              </div>

              {/* Code Snippet */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>
                  FULL SOLUTION CODE:
                </label>
                <textarea
                  value={extractCustomCode}
                  onChange={(e) => setExtractCustomCode(e.target.value)}
                  placeholder="Paste complete solution code here..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    background: '#000',
                    color: '#FFF',
                    border: '2px solid var(--border)',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setIsExtractModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontFamily: 'var(--font-mono)', border: '2px solid var(--border)' }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleExtractChokePoint}
                  disabled={isExtracting}
                  className="btn btn-primary"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    border: '2px solid var(--border)'
                  }}
                >
                  {isExtracting ? 'CARVING HINGE...' : '⚡ AUTO-EXTRACT & DRILL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
