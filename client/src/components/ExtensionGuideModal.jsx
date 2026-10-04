import React from 'react';
import { X, Puzzle, Copy, Check } from 'lucide-react';

export default function ExtensionGuideModal({ onClose }) {
  const extensionPath = '/Users/eashan/Desktop/Paced learner /extension';
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '92vw',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--gold-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--gold-border)'
            }}>
              <Puzzle size={20} color="var(--gold-primary)" />
            </div>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                marginBottom: '2px'
              }}>
                Chrome Extension Setup
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Autonomous background telemetry for live LeetCode submissions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Step Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0
            }}>
              01
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Open Chrome Extensions Management
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.5 }}>
                Navigate to <code style={{ color: 'var(--gold-light)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '3px' }}>chrome://extensions</code> in your browser and enable <strong>Developer mode</strong> (toggle top right).
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0
            }}>
              02
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Click "Load Unpacked"
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '3px', marginBottom: '8px', lineHeight: 1.5 }}>
                Select the unpacked extension directory from your local repository:
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--code-bg)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '4px',
                padding: '7px 12px',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)'
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {extensionPath}
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? 'var(--emerald-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '10px'
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span style={{ fontSize: '0.70rem', fontFamily: 'var(--font-mono)' }}>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-hairline)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0
            }}>
              03
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Solve any Problem on LeetCode
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.5 }}>
                Open any problem on <a href="https://leetcode.com/problemset/all/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold-primary)', textDecoration: 'none' }}>leetcode.com</a>. PacedLearner watches your solve, captures your exact code and error attempts, and auto-logs everything upon <strong>Accepted</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights: On/Off & Auto-Log */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '1.75rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏸️</span> Quick On / Off Switch
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
              Toggle the watcher off anytime via the extension popup or the in-page widget button to pause tracking.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Automatic Code & Error Log
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
              Zero-click sync automatically intercepts exact code, language, errors (WA, TLE, RE), and schedules your FSRS review date.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn btn-gold"
          style={{ width: '100%', padding: '12px' }}
        >
          Setup Complete
        </button>
      </div>
    </div>
  );
}
