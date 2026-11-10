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
      chrome.action.setBadgeBackgroundColor({ color: '#000000' });
      return;
    }

    const res = await fetch(`${API_BASE}/reviews/due`);
    if (res.ok) {
      const data = await res.json();
      const count = data.due_count || 0;
      if (count > 0) {
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

        const today = new Date().toDateString();
        if (triggerNotification && (today !== lastNotifiedDay || count > lastNotifiedCount)) {
          lastNotifiedDay = today;
          lastNotifiedCount = count;

          chrome.notifications.create('paced-due-reminder', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'PacedLearner — Pacey Recall Alert',
            message: `You have ${count} problem${count > 1 ? 's' : ''} due for FSRS recall review today.`,
            priority: 2,
            requireInteraction: false
          });
        }
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (err) {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  updateBadge(true);
  chrome.alarms.create('checkDueReviews', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkDueReviews') {
    updateBadge(true);
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === 'paced-due-reminder') {
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_EXTENSION_ENABLED') {
    const isEnabled = message.enabled;
    chrome.storage.local.set({ extensionEnabled: isEnabled });
    if (!isEnabled) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#000000' });
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
      .then((res) => res.json())
      .then((data) => {
        updateBadge();
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.type === 'GET_DUE_COUNT') {
    fetch(`${API_BASE}/reviews/due`)
      .then((res) => res.json())
      .then((data) => sendResponse({ count: data.due_count || 0 }))
      .catch(() => sendResponse({ count: 0 }));
    return true;
  }

  if (message.type === 'EXTRACT_CHOKE_POINT') {
    fetch(`${API_BASE}/choke-points/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then((res) => res.json())
      .then(async (extractData) => {
        if (!extractData.success) {
          sendResponse({ success: false, error: extractData.error });
          return;
        }
        const saveRes = await fetch(`${API_BASE}/choke-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extractData.choke_point)
        });
        const saveData = await saveRes.json();
        updateBadge();
        sendResponse(saveData);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.type === 'GET_PACEY_MODELS') {
    fetch(`${API_BASE}/pacey/models`)
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ online: false, error: err.message }));
    return true;
  }

  if (message.type === 'ASK_PACEY') {
    fetch(`${API_BASE}/pacey/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'PACEY_INTERROGATE') {
    fetch(`${API_BASE}/pacey/interrogate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'PACEY_TTS') {
    fetch(`${API_BASE}/pacey/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        sendResponse({ success: true, audioBase64: btoa(binary) });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'PACEY_STT') {
    fetch(`${API_BASE}/pacey/stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
