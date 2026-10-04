import React, { useState } from 'react';
import { Layers, BookOpen, BarChart3, Flame, Puzzle, RefreshCw, Zap, Bell, Sun, Moon } from 'lucide-react';
import PaceyMascot from './PaceyMascot';

export default function Navbar({
  activeTab,
  setActiveTab,
  dueCount = 0,
  stats,
  theme = 'dark',
  onToggleTheme,
  onRefresh,
  onOpenExtensionGuide,
  onOpenGitHubSync
}) {
  const [notifEnabled, setNotifEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('PacedLearner Reminders Active', {
        body: dueCount > 0 ? `You have ${dueCount} algorithmic problem(s) currently due for recall.` : 'All caught up! We will notify you when cards become due.',
      });
      setNotifEnabled(true);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifEnabled(true);
        new Notification('PacedLearner Reminders Enabled', {
          body: dueCount > 0 ? `You have ${dueCount} algorithmic problem(s) currently due for recall.` : 'Notifications enabled successfully!',
        });
      }
    }
  };
  return (
    <header style={{
      borderBottom: '1px solid var(--border-hairline)',
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 2.5rem',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: '74px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        padding: '6px 0'
      }}>
        {/* Brand with High-Contrast Luxury Serif Authority */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setActiveTab('reviews')}
        >
          {/* Architectural Monogram Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--gold-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>

          {/* Animated Mascot Pacey */}
          <PaceyMascot
            mood={dueCount > 0 ? 'reminder' : 'idle'}
            size={36}
            interactive={true}
          />


          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.18rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase'
              }}>
                PACED<span style={{ color: 'var(--cyber-cyan)' }}>_LEARNER</span>
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 7px',
                borderRadius: '2px',
                background: 'var(--cyber-cyan-tint)',
                color: 'var(--cyber-cyan)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                border: '1px solid var(--cyber-cyan-border)',
                fontFamily: 'var(--font-mono)'
              }}>
                // NEURAL_FSRS
              </span>
            </div>
            <p style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-tech)',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyber-green)', display: 'inline-block', boxShadow: '0 0 6px var(--cyber-green)' }} />
              SYS.ONLINE // ALGORITHMIC RETENTION TERMINAL
            </p>
          </div>
        </div>

        {/* Architectural Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '3px'
        }}>
          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '2px',
              border: '1px solid ' + (activeTab === 'reviews' ? 'var(--cyber-cyan-border)' : 'transparent'),
              background: activeTab === 'reviews' ? 'var(--cyber-cyan-tint)' : 'transparent',
              color: activeTab === 'reviews' ? 'var(--cyber-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'reviews' ? 700 : 500,
              fontSize: '0.82rem',
              fontFamily: 'var(--font-tech)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: activeTab === 'reviews' ? '0 0 12px var(--cyber-cyan-glow)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            <Zap size={14} color={activeTab === 'reviews' ? 'var(--cyber-cyan)' : 'var(--text-muted)'} />
            <span>Neural Queue</span>
            {dueCount > 0 && (
              <span style={{
                background: 'var(--cyber-magenta)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono)',
                boxShadow: '0 0 8px var(--cyber-magenta-glow)'
              }}>
                {dueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notebook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '2px',
              border: '1px solid ' + (activeTab === 'notebook' ? 'var(--cyber-cyan-border)' : 'transparent'),
              background: activeTab === 'notebook' ? 'var(--cyber-cyan-tint)' : 'transparent',
              color: activeTab === 'notebook' ? 'var(--cyber-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'notebook' ? 700 : 500,
              fontSize: '0.82rem',
              fontFamily: 'var(--font-tech)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: activeTab === 'notebook' ? '0 0 12px var(--cyber-cyan-glow)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            <BookOpen size={14} color={activeTab === 'notebook' ? 'var(--cyber-cyan)' : 'var(--text-muted)'} />
            <span>Problem Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '2px',
              border: '1px solid ' + (activeTab === 'analytics' ? 'var(--cyber-cyan-border)' : 'transparent'),
              background: activeTab === 'analytics' ? 'var(--cyber-cyan-tint)' : 'transparent',
              color: activeTab === 'analytics' ? 'var(--cyber-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'analytics' ? 700 : 500,
              fontSize: '0.82rem',
              fontFamily: 'var(--font-tech)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: activeTab === 'analytics' ? '0 0 12px var(--cyber-cyan-glow)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            <BarChart3 size={14} color={activeTab === 'analytics' ? 'var(--cyber-cyan)' : 'var(--text-muted)'} />
            <span>FSRS Telemetry</span>
          </button>
        </nav>

        {/* Right Restrained Luxury Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Active streak */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--gold-tint)',
            border: '1px solid var(--gold-border)',
            color: 'var(--gold-light)',
            fontSize: '0.78rem',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.03em'
          }}>
            <Flame size={14} fill="var(--gold-primary)" color="var(--gold-primary)" />
            <span>Streak Active</span>
          </div>

          {/* GitHub Sync Vault Button */}
          <button
            onClick={onOpenGitHubSync}
            title="GitHub Solution Vault & Auto-Sync"
            className="btn btn-secondary"
            style={{
              padding: '7px 12px',
              fontSize: '0.80rem',
              gap: '6px',
              border: '1px solid var(--border-hairline)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-primary)' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span style={{ fontSize: '0.78rem' }}>GitHub</span>
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? "Switch to Archival Alabaster (Light Mode)" : "Switch to Obsidian & Gold (Dark Mode)"}
            className="btn btn-secondary"
            style={{
              padding: '7px 12px',
              fontSize: '0.80rem',
              gap: '6px',
              border: '1px solid var(--border-hairline)'
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} color="var(--gold-primary)" />
                <span style={{ fontSize: '0.78rem' }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={14} color="var(--gold-primary)" />
                <span style={{ fontSize: '0.78rem' }}>Dark</span>
              </>
            )}
          </button>


          {/* Reminder Bell Button */}
          <button
            onClick={handleToggleNotifications}
            title={notifEnabled ? "Reminders Enabled (Click for test alert)" : "Enable Browser Reminders"}
            style={{
              background: notifEnabled ? 'var(--gold-tint)' : 'var(--bg-surface)',
              border: `1px solid ${notifEnabled ? 'var(--gold-border)' : 'var(--border-hairline)'}`,
              color: notifEnabled ? 'var(--gold-light)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.80rem',
              fontWeight: 500,
              transition: 'all 0.18s ease'
            }}
          >
            <Bell size={14} color={notifEnabled ? 'var(--gold-primary)' : 'var(--text-muted)'} />
            <span>{notifEnabled ? 'Reminders On' : 'Reminders'}</span>
          </button>

          {/* Extension Quick Trigger */}
          <button
            onClick={onOpenExtensionGuide}
            className="btn btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.80rem', gap: '7px' }}
          >
            <Puzzle size={14} color="var(--gold-primary)" />
            <span>Extension</span>
          </button>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
