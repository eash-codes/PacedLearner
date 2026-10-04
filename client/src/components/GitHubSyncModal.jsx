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
        backgroundColor: 'var(--modal-backdrop-bg, rgba(0, 0, 0, 0.75))',
        backdropFilter: 'blur(8px)',
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
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '16px',
          boxShadow: 'var(--card-shadow, 0 25px 50px -12px rgba(0,0,0,0.4))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-elevated)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-surface-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--cyber-cyan-border)',
                boxShadow: '0 0 10px var(--cyber-cyan-glow)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--cyber-cyan)' }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-tech)', letterSpacing: '0.04em' }}>
                GITHUB_VAULT <span style={{ color: 'var(--cyber-cyan)' }}>// REPO_SYNC</span>
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                [SYNC: ACTIVE] // COMMIT SOLUTIONS, INVARIANTS & FSRS TELEMETRY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--crimson-primary, #ef4444)',
                fontSize: '13px'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--emerald-primary, #10b981)',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Account & Target Repo Status */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Checking GitHub authentication...
            </div>
          ) : status?.authenticated ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={status.user.avatar_url}
                  alt={status.user.login}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {status.user.name || status.user.login}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--emerald-primary, #10b981)', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ✓ Authenticated
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Target: <strong style={{ color: 'var(--text-secondary)' }}>{status.targetRepo.fullName}</strong> ({status.targetRepo.default_branch})
                  </div>
                </div>
              </div>

              {status.targetRepo.exists ? (
                <a
                  href={status.targetRepo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Open Repo</span>
                  <span>↗</span>
                </a>
              ) : (
                <button
                  onClick={handleCreateRepo}
                  disabled={creatingRepo}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {creatingRepo ? 'Creating...' : '+ Create Repo'}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--crimson-primary, #ef4444)', marginBottom: '6px' }}>
                GitHub Not Connected
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Run <code style={{ backgroundColor: 'var(--code-bg)', padding: '2px 6px', borderRadius: '4px' }}>gh auth login</code> in your terminal or add <code style={{ backgroundColor: 'var(--code-bg)', padding: '2px 6px', borderRadius: '4px' }}>GITHUB_TOKEN</code> to <code style={{ backgroundColor: 'var(--code-bg)', padding: '2px 6px', borderRadius: '4px' }}>server/.env</code>.
              </p>
            </div>
          )}

          {/* Master Sync Action Banner */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Sync Entire Solution Vault
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Push all {problems.length} cataloged solutions and generate root Master README index table.
                </div>
              </div>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || !status?.authenticated}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: syncingAll ? 'not-allowed' : 'pointer',
                  opacity: syncingAll ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {syncingAll ? 'Syncing...' : '⚡ Push All Solutions Now'}
              </button>
            </div>

            {syncProgress && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>{syncProgress.message}</span>
                  <span>{syncProgress.current} / {syncProgress.total}</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(syncProgress.current / (syncProgress.total || 1)) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--emerald-primary, #10b981)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sync Preferences & Repository Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Configuration & Organization
            </h3>

            {/* Target Repo Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Repository Name
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="e.g. leetcode-solutions"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSaveConfig}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Folder Layout Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Vault Directory Layout
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => { setDirectoryMode('by-topic'); }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${directoryMode === 'by-topic' ? 'var(--gold-primary)' : 'var(--border-hairline)'}`,
                    backgroundColor: directoryMode === 'by-topic' ? 'var(--bg-surface-elevated)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>By Topic (Recommended)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <code>Array & Hashing/two-sum/</code>
                  </div>
                </div>

                <div
                  onClick={() => { setDirectoryMode('flat'); }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${directoryMode === 'flat' ? 'var(--gold-primary)' : 'var(--border-hairline)'}`,
                    backgroundColor: directoryMode === 'flat' ? 'var(--bg-surface-elevated)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Flat Directory</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <code>Problems/two-sum/</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-Push Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-elevated)', border: '1px solid var(--border-hairline)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Auto-Push on Solve & Review
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Automatically commit code & updated FSRS stats whenever you log or review a problem.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPush}
                onChange={e => {
                  setAutoPush(e.target.checked);
                  saveGitHubConfig({ autoPush: e.target.checked });
                }}
                style={{ accentColor: 'var(--gold-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-surface-elevated)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
