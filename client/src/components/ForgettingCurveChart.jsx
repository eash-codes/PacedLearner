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

  // Function to calculate R(t)
  const calcR = (t) => Math.pow(1 + FACTOR * (t / Math.max(0.1, stability)), DECAY);

  // Time range from 0 to max(intervalDays * 2.5, elapsedDays * 1.5, 10)
  const maxDays = Math.max(intervalDays * 2.2, elapsedDays * 1.4, 7);
  const pointsCount = 40;

  const width = 480;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Convert (day, R) to SVG coordinates
  const getX = (d) => padding.left + (d / maxDays) * graphWidth;
  const getY = (r) => padding.top + (1 - (r - 0.4) / 0.6) * graphHeight; // 40% to 100% scale

  // Generate SVG curve path
  const pathD = [];
  for (let i = 0; i <= pointsCount; i++) {
    const day = (i / pointsCount) * maxDays;
    const r = Math.max(0.4, calcR(day));
    const x = getX(day);
    const y = getY(r);
    if (i === 0) pathD.push(`M ${x} ${y}`);
    else pathD.push(`L ${x} ${y}`);
  }

  // Current position
  const currentX = getX(Math.min(maxDays, elapsedDays));
  const currentY = getY(Math.max(0.4, currentRetrievability));

  // 90% retention threshold line Y
  const y90 = getY(0.9);

  return (
    <div style={{
      background: 'var(--bg-canvas)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Ebbinghaus Retrieval Decay
          </span>
          <span style={{
            fontSize: '0.68rem',
            padding: '1px 6px',
            borderRadius: '3px',
            background: 'var(--gold-tint)',
            color: 'var(--gold-light)',
            fontWeight: 600,
            border: '1px solid var(--gold-border)',
            fontFamily: 'var(--font-mono)'
          }}>
            Stability: {stability}d
          </span>
        </div>
        <div style={{
          fontSize: '0.76rem',
          color: currentRetrievability < 0.90 ? '#fb7185' : '#34d399',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)'
        }}>
          Retention: {Math.round(currentRetrievability * 100)}%
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        <line x1={padding.left} y1={getY(1.0)} x2={width - padding.right} y2={getY(1.0)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1={padding.left} y1={getY(0.9)} x2={width - padding.right} y2={getY(0.9)} stroke="rgba(212, 175, 55, 0.25)" strokeDasharray="3 3" />
        <line x1={padding.left} y1={getY(0.7)} x2={width - padding.right} y2={getY(0.7)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <line x1={padding.left} y1={getY(0.5)} x2={width - padding.right} y2={getY(0.5)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />

        {/* 90% Target Retention Label */}
        <text x={padding.left - 6} y={y90 + 3} fill="var(--gold-primary)" fontSize="9" textAnchor="end" fontWeight="600" fontFamily="var(--font-mono)">90%</text>
        <text x={padding.left - 6} y={getY(1.0) + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">100%</text>
        <text x={padding.left - 6} y={getY(0.7) + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">70%</text>

        {/* 90% Target Line Accent */}
        <line x1={padding.left} y1={y90} x2={width - padding.right} y2={y90} stroke="var(--gold-primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

        {/* Area under curve */}
        <defs>
          <linearGradient id="curveFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <path
          d={`${pathD.join(' ')} L ${getX(maxDays)} ${getY(0.4)} L ${getX(0)} ${getY(0.4)} Z`}
          fill="url(#curveFill)"
        />

        {/* Main decay curve */}
        <path
          d={pathD.join(' ')}
          fill="none"
          stroke="var(--gold-primary)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Current status point */}
        <circle
          cx={currentX}
          cy={currentY}
          r="4.5"
          fill={currentRetrievability < 0.90 ? '#f43f5e' : '#10b981'}
          stroke="#08090c"
          strokeWidth="1.5"
        />

        {/* Current Position Marker Text */}
        <text
          x={Math.min(width - padding.right - 10, Math.max(padding.left + 10, currentX))}
          y={currentY - 10}
          fill="#f8fafc"
          fontSize="9"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
        >
          {currentRetrievability < 0.90 ? 'Review Due' : 'Retained'}
        </text>

        {/* X-axis labels */}
        <text x={padding.left} y={height - 8} fill="var(--text-muted)" fontSize="9" textAnchor="start" fontFamily="var(--font-mono)">0d</text>
        <text x={getX(maxDays / 2)} y={height - 8} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">{Math.round(maxDays / 2)}d</text>
        <text x={width - padding.right} y={height - 8} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">{Math.round(maxDays)}d</text>
      </svg>

      <p style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-sans)' }}>
        FSRS schedules the next recall test precisely before retrievability falls below the 90% threshold.
      </p>
    </div>
  );
}
