import React, { useState } from 'react';
import { useMascot } from './MascotCompanion.jsx';

export default function Navbar({
  activeTab,
  setActiveTab,
  dueCount = 0,
  chokeDueCount = 0,
  stats,
  theme = 'light',
  onToggleTheme,
  onRefresh,
  onOpenExtensionGuide,
  onOpenGitHubSync
}) {
  const mascot = useMascot();
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
        body: dueCount > 0 ? `You have ${dueCount} problem(s) due for review.` : 'All caught up. We will notify you when reviews become due.',
      });
      setNotifEnabled(true);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifEnabled(true);
        new Notification('PacedLearner Reminders Enabled', {
          body: dueCount > 0 ? `You have ${dueCount} problem(s) due for review.` : 'Notifications enabled.',
        });
      }
    }
  };

  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    if (mascot) {
      mascot.react('tab-change', { tab: tabId });
    }
  };

  const handleThemeClick = () => {
    const nextDark = theme !== 'dark';
    if (onToggleTheme) onToggleTheme();
    if (mascot) mascot.react('theme-toggle', { dark: nextDark });
  };

  const tabs = [
    { id: 'reviews', label: 'REVIEW QUEUE' },
    { id: 'notebook', label: 'PROBLEM LOG' },
    { id: 'interrogation', label: 'INTERROGATION' },
    { id: 'surgery', label: 'SURGERY' },
    { id: 'analytics', label: 'ANALYTICS' }
  ];

  return (
    <header className="rawblock-navbar" style={{
      borderBottom: '3px solid var(--border)',
      background: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 24px'
    }}>
      <div className="rawblock-navbar-inner" style={{
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Brand Lockup */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => handleTabSwitch('reviews')}
        >
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '22px',
            letterSpacing: '-0.01em',
            color: 'var(--text)'
          }}>
            PACED LEARNER
          </span>
          <span className="rawblock-navbar-subtitle" style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: 'var(--text)',
            textTransform: 'uppercase',
            borderLeft: '2px solid var(--border)',
            paddingLeft: '12px'
          }}>
            FSRS // SPACED REPETITION
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="rawblock-navbar-tabs" style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          minHeight: '64px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 24px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '5px solid var(--border)' : '5px solid transparent',
                background: activeTab === tab.id ? 'var(--text)' : 'transparent',
                color: activeTab === tab.id ? 'var(--bg)' : 'var(--text)',
                fontFamily: "'Work Sans', sans-serif",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '12px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'none'
              }}
            >
              {tab.label}
              {tab.id === 'reviews' && dueCount > 0 && (
                <span style={{
                  background: 'var(--error)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  fontFamily: "'Space Mono', monospace"
                }}>
                  {dueCount}
                </span>
              )}
              {tab.id === 'surgery' && chokeDueCount > 0 && (
                <span style={{
                  background: 'var(--error)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  fontFamily: "'Space Mono', monospace"
                }}>
                  {chokeDueCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="rawblock-navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
          {/* GitHub */}
          <button
            onClick={onOpenGitHubSync}
            title="GitHub Solution Vault"
            style={{
              background: 'transparent',
              border: '3px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GITHUB
          </button>

          {/* Reminders */}
          <button
            onClick={handleToggleNotifications}
            title={notifEnabled ? "Reminders active" : "Enable reminders"}
            style={{
              background: notifEnabled ? 'var(--text)' : 'transparent',
              border: '3px solid var(--border)',
              borderLeft: 'none',
              color: notifEnabled ? 'var(--bg)' : 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: 0
            }}
          >
            {notifEnabled ? 'ALERTS ON' : 'ALERTS'}
          </button>

          {/* Extension */}
          <button
            onClick={onOpenExtensionGuide}
            title="Chrome Extension Setup"
            style={{
              background: 'transparent',
              border: '3px solid var(--border)',
              borderLeft: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: 0
            }}
          >
            EXTENSION
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh data"
            style={{
              background: 'transparent',
              border: '3px solid var(--border)',
              borderLeft: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 0,
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}
          >
            SYNC
          </button>

          {/* Dark Mode / Color Inversion Toggle */}
          <button
            id="navbar-theme-toggle"
            onClick={handleThemeClick}
            title="Toggle Dark Mode (Invert B&W Polarity)"
            style={{
              background: theme === 'dark' ? 'var(--text)' : 'transparent',
              border: '3px solid var(--border)',
              borderLeft: 'none',
              color: theme === 'dark' ? 'var(--bg)' : 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 0,
              fontFamily: "'Space Mono', monospace",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            {theme === 'dark' ? '◑ LIGHT' : '◐ DARK'}
          </button>
        </div>
      </div>
    </header>
  );
}
