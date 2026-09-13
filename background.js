// background.js - Service Worker for LinkedIn DE Copilot

// Enable side panel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn DE Copilot installed successfully.');
  
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Error setting panel behavior:', error));
  }
});

// Fallback action click handler if sidePanel behavior is not supported
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      console.warn('Could not open side panel directly:', e);
    }
  }
});

// Listen for messages from content scripts or sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_SIDEPANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }
  }
  
  if (request.type === 'PING') {
    sendResponse({ status: 'alive' });
  }
});
