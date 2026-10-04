import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ChevronRight,
  Eye,
  Code,
  Clock,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ForgettingCurveChart from './ForgettingCurveChart';
import PaceyMascot from './PaceyMascot';

export default function FlashcardReview({
  dueProblems = [],
  onGradeReview,
  onSelectProblem,
  onSwitchToNotebook
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealStage, setRevealStage] = useState(1); // 1: Question, 2: Intuition/Pattern, 3: Full Code & Grading
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

  // Reset stage when moving cards
  useEffect(() => {
    setRevealStage(1);
    setCopied(false);
    setHint(null);
    setHintLevel(0);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, [currentIndex]);

  const handleRequestHint = async () => {
    if (loadingHint || !currentProblem) return;
    const nextLevel = Math.min(3, hintLevel + 1);
    setLoadingHint(true);
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
      }
    } catch (err) {
      console.error('Failed to get hint:', err);
    } finally {
      setLoadingHint(false);
    }
  };

  const currentProblem = dueProblems[currentIndex];

  // Handle keyboard shortcuts (Space to reveal, 1-4 to grade)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentProblem) return;

      // Prevent triggering shortcuts when focused inside an input, textarea, or contentEditable element
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (revealStage === 1) setRevealStage(2);
        else if (revealStage === 2) setRevealStage(3);
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

    try {
      await onGradeReview(currentProblem.id, rating);
      
      if (rating >= 3 && currentIndex === dueProblems.length - 1) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 }
        });
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
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Queue Empty / Completed View
  if (dueProblems.length === 0 || currentIndex >= dueProblems.length) {
    return (
      <div className="animate-fade-in" style={{
        maxWidth: '740px',
        margin: '4rem auto',
        textAlign: 'center',
        padding: '4rem 2rem'
      }}>
        {/* Pacey Mascot Celebrating */}
        <div style={{ marginBottom: '1.5rem' }}>
          <PaceyMascot mood="celebrating" size={80} speechBubble="All caught up! FSRS mastery locked in!" />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          fontWeight: 900
        }}>
          Queue Clear
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          maxWidth: '480px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.6
        }}>
          All scheduled algorithmic recall sessions are complete. Memory retention is sustained above the 90% threshold.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={onSwitchToNotebook}
            className="btn btn-primary"
            style={{ padding: '11px 24px' }}
          >
            <span>Open Repository</span>
            <ArrowRight size={16} />
          </button>

          <a
            href="https://leetcode.com/problemset/all/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ padding: '11px 22px' }}
          >
            <span>Browse LeetCode</span>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    );
  }

  // Previews for the 4 FSRS buttons
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
    <div className="animate-fade-in" style={{ maxWidth: '880px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
      {/* Top Queue Progress with Pacey */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PaceyMascot mood={revealStage >= 2 ? 'celebrating' : 'thinking'} size={38} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em'
          }}>
            RECALL QUEUE
          </span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600
          }}>
            {currentIndex + 1} / {dueProblems.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Clock size={13} />
          <span>Last tested {currentProblem.last_reviewed_at ? new Date(currentProblem.last_reviewed_at).toLocaleDateString() : 'Initial'}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div style={{ height: '2px', width: '100%', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1px', overflow: 'hidden', marginBottom: '1.75rem' }}>
        <div style={{
          height: '100%',
          width: `${((currentIndex) / dueProblems.length) * 100}%`,
          background: 'var(--gold-primary)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Main Flashcard Container with Cyber HUD Reticles */}
      <div className="glass-panel cyber-scanline" style={{ padding: '2.5rem', position: 'relative' }}>
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />

        {/* Header with Title & Tags */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className={`badge ${difficultyClass}`}>{currentProblem.difficulty}</span>
              <span className={`badge badge-${(currentProblem.mastery_level || 'learning').toLowerCase()}`}>
                {currentProblem.mastery_level || 'Learning'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--cyber-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                // STABILITY: {Number(currentProblem.fsrs_stability || 1).toFixed(1)}d
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-tech)',
              fontSize: '2.1rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
              lineHeight: 1.18,
              color: 'var(--text-primary)'
            }}>
              {currentProblem.title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    alert('✓ Problem solution & writeup pushed to GitHub Vault!');
                  }
                } catch (e) {
                  alert('Push failed: ' + e.message);
                }
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.80rem', gap: '6px' }}
              title="Push to or open in GitHub Vault"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{currentProblem.github_url ? 'GitHub Vault' : 'Push GitHub'}</span>
            </button>

            <a
              href={currentProblem.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.80rem', gap: '6px' }}
              title="Open problem in new tab"
            >
              <span>LeetCode</span>
              <ExternalLink size={14} />
            </a>
          </div>

        </div>

        {/* Algorithm Topic Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '2rem' }}>
          {(currentProblem.tags || []).map((t, idx) => (
            <span key={idx} className="tag-pill">#{t}</span>
          ))}
        </div>

        {/* STAGE 1: Active Recall Prompt */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem',
          marginBottom: '2rem'
        }}>
          <p style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--gold-primary)',
            fontFamily: 'var(--font-mono)',
            marginBottom: '0.75rem'
          }}>
            Cognitive Retrieval Objective
          </p>
          <p style={{
            color: 'var(--text-primary)',
            fontSize: '1.02rem',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Without looking at implementation: state the exact invariant, data structure, and optimal time & space complexity for <strong>{currentProblem.title}</strong>.
          </p>

          {/* Socratic AI Recall Spark (Gemini) */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px dashed var(--border-hairline)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={loadingHint}
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  gap: '6px',
                  color: 'var(--gold-light)',
                  borderColor: 'var(--gold-border)',
                  background: 'var(--gold-tint)'
                }}
              >
                <Sparkles size={13} color="var(--gold-primary)" />
                <span>
                  {loadingHint
                    ? 'Consulting Gemini 3.6...'
                    : hintLevel === 0
                    ? 'Request Socratic AI Hint'
                    : `Request Escalated Hint (L${hintLevel + 1}/3)`}
                </span>
              </button>

              {hintLevel > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Hint Level {hintLevel} of 3
                </span>
              )}
            </div>

            {hint && (
              <div className="animate-fade-in" style={{
                marginTop: '12px',
                background: 'rgba(212, 175, 55, 0.06)',
                border: '1px solid var(--gold-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: '#fef3c7',
                fontSize: '0.90rem',
                lineHeight: 1.55
              }}>
                <div style={{
                  color: 'var(--gold-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.70rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '4px',
                  fontWeight: 700
                }}>
                  ✦ Gemini Socratic Invariant Spark (Level {hintLevel})
                </div>
                {hint}
              </div>
            )}
          </div>
        </div>

        {/* STAGE 2: Pattern & Core Intuition Reveal */}
        {revealStage >= 2 && (
          <div className="animate-fade-in" style={{
            background: 'rgba(16, 185, 129, 0.03)',
            border: '1px solid var(--emerald-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1.75rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#34d399',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em'
              }}>
                Architecture & Invariants
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="tag-pill" style={{ color: '#6ee7b7' }}>Time: {currentProblem.time_complexity || 'O(N)'}</span>
                <span className="tag-pill" style={{ color: '#6ee7b7' }}>Space: {currentProblem.space_complexity || 'O(1)'}</span>
              </div>
            </div>

            <p style={{ color: '#f1f5f9', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              {currentProblem.intuition || 'Approach was logged via the LeetCode extension.'}
            </p>

            {/* Pattern Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(currentProblem.patterns || []).map((pat, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem',
                  padding: '4px 9px',
                  borderRadius: '4px',
                  background: 'var(--emerald-tint)',
                  color: '#34d399',
                  border: '1px solid var(--emerald-border)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)'
                }}>
                  ✦ {pat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* STAGE 3: Full Code & Pitfalls Reveal */}
        {revealStage >= 3 && (
          <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
            {/* Pitfalls & Edge Cases */}
            {currentProblem.pitfalls && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1px solid var(--crimson-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '14px'
              }}>
                <AlertTriangle size={18} color="var(--crimson-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{
                    fontSize: '0.80rem',
                    color: '#fb7185',
                    marginBottom: '4px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    Critical Edge Cases & Pitfalls
                  </h4>
                  <p style={{ fontSize: '0.90rem', color: '#fecdd3', lineHeight: 1.55 }}>
                    {currentProblem.pitfalls}
                  </p>
                </div>
              </div>
            )}

            {/* Syntax-Highlighted Code View */}
            <div style={{
              background: 'var(--code-bg)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'var(--bg-surface-elevated)',
                borderBottom: '1px solid var(--border-hairline)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}>
                  <Code size={13} /> {currentProblem.language || 'python3'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? 'var(--emerald-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre style={{
                padding: '1.5rem',
                margin: 0,
                fontSize: '0.84rem',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                overflowX: 'auto',
                fontFamily: 'var(--font-mono)'
              }}>
                <code>{currentProblem.code_snippet || '# No code snippet recorded.'}</code>
              </pre>
            </div>

            {/* Embedded Forgetting Curve Chart */}
            <div style={{ marginTop: '1.75rem' }}>
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
        <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1.75rem' }}>
          {revealStage === 1 && (
            <button
              onClick={() => setRevealStage(2)}
              className="btn btn-cyber-cyan"
              style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
            >
              <span>DECRYPT INVARIANTS & APPROACH</span>
              <span style={{ opacity: 0.8, fontSize: '0.78rem', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>[SPACE]</span>
              <ChevronRight size={16} />
            </button>
          )}

          {revealStage === 2 && (
            <button
              onClick={() => setRevealStage(3)}
              className="btn btn-cyber-cyan"
              style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
            >
              <span>ACCESS SOLUTION TERMINAL & RATE RECALL</span>
              <span style={{ opacity: 0.8, fontSize: '0.78rem', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>[SPACE]</span>
              <Eye size={16} />
            </button>
          )}

          {revealStage === 3 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--cyber-cyan)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)'
                }}>
                  // FSRS RECALL CALIBRATION MATRIX
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  SHORTCUTS: [1] [2] [3] [4]
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px'
              }}>
                {/* 1: Again (Laser Magenta) */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(1)}
                  style={{
                    background: 'var(--cyber-magenta-tint)',
                    border: '1px solid var(--cyber-magenta-border)',
                    color: 'var(--cyber-magenta)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 127, 0.22)';
                    e.currentTarget.style.boxShadow = '0 0 16px var(--cyber-magenta-glow)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--cyber-magenta-tint)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>[1] AGAIN</div>
                  <div style={{ fontSize: '0.70rem', opacity: 0.85, marginTop: '2px' }}>
                    {preview[1]?.label || '10m'}
                  </div>
                </button>

                {/* 2: Hard (Hazard Amber) */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(2)}
                  style={{
                    background: 'var(--cyber-amber-tint)',
                    border: '1px solid var(--cyber-amber-border)',
                    color: 'var(--cyber-amber)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.22)';
                    e.currentTarget.style.boxShadow = '0 0 16px var(--cyber-amber-glow)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--cyber-amber-tint)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>[2] HARD</div>
                  <div style={{ fontSize: '0.70rem', opacity: 0.85, marginTop: '2px' }}>
                    {preview[2]?.label || '1.2d'}
                  </div>
                </button>

                {/* 3: Good (Cyber Cyan) */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(3)}
                  style={{
                    background: 'var(--cyber-cyan-tint)',
                    border: '1px solid var(--cyber-cyan-border)',
                    color: 'var(--cyber-cyan)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.22)';
                    e.currentTarget.style.boxShadow = '0 0 16px var(--cyber-cyan-glow)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--cyber-cyan-tint)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>[3] GOOD</div>
                  <div style={{ fontSize: '0.70rem', opacity: 0.85, marginTop: '2px' }}>
                    {preview[3]?.label || '4.5d'}
                  </div>
                </button>

                {/* 4: Easy (Toxic Matrix Green) */}
                <button
                  disabled={isSubmitting}
                  onClick={() => handleGrade(4)}
                  style={{
                    background: 'var(--cyber-green-tint)',
                    border: '1px solid var(--cyber-green-border)',
                    color: 'var(--cyber-green)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 102, 0.22)';
                    e.currentTarget.style.boxShadow = '0 0 16px var(--cyber-green-glow)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--cyber-green-tint)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>[4] EASY</div>
                  <div style={{ fontSize: '0.70rem', opacity: 0.85, marginTop: '2px' }}>
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
