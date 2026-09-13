// background.js - Service Worker with API relay and Tab messaging

importScripts('utils/storage.js', 'utils/prompts.js', 'utils/gemini.js');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LinkedIn DE Copilot] Service Worker installed.');
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.warn('SidePanel behavior error:', err));
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open && tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      console.warn('Could not open side panel directly:', e);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_SIDEPANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  }

  if (request.type === 'GENERATE_COMMENTS_API') {
    (async () => {
      try {
        const settings = await StorageManager.getSettings();
        if (!settings.apiKey) {
          sendResponse({ success: false, error: 'Gemini API key is missing. Please set it in Settings.' });
          return;
        }
        const results = await GeminiClient.generateCommentSuggestions(
          request.postText,
          request.authorName,
          settings.apiKey,
          settings.customBio
        );
        sendResponse({ success: true, data: results });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.type === 'GENERATE_SINGLE_COMMENT_API') {
    (async () => {
      try {
        const settings = await StorageManager.getSettings();
        if (!settings.apiKey) {
          sendResponse({ success: false, error: 'Gemini API key is missing. Please set it in Settings.' });
          return;
        }
        const persona = COMMENT_PERSONAS[request.style] || COMMENT_PERSONAS.practical_experience;
        const prompt = persona.buildPrompt(request.postText, request.authorName, settings.customBio);
        const result = await GeminiClient.generate(prompt, settings.apiKey);
        sendResponse({ success: true, data: result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
