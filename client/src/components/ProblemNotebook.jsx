import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  ChevronRight,
  Zap,
  Plus
} from 'lucide-react';

export default function ProblemNotebook({
  problems = [],
  onSelectProblem,
  onStartReviewProblem,
  onOpenManualAdd,
  onOpenGitHubSync
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');

  // Filter problems
  const filteredProblems = problems.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.patterns || []).some(pat => pat.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDifficulty = difficultyFilter === 'all' || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    const matchesMastery = masteryFilter === 'all' || (p.mastery_level || '').toLowerCase() === masteryFilter.toLowerCase();

    return matchesSearch && matchesDifficulty && matchesMastery;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1440px', margin: '2.5rem auto', padding: '0 2.5rem' }}>
      {/* Top Header & Search Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '2rem',
        marginBottom: '2.25rem'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-tech)',
            fontSize: '2.2rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            marginBottom: '6px'
          }}>
            ALGORITHMIC_VAULT <span style={{ color: 'var(--cyber-cyan)' }}>// REPOSITORY</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', fontFamily: 'var(--font-tech)', letterSpacing: '0.04em' }}>
            [STATUS: {problems.length} PROBLEMS ARCHIVED] // FSRS RETRIEVAL STABILITY & CODE INVARIANTS
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            width: '280px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            transition: 'border-color 0.18s ease'
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search problems, patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '9px 8px',
                fontSize: '0.84rem',
                outline: 'none',
                width: '100%',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          {/* GitHub Vault Button */}
          <button
            onClick={onOpenGitHubSync}
            className="btn btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem', gap: '8px' }}
            title="Open GitHub Solutions Vault & Sync All"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub Vault</span>
          </button>

          {/* Quick Manual Add Button */}
          <button
            onClick={onOpenManualAdd}
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.84rem' }}
          >
            <Plus size={15} />
            <span>Log Problem</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-hairline)'
      }}>
        {/* Difficulty Filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'Easy', 'Medium', 'Hard'].map((diff) => {
            const isSelected = difficultyFilter === diff.toLowerCase();
            return (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff.toLowerCase())}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid ' + (isSelected ? 'var(--border-subtle)' : 'transparent'),
                  background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s ease'
                }}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Mastery Filter */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'Learning', 'Reviewing', 'Retained', 'Mastered'].map((m) => {
            const isSelected = masteryFilter === m.toLowerCase();
            return (
              <button
                key={m}
                onClick={() => setMasteryFilter(m.toLowerCase())}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid ' + (isSelected ? 'var(--border-subtle)' : 'transparent'),
                  background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: isSelected ? 'var(--gold-light)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s ease'
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cyber HUD Data Table */}
      <div className="glass-panel cyber-scanline" style={{ overflowX: 'auto', position: 'relative' }}>
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(255, 255, 255, 0.015)',
              borderBottom: '1px solid var(--border-hairline)',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-mono)'
            }}>
              <th style={{ padding: '14px 22px', fontWeight: 600 }}>Problem</th>
              <th style={{ padding: '14px 16px', fontWeight: 600 }}>Tier</th>
              <th style={{ padding: '14px 16px', fontWeight: 600 }}>Patterns & Invariants</th>
              <th style={{ padding: '14px 16px', fontWeight: 600 }}>Stage</th>
              <th style={{ padding: '14px 16px', fontWeight: 600 }}>Retention & Stability</th>
              <th style={{ padding: '14px 16px', fontWeight: 600 }}>Next Scheduled</th>
              <th style={{ padding: '14px 22px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No algorithmic solutions found matching criteria.
                </td>
              </tr>
            ) : (
              filteredProblems.map((p) => {
                const diffClass = p.difficulty === 'Easy' ? 'badge-easy' : p.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';
                const masteryClass = `badge-${(p.mastery_level || 'learning').toLowerCase()}`;
                const retPercent = Math.round((p.retrievability || 0) * 100);
                const retColor = retPercent >= 90 ? '#10b981' : retPercent >= 80 ? '#f59e0b' : '#f43f5e';

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--border-hairline)',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => onSelectProblem(p)}
                  >
                    {/* Title */}
                    <td style={{ padding: '16px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.90rem' }}>
                          {p.title}
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
                          title="Open on LeetCode"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        {p.time_complexity ? `${p.time_complexity} • ` : ''}{p.attempts_count || 1} solves logged
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td style={{ padding: '16px 16px' }}>
                      <span className={`badge ${diffClass}`}>{p.difficulty}</span>
                    </td>

                    {/* Patterns & Tags */}
                    <td style={{ padding: '16px 16px', maxWidth: '280px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(p.patterns || []).slice(0, 2).map((pat, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.72rem',
                            padding: '2px 7px',
                            borderRadius: '3px',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {pat}
                          </span>
                        ))}
                        {(p.tags || []).slice(0, 1).map((t, idx) => (
                          <span key={idx} className="tag-pill">#{t}</span>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 700, color: retColor, fontSize: '0.84rem', fontFamily: 'var(--font-mono)' }}>
                          {retPercent}%
                        </span>
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          S: {p.fsrs_stability}d
                        </span>
                      </div>
                      <div style={{ width: '84px', height: '3px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1.5px', overflow: 'hidden' }}>
                        <div style={{ width: `${retPercent}%`, height: '100%', background: retColor }} />
                      </div>
                    </td>

                    {/* Next Review */}
                    <td style={{ padding: '16px 16px' }}>
                      {p.is_due ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 7px',
                          borderRadius: '3px',
                          background: 'var(--crimson-tint)',
                          color: '#fb7185',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          border: '1px solid var(--crimson-border)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          ⚡ Due Today
                        </span>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(p.next_review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({p.interval_days}d)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 22px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {p.github_url && (
                          <a
                            href={p.github_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.76rem', color: 'var(--emerald-primary, #10b981)' }}
                            title="View solution on GitHub"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartReviewProblem(p);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '5px 9px', fontSize: '0.76rem', gap: '4px' }}
                          title="Trigger flashcard recall"
                        >
                          <Zap size={12} color="var(--gold-primary)" />
                          <span>Review</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProblem(p);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                        >
                          <span>Notes</span>
                          <ChevronRight size={12} />
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
