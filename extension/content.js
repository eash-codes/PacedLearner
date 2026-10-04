/**
 * PacedLearner LeetCode Content Script v1.1.0
 * Features:
 * - Master ON / OFF toggle button (on page widget and synced with extension popup)
 * - Automatic Code, Language & Error capture via page interceptor
 * - Automatic Submission watcher (Wrong Answer, Runtime Error, TLE, Accepted)
 * - Auto-Log on Accepted option with non-intrusive toast & manual rating modal
 * - Interactive 'Pacey' mascot with stateful emotions
 */

(() => {
  // Only run on problem pages
  if (!window.location.pathname.includes('/problems/')) return;

  let isTrackingEnabled = true;
  let isAutoLogEnabled = true;

  let sessionStart = Date.now();
  let elapsedSeconds = 0;
  let timerInterval = null;
  let failedAttempts = 0;
  let sessionErrors = [];
  let capturedCode = '';
  let capturedLang = 'python3';
  let isSolved = false;

  // Extract problem metadata from DOM and URL
  function getProblemMetadata() {
    const pathParts = window.location.pathname.split('/problems/')[1]?.split('/') || [];
    const slug = pathParts[0] || 'problem';

    let title = document.querySelector('div[class*="text-title-large"]')?.textContent ||
                document.querySelector('a[href*="/problems/"]')?.textContent ||
                slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Clean title numbers (e.g. "1. Two Sum" -> "Two Sum")
    title = title.replace(/^\d+\.\s*/, '').trim();

    let difficulty = 'Medium';
    const diffEl = document.querySelector('div[class*="text-difficulty-"], div[class*="text-brand-"], div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"]');
    if (diffEl) {
      const text = diffEl.textContent.trim().toLowerCase();
      if (text.includes('easy')) difficulty = 'Easy';
      else if (text.includes('hard')) difficulty = 'Hard';
      else difficulty = 'Medium';
    }

    const tags = [];
    const tagEls = document.querySelectorAll('a[href*="/tag/"]');
    tagEls.forEach(el => {
      const t = el.textContent.trim();
      if (t && !tags.includes(t)) tags.push(t);
    });

    return {
      title,
      slug,
      difficulty,
      url: `https://leetcode.com/problems/${slug}/`,
      tags
    };
  }

  // Timer controls
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!document.hidden && isTrackingEnabled && !isSolved) {
        elapsedSeconds++;
        updateWidgetTimer();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Render SVG Mascot 'Pacey'
  function renderPaceySvg(mood = 'idle', size = 36) {
    const isCelebrating = mood === 'celebrating';
    const isShocked = mood === 'shocked';
    const isThinking = mood === 'thinking';
    const isSleeping = mood === 'sleeping';

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" style="overflow: visible; display: block;">
        <defs>
          <linearGradient id="plPaceyGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7b72" />
            <stop offset="50%" stopColor="#f85149" />
            <stop offset="100%" stopColor="#da3633" />
          </linearGradient>
          <linearGradient id="plBellyGrad" x1="50" y1="45" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffebe9" />
            <stop offset="100%" stopColor="#ffdcd7" />
          </linearGradient>
        </defs>
        <!-- Shadow -->
        <ellipse cx="50" cy="92" rx="24" ry="4" fill="rgba(0,0,0,0.2)" />
        <!-- Body -->
        <path d="M50 14 C28 14 20 34 20 54 C20 74 30 86 50 86 C70 86 80 74 80 54 C80 34 72 14 50 14 Z" fill="url(#plPaceyGrad)" />
        <ellipse cx="50" cy="62" rx="20" ry="18" fill="url(#plBellyGrad)" opacity="0.9" />
        <ellipse cx="29" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
        <ellipse cx="71" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
        <ellipse cx="36" cy="86" rx="7" ry="4" fill="#da3633" />
        <ellipse cx="64" cy="86" rx="7" ry="4" fill="#da3633" />
        ${isCelebrating ? `
          <!-- Celebrating Arms & Happy Face -->
          <path d="M22 48 Q10 32 16 26 Q24 28 26 44" fill="#f85149" />
          <path d="M78 48 Q90 32 84 26 Q76 28 74 44" fill="#f85149" />
          <path d="M32 46 Q40 38 46 46" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round" fill="none" />
          <path d="M54 46 Q60 38 68 46" stroke="#1c1917" stroke-width="3.5" stroke-linecap="round" fill="none" />
          <path d="M42 56 Q50 68 58 56 Z" fill="#991b1b" />
          <circle cx="82" cy="22" r="10" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />
          <path d="M78 22 L81 25 L86 19" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none" />
        ` : isShocked ? `
          <!-- Shocked Face & Sweat Drop -->
          <ellipse cx="21" cy="56" rx="5" ry="7" fill="#f85149" />
          <ellipse cx="79" cy="56" rx="5" ry="7" fill="#f85149" />
          <ellipse cx="38" cy="44" rx="7" ry="8" fill="#ffffff" stroke="#1c1917" stroke-width="2" />
          <ellipse cx="62" cy="44" rx="7" ry="8" fill="#ffffff" stroke="#1c1917" stroke-width="2" />
          <circle cx="38" cy="44" r="3" fill="#1c1917" />
          <circle cx="62" cy="44" r="3" fill="#1c1917" />
          <path d="M74 30 Q78 38 74 42 Q70 38 74 30 Z" fill="#38bdf8" />
          <ellipse cx="50" cy="60" rx="4" ry="6" fill="#1c1917" />
        ` : isThinking ? `
          <!-- Thinking Spectacles -->
          <ellipse cx="21" cy="56" rx="5" ry="7" fill="#f85149" />
          <path d="M78 52 Q66 58 58 56 Q56 50 66 48" fill="#f85149" />
          <circle cx="38" cy="44" r="9" stroke="#1c1917" stroke-width="2" fill="rgba(255,255,255,0.4)" />
          <circle cx="62" cy="44" r="9" stroke="#1c1917" stroke-width="2" fill="rgba(255,255,255,0.4)" />
          <line x1="47" y1="44" x2="53" y2="44" stroke="#1c1917" stroke-width="2" />
          <circle cx="41" cy="41" r="3" fill="#1c1917" />
          <circle cx="65" cy="41" r="3" fill="#1c1917" />
          <path d="M46 58 Q50 55 54 58" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
        ` : isSleeping ? `
          <!-- Sleeping Zzz -->
          <ellipse cx="21" cy="56" rx="5" ry="7" fill="#f85149" />
          <ellipse cx="79" cy="56" rx="5" ry="7" fill="#f85149" />
          <path d="M34 46 Q40 50 46 46" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M54 46 Q60 50 66 46" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <text x="70" y="30" font-family="monospace" font-size="14" fill="#38bdf8" font-weight="bold">z</text>
          <text x="80" y="20" font-family="monospace" font-size="11" fill="#38bdf8" font-weight="bold">z</text>
        ` : `
          <!-- Idle Cute Eyes -->
          <ellipse cx="21" cy="56" rx="5" ry="7" fill="#f85149" />
          <ellipse cx="79" cy="56" rx="5" ry="7" fill="#f85149" />
          <circle cx="38" cy="44" r="5" fill="#1c1917" />
          <circle cx="36.5" cy="42" r="1.8" fill="#ffffff" />
          <circle cx="62" cy="44" r="5" fill="#1c1917" />
          <circle cx="60.5" cy="42" r="1.8" fill="#ffffff" />
          <path d="M46 56 Q50 60 54 56" stroke="#1c1917" stroke-width="2.5" stroke-linecap="round" fill="none" />
        `}
      </svg>
    `;
  }

  function setPaceyMood(mood, statusText) {
    const container = document.getElementById('pl-pacey-icon');
    const textEl = document.getElementById('pl-pacey-status');
    if (container) container.innerHTML = renderPaceySvg(mood, 36);
    if (textEl && statusText) textEl.textContent = statusText;
  }

  // Build or update the in-page floating widget
  function renderWidget() {
    let widget = document.getElementById('paced-learner-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'paced-learner-widget';
      document.body.appendChild(widget);
    }

    if (!isTrackingEnabled) {
      // Compact Paused state
      widget.className = 'pl-paused';
      widget.innerHTML = `
        <span class="pl-paused-dot"></span>
        <span class="pl-paused-text">PACED_LEARNER: PAUSED</span>
        <button class="pl-resume-btn" id="pl-resume-widget-btn" title="Turn PacedLearner watcher ON">Resume</button>
      `;

      document.getElementById('pl-resume-widget-btn')?.addEventListener('click', () => {
        setTrackingState(true);
      });
      return;
    }

    // Active state
    widget.className = '';
    widget.innerHTML = `
      <div class="pl-pacey-container" id="pl-pacey-icon" title="Pacey Mascot — Click me!">
        ${renderPaceySvg('idle', 36)}
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="pl-pacey-name">Pacey</span>
          <span class="pl-pacey-mood-text" id="pl-pacey-status">Focusing...</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <div class="pl-timer" id="pl-timer-display">${formatTime(elapsedSeconds)}</div>
          <div class="pl-stats-sub" id="pl-attempts-display">${failedAttempts > 0 ? `Attempts: ${failedAttempts + 1}` : 'First try'}</div>
        </div>
      </div>
      <button class="pl-widget-btn" id="pl-log-now-btn" title="Open Manual Review & Rating dialog">Log Solve</button>
      <button class="pl-widget-power-btn" id="pl-power-btn" title="Turn PacedLearner Watcher OFF">⏸️</button>
    `;

    document.getElementById('pl-log-now-btn')?.addEventListener('click', () => {
      openIngestModal();
    });

    document.getElementById('pl-power-btn')?.addEventListener('click', () => {
      setTrackingState(false);
    });

    document.getElementById('pl-pacey-icon')?.addEventListener('click', () => {
      setPaceyMood('celebrating', 'You got this! 🚀');
      setTimeout(() => setPaceyMood('idle', 'Focusing...'), 2500);
    });
  }

  function updateWidgetTimer() {
    const el = document.getElementById('pl-timer-display');
    if (el) el.textContent = formatTime(elapsedSeconds);

    if (elapsedSeconds === 20 * 60) {
      setPaceyMood('thinking', '20m mark! Stay mindful of pattern invariants.');
    }
  }

  function updateWidgetStats() {
    const el = document.getElementById('pl-attempts-display');
    if (el) {
      el.textContent = `Attempts: ${failedAttempts + 1}`;
      el.style.color = failedAttempts > 0 ? '#fbbf24' : '#64748b';
    }
  }

  // Master Tracking State Manager
  function setTrackingState(enabled, notify = true) {
    isTrackingEnabled = enabled;
    renderWidget();

    if (enabled) {
      startTimer();
      setPaceyMood('idle', 'Focusing...');
    } else {
      pauseTimer();
      // Remove modal if open
      document.getElementById('paced-learner-modal-overlay')?.remove();
    }

    if (notify) {
      chrome.storage.local.set({ extensionEnabled: enabled });
      chrome.runtime.sendMessage({
        type: 'SET_EXTENSION_ENABLED',
        enabled
      }).catch(() => {});
    }
  }

  // Listen to messages from popup or background script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'EXTENSION_TOGGLED') {
      setTrackingState(msg.enabled, false);
      sendResponse?.({ received: true });
    }
    if (msg.type === 'AUTOLOG_TOGGLED') {
      isAutoLogEnabled = msg.enabled;
      sendResponse?.({ received: true });
    }
  });

  // Listen to messages from page interceptor (MAIN world)
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    // 1. Code submission initiated
    if (event.data.type === 'PACED_CODE_SUBMITTED') {
      if (!isTrackingEnabled) return;
      if (event.data.code) {
        capturedCode = event.data.code;
        capturedLang = event.data.lang || capturedLang;
      }
      setPaceyMood('thinking', 'Running testcases...');
    }

    // 2. Submission check result arrived
    if (event.data.type === 'PACED_SUBMISSION_CHECK_RESULT') {
      if (!isTrackingEnabled) return;
      handleSubmissionResult(event.data.result);
    }
  });

  // Handle LeetCode submission check result
  function handleSubmissionResult(result) {
    if (!result) return;
    const status = result.status_msg || '';

    if (result.submittedCode) capturedCode = result.submittedCode;
    if (result.submittedLang) capturedLang = result.submittedLang;

    // CASE A: Accepted!
    if (status === 'Accepted') {
      if (isSolved) return; // Prevent double logging
      isSolved = true;
      pauseTimer();
      setPaceyMood('celebrating', 'ACCEPTED! 🎉');

      // Auto-calculate suggested rating
      let suggestedRating = 3; // Good
      if (failedAttempts >= 3 || elapsedSeconds > 40 * 60) suggestedRating = 2; // Hard
      else if (failedAttempts === 0 && elapsedSeconds < 12 * 60) suggestedRating = 4; // Easy

      const meta = getProblemMetadata();

      if (isAutoLogEnabled) {
        // Automatically log solve to local PacedLearner server
        executeLogSolve({
          meta,
          code: capturedCode,
          rating: suggestedRating,
          timeSpentSeconds: elapsedSeconds,
          failedAttempts: failedAttempts,
          customPitfalls: sessionErrors.length > 0
            ? `Past errors: ${sessionErrors.map(e => e.type).join(', ')}`
            : ''
        }, (res) => {
          showAutoLogToast(meta, suggestedRating, res);
        });
      } else {
        // Pop manual modal with all data prefilled
        setTimeout(() => openIngestModal(), 600);
      }
      return;
    }

    // CASE B: Failed Attempt (Wrong Answer, Runtime Error, TLE, Compile Error)
    failedAttempts++;
    updateWidgetStats();

    const errorEntry = {
      type: status,
      testcase: result.last_testcase || '',
      expected: result.expected_output || '',
      output: result.code_output || '',
      errorMsg: result.full_runtime_error || result.compile_error || '',
      timestamp: Date.now()
    };
    sessionErrors.push(errorEntry);

    if (status === 'Wrong Answer') {
      setPaceyMood('shocked', `WA on test #${result.total_correct || 0 + 1}`);
      setTimeout(() => { if (!isSolved) setPaceyMood('idle', 'Reviewing invariant...'); }, 5000);
    } else if (status === 'Time Limit Exceeded') {
      setPaceyMood('thinking', 'TLE! Check nested loop complexity.');
      setTimeout(() => { if (!isSolved) setPaceyMood('idle', 'Focusing...'); }, 5000);
    } else if (status.includes('Runtime') || status.includes('Compile')) {
      const shortErr = (result.full_runtime_error || result.compile_error || 'Error').split('\n')[0].slice(0, 30);
      setPaceyMood('shocked', shortErr);
      setTimeout(() => { if (!isSolved) setPaceyMood('idle', 'Focusing...'); }, 6000);
    }
  }

  // Execute solve log to background script / API
  function executeLogSolve({ meta, code, rating, timeSpentSeconds, failedAttempts, customPitfalls, pushToGitHub = true }, callback) {
    chrome.runtime.sendMessage({
      type: 'LOG_SOLVE',
      payload: {
        title: meta.title,
        slug: meta.slug,
        difficulty: meta.difficulty,
        url: meta.url,
        tags: meta.tags,
        code: code,
        language: capturedLang,
        timeSpentSeconds,
        failedAttempts,
        rating,
        customPitfalls,
        pushToGitHub
      }
    }, (response) => {
      callback?.(response);
    });
  }

  // Floating Toast on Auto-Log
  function showAutoLogToast(meta, rating, response) {
    document.getElementById('paced-learner-auto-toast')?.remove();

    const ratingLabels = { 1: 'Again (1d)', 2: 'Hard (2d)', 3: 'Good (4d)', 4: 'Easy (8d)' };
    const label = ratingLabels[rating] || 'Good';

    const toast = document.createElement('div');
    toast.id = 'paced-learner-auto-toast';
    toast.innerHTML = `
      <div style="font-size: 24px;">🎉</div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 700; color: #34d399;">
          Auto-Logged to PacedLearner!
        </div>
        <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
          <strong>${meta.title}</strong> solved in ${formatTime(elapsedSeconds)} (${failedAttempts} errs). FSRS: <span style="color: #38bdf8;">${label}</span>
        </div>
      </div>
      <button class="pl-toast-btn" id="pl-toast-edit-btn">Edit / Grade</button>
      <button class="pl-toast-close" id="pl-toast-close-btn">✕</button>
    `;

    document.body.appendChild(toast);

    document.getElementById('pl-toast-close-btn')?.addEventListener('click', () => {
      toast.remove();
    });

    document.getElementById('pl-toast-edit-btn')?.addEventListener('click', () => {
      toast.remove();
      openIngestModal(rating);
    });

    // Auto-dismiss toast after 7 seconds
    setTimeout(() => {
      if (document.getElementById('paced-learner-auto-toast')) {
        toast.remove();
      }
    }, 7000);
  }

  // Open Log Modal upon Manual click or when Auto-Log is off
  function openIngestModal(initialRating = null) {
    if (document.getElementById('paced-learner-modal-overlay')) return;

    const meta = getProblemMetadata();

    let suggestedRating = initialRating || 3;
    if (!initialRating) {
      if (failedAttempts >= 3 || elapsedSeconds > 40 * 60) suggestedRating = 2;
      else if (failedAttempts === 0 && elapsedSeconds < 12 * 60) suggestedRating = 4;
    }

    let selectedRating = suggestedRating;

    const overlay = document.createElement('div');
    overlay.id = 'paced-learner-modal-overlay';
    overlay.innerHTML = `
      <div class="pl-modal-box">
        <div class="pl-modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              ${renderPaceySvg('celebrating', 44)}
            </div>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #fff;">
                Log to PacedLearner Hub
              </h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">
                ${meta.title} (${meta.difficulty})
              </p>
            </div>
          </div>
          <button id="pl-modal-close" style="background: transparent; border: none; color: #64748b; font-size: 18px; cursor: pointer;">✕</button>
        </div>

        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-around; font-size: 13px;">
          <div>⏱️ Solve Time: <strong style="color: #38bdf8;">${formatTime(elapsedSeconds)}</strong></div>
          <div>⚠️ Attempts: <strong style="color: ${failedAttempts > 0 ? '#fbbf24' : '#34d399'};">${failedAttempts + 1}</strong></div>
          <div>💻 Code: <strong style="color: ${capturedCode ? '#34d399' : '#94a3b8'};">${capturedCode ? 'Captured ✓' : 'In Editor'}</strong></div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 6px;">
            FSRS Recall Effort:
          </label>
          <div style="display: flex; gap: 8px;" id="pl-grade-group">
            <button class="pl-btn-grade ${selectedRating === 1 ? 'selected' : ''}" data-val="1">[1] Again<br><small style="font-size: 10px; opacity: 0.7;">1 day</small></button>
            <button class="pl-btn-grade ${selectedRating === 2 ? 'selected' : ''}" data-val="2">[2] Hard<br><small style="font-size: 10px; opacity: 0.7;">2 days</small></button>
            <button class="pl-btn-grade ${selectedRating === 3 ? 'selected' : ''}" data-val="3">[3] Good<br><small style="font-size: 10px; opacity: 0.7;">4 days</small></button>
            <button class="pl-btn-grade ${selectedRating === 4 ? 'selected' : ''}" data-val="4">[4] Easy<br><small style="font-size: 10px; opacity: 0.7;">8 days</small></button>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">
            Key Takeaway / Edge Case (Optional):
          </label>
          <input
            type="text"
            id="pl-takeaway-input"
            placeholder="e.g. Fast/slow pointer. Check empty list base case."
            style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 8px 10px; font-size: 12px; outline: none;"
          />
        </div>

        <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="pl-github-sync-checkbox" checked style="accent-color: #10b981; cursor: pointer; width: 14px; height: 14px;" />
          <label for="pl-github-sync-checkbox" style="font-size: 12px; color: #cbd5e1; cursor: pointer;">
            ⚡ Push code & notes to GitHub (<code style="font-size: 11px; color: #38bdf8;">leetcode-solutions</code>)
          </label>
        </div>

        <button id="pl-confirm-save-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;">
          ✓ Save, Schedule & Sync
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const gradeButtons = overlay.querySelectorAll('.pl-btn-grade');
    gradeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        gradeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRating = parseInt(btn.getAttribute('data-val'), 10);
      });
    });

    document.getElementById('pl-modal-close')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('pl-confirm-save-btn')?.addEventListener('click', () => {
      const takeaway = document.getElementById('pl-takeaway-input').value;
      const pushToGitHub = document.getElementById('pl-github-sync-checkbox')?.checked ?? true;
      const saveBtn = document.getElementById('pl-confirm-save-btn');
      saveBtn.textContent = 'Saving & Syncing...';
      saveBtn.disabled = true;

      executeLogSolve({
        meta,
        code: capturedCode,
        rating: selectedRating,
        timeSpentSeconds: elapsedSeconds,
        failedAttempts,
        customPitfalls: takeaway,
        pushToGitHub
      }, (response) => {
        if (response?.success) {
          const ghMsg = response.data?.github_synced ? ' & Pushed to GitHub!' : '!';
          saveBtn.textContent = `✅ Synced to PacedLearner${ghMsg}`;
          saveBtn.style.background = '#059669';
          setTimeout(() => overlay.remove(), 1000);
        } else {
          saveBtn.textContent = 'Saved Locally';
          setTimeout(() => overlay.remove(), 1000);
        }
      });
    });
  }

  // Initialize extension storage preferences
  chrome.storage.local.get(['extensionEnabled', 'autoLogEnabled'], (res) => {
    isTrackingEnabled = res.extensionEnabled !== false;
    isAutoLogEnabled = res.autoLogEnabled !== false;

    renderWidget();
    if (isTrackingEnabled) {
      startTimer();
    }
  });
})();
