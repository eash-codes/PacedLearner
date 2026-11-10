import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Edit3,
  Save,
  Check,
  Copy,
  Zap
} from 'lucide-react';
import ForgettingCurveChart from './ForgettingCurveChart';
import { useMascot } from './MascotCompanion';

export default function ProblemDetailModal({
  problem,
  onClose,
  onUpdateNotes,
  onStartReview,
  onStartInterrogation,
  onStartSurgery,
  onProblemSynced
}) {
  if (!problem) return null;

  const mascot = useMascot();
  const [activeTab, setActiveTab] = useState('notes'); // notes | code | fsrs | history
  const [isEditing, setIsEditing] = useState(false);
  const [intuition, setIntuition] = useState(problem.intuition || '');
  const [pitfalls, setPitfalls] = useState(problem.pitfalls || '');
  const [timeComplexity, setTimeComplexity] = useState(problem.time_complexity || 'O(N)');
  const [spaceComplexity, setSpaceComplexity] = useState(problem.space_complexity || 'O(1)');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushingGitHub, setIsPushingGitHub] = useState(false);
  const [githubUrl, setGithubUrl] = useState(problem.github_url || null);
  const [githubPushSuccess, setGithubPushSuccess] = useState(false);
  const timerRef = React.useRef(null);
  const copyTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handlePushToGitHub = async () => {
    try {
      setIsPushingGitHub(true);
      mascot.react('github-sync-start', {});
      const res = await fetch(`http://localhost:4100/api/github/push/${problem.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setGithubUrl(data.fileUrl);
        setGithubPushSuccess(true);
        mascot.react('github-sync-done', { count: 1 });
        if (onProblemSynced) onProblemSynced();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setGithubPushSuccess(false), 3500);
      } else {
        alert('Failed to push to GitHub: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('GitHub Push Error: ' + err.message);
    } finally {
      setIsPushingGitHub(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(problem.code_snippet || '');
    setCopied(true);
    mascot.react('code-copied', {});
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await onUpdateNotes(problem.id, {
        intuition,
        pitfalls,
        time_complexity: timeComplexity,
        space_complexity: spaceComplexity
      });
      setIsEditing(false);
      if (mascot) {
        mascot.triggerState('wink', 'fier', 'INVARIANTS UPDATED // SAVED TO VAULT.', 3200);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const diffClass = problem.difficulty === 'Easy' ? 'badge-easy' : problem.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '980px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          border: '5px solid var(--border)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.75rem 2.25rem',
          borderBottom: '3px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          background: 'var(--bg)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span className={`badge ${diffClass}`}>{problem.difficulty}</span>
              <span className={`badge badge-${(problem.mastery_level || 'learning').toLowerCase()}`}>
                {problem.mastery_level || 'Learning'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                // STABILITY: {Number(problem.fsrs_stability || 1).toFixed(1)}d • REPS: {problem.fsrs_reps || 0}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.9rem',
              fontWeight: 900,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textTransform: 'uppercase'
            }}>
              {problem.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* GitHub Push Action */}
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                title="View synced files on GitHub"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  gap: '6px',
                  color: 'var(--success)',
                  borderColor: 'var(--success)'
                }}
              >
                <Check size={13} color="var(--success)" />
                <span>GITHUB VAULT</span>
                <ExternalLink size={11} />
              </a>
            ) : (
              <button
                onClick={handlePushToGitHub}
                disabled={isPushingGitHub}
                className="btn btn-secondary"
                title="Push code & intuition writeup to GitHub"
                style={{ padding: '8px 12px', fontSize: '0.78rem', gap: '6px' }}
              >
                <span>{isPushingGitHub ? 'PUSHING...' : githubPushSuccess ? '✓ PUSHED' : 'PUSH TO GITHUB'}</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onStartReview(problem);
              }}
              className="btn btn-gold"
              style={{ padding: '8px 14px', fontSize: '0.78rem', gap: '6px' }}
            >
              <Zap size={14} />
              <span>RECALL SESSION</span>
            </button>

            {onStartInterrogation && (
              <button
                onClick={() => {
                  onClose();
                  onStartInterrogation(problem);
                }}
                className="btn btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  gap: '6px',
                  background: 'var(--text)',
                  color: 'var(--bg)'
                }}
                title="Launch Live Voice Interrogation Mode with Pacey"
              >
                <span>🎙</span>
                <span>INTERROGATE</span>
              </button>
            )}

            {onStartSurgery && (
              <button
                onClick={() => {
                  onClose();
                  onStartSurgery(problem);
                }}
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  gap: '6px',
                  border: '2px solid var(--error)',
                  color: 'var(--error)'
                }}
                title="Launch 90s Choke-Point Surgery Drill"
              >
                <span>🩸</span>
                <span>SURGERY</span>
              </button>
            )}

            <a
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.78rem', gap: '6px' }}
            >
              <span>LEETCODE</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={onClose}
              className="btn btn-secondary"
              aria-label="Close modal"
              style={{ padding: '8px 10px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '3px solid var(--border)',
          background: 'var(--bg)'
        }}>
          {[
            { id: 'notes', label: '// INVARIANTS & NOTES' },
            { id: 'code', label: '// ACCEPTED SOLUTION' },
            { id: 'fsrs', label: '// RECALL MECHANICS (FSRS)' },
            { id: 'history', label: '// SESSION HISTORY' }
          ].map((tab, idx) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: active ? 'var(--text)' : 'var(--bg)',
                  color: active ? 'var(--bg)' : 'var(--text)',
                  border: 'none',
                  borderRight: idx < 3 ? '3px solid var(--border)' : 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '2.25rem', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: NOTES & INTUITION */}
          {activeTab === 'notes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={timeComplexity}
                        onChange={(e) => setTimeComplexity(e.target.value)}
                        placeholder="Time (e.g. O(N))"
                        style={{
                          background: 'var(--bg)',
                          border: '3px solid var(--border)',
                          color: 'var(--text)',
                          padding: '6px 10px',
                          fontSize: '0.80rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700
                        }}
                      />
                      <input
                        type="text"
                        value={spaceComplexity}
                        onChange={(e) => setSpaceComplexity(e.target.value)}
                        placeholder="Space (e.g. O(1))"
                        style={{
                          background: 'var(--bg)',
                          border: '3px solid var(--border)',
                          color: 'var(--text)',
                          padding: '6px 10px',
                          fontSize: '0.80rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="tag-pill">TIME: {problem.time_complexity || 'O(N)'}</span>
                      <span className="tag-pill">SPACE: {problem.space_complexity || 'O(1)'}</span>
                    </>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="btn btn-gold"
                      style={{ padding: '8px 16px', fontSize: '0.78rem', gap: '6px' }}
                    >
                      <Save size={14} />
                      <span>{isSaving ? 'SAVING...' : 'SAVE NOTES'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.78rem', gap: '6px' }}
                    >
                      <Edit3 size={13} />
                      <span>EDIT INVARIANTS</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Intuition Block */}
              <div style={{ marginBottom: '2rem' }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}>
                  // CORE INVARIANT & ALGORITHMIC STRATEGY
                </p>
                {isEditing ? (
                  <textarea
                    value={intuition}
                    onChange={(e) => setIntuition(e.target.value)}
                    rows={6}
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '3px solid var(--border)',
                      color: 'var(--text)',
                      padding: '14px',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.6,
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--border)',
                    padding: '1.5rem',
                    color: 'var(--text)',
                    lineHeight: 1.65,
                    fontSize: '0.95rem'
                  }}>
                    {problem.intuition || 'No intuition notes saved yet. Click Edit Invariants to add notes.'}
                  </div>
                )}
              </div>

              {/* Pitfalls Block */}
              <div>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--error)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}>
                  // CRITICAL EDGE CASES & PITFALLS
                </p>
                {isEditing ? (
                  <textarea
                    value={pitfalls}
                    onChange={(e) => setPitfalls(e.target.value)}
                    rows={4}
                    placeholder="List tricky edge cases, boundary conditions, or off-by-one errors..."
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '3px solid var(--error)',
                      color: 'var(--text)',
                      padding: '14px',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.6,
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--error)',
                    padding: '1.25rem 1.5rem',
                    color: 'var(--error)',
                    fontWeight: 600,
                    lineHeight: 1.6,
                    fontSize: '0.92rem'
                  }}>
                    {problem.pitfalls || 'No edge cases documented yet.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACCEPTED CODE */}
          {activeTab === 'code' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}>
                  LANGUAGE: <strong>{problem.language || 'python3'}</strong>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '6px' }}
                >
                  {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                  <span>{copied ? 'COPIED' : 'COPY CODE'}</span>
                </button>
              </div>

              <div style={{
                background: 'var(--bg)',
                border: '3px solid var(--border)',
                overflow: 'hidden'
              }}>
                <pre style={{
                  padding: '1.5rem',
                  margin: 0,
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  color: 'var(--text)',
                  overflowX: 'auto',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <code>{problem.code_snippet || '# No code recorded for this session.'}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: FSRS & FORGETTING CURVE */}
          {activeTab === 'fsrs' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', background: 'var(--border)', border: '3px solid var(--border)', marginBottom: '1.75rem' }}>
                <div style={{ background: 'var(--bg)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}>FSRS STABILITY</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                    {problem.fsrs_stability}d
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    Interval to reach 90% retention
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}>ESTIMATED DIFFICULTY</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                    {problem.fsrs_difficulty} / 10
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    Derived cognitive complexity
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}>CURRENT RETENTION</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: problem.retrievability >= 0.9 ? 'var(--success)' : 'var(--error)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>
                    {Math.round(problem.retrievability * 100)}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    Probability of successful retrieval
                  </div>
                </div>
              </div>

              <ForgettingCurveChart
                stability={problem.fsrs_stability}
                elapsedDays={2}
                currentRetrievability={problem.retrievability}
                intervalDays={problem.interval_days}
              />
            </div>
          )}

          {/* TAB 4: ATTEMPT HISTORY */}
          {activeTab === 'history' && (
            <div>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                // SOLVE & REVIEW HISTORY
              </p>

              {(problem.reviews || []).length === 0 ? (
                <p style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>No past review records available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {problem.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '1rem 1.25rem',
                        background: 'var(--bg)',
                        border: '3px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            fontFamily: 'var(--font-mono)',
                            color: rev.rating >= 3 ? 'var(--success)' : rev.rating === 2 ? 'var(--warning)' : 'var(--error)'
                          }}>
                            RATING: {rev.rating === 4 ? 'EASY' : rev.rating === 3 ? 'GOOD' : rev.rating === 2 ? 'HARD' : 'AGAIN'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            INTERVAL: {rev.interval_days}d
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                          STABILITY: {rev.stability_before?.toFixed(1)}d ➔ {rev.stability_after?.toFixed(1)}d
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {new Date(rev.reviewed_at).toLocaleDateString()} {new Date(rev.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
