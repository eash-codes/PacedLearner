import React, { useState, useEffect } from 'react';

export default function GitHubSyncModal({ isOpen, onClose, problems = [], onProblemSynced }) {
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [status, setStatus] = useState(null);
  const [repos, setRepos] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [repoName, setRepoName] = useState('leetcode-solutions');
  const [directoryMode, setDirectoryMode] = useState('by-topic');
  const [autoPush, setAutoPush] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const timerRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchGitHubStatus();
    }
  }, [isOpen]);

  async function fetchGitHubStatus() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('http://localhost:4100/api/github/status');
      if (!res.ok) throw new Error('Failed to fetch GitHub status');
      const data = await res.json();
      setStatus(data);

      if (data.config) {
        setRepoName(data.config.repo || 'leetcode-solutions');
        setDirectoryMode(data.config.directoryMode || 'by-topic');
        setAutoPush(data.config.autoPush ?? true);
        setIsPrivate(data.config.isPrivate ?? false);
      }

      // Fetch user repos in background
      if (data.authenticated) {
        fetch('http://localhost:4100/api/github/repos')
          .then(r => r.json())
          .then(d => setRepos(d.repos || []))
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    try {
      setError('');
      setSuccessMsg('');
      const res = await fetch('http://localhost:4100/api/github/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
          directoryMode,
          autoPush,
          isPrivate
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Settings updated successfully');
        fetchGitHubStatus();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to save config');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateRepo() {
    try {
      setCreatingRepo(true);
      setError('');
      const res = await fetch('http://localhost:4100/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          description: 'Curated LeetCode solutions, algorithmic intuition invariants, and FSRS spaced repetition schedules synced via PacedLearner.',
          isPrivate
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Repository ${repoName} created & linked!`);
        fetchGitHubStatus();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to create repository');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingRepo(false);
    }
  }

  async function handleSyncAll() {
    try {
      setSyncingAll(true);
      setError('');
      setSyncProgress({ current: 0, total: problems.length, message: 'Initiating repository sync...' });

      const res = await fetch('http://localhost:4100/api/github/push-all', {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        setSyncProgress({
          current: data.pushed,
          total: data.total,
          message: `Successfully synchronized ${data.pushed} of ${data.total} problems!`
        });
        setSuccessMsg(`All ${data.pushed} solutions and Master README pushed to GitHub!`);
        if (onProblemSynced) onProblemSynced();
        fetchGitHubStatus();
      } else {
        throw new Error(data.error || 'Batch push failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingAll(false);
    }
  }

  if (!isOpen) return null;

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
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg)',
          border: '5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '3px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg)'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '32px', fontFamily: "'Archivo Black', sans-serif", color: 'var(--text)' }}>
              GITHUB SYNC
            </h2>
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

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && (
            <div
              style={{
                padding: '16px',
                border: '3px solid var(--error)',
                color: 'var(--error)',
                fontWeight: 'bold',
                fontFamily: "'Space Mono', monospace"
              }}
            >
              ERROR: {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '16px',
                border: '3px solid var(--success)',
                color: 'var(--success)',
                fontWeight: 'bold',
                fontFamily: "'Space Mono', monospace"
              }}
            >
              SUCCESS: {successMsg}
            </div>
          )}

          {/* Account & Target Repo Status */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Space Mono', monospace" }}>
              CHECKING GITHUB AUTHENTICATION...
            </div>
          ) : status?.authenticated ? (
            <div
              style={{
                padding: '24px',
                border: '3px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={status.user.avatar_url}
                  alt={status.user.login}
                  style={{ width: '64px', height: '64px', border: '3px solid var(--border)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px', fontFamily: "'Work Sans', sans-serif", fontWeight: 600 }}>
                      {status.user.name || status.user.login}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--success)', border: '2px solid var(--success)', padding: '2px 8px', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                      AUTHENTICATED
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontFamily: "'Space Mono', monospace", marginTop: '8px' }}>
                    TARGET: <strong style={{ color: 'var(--text)' }}>{status.targetRepo.fullName}</strong> ({status.targetRepo.default_branch})
                  </div>
                </div>
              </div>

              {status.targetRepo.exists ? (
                <a
                  href={status.targetRepo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ textDecoration: 'none' }}
                >
                  OPEN REPO ↗
                </a>
              ) : (
                <button
                  onClick={handleCreateRepo}
                  disabled={creatingRepo}
                  className="btn-primary"
                >
                  {creatingRepo ? 'CREATING...' : 'CREATE REPO'}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                border: '3px solid var(--error)'
              }}
            >
              <div style={{ fontSize: '22px', fontFamily: "'Work Sans', sans-serif", fontWeight: 600, color: 'var(--error)', marginBottom: '16px' }}>
                GITHUB NOT CONNECTED
              </div>
              <p style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: '15px' }}>
                Run <span className="tag-pill">gh auth login</span> in your terminal or add <span className="tag-pill">GITHUB_TOKEN</span> to <span className="tag-pill">server/.env</span>.
              </p>
            </div>
          )}

          {/* Master Sync Action Banner */}
          <div
            style={{
              padding: '24px',
              border: '3px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '22px', fontFamily: "'Work Sans', sans-serif", fontWeight: 600 }}>
                  SYNC ENTIRE SOLUTION VAULT
                </div>
                <div style={{ fontSize: '16px', marginTop: '8px' }}>
                  Push all {problems.length} cataloged solutions and generate root Master README.
                </div>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || !status?.authenticated}
                className="btn-primary"
              >
                {syncingAll ? 'SYNCING...' : 'PUSH ALL SOLUTIONS'}
              </button>
            </div>

            {syncProgress && (
              <div style={{ marginTop: '16px', borderTop: '3px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono', monospace", marginBottom: '8px' }}>
                  <span>{syncProgress.message}</span>
                  <span>{syncProgress.current} / {syncProgress.total}</span>
                </div>
                <div style={{ width: '100%', height: '16px', border: '3px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                  <div
                    style={{
                      width: `${(syncProgress.current / (syncProgress.total || 1)) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--text)'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sync Preferences & Repository Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', border: '3px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontFamily: "'Work Sans', sans-serif", fontWeight: 600 }}>
              CONFIGURATION
            </h3>

            {/* Target Repo Name */}
            <div>
              <label className="input-label">
                REPOSITORY NAME
              </label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="e.g. leetcode-solutions"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSaveConfig}
                  className="btn-secondary"
                >
                  SAVE
                </button>
              </div>
            </div>

            {/* Folder Layout Mode */}
            <div>
              <label className="input-label">
                VAULT DIRECTORY LAYOUT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                <div
                  onClick={() => { setDirectoryMode('by-topic'); }}
                  style={{
                    padding: '16px',
                    border: `3px solid ${directoryMode === 'by-topic' ? 'var(--text)' : 'var(--border)'}`,
                    backgroundColor: directoryMode === 'by-topic' ? 'var(--text)' : 'var(--bg)',
                    color: directoryMode === 'by-topic' ? 'var(--bg)' : 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: "'Work Sans', sans-serif" }}>BY TOPIC</div>
                  <div style={{ fontSize: '14px', marginTop: '8px', fontFamily: "'Space Mono', monospace" }}>
                    Array & Hashing/two-sum/
                  </div>
                </div>

                <div
                  onClick={() => { setDirectoryMode('flat'); }}
                  style={{
                    padding: '16px',
                    border: `3px solid ${directoryMode === 'flat' ? 'var(--text)' : 'var(--border)'}`,
                    backgroundColor: directoryMode === 'flat' ? 'var(--text)' : 'var(--bg)',
                    color: directoryMode === 'flat' ? 'var(--bg)' : 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: "'Work Sans', sans-serif" }}>FLAT DIRECTORY</div>
                  <div style={{ fontSize: '14px', marginTop: '8px', fontFamily: "'Space Mono', monospace" }}>
                    Problems/two-sum/
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-Push Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '3px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: "'Work Sans', sans-serif" }}>
                  AUTO-PUSH ON SOLVE & REVIEW
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  Automatically commit code & updated FSRS stats whenever you log or review a problem.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPush}
                onChange={e => {
                  setAutoPush(e.target.checked);
                  // Wait, where is saveGitHubConfig? It's not in the component! I'll call handleSaveConfig here since it does the same, or wait... I should probably just let them click Save.
                  // Oh wait, in the original code there was a saveGitHubConfig call which was undefined. Let's remove it and let them click save.
                }}
                className="checkbox"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
