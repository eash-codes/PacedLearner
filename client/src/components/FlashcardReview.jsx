import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import ForgettingCurveChart from './ForgettingCurveChart';
import { useMascot } from './MascotCompanion.jsx';

export default function FlashcardReview({
  dueProblems = [],
  onGradeReview,
  onSelectProblem,
  onSwitchToNotebook,
  onStartInterrogation
}) {
  const mascot = useMascot();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const copyTimerRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setRevealStage(1);
    setCopied(false);
    setHint(null);
    setHintLevel(0);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, [currentIndex]);

  const currentProblem = dueProblems[currentIndex];

  const handleRequestHint = async () => {
    if (loadingHint || !currentProblem) return;
    const nextLevel = Math.min(3, hintLevel + 1);
    setLoadingHint(true);
    if (mascot) mascot.react('hint-loading', { level: nextLevel });
    try {
      const res = await fetch(`http://localhost:4100/api/reviews/${currentProblem.id}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintLevel: nextLevel })
      });
      if (res.ok) {
        const data = await res.json();
        setHint(data.hint);
        setHintLevel(nextLevel);
        if (mascot) mascot.react('hint-received', { level: nextLevel });
      }
    } catch (err) {
      console.error('Failed to get hint:', err);
    } finally {
      setLoadingHint(false);
    }
  };

  const handleAdvanceReveal = (nextStage) => {
    setRevealStage(nextStage);
    if (mascot) {
      if (nextStage === 2) mascot.react('reveal-stage-2');
      else if (nextStage === 3) mascot.react('reveal-stage-3');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentProblem) return;
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (revealStage === 1) handleAdvanceReveal(2);
        else if (revealStage === 2) handleAdvanceReveal(3);
      } else if (revealStage === 3) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          handleGrade(parseInt(e.key, 10));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealStage, currentProblem]);

  const handleGrade = async (rating) => {
    if (isSubmitting || !currentProblem) return;
    setIsSubmitting(true);
    if (mascot) mascot.react(`grade-${rating}`);
    try {
      await onGradeReview(currentProblem.id, rating);
      if (rating >= 3 && currentIndex === dueProblems.length - 1) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: mascot?.inverted ? ['#FFFFFF', '#BBBBBB', '#888888'] : ['#000000', '#444444', '#888888']
        });
        if (mascot) mascot.react('queue-clear');
      }
      if (currentIndex < dueProblems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!currentProblem?.code_snippet) return;
    navigator.clipboard.writeText(currentProblem.code_snippet);
    setCopied(true);
    if (mascot) mascot.react('copy-code');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // === Queue Empty ===
  if (dueProblems.length === 0 || currentIndex >= dueProblems.length) {
    return (
      <div style={{
        maxWidth: '880px',
        margin: '60px auto',
        padding: '0 24px'
      }}>
        <div style={{
          textAlign: 'left',
          padding: '40px',
          border: '5px solid var(--border)',
          background: 'var(--bg)'
        }}>
          <h2 style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '48px',
            lineHeight: 1.05,
            marginBottom: '16px',
            color: 'var(--text)'
          }}>
            QUEUE CLEAR
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            maxWidth: '480px',
            lineHeight: 1.6,
            marginBottom: '40px',
            fontFamily: "'Work Sans', sans-serif"
          }}>
            All scheduled recall sessions are complete. Memory retention is sustained above 90%.
          </p>

          <div style={{ display: 'flex', gap: '0' }}>
            <button
              onClick={onSwitchToNotebook}
              className="btn btn-primary"
              style={{ borderRight: 'none' }}
            >
              OPEN PROBLEM LOG
            </button>
            <a
              href="https://leetcode.com/problemset/all/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              BROWSE LEETCODE
            </a>
          </div>
        </div>
      </div>
    );
  }

  const preview = currentProblem.preview || {
    1: { label: '1 day' },
    2: { label: '2 days' },
    3: { label: '4 days' },
    4: { label: '10 days' }
  };

  const difficultyClass =
    currentProblem.difficulty === 'Easy' ? 'badge-easy' :
    currentProblem.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';

  return (
    <div style={{ maxWidth: '880px', margin: '40px auto', padding: '0 24px' }}>
      {/* Queue Progress */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '12px',
            color: 'var(--text)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700
          }}>
            RECALL QUEUE
          </span>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '12px',
            padding: '2px 10px',
            border: '2px solid var(--border)',
            fontWeight: 700,
            color: 'var(--text)',
            background: 'var(--bg)'
          }}>
            {currentIndex + 1} / {dueProblems.length}
          </span>
        </div>

        <span style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontFamily: "'Space Mono', monospace"
        }}>
          Last reviewed: {currentProblem.last_reviewed_at ? new Date(currentProblem.last_reviewed_at).toLocaleDateString() : 'Initial'}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '6px',
        width: '100%',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        marginBottom: '24px'
      }}>
        <div style={{
          height: '100%',
          width: `${((currentIndex) / dueProblems.length) * 100}%`,
          background: 'var(--text)'
        }} />
      </div>

      {/* Main Flashcard */}
      <div style={{
        border: '3px solid var(--border)',
        padding: '40px',
        background: 'var(--bg)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '24px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className={`badge ${difficultyClass}`}>{currentProblem.difficulty}</span>
              <span className={`badge badge-${(currentProblem.mastery_level || 'learning').toLowerCase()}`}>
                {currentProblem.mastery_level || 'Learning'}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text)',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                S={Number(currentProblem.fsrs_stability || 1).toFixed(1)}d
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '32px',
              lineHeight: 1.1,
              color: 'var(--text)'
            }}>
              {currentProblem.title}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0' }}>
            <button
              onClick={async () => {
                if (currentProblem.github_url) {
                  window.open(currentProblem.github_url, '_blank');
                  return;
                }
                try {
                  const res = await fetch(`http://localhost:4100/api/github/push/${currentProblem.id}`, { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    currentProblem.github_url = data.fileUrl;
                    if (mascot) mascot.react('github-sync');
                    alert('Pushed to GitHub.');
                  }
                } catch (e) {
                  alert('Push failed: ' + e.message);
                }
              }}
              style={{
                background: 'transparent',
                border: '3px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
                padding: '6px 14px',
                fontFamily: "'Work Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Push to GitHub"
            >
              {currentProblem.github_url ? 'VIEW GITHUB' : 'PUSH GITHUB'}
            </button>
            {onStartInterrogation && (
              <button
                onClick={() => onStartInterrogation(currentProblem)}
                style={{
                  background: 'var(--text)',
                  border: '3px solid var(--border)',
                  borderLeft: 'none',
                  color: 'var(--bg)',
                  padding: '6px 14px',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  borderRadius: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Launch Live Voice Interrogation Mode with Pacey"
              >
                <span>🎙</span>
                <span>INTERROGATE</span>
              </button>
            )}
            <a
              href={currentProblem.url}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'transparent',
                border: '3px solid var(--border)',
                borderLeft: 'none',
                color: 'var(--link-blue)',
                padding: '6px 14px',
                fontFamily: "'Work Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              LEETCODE
            </a>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '32px' }}>
          {(currentProblem.tags || []).map((t, idx) => (
            <span key={idx} className="tag-pill">{t}</span>
          ))}
        </div>

        {/* STAGE 1: Recall Prompt */}
        <div style={{
          border: '3px solid var(--border)',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text)',
            fontFamily: "'Archivo Black', sans-serif",
            marginBottom: '12px'
          }}>
            RETRIEVAL PROMPT
          </p>
          <p style={{
            color: 'var(--text)',
            fontSize: '16px',
            lineHeight: 1.6,
            fontFamily: "'Work Sans', sans-serif"
          }}>
            Without looking at the implementation: state the exact invariant, data structure, and optimal time and space complexity for <strong>{currentProblem.title}</strong>.
          </p>

          {/* AI Hint */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={loadingHint}
              style={{
                background: loadingHint ? 'var(--surface-sunken)' : 'transparent',
                border: '2px solid var(--border)',
                color: 'var(--text)',
                cursor: loadingHint ? 'not-allowed' : 'pointer',
                padding: '6px 16px',
                fontFamily: "'Work Sans', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 0
              }}
            >
              {loadingHint
                ? 'LOADING...'
                : hintLevel === 0
                ? 'REQUEST HINT'
                : `HINT L${hintLevel + 1}/3`}
            </button>

            {hintLevel > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginLeft: '12px' }}>
                Level {hintLevel} of 3
              </span>
            )}

            {hint && (
              <div style={{
                marginTop: '12px',
                border: '2px solid var(--border)',
                padding: '16px',
                fontFamily: "'Work Sans', sans-serif",
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'var(--text)'
              }}>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '8px',
                  color: 'var(--text)'
                }}>
                  SOCRATIC HINT (LEVEL {hintLevel})
                </div>
                {hint}
              </div>
            )}
          </div>
        </div>

        {/* STAGE 2: Pattern & Intuition Reveal */}
        {revealStage >= 2 && (
          <div className="animate-fade-in" style={{
            border: '3px solid var(--success)',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text)',
                textTransform: 'uppercase',
                fontFamily: "'Archivo Black', sans-serif",
                letterSpacing: '0.1em'
              }}>
                INVARIANTS AND APPROACH
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="tag-pill">Time: {currentProblem.time_complexity || 'O(N)'}</span>
                <span className="tag-pill">Space: {currentProblem.space_complexity || 'O(1)'}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text)', fontSize: '16px', lineHeight: 1.6, marginBottom: '16px', fontFamily: "'Work Sans', sans-serif" }}>
              {currentProblem.intuition || 'Approach was logged via the LeetCode extension.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(currentProblem.patterns || []).map((pat, i) => (
                <span key={i} style={{
                  fontSize: '10px',
                  padding: '4px 10px',
                  border: '2px solid var(--success)',
                  color: 'var(--success)',
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {pat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: Full Code & Pitfalls */}
        {revealStage >= 3 && (
          <div className="animate-fade-in" style={{ marginBottom: '32px' }}>
            {/* Pitfalls */}
            {currentProblem.pitfalls && (
              <div style={{
                border: '3px solid var(--error)',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                gap: '16px'
              }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '16px', color: 'var(--error)', flexShrink: 0 }}>!</span>
                <div>
                  <h4 style={{
                    fontSize: '11px',
                    color: 'var(--error)',
                    marginBottom: '4px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: "'Archivo Black', sans-serif"
                  }}>
                    EDGE CASES AND PITFALLS
                  </h4>
                  <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.6, fontFamily: "'Work Sans', sans-serif" }}>
                    {currentProblem.pitfalls}
                  </p>
                </div>
              </div>
            )}

            {/* Code View */}
            <div style={{ border: '3px solid var(--border)', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'var(--text)',
                color: 'var(--bg)',
                fontSize: '12px'
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {currentProblem.language || 'python3'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: 'transparent',
                    border: '2px solid var(--bg)',
                    color: copied ? '#008000' : 'var(--bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: "'Space Mono', monospace",
                    padding: '2px 10px',
                    borderRadius: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em'
                  }}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>

              <pre style={{
                padding: '24px',
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text)',
                overflowX: 'auto',
                fontFamily: "'Space Mono', monospace",
                background: 'var(--surface-sunken)'
              }}>
                <code>{currentProblem.code_snippet || '# No code snippet recorded.'}</code>
              </pre>
            </div>

            {/* Forgetting Curve */}
            <div style={{ marginTop: '24px' }}>
              <ForgettingCurveChart
                stability={currentProblem.fsrs_stability || 1.0}
                elapsedDays={2}
                currentRetrievability={currentProblem.retrievability || 0.85}
                intervalDays={currentProblem.interval_days || 1}
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ borderTop: '3px solid var(--border)', paddingTop: '24px' }}>
          {revealStage === 1 && (
            <button
              onClick={() => handleAdvanceReveal(2)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '14px' }}
            >
              REVEAL APPROACH [SPACE]
            </button>
          )}

          {revealStage === 2 && (
            <button
              onClick={() => handleAdvanceReveal(3)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '14px' }}
            >
              REVEAL SOLUTION AND GRADE [SPACE]
            </button>
          )}

          {revealStage === 3 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: "'Archivo Black', sans-serif"
                }}>
                  FSRS RECALL GRADE
                </span>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.08em'
                }}>
                  KEYS: [1] [2] [3] [4]
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 0
              }}>
                {/* Again */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(1)}
                  style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--error)',
                    color: 'var(--error)',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: "'Work Sans', sans-serif",
                    borderRadius: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--error)';
                    e.currentTarget.style.color = '#FFFFFF';
                    if (mascot) mascot.react('hover-grade-1');
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--error)';
                    if (mascot) mascot.react('hover-grade-leave');
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em' }}>[1] AGAIN</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                    {preview[1]?.label || '10m'}
                  </div>
                </button>

                {/* Hard */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(2)}
                  style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--warning)',
                    borderLeft: 'none',
                    color: 'var(--warning)',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: "'Work Sans', sans-serif",
                    borderRadius: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--warning)';
                    e.currentTarget.style.color = '#FFFFFF';
                    if (mascot) mascot.react('hover-grade-2');
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--warning)';
                    if (mascot) mascot.react('hover-grade-leave');
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em' }}>[2] HARD</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                    {preview[2]?.label || '1.2d'}
                  </div>
                </button>

                {/* Good */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(3)}
                  style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--border)',
                    borderLeft: 'none',
                    color: 'var(--text)',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: "'Work Sans', sans-serif",
                    borderRadius: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--text)';
                    e.currentTarget.style.color = 'var(--bg)';
                    if (mascot) mascot.react('hover-grade-3');
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    if (mascot) mascot.react('hover-grade-leave');
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em' }}>[3] GOOD</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                    {preview[3]?.label || '4.5d'}
                  </div>
                </button>

                {/* Easy */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(4)}
                  style={{
                    background: 'var(--bg)',
                    border: '3px solid var(--success)',
                    borderLeft: 'none',
                    color: 'var(--success)',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: "'Work Sans', sans-serif",
                    borderRadius: 0
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--success)';
                    e.currentTarget.style.color = '#FFFFFF';
                    if (mascot) mascot.react('hover-grade-4');
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--success)';
                    if (mascot) mascot.react('hover-grade-leave');
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em' }}>[4] EASY</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                    {preview[4]?.label || '14d'}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
