import React from 'react';

export default function ForgettingCurveChart({
  stability = 3.2,
  elapsedDays = 2.5,
  currentRetrievability = 0.88,
  intervalDays = 3,
  height = 180
}) {
  const FACTOR = 19 / 81;
  const DECAY = -0.5;

  const calcR = (t) => Math.pow(1 + FACTOR * (t / Math.max(0.1, stability)), DECAY);

  const maxDays = Math.max(intervalDays * 2.2, elapsedDays * 1.4, 7);
  const pointsCount = 40;

  const width = 480;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (d) => padding.left + (d / maxDays) * graphWidth;
  const getY = (r) => padding.top + (1 - (r - 0.4) / 0.6) * graphHeight;

  const pathD = [];
  for (let i = 0; i <= pointsCount; i++) {
    const day = (i / pointsCount) * maxDays;
    const r = Math.max(0.4, calcR(day));
    const x = getX(day);
    const y = getY(r);
    if (i === 0) pathD.push(`M ${x} ${y}`);
    else pathD.push(`L ${x} ${y}`);
  }

  const currentX = getX(Math.min(maxDays, elapsedDays));
  const currentY = getY(Math.max(0.4, currentRetrievability));
  const y90 = getY(0.9);

  return (
    <div style={{
      background: 'var(--bg)',
      border: '3px solid var(--border)',
      padding: '16px',
      position: 'relative',
      color: 'var(--text)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Space Mono', monospace" }}>
            EBBINGHAUS RETRIEVAL DECAY
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            background: 'var(--text)',
            color: 'var(--bg)',
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace"
          }}>
            S={stability}d
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: currentRetrievability < 0.90 ? 'var(--error)' : 'var(--success)',
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace"
        }}>
          RETENTION: {Math.round(currentRetrievability * 100)}%
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        <line x1={padding.left} y1={getY(1.0)} x2={width - padding.right} y2={getY(1.0)} stroke="var(--text-muted)" strokeDasharray="2 4" opacity="0.45" />
        <line x1={padding.left} y1={getY(0.9)} x2={width - padding.right} y2={getY(0.9)} stroke="var(--text)" strokeDasharray="4 4" />
        <line x1={padding.left} y1={getY(0.7)} x2={width - padding.right} y2={getY(0.7)} stroke="var(--text-muted)" strokeDasharray="2 4" opacity="0.45" />
        <line x1={padding.left} y1={getY(0.5)} x2={width - padding.right} y2={getY(0.5)} stroke="var(--text-muted)" strokeDasharray="2 4" opacity="0.45" />

        {/* Y-axis Labels */}
        <text x={padding.left - 6} y={y90 + 3} fill="var(--text)" fontSize="10" textAnchor="end" fontWeight="700" fontFamily="'Space Mono', monospace">90%</text>
        <text x={padding.left - 6} y={getY(1.0) + 3} fill="var(--text-secondary)" fontSize="10" textAnchor="end" fontFamily="'Space Mono', monospace">100%</text>
        <text x={padding.left - 6} y={getY(0.7) + 3} fill="var(--text-secondary)" fontSize="10" textAnchor="end" fontFamily="'Space Mono', monospace">70%</text>

        {/* Area under curve */}
        <path
          d={`${pathD.join(' ')} L ${getX(maxDays)} ${getY(0.4)} L ${getX(0)} ${getY(0.4)} Z`}
          fill="var(--text)"
          opacity="0.08"
        />

        {/* Main decay curve */}
        <path
          d={pathD.join(' ')}
          fill="none"
          stroke="var(--text)"
          strokeWidth="2.5"
          strokeLinecap="square"
        />

        {/* Current status point */}
        <circle
          cx={currentX}
          cy={currentY}
          r="5"
          fill={currentRetrievability < 0.90 ? 'var(--error)' : 'var(--text)'}
          stroke="var(--bg)"
          strokeWidth="2"
        />

        {/* Current Position Marker Text */}
        <text
          x={Math.min(width - padding.right - 10, Math.max(padding.left + 10, currentX))}
          y={currentY - 10}
          fill="var(--text)"
          fontSize="10"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="'Space Mono', monospace"
        >
          {currentRetrievability < 0.90 ? 'REVIEW DUE' : 'RETAINED'}
        </text>

        {/* X-axis labels */}
        <text x={padding.left} y={height - 6} fill="var(--text)" fontSize="10" textAnchor="start" fontFamily="'Space Mono', monospace">0d</text>
        <text x={getX(maxDays / 2)} y={height - 6} fill="var(--text)" fontSize="10" textAnchor="middle" fontFamily="'Space Mono', monospace">{Math.round(maxDays / 2)}d</text>
        <text x={width - padding.right} y={height - 6} fill="var(--text)" fontSize="10" textAnchor="end" fontFamily="'Space Mono', monospace">{Math.round(maxDays)}d</text>
      </svg>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: "'Work Sans', sans-serif" }}>
        FSRS schedules the next recall test right before retrievability drops below the 90% threshold.
      </p>
    </div>
  );
}
