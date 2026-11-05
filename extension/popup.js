document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('due-count');
  const openHubBtn = document.getElementById('open-hub-btn');
  const openLeetCodeBtn = document.getElementById('open-leetcode-btn');
  const themeToggleBtn = document.getElementById('popup-theme-toggle');

  const toggleInput = document.getElementById('extension-toggle');
  const toggleCard = document.getElementById('toggle-card');
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');

  const autoLogInput = document.getElementById('autolog-toggle');
  const autoLogCard = document.getElementById('autolog-card');
  const autoLogTitle = document.getElementById('autolog-title');
  const autoLogDesc = document.getElementById('autolog-desc');

  const paceyCanvas = document.getElementById('popup-pacey-canvas');
  const paceyStage = document.getElementById('popup-pacey-stage');
  const paceyBadge = document.getElementById('popup-pacey-badge');
  const paceyMsg = document.getElementById('popup-pacey-msg');

  const POKE_REACTIONS = [
    { state: 'wink', expr: 'heureux', msg: 'PACEY ONLINE // READY FOR LEETCODE' },
    { state: 'swirl', expr: 'excite', msg: '360° GAZE LOCKED ON YOUR CURSOR' },
    { state: 'idle', expr: 'curieux', msg: 'WATCHING FOR COMPILER & RUNTIME ERRORS' },
    { state: 'orbit', expr: 'fier', msg: 'SUSTAINING 90%+ FSRS RETENTION' },
    { state: 'wide', expr: 'surpris', msg: 'CHECK BOUNDARY CONDITIONS BEFORE SUBMIT' },
    { state: 'idle', expr: 'mefiant', msg: 'NO PEEKING AT THE EDITORIAL TAB' },
    { state: 'thinking', expr: 'attentif', msg: 'ANALYZING TIME & SPACE COMPLEXITY...' },
    { state: 'burst', expr: 'hilare', msg: 'RAWBLOCK B&W // ZERO ROUNDED CORNERS' }
  ];

  let pokeIdx = 0;
  let pacey = null;
  let isDarkMode = false;

  if (paceyCanvas && window.PaceyEngine) {
    pacey = window.PaceyEngine.mount(paceyCanvas, {
      size: 82,
      expression: 'attentif',
      state: 'idle',
      follow: true,
      inverted: false
    });
  }

  function applyDarkMode(dark, announce = false) {
    isDarkMode = Boolean(dark);
    document.body.classList.toggle('dark-mode', isDarkMode);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = isDarkMode ? '◑ LIGHT' : '◐ DARK';
    }
    if (pacey) {
      pacey.setInverted(isDarkMode);
    }
    if (announce) {
      setPaceyMood(
        'swirl',
        'excite',
        isDarkMode
          ? 'DARK MODE INVERTED // WHITE SPHERE & BLACK EYES.'
          : 'LIGHT MODE RESTORED // BLACK SPHERE & WHITE EYES.'
      );
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextDark = !isDarkMode;
      applyDarkMode(nextDark, true);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ darkMode: nextDark });
        chrome.tabs?.query({ url: '*://*.leetcode.com/*' }, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs
              .sendMessage(tab.id, {
                type: 'DARKMODE_TOGGLED',
                darkMode: nextDark
              })
              .catch(() => {});
          });
        });
      }
    });
  }

  function setPaceyMood(state, expr, text) {
    if (!pacey) return;
    if (state && state !== 'idle') {
      pacey.triggerState(state, expr);
    } else if (expr) {
      pacey.setExpression(expr);
    }
    if (paceyBadge) {
      paceyBadge.textContent = `PACEY // ${pacey.getLabel()}`;
    }
    if (paceyMsg && text) {
      paceyMsg.textContent = `> ${text}`;
    }
  }

  if (paceyStage) {
    paceyStage.addEventListener('click', () => {
      const r = POKE_REACTIONS[pokeIdx % POKE_REACTIONS.length];
      pokeIdx += 1;
      setPaceyMood(r.state, r.expr, r.msg);
    });
    paceyStage.addEventListener('dblclick', () => {
      setPaceyMood('orbit', 'fier', '3D ORBITAL OVERDRIVE ENGAGED');
    });
  }

  function updateToggleUI(enabled) {
    toggleInput.checked = enabled;
    if (enabled) {
      toggleCard.className = 'toggle-card active';
      statusDot.className = 'status-dot';
      statusTitle.textContent = 'OBSERVER: ACTIVE';
      statusDesc.textContent = 'Pacey tracks editor actions, errors & solves';
      setPaceyMood('wink', 'attentif', 'OBSERVER ACTIVE // WATCHING LEETCODE.');
    } else {
      toggleCard.className = 'toggle-card paused';
      statusDot.className = 'status-dot paused';
      statusTitle.textContent = 'OBSERVER: PAUSED';
      statusDesc.textContent = 'Paused on LeetCode. Solves will not be logged';
      setPaceyMood('idle', 'somnolent', 'OBSERVER PAUSED // PACEY IN STANDBY.');
    }
  }

  function updateAutoLogUI(enabled) {
    if (!autoLogInput) return;
    autoLogInput.checked = enabled;
    if (enabled) {
      autoLogCard.className = 'toggle-card active';
      autoLogTitle.textContent = 'AUTO-LOG: ON';
      autoLogDesc.textContent = 'Instant sync on Accepted without modal prompt';
    } else {
      autoLogCard.className = 'toggle-card paused';
      autoLogTitle.textContent = 'AUTO-LOG: MANUAL';
      autoLogDesc.textContent = 'Opens FSRS rating modal on Accepted solve';
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['extensionEnabled', 'autoLogEnabled', 'darkMode'], (res) => {
      const isEnabled = res.extensionEnabled !== false;
      const isAutoLog = res.autoLogEnabled !== false;
      const isDark = res.darkMode === true;
      applyDarkMode(isDark, false);
      updateToggleUI(isEnabled);
      updateAutoLogUI(isAutoLog);
    });
  }

  toggleInput.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    updateToggleUI(enabled);

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ extensionEnabled: enabled });
      chrome.runtime.sendMessage({
        type: 'SET_EXTENSION_ENABLED',
        enabled
      });
      chrome.tabs.query({ url: '*://*.leetcode.com/*' }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              type: 'EXTENSION_TOGGLED',
              enabled
            })
            .catch(() => {});
        });
      });
    }
  });

  if (autoLogInput) {
    autoLogInput.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      updateAutoLogUI(enabled);
      setPaceyMood(
        'wink',
        enabled ? 'heureux' : 'curieux',
        enabled ? 'AUTO-LOG ENABLED // INSTANT FSRS SYNC.' : 'MANUAL GRADE MODE // MODAL ON ACCEPTED.'
      );

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ autoLogEnabled: enabled });
        chrome.tabs.query({ url: '*://*.leetcode.com/*' }, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs
              .sendMessage(tab.id, {
                type: 'AUTOLOG_TOGGLED',
                enabled
              })
              .catch(() => {});
          });
        });
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GET_DUE_COUNT' }, (response) => {
      if (response && response.count !== undefined) {
        countEl.textContent = response.count;
        countEl.style.color = response.count > 0 ? '#FF0000' : '#008000';
        if (response.count > 0) {
          setPaceyMood('exclaim', 'attentif', `${response.count} PROBLEM(S) DUE IN RECALL QUEUE.`);
        }
      } else {
        countEl.textContent = '0';
      }
    });
  }

  openHubBtn.addEventListener('mouseenter', () => {
    setPaceyMood('idle', 'fier', 'OPENING FSRS RECALL TERMINAL...');
  });
  openHubBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    } else {
      window.open('http://localhost:5173', '_blank');
    }
  });

  openLeetCodeBtn.addEventListener('mouseenter', () => {
    setPaceyMood('idle', 'excite', 'READY TO OBSERVE LEETCODE SESSION...');
  });
  openLeetCodeBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'https://leetcode.com/problemset/all/' });
    } else {
      window.open('https://leetcode.com/problemset/all/', '_blank');
    }
  });
});
