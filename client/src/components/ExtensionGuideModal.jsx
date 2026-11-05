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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--bg)',
          border: '5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '3px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '32px',
              color: 'var(--text)',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              CHROME EXTENSION SETUP
            </h3>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px', color: 'var(--text)', margin: 0 }}>
              AUTONOMOUS BACKGROUND TELEMETRY FOR LIVE LEETCODE SUBMISSIONS.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              fontSize: '24px',
              padding: '0 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* 3 Step Guide */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'var(--bg)',
            border: '3px solid var(--border)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              fontFamily: "'Archivo Black', sans-serif",
              flexShrink: 0
            }}>
              01
            </div>
            <div>
              <div style={{ fontSize: '18px', fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase' }}>
                Open Chrome Extensions Management
              </div>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', marginTop: '8px', lineHeight: 1.5 }}>
                Navigate to <span className="tag-pill">chrome://extensions</span> in your browser and enable <strong style={{ fontFamily: "'Archivo Black', sans-serif" }}>Developer mode</strong> (toggle top right).
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'var(--bg)',
            border: '3px solid var(--border)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              fontFamily: "'Archivo Black', sans-serif",
              flexShrink: 0
            }}>
              02
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase' }}>
                Click "Load Unpacked"
              </div>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', marginTop: '8px', marginBottom: '16px', lineHeight: 1.5 }}>
                Select the unpacked extension directory from your local repository:
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '3px solid var(--border)',
                padding: '12px',
                fontFamily: "'Space Mono', monospace",
                fontSize: '15px'
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {extensionPath}
                </span>
                <button
                  onClick={handleCopy}
                  className="btn-secondary"
                  style={{ marginLeft: '16px', padding: '6px 16px' }}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'var(--bg)',
            border: '3px solid var(--border)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              fontFamily: "'Archivo Black', sans-serif",
              flexShrink: 0
            }}>
              03
            </div>
            <div>
              <div style={{ fontSize: '18px', fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase' }}>
                Solve any Problem on LeetCode
              </div>
              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', marginTop: '8px', lineHeight: 1.5 }}>
                Open any problem on <a href="https://leetcode.com/problemset/all/" target="_blank" rel="noreferrer" style={{ color: 'var(--info)', textDecoration: 'underline' }}>leetcode.com</a>. PacedLearner watches your solve, captures your exact code and error attempts, and auto-logs everything upon <strong style={{ fontFamily: "'Archivo Black', sans-serif" }}>Accepted</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights: On/Off & Auto-Log */}
        <div style={{
          borderTop: '3px solid var(--border)',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px'
        }}>
          <div>
            <div style={{ fontSize: '18px', fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', marginBottom: '8px' }}>
              ⠿ Movable Pacey Observer
            </div>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', lineHeight: 1.4, margin: 0 }}>
              Pacey appears on LeetCode in a draggable RawBlock B&amp;W dock, physically tracking your editor, test runs, and errors.
            </p>
          </div>

          <div>
            <div style={{ fontSize: '18px', fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', marginBottom: '8px' }}>
              ⚡ Live Error &amp; Solve Telemetry
            </div>
            <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', lineHeight: 1.4, margin: 0 }}>
              Reacts in real time to Compile Errors, Runtime Exceptions, Wrong Answers, TLE, and auto-logs Accepted solves to FSRS.
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', borderTop: '3px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            SETUP COMPLETE
          </button>
        </div>
      </div>
    </div>
  );
}
