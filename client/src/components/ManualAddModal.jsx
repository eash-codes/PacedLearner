import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function ManualAddModal({ onClose, onAddProblem }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tagsInput, setTagsInput] = useState('');
  const [code, setCode] = useState('');
  const [rating, setRating] = useState(3);
  const [intuition, setIntuition] = useState('');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await onAddProblem({
        title,
        url: url.trim() || `https://leetcode.com/problems/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
        difficulty,
        tags,
        code,
        rating: Number(rating),
        customIntuition: intuition,
        timeSpentSeconds: timeSpentMinutes * 60,
        failedAttempts: 0
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '720px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              marginBottom: '4px'
            }}>
              Catalog Algorithmic Solution
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Add a problem to PacedLearner with FSRS retention scheduling.
            </p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Problem Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 3Sum"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                Difficulty Tier
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                Solve Duration (Minutes)
              </label>
              <input
                type="number"
                value={timeSpentMinutes}
                onChange={(e) => setTimeSpentMinutes(Number(e.target.value))}
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Patterns & Invariants (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Two Pointers, Monotonic Queue, Sliding Window"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Initial FSRS Recall Calibration
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { val: 1, label: 'Again (1d)', color: '#fb7185' },
                { val: 2, label: 'Hard (2d)', color: '#fbbf24' },
                { val: 3, label: 'Good (4d)', color: '#34d399' },
                { val: 4, label: 'Easy (8d)', color: 'var(--gold-light)' }
              ].map((r) => (
                <button
                  type="button"
                  key={r.val}
                  onClick={() => setRating(r.val)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: 'var(--radius-xs)',
                    border: rating === r.val ? '1px solid var(--gold-border)' : '1px solid var(--border-hairline)',
                    background: rating === r.val ? 'var(--gold-tint)' : 'var(--bg-canvas)',
                    color: rating === r.val ? 'var(--gold-light)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Invariant & Strategy Notes
            </label>
            <textarea
              placeholder="What algorithmic invariant or structural insight unlocks this solution?"
              value={intuition}
              onChange={(e) => setIntuition(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.55
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Accepted Solution Code (Optional)
            </label>
            <textarea
              placeholder="Paste accepted code implementation..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--code-bg)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.55
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-gold"
            style={{ marginTop: '8px', padding: '12px', width: '100%' }}
          >
            <Plus size={15} />
            <span>{submitting ? 'Cataloging...' : 'Catalog in PacedLearner'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
