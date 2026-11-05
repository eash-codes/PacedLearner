import React from 'react';

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
    <div style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '64px',
          color: 'var(--text)',
          lineHeight: 1.0,
          marginBottom: '8px',
          textTransform: 'uppercase'
        }}>
          FSRS TELEMETRY
        </h1>
        <p style={{ color: 'var(--text)', fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>
          RETENTION DIAGNOSTICS & MASTERY METRICS
        </p>
      </div>

      {/* Top 4 Metric Instruments */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {/* Retention Probability */}
        <div style={{ padding: '24px', border: '5px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace", marginBottom: '16px' }}>
            RETENTION PROBABILITY
          </div>
          <div style={{
            fontSize: '48px',
            fontFamily: "'Archivo Black', sans-serif",
            lineHeight: 1
          }}>
            {avgRetention}%
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text)', marginTop: '16px', fontFamily: "'Space Mono', monospace" }}>
            Probability of blind algorithmic retrieval at current timestamp.
          </p>
        </div>

        {/* Mastered Problems */}
        <div style={{ padding: '24px', border: '5px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace", marginBottom: '16px' }}>
            MASTERED TIER
          </div>
          <div style={{
            fontSize: '48px',
            fontFamily: "'Archivo Black', sans-serif",
            lineHeight: 1
          }}>
            {stats.mastered_count || 0}
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text)', marginTop: '16px', fontFamily: "'Space Mono', monospace" }}>
            Stability &gt; 90 days with consecutive clean recall passes.
          </p>
        </div>

        {/* Active Due Reviews */}
        <div style={{ padding: '24px', border: '5px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace", marginBottom: '16px', color: stats.due_today > 0 ? 'var(--error)' : 'var(--text)' }}>
            RECALL DUE NOW
          </div>
          <div style={{
            fontSize: '48px',
            fontFamily: "'Archivo Black', sans-serif",
            lineHeight: 1,
            color: stats.due_today > 0 ? 'var(--error)' : 'var(--text)'
          }}>
            {stats.due_today || 0}
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text)', marginTop: '16px', fontFamily: "'Space Mono', monospace" }}>
            Algorithmic recall sessions scheduled for today.
          </p>
        </div>

        {/* Total Solves */}
        <div style={{ padding: '24px', border: '5px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace", marginBottom: '16px' }}>
            TOTAL LOGGED
          </div>
          <div style={{
            fontSize: '48px',
            fontFamily: "'Archivo Black', sans-serif",
            lineHeight: 1
          }}>
            {stats.total_problems || 0}
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text)', marginTop: '16px', fontFamily: "'Space Mono', monospace" }}>
            Actively monitored under FSRS spaced repetition algorithms.
          </p>
        </div>
      </div>

      {/* Mastery Progress Bar & Breakdown */}
      <div style={{ padding: '40px', border: '5px solid var(--border)', marginBottom: '40px' }}>
        <h3 style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '32px',
          marginBottom: '24px',
          color: 'var(--text)'
        }}>
          MASTERY DISTRIBUTION FUNNEL
        </h3>

        {/* Segmented Architectural Track */}
        <div style={{ height: '24px', width: '100%', border: '3px solid var(--border)', display: 'flex', marginBottom: '24px' }}>
          <div style={{ width: `${masteredPct}%`, background: 'var(--text)' }} title={`Mastered: ${masteredPct}%`} />
          <div style={{ width: `${retainedPct}%`, background: 'var(--border)', opacity: 0.8 }} title={`Retained: ${retainedPct}%`} />
          <div style={{ width: `${reviewingPct}%`, background: 'var(--border)', opacity: 0.5 }} title={`Reviewing: ${reviewingPct}%`} />
          <div style={{ width: `${learningPct}%`, background: 'var(--bg)' }} title={`Learning: ${learningPct}%`} />
        </div>

        {/* Breakdown Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--text)', border: '3px solid var(--border)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace" }}>
                MASTERED ({stats.mastered_count || 0})
              </div>
              <div style={{ fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>Stability &gt; 90 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--border)', opacity: 0.8, border: '3px solid var(--border)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace" }}>
                RETAINED ({stats.retained_count || 0})
              </div>
              <div style={{ fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>Stability 14 - 90 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--border)', opacity: 0.5, border: '3px solid var(--border)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace" }}>
                REVIEWING ({stats.reviewing_count || 0})
              </div>
              <div style={{ fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>Stability 3 - 14 days</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '24px', height: '24px', background: 'var(--bg)', border: '3px solid var(--border)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', fontFamily: "'Space Mono', monospace" }}>
                LEARNING ({stats.learning_count || 0})
              </div>
              <div style={{ fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>Stability &lt; 3 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Breakdown & Difficulty Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
        {/* Topic Patterns */}
        <div style={{ padding: '40px', border: '5px solid var(--border)' }}>
          <h3 style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '32px',
            marginBottom: '24px',
            color: 'var(--text)'
          }}>
            ALGORITHMIC PATTERNS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {topics.length === 0 ? (
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px' }}>No topics recorded yet.</p>
            ) : (
              topics.map(([topic, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={topic}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
                      <span style={{ fontWeight: 'bold' }}>{topic.toUpperCase()}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '16px', border: '3px solid var(--border)', width: '100%' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div style={{ padding: '40px', border: '5px solid var(--border)' }}>
          <h3 style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '32px',
            marginBottom: '24px',
            color: 'var(--text)'
          }}>
            DIFFICULTY STRATIFICATION
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
                <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>EASY</span>
                <span>{stats.difficulty_breakdown?.Easy || 0}</span>
              </div>
              <div style={{ height: '16px', border: '3px solid var(--border)', width: '100%' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Easy || 0) / total) * 100)}%`, background: 'var(--success)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
                <span style={{ fontWeight: 'bold', color: 'var(--warning)' }}>MEDIUM</span>
                <span>{stats.difficulty_breakdown?.Medium || 0}</span>
              </div>
              <div style={{ height: '16px', border: '3px solid var(--border)', width: '100%' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Medium || 0) / total) * 100)}%`, background: 'var(--warning)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
                <span style={{ fontWeight: 'bold', color: 'var(--error)' }}>HARD</span>
                <span>{stats.difficulty_breakdown?.Hard || 0}</span>
              </div>
              <div style={{ height: '16px', border: '3px solid var(--border)', width: '100%' }}>
                <div style={{ height: '100%', width: `${Math.round(((stats.difficulty_breakdown?.Hard || 0) / total) * 100)}%`, background: 'var(--error)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
