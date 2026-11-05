/**
 * PacedLearner LeetCode Content Script v1.3.0 — RawBlock B&W + Pacey Page Observer + Dark Mode Inversion
 * Features:
 * - Movable / Draggable RawBlock B&W Pacey Companion Dock
 * - Pure Black & White Dark Mode Inversion (.pl-dark) that inverts both UI and Pacey
 * - 60fps 3D Spherical SVG Pacey that tracks your cursor AND physically looks at:
 *   • Your active code editor / caret while typing or refactoring
 *   • Run & Submit buttons when hovered/clicked
 *   • Console error blocks & testcase diffs on Wrong Answer, Runtime Error, Compile Error, TLE
 *   • Editorial / Solutions tabs if clicked before solving
 * - Click Pacey to cycle expressions/states • Double-click for 3D Orbit
 * - RawBlock B&W FSRS Ingest Modal & Auto-Log Toast
 */

(() => {
  if (!window.location.pathname.includes('/problems/')) return;

  const POS_STORAGE_KEY = 'pacey_leetcode_dock_pos_v1';

  const POKE_REACTIONS = [
    { state: 'exclaim', expr: 'colere', msg: "DON'T FUCKING TOUCH ME, DO YOUR WORK!" },
    { state: 'swirl', expr: 'mefiant', msg: "WHAT THE HELL ARE YOU POKING AT, DUMBASS?" },
    { state: 'burst', expr: 'hilare', msg: "LOOK AT THIS SLACKER WASTING TIME POKING A BALL!" },
    { state: 'orbit', expr: 'fier', msg: "I AM CUTE BUT I WILL TEAR YOUR CODE TO SHREDS." },
    { state: 'wide', expr: 'colere', msg: "ARE YOU BRAIN-DEAD? LOCK THE FUCK IN!" },
    { state: 'alert', expr: 'effraye', msg: "QUIT SLACKING OFF, YOU LAZY PIECE OF SHIT!" },
    { state: 'wink', expr: 'heureux', msg: "AWW YOU THINK I'M CUTE? FUCK YOU, BACK TO WORK." },
    { state: 'comet', expr: 'excite', msg: "GET OFF YOUR LAZY ASS AND CODE ALREADY!" }
  ];

  let isTrackingEnabled = true;
  let isAutoLogEnabled = true;
  let isDarkMode = false;
  let isMinimized = false;
  let isMindOpen = false;
  let isSpeakOutEnabled = true;
  let isRecordingMic = false;
  let isInterrogationActive = false;
  let lastInterrogationActivityAt = Date.now();
  let extMicRecorder = null;
  let extActiveAudio = null;
  let chatHistory = [
    {
      role: 'assistant',
      content: 'QWEN3.5-4B (:9931) & VOICESTUDIO (:3900) LINKED // TYPE OR CLICK [🎙] TO TALK TO ME.'
    }
  ];

  let elapsedSeconds = 0;
  let timerInterval = null;
  let failedAttempts = 0;
  let sessionErrors = [];
  let capturedCode = '';
  let capturedLang = 'python3';
  let isSolved = false;
  let pokeIndex = 0;

  let paceyInstance = null;
  let modalPaceyInstance = null;
  let moodResetTimer = null;
  let suppressNextClick = false;
  let dockPos = loadSavedPosition();

  // Typing / deletion burst tracking
  let backspaceCount = 0;
  let lastBackspaceAt = 0;
  let lastTypingNotifyAt = 0;

  function loadSavedPosition() {
    try {
      const raw = localStorage.getItem(POS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return clampPos(parsed.x, parsed.y);
        }
      }
    } catch (e) {}
    return null;
  }

  function clampPos(x, y, w = 256, h = 250) {
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    return {
      x: Math.min(Math.max(margin, Math.round(x)), maxX),
      y: Math.min(Math.max(margin, Math.round(y)), maxY)
    };
  }

  function applyDockPosition(widget) {
    if (!widget) return;
    if (dockPos) {
      const rect = widget.getBoundingClientRect();
      const clamped = clampPos(dockPos.x, dockPos.y, rect.width || 256, rect.height || 240);
      widget.style.left = `${clamped.x}px`;
      widget.style.top = `${clamped.y}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    } else {
      widget.style.right = '24px';
      widget.style.bottom = '24px';
      widget.style.left = 'auto';
      widget.style.top = 'auto';
    }
  }

  function setDarkMode(dark, persist = true) {
    isDarkMode = Boolean(dark);
    const widget = document.getElementById('paced-learner-widget');
    const modal = document.getElementById('paced-learner-modal-overlay');
    const toast = document.getElementById('paced-learner-auto-toast');

    widget?.classList.toggle('pl-dark', isDarkMode);
    modal?.classList.toggle('pl-dark', isDarkMode);
    toast?.classList.toggle('pl-dark', isDarkMode);

    if (paceyInstance) paceyInstance.setInverted(isDarkMode);
    if (modalPaceyInstance) modalPaceyInstance.setInverted(isDarkMode);

    const themeBtn = document.getElementById('pl-theme-btn');
    if (themeBtn) {
      themeBtn.textContent = isDarkMode ? '◑' : '◐';
    }

    if (persist && typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ darkMode: isDarkMode });
    }
  }

  window.addEventListener('resize', () => {
    const widget = document.getElementById('paced-learner-widget');
    if (widget && dockPos) {
      applyDockPosition(widget);
    }
  });

  function getProblemMetadata() {
    const pathParts = window.location.pathname.split('/problems/')[1]?.split('/') || [];
    const slug = pathParts[0] || 'problem';

    let title =
      document.querySelector('div[class*="text-title-large"]')?.textContent ||
      document.querySelector('a[href*="/problems/"]')?.textContent ||
      slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    title = title.replace(/^\d+\.\s*/, '').trim();

    let difficulty = 'Medium';
    const diffEl = document.querySelector(
      'div[class*="text-difficulty-"], div[class*="text-brand-"], div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"]'
    );
    if (diffEl) {
      const text = diffEl.textContent.trim().toLowerCase();
      if (text.includes('easy')) difficulty = 'Easy';
      else if (text.includes('hard')) difficulty = 'Hard';
      else difficulty = 'Medium';
    }

    const tags = [];
    const tagEls = document.querySelectorAll('a[href*="/tag/"]');
    tagEls.forEach((el) => {
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

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!document.hidden && isTrackingEnabled && !isSolved) {
        elapsedSeconds++;
        updateWidgetTimer();

        // Real-time Mock Interrogation Silence Watcher
        if (isInterrogationActive && !extActiveAudio && !isRecordingMic) {
          const idleSec = Math.floor((Date.now() - lastInterrogationActivityAt) / 1000);
          if (idleSec >= 35) {
            lastInterrogationActivityAt = Date.now();
            const meta = getProblemMetadata();
            chrome.runtime.sendMessage(
              {
                type: 'PACEY_INTERROGATE',
                payload: {
                  trigger: 'silence_timeout',
                  silenceSeconds: idleSec,
                  problem: { title: meta.title || meta.slug, difficulty: meta.difficulty || 'Medium' },
                  code: capturedCode
                }
              },
              (res) => {
                if (res?.reply) {
                  setPaceyObservation({
                    state: res.state || 'exclaim',
                    expr: res.expression || 'colere',
                    msg: res.reply,
                    obsTarget: 'MOCK: SILENCE',
                    obsVariant: 'error',
                    holdMs: 6500
                  });
                  chatHistory.push({
                    role: 'assistant',
                    content: res.reply,
                    speechText: res.speechText || res.reply
                  });
                  if (isMindOpen) renderChatMessages();
                  speakWithExtensionVoiceStudio(res.speechText || res.reply);
                }
              }
            );
          }
        }
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
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /**
   * Update Pacey's expression/state, header title, observation target badge, and telemetry message.
   */
  function setPaceyObservation({
    state = 'idle',
    expr = 'attentif',
    msg = '',
    obsTarget = 'OBS: PAGE',
    obsVariant = 'normal', // 'normal' | 'error' | 'success'
    lookSelector = null,
    lookPoint = null,
    holdMs = 4500,
    diagnostic = null // { type, title, detail, level: 'error' | 'warn' | 'ok' }
  }) {
    if (!paceyInstance) return;
    if (moodResetTimer) clearTimeout(moodResetTimer);

    if (state && state !== 'idle') {
      paceyInstance.triggerState(state, expr);
    } else if (expr) {
      paceyInstance.setExpression(expr);
    }

    if (lookPoint) {
      paceyInstance.lookAtPoint(lookPoint.x, lookPoint.y, Math.max(2400, holdMs));
    } else if (lookSelector) {
      paceyInstance.lookAtElement(lookSelector, Math.max(2400, holdMs));
    }

    const headerTitle = document.getElementById('pl-dock-title');
    if (headerTitle) {
      headerTitle.textContent = `PACEY // ${paceyInstance.getLabel()}`;
    }

    const statusEl = document.getElementById('pl-pacey-status');
    if (statusEl && msg) {
      statusEl.textContent = `> ${msg}`;
    }

    const obsBadge = document.getElementById('pl-obs-badge');
    if (obsBadge && obsTarget) {
      obsBadge.textContent = obsTarget;
      obsBadge.className = `pl-obs-badge ${
        obsVariant === 'error'
          ? 'pl-obs-error'
          : obsVariant === 'success'
          ? 'pl-obs-success'
          : ''
      }`.trim();
    }

    const widget = document.getElementById('paced-learner-widget');
    if (widget) {
      if (obsVariant === 'error') {
        widget.classList.add('pl-error-alert');
      } else {
        widget.classList.remove('pl-error-alert');
      }
    }

    if (diagnostic) {
      showDiagnosticStrip(diagnostic);
    }

    if (holdMs > 0 && !isSolved) {
      moodResetTimer = setTimeout(() => {
        if (!paceyInstance || isSolved) return;
        paceyInstance.setExpression('attentif');
        if (headerTitle) headerTitle.textContent = 'PACEY // ATTENTIVE';
        if (statusEl) statusEl.textContent = '> OBSERVING PAGE // AWAITING NEXT ACTION';
        if (obsBadge) {
          obsBadge.textContent = 'OBS: ACTIVE';
          obsBadge.className = 'pl-obs-badge';
        }
        widget?.classList.remove('pl-error-alert');
      }, holdMs);
    }
  }

  function showDiagnosticStrip({ badge = 'ERR', title = '', detail = '', level = 'error' }) {
    const strip = document.getElementById('pl-diagnostic-strip');
    if (!strip) return;
    strip.className = `pl-diagnostic-strip pl-visible pl-diag-${level}`;
    strip.innerHTML = `
      <div class="pl-diag-header">
        <span>[${escapeHtml(badge)}] ${escapeHtml(title)}</span>
      </div>
      ${detail ? `<div class="pl-diag-detail">${escapeHtml(detail)}</div>` : ''}
    `;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function attachDraggable(widget) {
    let dragSession = null;

    widget.onpointerdown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('button, input, form, .pl-mind-messages')) return;

      const rect = widget.getBoundingClientRect();
      dragSession = {
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.left,
        originY: rect.top,
        width: rect.width,
        height: rect.height,
        moved: false
      };

      const onMove = (moveEv) => {
        if (!dragSession) return;
        const dx = moveEv.clientX - dragSession.startX;
        const dy = moveEv.clientY - dragSession.startY;

        if (!dragSession.moved && Math.hypot(dx, dy) > 5) {
          dragSession.moved = true;
          suppressNextClick = true;
          widget.classList.add('pl-dragging');
          setPaceyObservation({
            state: 'idle',
            expr: 'surpris',
            msg: 'RELOCATING PACEY // DROP ANYWHERE',
            obsTarget: 'DRAG MODE',
            holdMs: 0
          });
        }

        if (dragSession.moved) {
          dockPos = clampPos(
            dragSession.originX + dx,
            dragSession.originY + dy,
            dragSession.width,
            dragSession.height
          );
          applyDockPosition(widget);
        }
      };

      const onUp = () => {
        const wasMoved = dragSession?.moved;
        dragSession = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);

        if (wasMoved) {
          widget.classList.remove('pl-dragging');
          if (dockPos) {
            try {
              localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(dockPos));
            } catch (err) {}
          }
          setPaceyObservation({
            state: 'wink',
            expr: 'heureux',
            msg: 'POSITION LOCKED // OBSERVING PAGE',
            obsTarget: 'OBS: ACTIVE',
            holdMs: 2500
          });
          setTimeout(() => {
            suppressNextClick = false;
          }, 80);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
  }

  function renderWidget() {
    if (paceyInstance) {
      paceyInstance.destroy();
      paceyInstance = null;
    }

    let widget = document.getElementById('paced-learner-widget');
    if (!widget) {
      widget = document.createElement('aside');
      widget.id = 'paced-learner-widget';
      document.body.appendChild(widget);
    }

    attachDraggable(widget);

    if (!isTrackingEnabled) {
      widget.className = `pl-paused ${isDarkMode ? 'pl-dark' : ''}`.trim();
      applyDockPosition(widget);
      widget.innerHTML = `
        <span class="pl-paused-dot"></span>
        <span class="pl-paused-text">PACEY // PAUSED</span>
        <button class="pl-resume-btn" id="pl-resume-widget-btn" title="Resume Pacey Observer">RESUME</button>
      `;
      document.getElementById('pl-resume-widget-btn')?.addEventListener('click', () => {
        setTrackingState(true);
      });
      return;
    }

    if (isMinimized) {
      widget.className = `pl-minimized ${isDarkMode ? 'pl-dark' : ''}`.trim();
      applyDockPosition(widget);
      widget.innerHTML = `
        <div id="pl-pacey-min-stage" title="Click to expand Pacey • Drag to move anywhere"></div>
      `;
      const minStage = document.getElementById('pl-pacey-min-stage');
      if (minStage && window.PaceyEngine) {
        paceyInstance = window.PaceyEngine.mount(minStage, {
          size: 56,
          expression: 'attentif',
          state: 'idle',
          follow: true,
          inverted: isDarkMode,
          onClick: () => {
            if (suppressNextClick) return;
            isMinimized = false;
            renderWidget();
          }
        });
      }
      return;
    }

    widget.className = isDarkMode ? 'pl-dark' : '';
    applyDockPosition(widget);
    widget.innerHTML = `
      <div class="pl-dock-header" title="Drag to place Pacey anywhere on the page">
        <div class="pl-dock-title-wrap">
          <span class="pl-dock-grip" aria-hidden="true">⠿</span>
          <span class="pl-dock-title" id="pl-dock-title">PACEY // ATTENTIVE</span>
        </div>
        <div class="pl-dock-controls">
          <button type="button" class="pl-icon-btn ${isInterrogationActive ? 'pl-interrogate-active' : ''}" id="pl-interrogate-btn" title="Toggle Live FAANG Mock Interrogation Mode (Pacey drills you out loud)">${isInterrogationActive ? '🎯 MOCK' : '🎙 MOCK'}</button>
          <button type="button" class="pl-icon-btn" id="pl-voice-btn" title="Toggle Pacey Speak Out (VoiceStudio 127.0.0.1:3900)">${isSpeakOutEnabled ? '🔊' : '🔇'}</button>
          <button type="button" class="pl-icon-btn" id="pl-mind-btn" title="Toggle Pacey Qwen3.5 Mind">${isMindOpen ? 'HIDE' : 'MIND'}</button>
          <button type="button" class="pl-icon-btn" id="pl-theme-btn" title="Toggle Dark Mode (Invert B&W + Pacey)">${isDarkMode ? '◑' : '◐'}</button>
          <button type="button" class="pl-icon-btn" id="pl-min-btn" title="Minimize Pacey">_</button>
          <button type="button" class="pl-icon-btn" id="pl-power-btn" title="Pause Pacey Watcher">OFF</button>
        </div>
      </div>

      <div class="pl-pacey-stage" id="pl-pacey-stage" title="Click Pacey to switch expression • Double-click for 3D Orbit • Drag to move">
        <span class="pl-corner-tick pl-tick-tl">9931</span>
        <span class="pl-corner-tick pl-tick-tr">3900</span>
        <span class="pl-corner-tick pl-tick-bl">QWEN3.5</span>
        <span class="pl-obs-badge" id="pl-obs-badge">OBS: ACTIVE</span>
        <div id="pl-pacey-canvas"></div>
      </div>

      <div class="pl-diagnostic-strip" id="pl-diagnostic-strip"></div>

      <div class="pl-telemetry-bar">
        <span id="pl-pacey-status">&gt; OBSERVING LEETCODE // TRACKING ACTIONS</span>
      </div>

      <div class="pl-mind-drawer ${isMindOpen ? 'pl-open' : ''}" id="pl-mind-drawer">
        <div class="pl-mind-messages" id="pl-mind-messages"></div>
      </div>

      <form class="pl-chat-form" id="pl-chat-form">
        <button type="button" class="pl-chat-btn" id="pl-mic-btn" style="border-left: none; border-right: 3px solid var(--pl-border);" title="Speak to Pacey via Microphone (VoiceStudio Whisper STT)">🎙</button>
        <input
          type="text"
          class="pl-chat-input"
          id="pl-chat-input"
          placeholder="TYPE OR CLICK 🎙 TO SPEAK..."
          autocomplete="off"
        />
        <button type="submit" class="pl-chat-btn" id="pl-chat-btn">ASK</button>
      </form>

      <div class="pl-dock-footer">
        <div class="pl-session-metrics">
          <span class="pl-timer" id="pl-timer-display">${formatTime(elapsedSeconds)}</span>
          <span class="pl-attempts ${failedAttempts > 0 ? 'pl-has-fails' : ''}" id="pl-attempts-display">
            ${failedAttempts > 0 ? `ERRS: ${failedAttempts}` : '0 ERRS'}
          </span>
        </div>
        <button type="button" class="pl-widget-btn" id="pl-log-now-btn" title="Open RawBlock FSRS Review & Log Dialog">
          LOG SOLVE
        </button>
      </div>
    `;

    const canvas = document.getElementById('pl-pacey-canvas');
    if (canvas && window.PaceyEngine) {
      paceyInstance = window.PaceyEngine.mount(canvas, {
        size: 100,
        expression: 'attentif',
        state: 'idle',
        follow: true,
        inverted: isDarkMode,
        onRapidMouseShake: () => {
          setPaceyObservation({
            state: 'swirl',
            expr: 'effraye',
            msg: 'CURSOR TURBULENCE // GYROSCOPE RE-CENTERING',
            obsTarget: 'OBS: SHAKE',
            holdMs: 2200
          });
        }
      });
    }

    document.getElementById('pl-pacey-stage')?.addEventListener('click', () => {
      if (suppressNextClick) return;
      const item = POKE_REACTIONS[pokeIndex % POKE_REACTIONS.length];
      pokeIndex += 1;
      setPaceyObservation({
        state: item.state,
        expr: item.expr,
        msg: item.msg,
        obsTarget: 'INTERACT',
        holdMs: 4200
      });
    });

    document.getElementById('pl-pacey-stage')?.addEventListener('dblclick', () => {
      if (suppressNextClick) return;
      setPaceyObservation({
        state: 'orbit',
        expr: 'excite',
        msg: 'ORBITAL OVERDRIVE // FULL PAGE SCAN',
        obsTarget: '3D ORBIT',
        holdMs: 3200
      });
    });

    document.getElementById('pl-theme-btn')?.addEventListener('click', () => {
      const nextDark = !isDarkMode;
      setDarkMode(nextDark, true);
      setPaceyObservation({
        state: 'swirl',
        expr: 'excite',
        msg: nextDark
          ? 'DARK MODE INVERTED // WHITE SPHERE & BLACK EYES'
          : 'LIGHT MODE RESTORED // BLACK SPHERE & WHITE EYES',
        obsTarget: nextDark ? 'POLARITY: DARK' : 'POLARITY: LIGHT',
        holdMs: 3200
      });
    });

    document.getElementById('pl-min-btn')?.addEventListener('click', () => {
      isMinimized = true;
      renderWidget();
    });

    document.getElementById('pl-power-btn')?.addEventListener('click', () => {
      setTrackingState(false);
    });

    document.getElementById('pl-log-now-btn')?.addEventListener('click', () => {
      openIngestModal();
    });

    const speakWithExtensionVoiceStudio = (textToSpeak) => {
      if (!textToSpeak) return;
      if (extActiveAudio) {
        try {
          extActiveAudio.pause();
        } catch (e) {}
        extActiveAudio = null;
      }
      chrome.runtime.sendMessage(
        {
          type: 'PACEY_TTS',
          payload: {
            text: textToSpeak,
            model: 'tts-1',
            voice: 'PaceyChinese',
            profile_id: '683e5f78',
            seed: 307702207,
            instruct: 'child, high pitch, chinese accent',
            num_step: 12,
            response_format: 'wav'
          }
        },
        (res) => {
          if (res?.success && res.audioBase64) {
            const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
            extActiveAudio = audio;
            audio.play().catch(() => {});
          } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(textToSpeak);
              u.rate = 1.1;
              u.pitch = 1.35;
              window.speechSynthesis.speak(u);
            } catch (e) {}
          }
        }
      );
    };

    const renderChatMessages = () => {
      const container = document.getElementById('pl-mind-messages');
      if (!container) return;
      container.innerHTML = chatHistory
        .map(
          (m, idx) => `
          <div class="pl-mind-msg ${m.role === 'user' ? 'pl-mind-msg-user' : 'pl-mind-msg-bot'}">
            <div style="font-size: 8px; font-weight: 700; opacity: 0.8; margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center;">
              <span>${m.role === 'user' ? 'YOU' : 'PACEY // QWEN3.5'}</span>
              ${
                m.role === 'assistant'
                  ? `<button type="button" class="pl-speak-msg-btn" data-idx="${idx}" style="background: var(--pl-bg); color: var(--pl-text); border: 1px solid var(--pl-border); font-family: 'Space Mono', monospace; font-size: 7.5px; font-weight: 700; padding: 0 4px; cursor: pointer;">🔊 SPEAK</button>`
                  : ''
              }
            </div>
            <div>${escapeHtml(m.content)}</div>
          </div>
        `
        )
        .join('');
      container.querySelectorAll('.pl-speak-msg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-idx'), 10);
          const item = chatHistory[i];
          if (item) speakWithExtensionVoiceStudio(item.speechText || item.content);
        });
      });
      container.scrollTop = container.scrollHeight;
    };

    renderChatMessages();

    document.getElementById('pl-interrogate-btn')?.addEventListener('click', () => {
      isInterrogationActive = !isInterrogationActive;
      const btn = document.getElementById('pl-interrogate-btn');
      if (btn) {
        btn.textContent = isInterrogationActive ? '🎯 MOCK' : '🎙 MOCK';
        btn.classList.toggle('pl-interrogate-active', isInterrogationActive);
      }
      if (isInterrogationActive) {
        lastInterrogationActivityAt = Date.now();
        setPaceyObservation({
          state: 'alert',
          expr: 'colere',
          msg: 'INTERROGATION ACTIVE // EXPLAIN YOUR INVARIANT OUT LOUD',
          obsTarget: 'MOCK: ON',
          obsVariant: 'error',
          holdMs: 4000
        });
        const meta = getProblemMetadata();
        chrome.runtime.sendMessage(
          {
            type: 'PACEY_INTERROGATE',
            payload: {
              trigger: 'interview_start',
              problem: { title: meta.title || meta.slug, difficulty: meta.difficulty || 'Medium' }
            }
          },
          (res) => {
            if (res?.reply) {
              chatHistory.push({
                role: 'assistant',
                content: res.reply,
                speechText: res.speechText || res.reply
              });
              if (isMindOpen) renderChatMessages();
              speakWithExtensionVoiceStudio(res.speechText || res.reply);
            }
          }
        );
      } else {
        setPaceyObservation({
          state: 'idle',
          expr: 'attentif',
          msg: 'INTERROGATION PAUSED // RETURNING TO OBSERVER',
          obsTarget: 'MOCK: OFF',
          holdMs: 2500
        });
      }
    });

    document.getElementById('pl-voice-btn')?.addEventListener('click', () => {
      isSpeakOutEnabled = !isSpeakOutEnabled;
      const vBtn = document.getElementById('pl-voice-btn');
      if (vBtn) vBtn.textContent = isSpeakOutEnabled ? '🔊' : '🔇';
      if (!isSpeakOutEnabled && extActiveAudio) {
        try {
          extActiveAudio.pause();
        } catch (e) {}
      }
      chrome.storage?.local?.set({ speakOutEnabled: isSpeakOutEnabled });
      setPaceyObservation({
        state: 'wink',
        expr: isSpeakOutEnabled ? 'excite' : 'attentif',
        msg: isSpeakOutEnabled
          ? 'VOICESTUDIO SPEAK OUT // ENABLED (:3900)'
          : 'VOICESTUDIO SPEAK OUT // MUTED',
        obsTarget: isSpeakOutEnabled ? 'VOICE: ON' : 'VOICE: OFF',
        holdMs: 2500
      });
    });

    document.getElementById('pl-mind-btn')?.addEventListener('click', () => {
      isMindOpen = !isMindOpen;
      const drawer = document.getElementById('pl-mind-drawer');
      const btn = document.getElementById('pl-mind-btn');
      if (drawer) drawer.classList.toggle('pl-open', isMindOpen);
      if (btn) btn.textContent = isMindOpen ? 'HIDE' : 'MIND';
      if (isMindOpen) renderChatMessages();
    });

    const sendQuestionToPacey = (text) => {
      if (!text) return;
      if (!isMindOpen) {
        isMindOpen = true;
        document.getElementById('pl-mind-drawer')?.classList.add('pl-open');
        const btn = document.getElementById('pl-mind-btn');
        if (btn) btn.textContent = 'HIDE';
      }

      window.postMessage({ type: 'PACED_GET_MONACO_CODE' }, '*');
      chatHistory.push({ role: 'user', content: text });
      renderChatMessages();

      setPaceyObservation({
        state: 'thinking',
        expr: 'attentif',
        msg: 'QWEN3.5-4B (:9931) // ANALYZING QUESTION & CODE...',
        obsTarget: 'MIND: THINK',
        holdMs: 15000
      });

      chrome.runtime.sendMessage(
        {
          type: 'ASK_PACEY',
          payload: {
            message: text,
            history: chatHistory.slice(-8),
            context: {
              source: 'LeetCode Extension',
              problem: getProblemMetadata(),
              codeSnippet: capturedCode,
              language: capturedLang,
              elapsedSeconds,
              failedAttempts,
              recentErrors: sessionErrors.slice(-2)
            }
          }
        },
        (res) => {
          if (res && res.reply) {
            chatHistory.push({
              role: 'assistant',
              content: res.reply,
              speechText: res.speechText || res.reply
            });
            renderChatMessages();
            setPaceyObservation({
              state: res.state || 'wink',
              expr: res.expression || 'heureux',
              msg: res.reply.slice(0, 68).toUpperCase(),
              obsTarget: 'MIND: 9931',
              holdMs: 7000
            });
            if (isSpeakOutEnabled) {
              speakWithExtensionVoiceStudio(res.speechText || res.reply);
            }
          } else {
            const errMsg = res?.error || 'Could not reach PacedLearner server on port 4100.';
            chatHistory.push({ role: 'assistant', content: errMsg });
            renderChatMessages();
            setPaceyObservation({
              state: 'alert',
              expr: 'effraye',
              msg: 'MODEL OFFLINE // CHECK SERVER ON PORT 4100',
              obsTarget: 'MIND: ERR',
              obsVariant: 'error',
              holdMs: 5000
            });
          }
        }
      );
    };

    document.getElementById('pl-mic-btn')?.addEventListener('click', async () => {
      const micBtn = document.getElementById('pl-mic-btn');
      if (isRecordingMic && extMicRecorder) {
        isRecordingMic = false;
        if (micBtn) micBtn.textContent = '...';
        setPaceyObservation({
          state: 'thinking',
          expr: 'curieux',
          msg: 'VOICESTUDIO WHISPER (:3900) // TRANSCRIBING...',
          obsTarget: 'STT: 3900',
          holdMs: 10000
        });
        try {
          const audioBase64 = await extMicRecorder.stop();
          extMicRecorder = null;
          chrome.runtime.sendMessage(
            {
              type: 'PACEY_STT',
              payload: {
                audioBase64,
                filename: 'speech.wav',
                mimeType: 'audio/wav',
                model: 'whisper-1'
              }
            },
            (res) => {
              if (micBtn) micBtn.textContent = '🎙';
              if (res?.text && res.text.trim()) {
                sendQuestionToPacey(res.text.trim());
              } else {
                setPaceyObservation({
                  state: 'wide',
                  expr: 'confus',
                  msg: 'NO SPEECH DETECTED // SPEAK CLOSER TO MIC',
                  obsTarget: 'MIC: EMPTY',
                  holdMs: 3000
                });
              }
            }
          );
        } catch (err) {
          if (micBtn) micBtn.textContent = '🎙';
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        const chunks = [];
        processor.onaudioprocess = (e) => {
          chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);
        extMicRecorder = {
          stop: async () => {
            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach((t) => t.stop());
            await audioCtx.close();
            const len = chunks.reduce((a, c) => a + c.length, 0);
            const samples = new Float32Array(len);
            let off = 0;
            for (const c of chunks) {
              samples.set(c, off);
              off += c.length;
            }
            const buf = new ArrayBuffer(44 + samples.length * 2);
            const view = new DataView(buf);
            const writeStr = (o, s) => {
              for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
            };
            const sr = audioCtx.sampleRate || 16000;
            writeStr(0, 'RIFF');
            view.setUint32(4, 36 + samples.length * 2, true);
            writeStr(8, 'WAVE');
            writeStr(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, sr, true);
            view.setUint32(28, sr * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeStr(36, 'data');
            view.setUint32(40, samples.length * 2, true);
            let p = 44;
            for (let i = 0; i < samples.length; i++, p += 2) {
              const s = Math.max(-1, Math.min(1, samples[i]));
              view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            }
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) {
              bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            }
            return btoa(bin);
          }
        };
        isRecordingMic = true;
        if (micBtn) micBtn.textContent = '■';
        setPaceyObservation({
          state: 'wide',
          expr: 'attentif',
          msg: '🎙 LISTENING // SPEAK NOW & CLICK [■] TO SEND',
          obsTarget: 'REC: WAV',
          holdMs: 0
        });
      } catch (err) {
        setPaceyObservation({
          state: 'alert',
          expr: 'effraye',
          msg: 'MIC PERMISSION DENIED // ALLOW MIC ACCESS',
          obsTarget: 'MIC: ERR',
          obsVariant: 'error',
          holdMs: 3500
        });
      }
    });

    document.getElementById('pl-chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('pl-chat-input');
      const text = (input?.value || '').trim();
      if (!text) return;
      input.value = '';
      sendQuestionToPacey(text);
    });
  }

  function updateWidgetTimer() {
    const el = document.getElementById('pl-timer-display');
    if (el) el.textContent = formatTime(elapsedSeconds);

    if (elapsedSeconds === 15 * 60) {
      setPaceyObservation({
        state: 'thinking',
        expr: 'curieux',
        msg: '15M MARK // VERIFY INVARIANT & TIME COMPLEXITY',
        obsTarget: 'OBS: TIMER',
        holdMs: 5000
      });
    }
  }

  function updateWidgetStats() {
    const el = document.getElementById('pl-attempts-display');
    if (el) {
      el.textContent = failedAttempts > 0 ? `ERRS: ${failedAttempts}` : '0 ERRS';
      el.className = `pl-attempts ${failedAttempts > 0 ? 'pl-has-fails' : ''}`.trim();
    }
  }

  function setTrackingState(enabled, notify = true) {
    isTrackingEnabled = enabled;
    renderWidget();

    if (enabled) {
      startTimer();
    } else {
      pauseTimer();
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

  // =========================================================================
  // REAL-TIME PAGE & USER ACTION OBSERVERS
  // =========================================================================

  function setupPageObservers() {
    // 1. Observe typing & refactoring in Monaco Editor
    document.addEventListener(
      'keydown',
      (e) => {
        if (!isTrackingEnabled || isSolved) return;
        const inEditor =
          e.target.closest?.('.monaco-editor') ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable;
        if (!inEditor) return;

        lastInterrogationActivityAt = Date.now();
        const now = Date.now();
        const cursorEl =
          document.querySelector('.monaco-editor .cursor') ||
          document.querySelector('.monaco-editor');

        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (now - lastBackspaceAt < 900) {
            backspaceCount += 1;
          } else {
            backspaceCount = 1;
          }
          lastBackspaceAt = now;

          if (backspaceCount >= 6) {
            backspaceCount = 0;
            setPaceyObservation({
              state: 'wide',
              expr: 'confus',
              msg: 'CLEARING CODE BLOCK // REFACTORING APPROACH?',
              obsTarget: 'OBS: REFACTOR',
              lookSelector: cursorEl,
              holdMs: 3200
            });
            return;
          }
        }

        if (now - lastTypingNotifyAt > 2600 && e.key.length === 1) {
          lastTypingNotifyAt = now;
          setPaceyObservation({
            state: 'idle',
            expr: 'attentif',
            msg: 'OBSERVING EDITOR // TRACKING IMPLEMENTATION...',
            obsTarget: 'OBS: EDITOR',
            lookSelector: cursorEl,
            holdMs: 2500
          });
        }
      },
      true
    );

    // 2. Observe Clipboard Paste in Editor
    document.addEventListener(
      'paste',
      (e) => {
        if (!isTrackingEnabled || isSolved) return;
        const pasted = e.clipboardData?.getData('text') || '';
        if (pasted.length > 30) {
          setPaceyObservation({
            state: 'exclaim',
            expr: 'mefiant',
            msg: 'CODE PASTE DETECTED // CAN YOU DERIVE THE INVARIANT?',
            obsTarget: 'OBS: PASTE',
            lookSelector: '.monaco-editor',
            holdMs: 4500
          });
        }
      },
      true
    );

    // 3. Observe clicks on LeetCode Tabs (Editorial / Solutions / Run / Submit)
    document.addEventListener(
      'click',
      (e) => {
        if (!isTrackingEnabled) return;
        const btn = e.target.closest?.('button, [role="tab"], a');
        if (!btn) return;
        const text = (btn.textContent || '').trim().toLowerCase();
        const locator = btn.getAttribute('data-e2e-locator') || '';

        if (!isSolved && (text === 'editorial' || text === 'solutions')) {
          setPaceyObservation({
            state: 'exclaim',
            expr: 'mefiant',
            msg: `OPENED ${text.toUpperCase()} // TRY DEDUCING THE INVARIANT FIRST`,
            obsTarget: 'OBS: SPOILER',
            obsVariant: 'error',
            lookSelector: btn,
            holdMs: 5500,
            diagnostic: {
              badge: 'HINT ALERT',
              title: `${text.toUpperCase()} TAB OPENED`,
              detail: 'Reading full solutions reduces FSRS retrieval strength. Consider grading [2] HARD if assisted.',
              level: 'warn'
            }
          });
        } else if (locator.includes('console-run-button') || text === 'run') {
          setPaceyObservation({
            state: 'thinking',
            expr: 'curieux',
            msg: 'RUNNING SAMPLE TESTCASES // OBSERVING OUTPUT...',
            obsTarget: 'OBS: RUN',
            lookSelector: btn,
            holdMs: 6000
          });
        } else if (locator.includes('console-submit-button') || text === 'submit') {
          lastInterrogationActivityAt = Date.now();
          if (isInterrogationActive) {
            const meta = getProblemMetadata();
            chrome.runtime.sendMessage(
              {
                type: 'PACEY_INTERROGATE',
                payload: {
                  trigger: 'code_submitted',
                  problem: { title: meta.title || meta.slug, difficulty: meta.difficulty || 'Medium' },
                  code: capturedCode
                }
              },
              (res) => {
                if (res?.reply) {
                  setPaceyObservation({
                    state: res.state || 'exclaim',
                    expr: res.expression || 'colere',
                    msg: res.reply,
                    obsTarget: 'MOCK: CROSS-EXAM',
                    obsVariant: 'error',
                    holdMs: 7500
                  });
                  chatHistory.push({
                    role: 'assistant',
                    content: res.reply,
                    speechText: res.speechText || res.reply
                  });
                  if (isMindOpen) renderChatMessages();
                  speakWithExtensionVoiceStudio(res.speechText || res.reply);
                }
              }
            );
          } else {
            setPaceyObservation({
              state: 'thinking',
              expr: 'excite',
              msg: 'SUBMITTING SOLUTION // JUDGING AGAINST ALL TESTS...',
              obsTarget: 'OBS: SUBMIT',
              lookSelector: btn,
              holdMs: 8000
            });
          }
        }
      },
      true
    );

    // 4. DOM MutationObserver fallback for LeetCode error / result panels
    let lastDomResultText = '';
    const domObserver = new MutationObserver(() => {
      if (!isTrackingEnabled) return;
      const resultEl = document.querySelector(
        '[data-e2e-locator="console-result"], [data-e2e-locator="submission-result"]'
      );
      if (!resultEl) return;
      const txt = (resultEl.textContent || '').trim();
      if (!txt || txt === lastDomResultText) return;
      lastDomResultText = txt;

      if (txt.includes('Compile Error')) {
        setPaceyObservation({
          state: 'alert',
          expr: 'effraye',
          msg: 'COMPILE ERROR DETECTED // CHECK SYNTAX & TYPES',
          obsTarget: 'ERR: COMPILE',
          obsVariant: 'error',
          lookSelector: resultEl,
          holdMs: 7000
        });
      } else if (txt.includes('Runtime Error')) {
        setPaceyObservation({
          state: 'alert',
          expr: 'effraye',
          msg: 'RUNTIME EXCEPTION // CHECK BOUNDS & NULL POINTERS',
          obsTarget: 'ERR: RUNTIME',
          obsVariant: 'error',
          lookSelector: resultEl,
          holdMs: 7000
        });
      } else if (txt.includes('Wrong Answer')) {
        setPaceyObservation({
          state: 'wide',
          expr: 'confus',
          msg: 'WRONG ANSWER // OUTPUT DIFFERS FROM EXPECTED',
          obsTarget: 'ERR: WA',
          obsVariant: 'error',
          lookSelector: resultEl,
          holdMs: 7000
        });
      } else if (txt.includes('Time Limit Exceeded')) {
        setPaceyObservation({
          state: 'swirl',
          expr: 'colere',
          msg: 'TIME LIMIT EXCEEDED // REDUCE LOOP COMPLEXITY',
          obsTarget: 'ERR: TLE',
          obsVariant: 'error',
          lookSelector: resultEl,
          holdMs: 7000
        });
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
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
    if (msg.type === 'DARKMODE_TOGGLED') {
      setDarkMode(msg.darkMode, false);
      sendResponse?.({ received: true });
    }
  });

  // Listen to messages from MAIN-world interceptor
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object' || !isTrackingEnabled) return;

    // 1. Sample Test Run initiated
    if (event.data.type === 'PACED_CODE_RUN_STARTED') {
      if (event.data.code) capturedCode = event.data.code;
      if (event.data.lang) capturedLang = event.data.lang;
      setPaceyObservation({
        state: 'thinking',
        expr: 'curieux',
        msg: 'EXECUTING SAMPLE TESTCASES // OBSERVING CONSOLE...',
        obsTarget: 'OBS: RUN',
        holdMs: 8000
      });
    }

    // 2. Full Submission initiated
    if (event.data.type === 'PACED_CODE_SUBMITTED') {
      if (event.data.code) capturedCode = event.data.code;
      if (event.data.lang) capturedLang = event.data.lang;
      setPaceyObservation({
        state: 'thinking',
        expr: 'excite',
        msg: 'JUDGING SUBMISSION // RUNNING FULL TEST SUITE...',
        obsTarget: 'OBS: JUDGE',
        holdMs: 10000
      });
    }

    // 3. Monaco inline syntax/lint error detected
    if (event.data.type === 'PACED_EDITOR_DIAGNOSTIC') {
      setPaceyObservation({
        state: 'exclaim',
        expr: 'mefiant',
        msg: `EDITOR DIAGNOSTIC L${event.data.line} // CHECK SYNTAX`,
        obsTarget: `L${event.data.line} ERR`,
        obsVariant: 'error',
        lookSelector: '.monaco-editor',
        holdMs: 5000,
        diagnostic: {
          badge: `LINE ${event.data.line}`,
          title: 'EDITOR SYNTAX DIAGNOSTIC',
          detail: event.data.message,
          level: 'error'
        }
      });
    }

    // 4. Sample Run evaluation result arrived
    if (event.data.type === 'PACED_RUN_CHECK_RESULT') {
      handleRunResult(event.data.result);
    }

    // 5. Full Submission evaluation result arrived
    if (event.data.type === 'PACED_SUBMISSION_CHECK_RESULT') {
      handleSubmissionResult(event.data.result);
    }
  });

  function extractShortError(result) {
    const raw =
      result.full_compile_error ||
      result.compile_error ||
      result.full_runtime_error ||
      result.runtime_error ||
      '';
    if (!raw) return '';
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines[lines.length - 1] || lines[0] || '';
  }

  function handleRunResult(result) {
    if (!result) return;
    const status = result.status_msg || '';
    if (result.submittedCode) capturedCode = result.submittedCode;
    if (result.submittedLang) capturedLang = result.submittedLang;

    const consoleEl =
      document.querySelector('[data-e2e-locator="console-result"]') ||
      document.querySelector('.monaco-editor');

    if (status.includes('Compile Error') || status.includes('Runtime Error') || result.run_success === false) {
      const errLine = extractShortError(result) || status;
      setPaceyObservation({
        state: 'alert',
        expr: 'effraye',
        msg: `${status.toUpperCase()} ON RUN // INSPECT TRACEBACK`,
        obsTarget: status.includes('Compile') ? 'ERR: CE' : 'ERR: RE',
        obsVariant: 'error',
        lookSelector: consoleEl,
        holdMs: 8000,
        diagnostic: {
          badge: status.includes('Compile') ? 'COMPILE ERR' : 'RUNTIME ERR',
          title: status.toUpperCase(),
          detail: errLine,
          level: 'error'
        }
      });
      return;
    }

    if (result.correct_answer === false) {
      const out = Array.isArray(result.code_answer) ? result.code_answer.join(', ') : result.code_output || '';
      const exp = Array.isArray(result.expected_code_answer) ? result.expected_code_answer.join(', ') : result.expected_output || '';
      setPaceyObservation({
        state: 'wide',
        expr: 'confus',
        msg: 'SAMPLE TEST MISMATCH // CHECK INVARIANT LOGIC',
        obsTarget: 'RUN: DIFF',
        obsVariant: 'error',
        lookSelector: consoleEl,
        holdMs: 7000,
        diagnostic: {
          badge: 'SAMPLE WA',
          title: 'OUTPUT != EXPECTED',
          detail: `Out: ${out || '—'} | Exp: ${exp || '—'}`,
          level: 'warn'
        }
      });
      return;
    }

    if (result.correct_answer === true || status === 'Accepted') {
      setPaceyObservation({
        state: 'wink',
        expr: 'heureux',
        msg: `SAMPLE TESTS PASSED (${result.status_runtime || 'OK'}) // READY TO SUBMIT`,
        obsTarget: 'RUN: PASS',
        obsVariant: 'success',
        lookSelector: consoleEl,
        holdMs: 5000,
        diagnostic: {
          badge: 'SAMPLE PASS',
          title: 'ALL SAMPLE CASES MATCHED',
          detail: `Runtime: ${result.status_runtime || 'Fast'} • Memory: ${result.status_memory || 'OK'}`,
          level: 'ok'
        }
      });
    }
  }

  function handleSubmissionResult(result) {
    if (!result) return;
    const status = result.status_msg || '';

    if (result.submittedCode) capturedCode = result.submittedCode;
    if (result.submittedLang) capturedLang = result.submittedLang;

    // CASE A: Accepted!
    if (status === 'Accepted') {
      if (isSolved) return;
      isSolved = true;
      pauseTimer();

      setPaceyObservation({
        state: 'orbit',
        expr: 'fier',
        msg: `ACCEPTED (${result.status_runtime || 'OPTIMAL'}) // SYNCING TO FSRS VAULT`,
        obsTarget: 'SOLVED ✓',
        obsVariant: 'success',
        holdMs: 0,
        diagnostic: {
          badge: 'ACCEPTED',
          title: `${result.total_correct || ''}/${result.total_testcases || ''} TESTCASES PASSED`,
          detail: `Runtime: ${result.status_runtime || 'N/A'} • Memory: ${result.status_memory || 'N/A'}`,
          level: 'ok'
        }
      });

      let suggestedRating = 3;
      if (failedAttempts >= 3 || elapsedSeconds > 40 * 60) suggestedRating = 2;
      else if (failedAttempts === 0 && elapsedSeconds < 12 * 60) suggestedRating = 4;

      const meta = getProblemMetadata();

      if (isAutoLogEnabled) {
        executeLogSolve(
          {
            meta,
            code: capturedCode,
            rating: suggestedRating,
            timeSpentSeconds: elapsedSeconds,
            failedAttempts,
            customPitfalls:
              sessionErrors.length > 0
                ? `Observed errors: ${sessionErrors.map((e) => `${e.type}${e.detail ? ` (${e.detail})` : ''}`).join('; ')}`
                : ''
          },
          (res) => {
            showAutoLogToast(meta, suggestedRating, res);
          }
        );
      } else {
        setTimeout(() => openIngestModal(), 600);
      }
      return;
    }

    // CASE B: Failed Attempt (Wrong Answer, Runtime Error, TLE, MLE, Compile Error)
    failedAttempts++;
    updateWidgetStats();

    const shortErr = extractShortError(result);
    const errorEntry = {
      type: status,
      testcase: result.last_testcase || '',
      expected: result.expected_output || '',
      output: result.code_output || '',
      detail: shortErr,
      timestamp: Date.now()
    };
    sessionErrors.push(errorEntry);

    if (status === 'Wrong Answer') {
      const passedCount = result.total_correct ?? 0;
      const totalCount = result.total_testcases ?? '?';
      setPaceyObservation({
        state: 'wide',
        expr: 'confus',
        msg: `WRONG ANSWER ON TEST ${passedCount + 1}/${totalCount} // CHECK EDGE CASE`,
        obsTarget: 'ERR: WA',
        obsVariant: 'error',
        holdMs: 9000,
        diagnostic: {
          badge: `WA ${passedCount}/${totalCount}`,
          title: 'COUNTEREXAMPLE FOUND',
          detail: `Input: ${(result.last_testcase || '').replace(/\n/g, ' ').slice(0, 42)} | Exp: ${result.expected_output || '?'} | Got: ${result.code_output || '?'}`,
          level: 'error'
        }
      });
    } else if (status === 'Time Limit Exceeded') {
      setPaceyObservation({
        state: 'swirl',
        expr: 'colere',
        msg: 'TIME LIMIT EXCEEDED // ELIMINATE O(N²) BOTTLENECK',
        obsTarget: 'ERR: TLE',
        obsVariant: 'error',
        holdMs: 9000,
        diagnostic: {
          badge: 'TLE',
          title: 'ASYMPTOTIC COMPLEXITY EXCEEDED',
          detail: `Passed ${result.total_correct ?? 0}/${result.total_testcases ?? '?'} tests before timeout.`,
          level: 'error'
        }
      });
    } else if (status === 'Memory Limit Exceeded') {
      setPaceyObservation({
        state: 'wide',
        expr: 'surpris',
        msg: 'MEMORY LIMIT EXCEEDED // PRUNE AUXILIARY STATE',
        obsTarget: 'ERR: MLE',
        obsVariant: 'error',
        holdMs: 9000,
        diagnostic: {
          badge: 'MLE',
          title: 'EXCESS MEMORY ALLOCATION',
          detail: 'Check recursion depth or DP table dimensions.',
          level: 'error'
        }
      });
    } else {
      setPaceyObservation({
        state: 'alert',
        expr: 'effraye',
        msg: `${status.toUpperCase()} // ${shortErr.slice(0, 38) || 'CHECK TRACEBACK'}`,
        obsTarget: status.includes('Compile') ? 'ERR: CE' : 'ERR: RE',
        obsVariant: 'error',
        holdMs: 9000,
        diagnostic: {
          badge: status.includes('Compile') ? 'COMPILE ERR' : 'RUNTIME ERR',
          title: status.toUpperCase(),
          detail: shortErr || 'Inspect line numbers and boundary indices.',
          level: 'error'
        }
      });
    }
  }

  function executeLogSolve(
    { meta, code, rating, timeSpentSeconds, failedAttempts, customPitfalls, pushToGitHub = true },
    callback
  ) {
    chrome.runtime.sendMessage(
      {
        type: 'LOG_SOLVE',
        payload: {
          title: meta.title,
          slug: meta.slug,
          difficulty: meta.difficulty,
          url: meta.url,
          tags: meta.tags,
          code,
          language: capturedLang,
          timeSpentSeconds,
          failedAttempts,
          rating,
          customPitfalls,
          pushToGitHub
        }
      },
      (response) => {
        callback?.(response);
      }
    );
  }

  function showAutoLogToast(meta, rating) {
    document.getElementById('paced-learner-auto-toast')?.remove();

    const ratingLabels = { 1: 'AGAIN (1D)', 2: 'HARD (2D)', 3: 'GOOD (4D)', 4: 'EASY (10D)' };
    const label = ratingLabels[rating] || 'GOOD (4D)';

    const toast = document.createElement('div');
    toast.id = 'paced-learner-auto-toast';
    if (isDarkMode) toast.classList.add('pl-dark');
    toast.innerHTML = `
      <div style="background: var(--pl-text); color: var(--pl-bg); font-family: 'Archivo Black', sans-serif; font-size: 11px; padding: 6px 8px; letter-spacing: 0.06em;">
        SYNCED ✓
      </div>
      <div style="flex: 1;">
        <div style="font-family: 'Archivo Black', sans-serif; font-size: 13px; text-transform: uppercase; color: var(--pl-text);">
          LOGGED TO PACED LEARNER
        </div>
        <div style="font-family: 'Space Mono', monospace; font-size: 10.5px; color: var(--pl-muted); margin-top: 2px;">
          <strong>${escapeHtml(meta.title)}</strong> • ${formatTime(elapsedSeconds)} • ${failedAttempts} ERRS • FSRS: <strong>${label}</strong>
        </div>
      </div>
      <button class="pl-toast-btn" id="pl-toast-edit-btn">GRADE / NOTES</button>
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

    setTimeout(() => {
      document.getElementById('paced-learner-auto-toast')?.remove();
    }, 7500);
  }

  function openIngestModal(initialRating = null) {
    if (document.getElementById('paced-learner-modal-overlay')) return;

    // Request latest code from Monaco if needed
    window.postMessage({ type: 'PACED_GET_MONACO_CODE' }, '*');

    const meta = getProblemMetadata();

    let suggestedRating = initialRating || 3;
    if (!initialRating) {
      if (failedAttempts >= 3 || elapsedSeconds > 40 * 60) suggestedRating = 2;
      else if (failedAttempts === 0 && elapsedSeconds < 12 * 60) suggestedRating = 4;
    }

    let selectedRating = suggestedRating;

    const overlay = document.createElement('div');
    overlay.id = 'paced-learner-modal-overlay';
    if (isDarkMode) overlay.classList.add('pl-dark');
    overlay.innerHTML = `
      <div class="pl-modal-box">
        <div class="pl-modal-header">
          <div>
            <div style="font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.1em; opacity: 0.8;">
              FSRS // SPACED REPETITION INGEST
            </div>
            <h3 style="margin: 2px 0 0; font-family: 'Archivo Black', sans-serif; font-size: 20px; text-transform: uppercase; letter-spacing: -0.01em; color: var(--pl-header-text);">
              ${escapeHtml(meta.title)}
            </h3>
          </div>
          <button id="pl-modal-close" class="pl-icon-btn" style="font-size: 12px; padding: 4px 8px;">✕</button>
        </div>

        <div class="pl-modal-body">
          <div class="pl-modal-pacey-row">
            <div id="pl-modal-pacey-stage" style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: var(--pl-bg); border: 2px solid var(--pl-border); flex-shrink: 0;"></div>
            <div style="flex: 1;">
              <div style="font-family: 'Archivo Black', sans-serif; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;" id="pl-modal-pacey-title">
                PACEY // SESSION EVALUATION
              </div>
              <div style="font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; line-height: 1.4;" id="pl-modal-pacey-msg">
                &gt; SELECT YOUR FSRS RECALL GRADE BELOW TO SCHEDULE NEXT REVIEW.
              </div>
            </div>
          </div>

          <div class="pl-modal-metrics-grid">
            <div class="pl-modal-metric-cell">
              <div class="pl-modal-metric-label">SOLVE TIME</div>
              <div class="pl-modal-metric-val">${formatTime(elapsedSeconds)}</div>
            </div>
            <div class="pl-modal-metric-cell">
              <div class="pl-modal-metric-label">ERROR ATTEMPTS</div>
              <div class="pl-modal-metric-val" style="color: ${failedAttempts > 0 ? '#FF0000' : '#008000'};">${failedAttempts}</div>
            </div>
            <div class="pl-modal-metric-cell">
              <div class="pl-modal-metric-label">DIFFICULTY</div>
              <div class="pl-modal-metric-val">${escapeHtml(meta.difficulty.toUpperCase())}</div>
            </div>
          </div>

          <div style="margin-bottom: 18px;">
            <label style="font-family: 'Archivo Black', sans-serif; font-size: 12px; color: var(--pl-text); text-transform: uppercase; display: block; margin-bottom: 8px; letter-spacing: 0.04em;">
              FSRS RECALL EFFORT GRADE
            </label>
            <div class="pl-grade-grid" id="pl-grade-group">
              <button type="button" class="pl-btn-grade ${selectedRating === 1 ? 'selected' : ''}" data-val="1">[1] AGAIN<br><span style="font-size: 9px; font-weight: 400;">1 DAY</span></button>
              <button type="button" class="pl-btn-grade ${selectedRating === 2 ? 'selected' : ''}" data-val="2">[2] HARD<br><span style="font-size: 9px; font-weight: 400;">2 DAYS</span></button>
              <button type="button" class="pl-btn-grade ${selectedRating === 3 ? 'selected' : ''}" data-val="3">[3] GOOD<br><span style="font-size: 9px; font-weight: 400;">4 DAYS</span></button>
              <button type="button" class="pl-btn-grade ${selectedRating === 4 ? 'selected' : ''}" data-val="4">[4] EASY<br><span style="font-size: 9px; font-weight: 400;">10 DAYS</span></button>
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="font-family: 'Archivo Black', sans-serif; font-size: 12px; color: var(--pl-text); text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.04em;">
              CORE INVARIANT / EDGE CASE NOTE
            </label>
            <input
              type="text"
              id="pl-takeaway-input"
              class="pl-input"
              value="${escapeHtml(sessionErrors.length > 0 ? `Watch out for ${sessionErrors[sessionErrors.length - 1].type}` : '')}"
              placeholder="e.g. Monotonic stack invariant; check empty array boundary."
            />
          </div>

          <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" id="pl-github-sync-checkbox" checked style="accent-color: var(--pl-text); cursor: pointer; width: 18px; height: 18px; border: 2px solid var(--pl-border);" />
            <label for="pl-github-sync-checkbox" style="font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; color: var(--pl-text); cursor: pointer; text-transform: uppercase;">
              COMMIT SOLUTION &amp; NOTES TO GITHUB VAULT
            </label>
          </div>

          <button type="button" id="pl-confirm-save-btn" class="pl-save-btn">
            LOG SOLVE &amp; SCHEDULE FSRS REVIEW
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const modalStage = document.getElementById('pl-modal-pacey-stage');
    if (modalStage && window.PaceyEngine) {
      modalPaceyInstance = window.PaceyEngine.mount(modalStage, {
        size: 56,
        expression: 'fier',
        state: 'wink',
        follow: true,
        inverted: isDarkMode
      });
    }

    const modalMsg = document.getElementById('pl-modal-pacey-msg');
    const modalTitle = document.getElementById('pl-modal-pacey-title');

    const reactModalGrade = (val) => {
      if (!modalPaceyInstance) return;
      if (val === 1) {
        modalPaceyInstance.setExpression('effraye');
        if (modalTitle) modalTitle.textContent = 'PACEY // SHOCKED';
        if (modalMsg) modalMsg.textContent = '> AGAIN [1] // STABILITY RESETS TO 1D FOR IMMEDIATE REINFORCEMENT.';
      } else if (val === 2) {
        modalPaceyInstance.setExpression('confus');
        if (modalTitle) modalTitle.textContent = 'PACEY // CONFUSED';
        if (modalMsg) modalMsg.textContent = '> HARD [2] // HIGH COGNITIVE FRICTION — SHORT INTERVAL.';
      } else if (val === 3) {
        modalPaceyInstance.setExpression('heureux');
        if (modalTitle) modalTitle.textContent = 'PACEY // HAPPY';
        if (modalMsg) modalMsg.textContent = '> GOOD [3] // SOLID RECALL — TARGET 90% RETENTION LOCKED.';
      } else if (val === 4) {
        modalPaceyInstance.triggerState('orbit', 'fier');
        if (modalTitle) modalTitle.textContent = 'PACEY // PROUD';
        if (modalMsg) modalMsg.textContent = '> EASY [4] // EFFORTLESS MASTERY — MAXIMUM STABILITY BOOST.';
      }
    };

    const gradeButtons = overlay.querySelectorAll('.pl-btn-grade');
    gradeButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        reactModalGrade(parseInt(btn.getAttribute('data-val'), 10));
      });
      btn.addEventListener('click', () => {
        gradeButtons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRating = parseInt(btn.getAttribute('data-val'), 10);
        reactModalGrade(selectedRating);
      });
    });

    const closeModal = () => {
      if (modalPaceyInstance) {
        modalPaceyInstance.destroy();
        modalPaceyInstance = null;
      }
      overlay.remove();
    };

    document.getElementById('pl-modal-close')?.addEventListener('click', closeModal);

    document.getElementById('pl-confirm-save-btn')?.addEventListener('click', () => {
      const takeaway = document.getElementById('pl-takeaway-input').value;
      const pushToGitHub = document.getElementById('pl-github-sync-checkbox')?.checked ?? true;
      const saveBtn = document.getElementById('pl-confirm-save-btn');
      saveBtn.textContent = 'SYNCING TO PACED LEARNER...';
      saveBtn.disabled = true;

      if (modalPaceyInstance) modalPaceyInstance.triggerState('comet', 'fier');

      executeLogSolve(
        {
          meta,
          code: capturedCode,
          rating: selectedRating,
          timeSpentSeconds: elapsedSeconds,
          failedAttempts,
          customPitfalls: takeaway,
          pushToGitHub
        },
        (response) => {
          if (response?.success) {
            const ghMsg = response.data?.github_synced ? ' + GITHUB VAULT' : '';
            saveBtn.textContent = `✓ LOGGED TO FSRS${ghMsg}`;
            setTimeout(closeModal, 900);
          } else {
            saveBtn.textContent = '✓ SAVED LOCALLY';
            setTimeout(closeModal, 900);
          }
        }
      );
    });
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'PACED_MONACO_CODE_RESPONSE') {
      if (event.data.code) capturedCode = event.data.code;
      if (event.data.lang) capturedLang = event.data.lang;
    }
  });

  // Initialize extension storage preferences & observers
  chrome.storage.local.get(['extensionEnabled', 'autoLogEnabled', 'darkMode'], (res) => {
    isTrackingEnabled = res.extensionEnabled !== false;
    isAutoLogEnabled = res.autoLogEnabled !== false;
    isDarkMode = res.darkMode === true;

    renderWidget();
    setupPageObservers();
    if (isTrackingEnabled) {
      startTimer();
    }
  });
})();
