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

export default function ProblemDetailModal({
  problem,
  onClose,
  onUpdateNotes,
  onStartReview,
  onProblemSynced
}) {
  if (!problem) return null;

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
      const res = await fetch(`http://localhost:4100/api/github/push/${problem.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setGithubUrl(data.fileUrl);
        setGithubPushSuccess(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const diffClass = problem.difficulty === 'Easy' ? 'badge-easy' : problem.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '980px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          position: 'relative'
        }}
      >
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />

        {/* Modal Header */}
        <div style={{
          padding: '1.75rem 2.25rem',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          background: 'var(--bg-surface)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className={`badge ${diffClass}`}>{problem.difficulty}</span>
              <span className={`badge badge-${(problem.mastery_level || 'learning').toLowerCase()}`}>
                {problem.mastery_level || 'Learning'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--cyber-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                // STABILITY: {Number(problem.fsrs_stability || 1).toFixed(1)}d • REPS: {problem.fsrs_reps || 0}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-tech)',
              fontSize: '1.9rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
              lineHeight: 1.2
            }}>
              {problem.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  fontSize: '0.80rem',
                  gap: '6px',
                  color: 'var(--emerald-primary, #10b981)',
                  borderColor: 'rgba(16, 185, 129, 0.3)'
                }}
              >
                <Check size={13} color="var(--emerald-primary, #10b981)" />
                <span>GitHub Vault</span>
                <ExternalLink size={11} />
              </a>
            ) : (
              <button
                onClick={handlePushToGitHub}
                disabled={isPushingGitHub}
                className="btn btn-secondary"
                title="Push code & intuition writeup to GitHub"
                style={{ padding: '8px 12px', fontSize: '0.80rem', gap: '6px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>{isPushingGitHub ? 'Pushing...' : githubPushSuccess ? '✓ Pushed' : 'Push to GitHub'}</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onStartReview(problem);
              }}
              className="btn btn-gold"
              style={{ padding: '8px 14px', fontSize: '0.80rem', gap: '6px' }}
            >
              <Zap size={14} />
              <span>Recall Session</span>
            </button>


            <a
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.80rem', gap: '6px' }}
            >
              <span>LeetCode</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '1.75rem',
          padding: '0 2.25rem',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'rgba(255, 255, 255, 0.015)'
        }}>
          {[
            { id: 'notes', label: '// INVARIANTS & NOTES' },
            { id: 'code', label: '// ACCEPTED SOLUTION' },
            { id: 'fsrs', label: '// RECALL MECHANICS (FSRS)' },
            { id: 'history', label: '// SESSION HISTORY' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 6px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--cyber-cyan)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--cyber-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.80rem',
                fontFamily: 'var(--font-tech)',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                textShadow: activeTab === tab.id ? '0 0 10px var(--cyber-cyan-glow)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
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
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius-xs)',
                          padding: '6px 10px',
                          fontSize: '0.80rem',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                      <input
                        type="text"
                        value={spaceComplexity}
                        onChange={(e) => setSpaceComplexity(e.target.value)}
                        placeholder="Space (e.g. O(1))"
                        style={{
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius-xs)',
                          padding: '6px 10px',
                          fontSize: '0.80rem',
                          fontFamily: 'var(--font-mono)'
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="tag-pill" style={{ color: 'var(--emerald-primary)' }}>Time: {problem.time_complexity || 'O(N)'}</span>
                      <span className="tag-pill" style={{ color: 'var(--emerald-primary)' }}>Space: {problem.space_complexity || 'O(1)'}</span>
                    </>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="btn btn-gold"
                      style={{ padding: '7px 16px', fontSize: '0.80rem', gap: '6px' }}
                    >
                      <Save size={14} />
                      <span>{isSaving ? 'Saving...' : 'Save Notes'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-secondary"
                      style={{ padding: '7px 14px', fontSize: '0.80rem', gap: '6px' }}
                    >
                      <Edit3 size={13} />
                      <span>Edit Invariants</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Intuition Block */}
              <div style={{ marginBottom: '2rem' }}>
                <p style={{
                  fontSize: '0.72rem',
                  color: 'var(--gold-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)'
                }}>
                  Core Invariant & Algorithmic Strategy
                </p>
                {isEditing ? (
                  <textarea
                    value={intuition}
                    onChange={(e) => setIntuition(e.target.value)}
                    rows={6}
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      padding: '14px',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.6,
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.5rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.65,
                    fontSize: '0.94rem'
                  }}>
                    {problem.intuition || 'No intuition notes saved yet. Click Edit Invariants to add notes.'}
                  </div>
                )}
              </div>

              {/* Pitfalls Block */}
              <div>
                <p style={{
                  fontSize: '0.72rem',
                  color: 'var(--crimson-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)'
                }}>
                  Critical Edge Cases & Pitfalls
                </p>
                {isEditing ? (
                  <textarea
                    value={pitfalls}
                    onChange={(e) => setPitfalls(e.target.value)}
                    rows={4}
                    placeholder="List tricky edge cases, boundary conditions, or off-by-one errors..."
                    style={{
                      width: '100%',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      padding: '14px',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.6,
                      outline: 'none'
                    }}
                  />
                ) : (
                  <div style={{
                    background: 'var(--crimson-tint)',
                    border: '1px solid var(--crimson-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem 1.5rem',
                    color: 'var(--crimson-primary)',
                    fontWeight: 500,
                    lineHeight: 1.6,
                    fontSize: '0.90rem'
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
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Language: <strong style={{ color: '#fff' }}>{problem.language || 'python3'}</strong>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
                >
                  {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              <div style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden'
              }}>
                <pre style={{
                  padding: '1.5rem',
                  margin: 0,
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>FSRS STABILITY</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
                    {problem.fsrs_stability}d
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Interval to reach 90% retention
                  </div>
                </div>

                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>ESTIMATED DIFFICULTY</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-light)', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
                    {problem.fsrs_difficulty} / 10
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Derived cognitive complexity
                  </div>
                </div>

                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>CURRENT RETENTION</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: problem.retrievability >= 0.9 ? '#10b981' : '#fb7185', marginTop: '4px', fontFamily: 'var(--font-serif)' }}>
                    {Math.round(problem.retrievability * 100)}%
                  </div>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1rem',
                fontFamily: 'var(--font-mono)'
              }}>
                Solve & Review History
              </p>

              {(problem.reviews || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No past review records available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {problem.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            fontFamily: 'var(--font-mono)',
                            color: rev.rating === 4 ? '#34d399' : rev.rating === 3 ? 'var(--gold-light)' : rev.rating === 2 ? '#fbbf24' : '#fb7185'
                          }}>
                            Rating: {rev.rating === 4 ? 'Easy' : rev.rating === 3 ? 'Good' : rev.rating === 2 ? 'Hard' : 'Again'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Interval: {rev.interval_days}d
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                          Stability: {rev.stability_before?.toFixed(1)}d ➔ {rev.stability_after?.toFixed(1)}d
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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
