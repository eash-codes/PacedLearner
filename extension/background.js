/**
 * PacedLearner Chrome Extension Service Worker
 * Manages due review badge counts & relays session logs to local core engine.
 */

const API_BASE = 'http://localhost:4100/api';

let lastNotifiedCount = 0;
let lastNotifiedDay = '';

async function updateBadge(triggerNotification = false) {
  try {
    const storage = await chrome.storage.local.get(['extensionEnabled']);
    if (storage.extensionEnabled === false) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
      return;
    }

    const res = await fetch(`${API_BASE}/reviews/due`);
    if (res.ok) {
      const data = await res.json();
      const count = data.due_count || 0;
      if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

        const today = new Date().toDateString();
        // Send desktop notification once per day or when count rises
        if (triggerNotification && (today !== lastNotifiedDay || count > lastNotifiedCount)) {
          lastNotifiedDay = today;
          lastNotifiedCount = count;

          chrome.notifications.create('paced-due-reminder', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'PacedLearner — Recall Queue Due',
            message: `You have ${count} problem${count > 1 ? 's' : ''} due for spaced repetition recall review today. Keep your memory sharp!`,
            priority: 2,
            requireInteraction: false
          });
        }
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (err) {
    // Local server might be offline
    chrome.action.setBadgeText({ text: '' });
  }
}

// Check on install and set alarm for periodic checks every 30 minutes
chrome.runtime.onInstalled.addListener(() => {
  updateBadge(true);
  chrome.alarms.create('checkDueReviews', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkDueReviews') {
    updateBadge(true);
  }
});

// Click notification to open PacedLearner review queue
chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === 'paced-due-reminder') {
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  }
});

// Message listener from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_EXTENSION_ENABLED') {
    const isEnabled = message.enabled;
    chrome.storage.local.set({ extensionEnabled: isEnabled });
    if (!isEnabled) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
    } else {
      updateBadge();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'LOG_SOLVE') {
    fetch(`${API_BASE}/sessions/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then(res => res.json())
      .then(data => {
        updateBadge();
        sendResponse({ success: true, data });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_DUE_COUNT') {
    fetch(`${API_BASE}/reviews/due`)
      .then(res => res.json())
      .then(data => sendResponse({ count: data.due_count || 0 }))
      .catch(() => sendResponse({ count: 0 }));
    return true;
  }
});
