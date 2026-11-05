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
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
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
              CATALOG ALGORITHMIC SOLUTION
            </h3>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '15px', color: 'var(--text)', margin: 0 }}>
              ADD A PROBLEM TO PACEDLEARNER WITH FSRS RETENTION SCHEDULING.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
          <div>
            <label className="input-label">
              PROBLEM TITLE *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 3Sum"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label className="input-label">
                DIFFICULTY TIER
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="input-label">
                SOLVE DURATION (MINUTES)
              </label>
              <input
                type="number"
                value={timeSpentMinutes}
                onChange={(e) => setTimeSpentMinutes(Number(e.target.value))}
                min="1"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">
              PATTERNS & INVARIANTS (COMMA SEPARATED)
            </label>
            <input
              type="text"
              placeholder="e.g. Two Pointers, Monotonic Queue, Sliding Window"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label className="input-label">
              INITIAL FSRS RECALL CALIBRATION
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { val: 1, label: 'AGAIN (1D)' },
                { val: 2, label: 'HARD (2D)' },
                { val: 3, label: 'GOOD (4D)' },
                { val: 4, label: 'EASY (8D)' }
              ].map((r) => (
                <button
                  type="button"
                  key={r.val}
                  onClick={() => setRating(r.val)}
                  style={{
                    padding: '12px',
                    border: `3px solid ${rating === r.val ? 'var(--text)' : 'var(--border)'}`,
                    background: rating === r.val ? 'var(--text)' : 'var(--bg)',
                    color: rating === r.val ? 'var(--bg)' : 'var(--text)',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontFamily: "'Space Mono', monospace"
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">
              INVARIANT & STRATEGY NOTES
            </label>
            <textarea
              placeholder="What algorithmic invariant or structural insight unlocks this solution?"
              value={intuition}
              onChange={(e) => setIntuition(e.target.value)}
              rows={3}
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="input-label">
              ACCEPTED SOLUTION CODE (OPTIONAL)
            </label>
            <textarea
              placeholder="Paste accepted code implementation..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={4}
              className="input-field"
              style={{ width: '100%', fontFamily: "'Space Mono', monospace", resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} />
            <span>{submitting ? 'CATALOGING...' : 'CATALOG IN PACEDLEARNER'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
