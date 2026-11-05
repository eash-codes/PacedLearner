import React, { useState } from 'react';
import { useMascot } from './MascotCompanion.jsx';

export default function ProblemNotebook({
  problems = [],
  onSelectProblem,
  onStartReviewProblem,
  onStartInterrogation,
  onOpenManualAdd,
  onOpenGitHubSync
}) {
  const mascot = useMascot();
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.patterns || []).some(pat => pat.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDifficulty = difficultyFilter === 'all' || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    const matchesMastery = masteryFilter === 'all' || (p.mastery_level || '').toLowerCase() === masteryFilter.toLowerCase();

    return matchesSearch && matchesDifficulty && matchesMastery;
  });

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (mascot) mascot.react('search-problems', { query: val });
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '40px auto', padding: '0 40px' }}>
      {/* Top Header & Search Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '64px',
            color: 'var(--text)',
            lineHeight: 1.0,
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            ALGORITHMIC VAULT
          </h1>
          <p style={{ color: 'var(--text)', fontSize: '15px', fontFamily: "'Space Mono', monospace" }}>
            [{problems.length} PROBLEMS ARCHIVED] // FSRS RETRIEVAL STABILITY &amp; CODE INVARIANTS
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="SEARCH PROBLEMS, PATTERNS..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="input-field"
            style={{
              width: '280px',
              borderRight: 'none'
            }}
          />

          <button
            onClick={onOpenGitHubSync}
            className="btn btn-secondary"
            style={{ borderRight: 'none' }}
            title="Open GitHub Solutions Vault & Sync All"
          >
            GITHUB VAULT
          </button>

          <button
            onClick={onOpenManualAdd}
            className="btn btn-primary"
          >
            + LOG PROBLEM
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '3px solid var(--border)'
      }}>
        {/* Difficulty Filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'Easy', 'Medium', 'Hard'].map((diff) => {
            const isSelected = difficultyFilter === diff.toLowerCase();
            return (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff.toLowerCase())}
                style={{
                  padding: '4px 12px',
                  border: '2px solid var(--border)',
                  background: isSelected ? 'var(--text)' : 'var(--bg)',
                  color: isSelected ? 'var(--bg)' : 'var(--text)',
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                {diff}
              </button>
            );
          })}
        </div>

        {/* Mastery Filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'Learning', 'Reviewing', 'Retained', 'Mastered'].map((m) => {
            const isSelected = masteryFilter === m.toLowerCase();
            return (
              <button
                key={m}
                onClick={() => setMasteryFilter(m.toLowerCase())}
                style={{
                  padding: '4px 12px',
                  border: '2px solid var(--border)',
                  background: isSelected ? 'var(--text)' : 'var(--bg)',
                  color: isSelected ? 'var(--bg)' : 'var(--text)',
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brutalist Data Table */}
      <div style={{ border: '5px solid var(--border)', background: 'var(--bg)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
          <thead>
            <tr style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderBottom: '3px solid var(--border)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: "'Space Mono', monospace"
            }}>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>PROBLEM</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>TIER</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>PATTERNS &amp; INVARIANTS</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>STAGE</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>RETENTION &amp; STABILITY</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>NEXT SCHEDULED</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace" }}>
                  NO ALGORITHMIC SOLUTIONS FOUND MATCHING CRITERIA.
                </td>
              </tr>
            ) : (
              filteredProblems.map((p) => {
                const diffClass = p.difficulty === 'Easy' ? 'badge-easy' : p.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';
                const masteryClass = `badge-${(p.mastery_level || 'learning').toLowerCase()}`;
                const retPercent = Math.round((p.retrievability || 0) * 100);
                const retColor = retPercent >= 90 ? '#008000' : retPercent >= 80 ? '#FFA500' : '#FF0000';

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '3px solid var(--border)',
                      cursor: 'pointer',
                      background: 'var(--bg)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--surface-sunken)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg)'; }}
                    onClick={() => {
                      if (mascot) mascot.react('problem-inspect', { title: p.title });
                      onSelectProblem(p);
                    }}
                  >
                    {/* Title */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '16px', fontFamily: "'Work Sans', sans-serif" }}>
                          {p.title}
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: 'var(--link-blue)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'underline'
                          }}
                          title="Open on LeetCode"
                        >
                          [LC]
                        </a>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: "'Space Mono', monospace" }}>
                        {p.time_complexity ? `${p.time_complexity} • ` : ''}{p.attempts_count || 1} SOLVES LOGGED
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td style={{ padding: '16px 16px' }}>
                      <span className={`badge ${diffClass}`}>{p.difficulty}</span>
                    </td>

                    {/* Patterns & Tags */}
                    <td style={{ padding: '16px 16px', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(p.patterns || []).slice(0, 2).map((pat, idx) => (
                          <span key={idx} className="tag-pill">
                            {pat}
                          </span>
                        ))}
                        {(p.tags || []).slice(0, 1).map((t, idx) => (
                          <span key={idx} className="tag-pill" style={{ background: 'var(--surface-sunken)' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Mastery Level */}
                    <td style={{ padding: '16px 16px' }}>
                      <span className={`badge ${masteryClass}`}>
                        {p.mastery_level || 'Learning'}
                      </span>
                    </td>

                    {/* Retention & FSRS Stability */}
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: retColor, fontSize: '14px', fontFamily: "'Space Mono', monospace" }}>
                          {retPercent}%
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace" }}>
                          S={Number(p.fsrs_stability || 1).toFixed(1)}d
                        </span>
                      </div>
                      <div style={{ width: '96px', height: '6px', background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
                        <div style={{ width: `${retPercent}%`, height: '100%', background: 'var(--text)' }} />
                      </div>
                    </td>

                    {/* Next Review */}
                    <td style={{ padding: '16px 16px' }}>
                      {p.is_due ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: 'var(--bg)',
                          color: '#FF0000',
                          fontWeight: 700,
                          fontSize: '11px',
                          border: '2px solid #FF0000',
                          fontFamily: "'Space Mono', monospace",
                          textTransform: 'uppercase'
                        }}>
                          DUE TODAY
                        </span>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--text)', fontFamily: "'Space Mono', monospace" }}>
                          {new Date(p.next_review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                            ({p.interval_days}d)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartReviewProblem(p);
                          }}
                          style={{
                            padding: '6px 12px',
                            border: '2px solid var(--border)',
                            background: 'var(--text)',
                            color: 'var(--bg)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                          title="Trigger flashcard recall"
                        >
                          REVIEW
                        </button>

                        {onStartInterrogation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartInterrogation(p);
                            }}
                            style={{
                              padding: '6px 10px',
                              border: '2px solid var(--border)',
                              borderLeft: 'none',
                              background: 'var(--bg)',
                              color: 'var(--text)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Mock Interview this problem with Pacey"
                          >
                            <span>🎙</span>
                            <span>MOCK</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mascot) mascot.react('problem-inspect', { title: p.title });
                            onSelectProblem(p);
                          }}
                          style={{
                            padding: '6px 12px',
                            border: '2px solid var(--border)',
                            borderLeft: 'none',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          NOTES
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
