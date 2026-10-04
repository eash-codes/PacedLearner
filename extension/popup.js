document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('due-count');
  const openHubBtn = document.getElementById('open-hub-btn');
  const openLeetCodeBtn = document.getElementById('open-leetcode-btn');
  
  // Master toggle elements
  const toggleInput = document.getElementById('extension-toggle');
  const toggleCard = document.getElementById('toggle-card');
  const statusDot = document.getElementById('status-dot');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');

  // Auto-log toggle elements
  const autoLogInput = document.getElementById('autolog-toggle');
  const autoLogCard = document.getElementById('autolog-card');
  const autoLogTitle = document.getElementById('autolog-title');
  const autoLogDesc = document.getElementById('autolog-desc');

  function updateToggleUI(enabled) {
    toggleInput.checked = enabled;
    if (enabled) {
      toggleCard.className = 'toggle-card active';
      statusDot.className = 'status-dot';
      statusTitle.textContent = 'WATCHER: ACTIVE';
      statusTitle.style.color = '#00f0ff';
      statusDesc.textContent = 'Tracking LeetCode solve times & submissions';
    } else {
      toggleCard.className = 'toggle-card paused';
      statusDot.className = 'status-dot paused';
      statusTitle.textContent = 'WATCHER: PAUSED';
      statusTitle.style.color = '#f59e0b';
      statusDesc.textContent = 'Disabled on LeetCode. Solves will not be logged';
    }
  }

  function updateAutoLogUI(enabled) {
    if (!autoLogInput) return;
    autoLogInput.checked = enabled;
    if (enabled) {
      autoLogCard.className = 'toggle-card active';
      autoLogTitle.textContent = 'AUTO-LOG: ON';
      autoLogTitle.style.color = '#00f0ff';
      autoLogDesc.textContent = 'Instant background sync on Accepted without popup';
    } else {
      autoLogCard.className = 'toggle-card paused';
      autoLogTitle.textContent = 'AUTO-LOG: MANUAL';
      autoLogTitle.style.color = '#f59e0b';
      autoLogDesc.textContent = 'Opens rating modal on Accepted to review first';
    }
  }

  // Load persisted states (defaults to true)
  chrome.storage.local.get(['extensionEnabled', 'autoLogEnabled'], (res) => {
    const isEnabled = res.extensionEnabled !== false; // Default true
    const isAutoLog = res.autoLogEnabled !== false; // Default true
    updateToggleUI(isEnabled);
    updateAutoLogUI(isAutoLog);
  });

  // Handle master toggle change
  toggleInput.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    updateToggleUI(enabled);

    // Save to storage
    chrome.storage.local.set({ extensionEnabled: enabled });

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SET_EXTENSION_ENABLED',
      enabled
    });

    // Notify all active LeetCode tabs
    chrome.tabs.query({ url: '*://*.leetcode.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'EXTENSION_TOGGLED',
          enabled
        }).catch(() => {});
      });
    });
  });

  // Handle auto-log toggle change
  if (autoLogInput) {
    autoLogInput.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      updateAutoLogUI(enabled);

      chrome.storage.local.set({ autoLogEnabled: enabled });

      // Notify all active LeetCode tabs
      chrome.tabs.query({ url: '*://*.leetcode.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'AUTOLOG_TOGGLED',
            enabled
          }).catch(() => {});
        });
      });
    });
  }

  // Request due count from background script
  chrome.runtime.sendMessage({ type: 'GET_DUE_COUNT' }, (response) => {
    if (response && response.count !== undefined) {
      countEl.textContent = response.count;
      countEl.style.color = response.count > 0 ? '#ff007f' : '#00ff66';
    } else {
      countEl.textContent = '0';
    }
  });

  openHubBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });

  openLeetCodeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://leetcode.com/problemset/all/' });
  });
});
