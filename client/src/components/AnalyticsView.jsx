import React from 'react';
import {
  TrendingUp,
  Award,
  Brain,
  Layers
} from 'lucide-react';

export default function AnalyticsView({ stats, problems = [] }) {
  if (!stats) return null;

  const total = stats.total_problems || 1;
  const masteredPct = Math.round(((stats.mastered_count || 0) / total) * 100);
  const retainedPct = Math.round(((stats.retained_count || 0) / total) * 100);
  const reviewingPct = Math.round(((stats.reviewing_count || 0) / total) * 100);
  const learningPct = Math.round(((stats.learning_count || 0) / total) * 100);

  const avgRetention = Math.round((stats.avg_retention || 0.9) * 100);

  // Group topics
  const topics = Object.entries(stats.topic_distribution || {}).slice(0, 8);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '2.5rem auto', padding: '0 2.5rem' }}>
      <div style={{ marginBottom: '2.25rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-tech)',
          fontSize: '2.2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
          lineHeight: 1.15,
          marginBottom: '6px'
        }}>
          FSRS_TELEMETRY <span style={{ color: 'var(--cyber-cyan)' }}>// RETENTION DIAGNOSTICS</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', fontFamily: 'var(--font-tech)', letterSpacing: '0.04em' }}>
          [STATUS: SENSORS ACTIVE] // MEMORY STABILITY, RETRIEVAL PROBABILITY & MASTERY METRICS
        </p>
      </div>

      {/* Top 4 Cyber Metric Instruments */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Retention Probability */}
        <div className="glass-panel cyber-scanline" style={{ padding: '1.75rem', position: 'relative' }}>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-br" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--cyber-green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              // RETENTION_PROBABILITY
            </span>
            <TrendingUp size={16} color="var(--cyber-green)" />
          </div>
          <div style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            color: 'var(--cyber-green)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            textShadow: '0 0 12px var(--cyber-green-glow)'
          }}>
            {avgRetention}%
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'var(--font-tech)' }}>
            Probability of blind algorithmic retrieval at current timestamp.
          </p>
        </div>

        {/* Mastered Problems */}
        <div className="glass-panel cyber-scanline" style={{ padding: '1.75rem', position: 'relative' }}>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-br" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--cyber-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              // MASTERED_TIER
            </span>
            <Award size={16} color="var(--cyber-cyan)" />
          </div>
          <div style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            color: 'var(--cyber-cyan)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            textShadow: '0 0 12px var(--cyber-cyan-glow)'
          }}>
            {stats.mastered_count || 0}
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'var(--font-tech)' }}>
            Stability &gt; 90 days with consecutive clean recall passes.
          </p>
        </div>

        {/* Active Due Reviews */}
        <div className="glass-panel cyber-scanline" style={{ padding: '1.75rem', position: 'relative' }}>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-br" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--cyber-magenta)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              // RECALL_DUE_NOW
            </span>
            <Brain size={16} color={stats.due_today > 0 ? 'var(--cyber-magenta)' : 'var(--cyber-green)'} />
          </div>
          <div style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            color: stats.due_today > 0 ? 'var(--cyber-magenta)' : 'var(--cyber-green)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            textShadow: stats.due_today > 0 ? '0 0 12px var(--cyber-magenta-glow)' : '0 0 12px var(--cyber-green-glow)'
          }}>
            {stats.due_today || 0}
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'var(--font-tech)' }}>
            Algorithmic recall sessions scheduled for today.
          </p>
        </div>

        {/* Total Solves */}
        <div className="glass-panel cyber-scanline" style={{ padding: '1.75rem', position: 'relative' }}>
          <div className="hud-corner hud-corner-tl" />
          <div className="hud-corner hud-corner-br" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--cyber-amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              // TOTAL_PROBLEMS_LOGGED
            </span>
            <Layers size={16} color="var(--cyber-amber)" />
          </div>
          <div style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            color: 'var(--cyber-amber)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            textShadow: '0 0 12px var(--cyber-amber-glow)'
          }}>
            {stats.total_problems || 0}
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'var(--font-tech)' }}>
            Actively monitored under FSRS spaced repetition algorithms.
          </p>
        </div>
      </div>

      {/* Mastery Progress Bar & Breakdown */}
      <div className="glass-panel cyber-scanline" style={{ padding: '2rem', marginBottom: '2rem', position: 'relative' }}>
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
        <h3 style={{
          fontFamily: 'var(--font-tech)',
          fontSize: '1.25rem',
          fontWeight: 700,
          marginBottom: '1.25rem',
          color: 'var(--text-primary)',
          letterSpacing: '0.03em'
        }}>
          // MASTERY_DISTRIBUTION_FUNNEL
        </h3>

        {/* Segmented Architectural Track */}
        <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ width: `${masteredPct}%`, background: 'var(--gold-primary)' }} title={`Mastered: ${masteredPct}%`} />
          <div style={{ width: `${retainedPct}%`, background: '#3b82f6' }} title={`Retained: ${retainedPct}%`} />
          <div style={{ width: `${reviewingPct}%`, background: 'var(--amber-primary)' }} title={`Reviewing: ${reviewingPct}%`} />
          <div style={{ width: `${learningPct}%`, background: '#64748b' }} title={`Learning: ${learningPct}%`} />
        </div>

        {/* Breakdown Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--gold-primary)' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                Mastered ({stats.mastered_count || 0})
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Stability &gt; 90 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                Retained ({stats.retained_count || 0})
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Stability 14 - 90 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--amber-primary)' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                Reviewing ({stats.reviewing_count || 0})
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Stability 3 - 14 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#64748b' }} />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                Learning ({stats.learning_count || 0})
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Stability &lt; 3 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Breakdown & Difficulty Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Topic Patterns */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1.25rem',
            color: 'var(--text-primary)'
          }}>
            Algorithmic Invariants & Patterns
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topics.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No topics recorded yet.</p>
            ) : (
              topics.map(([topic, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{topic}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold-primary)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1.25rem',
            color: 'var(--text-primary)'
          }}>
            Difficulty Stratification
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                <span style={{ fontWeight: 600, color: '#34d399', fontFamily: 'var(--font-mono)' }}>Easy</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{stats.difficulty_breakdown?.Easy || 0}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Easy || 0) / total) * 100)}%`, background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                <span style={{ fontWeight: 600, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>Medium</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{stats.difficulty_breakdown?.Medium || 0}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Medium || 0) / total) * 100)}%`, background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                <span style={{ fontWeight: 600, color: '#fb7185', fontFamily: 'var(--font-mono)' }}>Hard</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{stats.difficulty_breakdown?.Hard || 0}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Hard || 0) / total) * 100)}%`, background: '#f43f5e' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
