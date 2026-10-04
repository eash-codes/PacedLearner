import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import FlashcardReview from './components/FlashcardReview';
import ProblemNotebook from './components/ProblemNotebook';
import ProblemDetailModal from './components/ProblemDetailModal';
import AnalyticsView from './components/AnalyticsView';
import ExtensionGuideModal from './components/ExtensionGuideModal';
import ManualAddModal from './components/ManualAddModal.jsx';
import GitHubSyncModal from './components/GitHubSyncModal.jsx';

const API_BASE = 'http://localhost:4100/api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('paced_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('paced_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [activeTab, setActiveTab] = useState('reviews'); // reviews | notebook | analytics
  const [allProblems, setAllProblems] = useState([]);
  const [dueProblems, setDueProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Selected items
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [isExtensionGuideOpen, setIsExtensionGuideOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isGitHubSyncOpen, setIsGitHubSyncOpen] = useState(false);

  // Load all initial data (isSilent prevents loading flicker on background poll)
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const [probRes, dueRes, statRes] = await Promise.all([
        fetch(`${API_BASE}/problems`),
        fetch(`${API_BASE}/reviews/due`),
        fetch(`${API_BASE}/analytics`)
      ]);

      if (!probRes.ok || !dueRes.ok || !statRes.ok) {
        throw new Error('Failed to connect to PacedLearner server. Ensure server is running on port 4100.');
      }

      const probData = await probRes.json();
      const dueData = await dueRes.json();
      const statData = await statRes.json();

      setAllProblems(probData.problems || []);
      setDueProblems(dueData.problems || []);
      setStats(statData);
    } catch (err) {
      console.error('API Error:', err);
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const anyModalOpen = !!(selectedProblem || isExtensionGuideOpen || isManualAddOpen || isGitHubSyncOpen);

  // Lock body scroll and register Escape listener when modals are open (zero leaks)
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (selectedProblem) setSelectedProblem(null);
          if (isGitHubSyncOpen) setIsGitHubSyncOpen(false);
          if (isManualAddOpen) setIsManualAddOpen(false);
          if (isExtensionGuideOpen) setIsExtensionGuideOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [anyModalOpen, selectedProblem, isGitHubSyncOpen, isManualAddOpen, isExtensionGuideOpen]);

  useEffect(() => {
    // Initial fetch with loader
    fetchData(false);

    // Silent background poll every 12 seconds, pausing when user is interacting with any modal
    const interval = setInterval(() => {
      if (!anyModalOpen && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchData, anyModalOpen]);


  // Grade an active review (FSRS)
  const handleGradeReview = async (problemId, rating) => {
    try {
      const res = await fetch(`${API_BASE}/reviews/${problemId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });

      if (!res.ok) throw new Error('Failed to grade review');
      const data = await res.json();

      // Refresh list
      await fetchData();
      return data;
    } catch (err) {
      console.error('Error grading review:', err);
      alert('Error updating review rating.');
    }
  };

  // Update notes & intuition
  const handleUpdateNotes = async (problemId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/problems/${problemId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Failed to update notes');
      const data = await res.json();

      setSelectedProblem(data.problem);
      await fetchData();
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes.');
    }
  };

  // Manual problem add
  const handleAddProblem = async (problemData) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemData)
      });

      if (!res.ok) throw new Error('Failed to add problem');
      await fetchData();
    } catch (err) {
      console.error('Error logging problem:', err);
      alert('Failed to add problem.');
    }
  };

  // Trigger review for a single problem from the notebook
  const handleStartReviewProblem = (problem) => {
    // Put problem at front of due list and switch to reviews tab
    setDueProblems([problem, ...dueProblems.filter(p => p.id !== problem.id)]);
    setActiveTab('reviews');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dueCount={dueProblems.length}
        stats={stats}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRefresh={fetchData}
        onOpenExtensionGuide={() => setIsExtensionGuideOpen(true)}
        onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '4rem' }}>
        {error ? (
          <div style={{
            maxWidth: '640px',
            margin: '4rem auto',
            padding: '2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#f87171', marginBottom: '8px' }}>Cannot Connect to Server</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {error}
            </p>
            <button onClick={fetchData} className="btn btn-secondary">
              Try Reconnecting
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'reviews' && (
              <FlashcardReview
                dueProblems={dueProblems}
                onGradeReview={handleGradeReview}
                onSelectProblem={(p) => setSelectedProblem(p)}
                onSwitchToNotebook={() => setActiveTab('notebook')}
                onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
              />
            )}

            {activeTab === 'notebook' && (
              <ProblemNotebook
                problems={allProblems}
                onSelectProblem={(p) => setSelectedProblem(p)}
                onStartReviewProblem={handleStartReviewProblem}
                onOpenManualAdd={() => setIsManualAddOpen(true)}
                onOpenGitHubSync={() => setIsGitHubSyncOpen(true)}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView
                stats={stats}
                problems={allProblems}
              />
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      {selectedProblem && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onUpdateNotes={handleUpdateNotes}
          onStartReview={handleStartReviewProblem}
          onProblemSynced={fetchData}
        />
      )}

      {/* GitHub Solution Vault Modal */}
      <GitHubSyncModal
        isOpen={isGitHubSyncOpen}
        onClose={() => setIsGitHubSyncOpen(false)}
        problems={allProblems}
        onProblemSynced={fetchData}
      />

      {/* Extension Setup Guide Modal */}
      {isExtensionGuideOpen && (
        <ExtensionGuideModal
          onClose={() => setIsExtensionGuideOpen(false)}
        />
      )}

      {/* Manual Problem Add Modal */}
      {isManualAddOpen && (
        <ManualAddModal
          onClose={() => setIsManualAddOpen(false)}
          onAddProblem={handleAddProblem}
        />
      )}
    </div>
  );
}

