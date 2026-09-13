// sidepanel/sidepanel.js - Main logic for LinkedIn DE Copilot Studio

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const apiStatusIndicator = document.getElementById('api-status-indicator');
  const draftCounter = document.getElementById('draft-counter');
  const appToast = document.getElementById('app-toast');

  // Tab 1: Post Creator Elements
  const topicPillsContainer = document.getElementById('topic-pills-container');
  const customTopicInput = document.getElementById('custom-topic-input');
  const frameworkSelect = document.getElementById('framework-select');
  const postNotesInput = document.getElementById('post-notes-input');
  const generatePostBtn = document.getElementById('generate-post-btn');
  const outputCard = document.getElementById('output-card');
  const postOutputTextarea = document.getElementById('post-output-textarea');
  const charCounter = document.getElementById('char-counter');
  const copyPostBtn = document.getElementById('copy-post-btn');
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const openLinkedinBtn = document.getElementById('open-linkedin-btn');

  // Formatting Toolbar Elements
  const formatBoldBtn = document.getElementById('format-bold');
  const formatItalicBtn = document.getElementById('format-italic');
  const formatBulletBlueBtn = document.getElementById('format-bullet-blue');
  const formatBulletArrowBtn = document.getElementById('format-bullet-arrow');
  const formatBulletCheckBtn = document.getElementById('format-bullet-check');
  const formatCodeBtn = document.getElementById('format-code');

  // Tab 2: Hooks Elements
  const hookTopicInput = document.getElementById('hook-topic-input');
  const generateHooksBtn = document.getElementById('generate-hooks-btn');
  const hooksResultsCard = document.getElementById('hooks-results-card');
  const hooksListContainer = document.getElementById('hooks-list-container');

  // Tab 3: Drafts Elements
  const draftsListContainer = document.getElementById('drafts-list-container');
  const clearDraftsBtn = document.getElementById('clear-drafts-btn');

  // Tab 4: Settings Elements
  const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility-btn');
  const testSaveApiBtn = document.getElementById('test-save-api-btn');
  const apiTestResult = document.getElementById('api-test-result');
  const customBioInput = document.getElementById('custom-bio-input');
  const settingAutoLike = document.getElementById('setting-auto-like');
  const savePreferencesBtn = document.getElementById('save-preferences-btn');

  let currentSettings = await StorageManager.getSettings();
  let selectedTopic = 'PySpark Partition Skew & Memory Spill';

  // Helper: Show toast
  function showToast(message) {
    if (!appToast) return;
    appToast.textContent = message;
    appToast.classList.add('show');
    setTimeout(() => appToast.classList.remove('show'), 2600);
  }

  // Update Status Indicator
  async function updateApiStatus() {
    const dot = apiStatusIndicator.querySelector('.status-dot');
    const text = apiStatusIndicator.querySelector('.status-text');

    if (!currentSettings.apiKey) {
      dot.className = 'status-dot';
      text.textContent = 'API Key Needed';
      return;
    }

    dot.className = 'status-dot connected';
    text.textContent = 'Free AI Ready';
  }

  // Update Drafts Count Badge
  async function updateDraftsList() {
    const drafts = await StorageManager.getDrafts();
    draftCounter.textContent = drafts.length;

    if (!draftsListContainer) return;

    if (drafts.length === 0) {
      draftsListContainer.innerHTML = `<div class="empty-state">No saved drafts yet. Generate and save posts from Post Studio!</div>`;
      return;
    }

    draftsListContainer.innerHTML = '';
    drafts.forEach((draft) => {
      const card = document.createElement('div');
      card.className = 'draft-card';
      const dateStr = new Date(draft.updatedAt || draft.createdAt).toLocaleDateString();

      card.innerHTML = `
        <div class="draft-meta">
          <strong>${draft.topic || 'General DE Post'}</strong>
          <span>${dateStr}</span>
        </div>
        <div class="draft-snippet">${draft.content.slice(0, 140)}...</div>
        <div class="draft-actions">
          <button class="draft-btn load-draft-btn">✍️ Edit</button>
          <button class="draft-btn copy-draft-btn">📋 Copy</button>
          <button class="draft-btn delete-draft-btn" style="color: var(--error-color);">🗑️ Delete</button>
        </div>
      `;

      // Handlers
      card.querySelector('.load-draft-btn').addEventListener('click', () => {
        postOutputTextarea.value = draft.content;
        updateCharCounter();
        outputCard.style.display = 'flex';
        switchTab('tab-post-creator');
        showToast('Draft loaded into editor!');
      });

      card.querySelector('.copy-draft-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(draft.content);
        showToast('Draft copied to clipboard!');
      });

      card.querySelector('.delete-draft-btn').addEventListener('click', async () => {
        await StorageManager.deleteDraft(draft.id);
        updateDraftsList();
        showToast('Draft deleted.');
      });

      draftsListContainer.appendChild(card);
    });
  }

  // Switch Tab Helper
  function switchTab(targetTabId) {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeTabBtn = document.querySelector(`.nav-tab[data-tab="${targetTabId}"]`);
    const activeContent = document.getElementById(targetTabId);

    if (activeTabBtn) activeTabBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  // Initialize Settings in UI
  geminiApiKeyInput.value = currentSettings.apiKey || '';
  customBioInput.value = currentSettings.customBio || '';
  settingAutoLike.checked = currentSettings.autoLike || false;
  updateApiStatus();
  updateDraftsList();

  // Tab Switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Topic Matrix selection
  topicPillsContainer.querySelectorAll('.topic-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      topicPillsContainer.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTopic = pill.getAttribute('data-topic');
      customTopicInput.value = '';
    });
  });

  customTopicInput.addEventListener('input', () => {
    if (customTopicInput.value.trim().length > 0) {
      topicPillsContainer.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('active'));
      selectedTopic = customTopicInput.value.trim();
    }
  });

  // Character Counter
  function updateCharCounter() {
    const len = postOutputTextarea.value.length;
    charCounter.textContent = `${len} chars (Recommended: 800 - 1800)`;
  }
  postOutputTextarea.addEventListener('input', updateCharCounter);

  // Generate Post Handler
  generatePostBtn.addEventListener('click', async () => {
    const topic = customTopicInput.value.trim() || selectedTopic;
    if (!topic) {
      showToast('Please select or enter a topic.');
      return;
    }

    if (!currentSettings.apiKey) {
      switchTab('tab-settings');
      showToast('Please enter your free Gemini API key first.');
      return;
    }

    const frameworkKey = frameworkSelect.value;
    const framework = POST_FRAMEWORKS[frameworkKey] || POST_FRAMEWORKS.architecture_case_study;
    const prompt = framework.buildPrompt(topic, postNotesInput.value.trim(), currentSettings.customBio);

    const originalBtnText = generatePostBtn.innerHTML;
    generatePostBtn.disabled = true;
    generatePostBtn.innerHTML = `<span>⏳</span> Generating ${framework.name.split(' ')[0]} Post...`;

    try {
      const generatedPost = await GeminiClient.generate(prompt, currentSettings.apiKey, {
        temperature: 0.75,
        maxOutputTokens: 1500
      });

      postOutputTextarea.value = generatedPost;
      updateCharCounter();
      outputCard.style.display = 'flex';
      outputCard.scrollIntoView({ behavior: 'smooth' });
      showToast('✨ Post generated! Edit & format below.');
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      generatePostBtn.disabled = false;
      generatePostBtn.innerHTML = originalBtnText;
    }
  });

  // Text Selection & Formatting Helpers
  function transformSelectedText(transformer) {
    const start = postOutputTextarea.selectionStart;
    const end = postOutputTextarea.selectionEnd;
    const val = postOutputTextarea.value;

    if (start === end) {
      showToast('Highlight some text first to apply styling.');
      return;
    }

    const selected = val.substring(start, end);
    const transformed = transformer(selected);
    postOutputTextarea.value = val.substring(0, start) + transformed + val.substring(end);
    postOutputTextarea.setSelectionRange(start, start + transformed.length);
    postOutputTextarea.focus();
    updateCharCounter();
  }

  function insertAtCursor(text) {
    const start = postOutputTextarea.selectionStart;
    const end = postOutputTextarea.selectionEnd;
    const val = postOutputTextarea.value;
    postOutputTextarea.value = val.substring(0, start) + text + val.substring(end);
    postOutputTextarea.setSelectionRange(start + text.length, start + text.length);
    postOutputTextarea.focus();
    updateCharCounter();
  }

  formatBoldBtn.addEventListener('click', () => transformSelectedText(UnicodeStyler.bold));
  formatItalicBtn.addEventListener('click', () => transformSelectedText(UnicodeStyler.italic));
  formatBulletBlueBtn.addEventListener('click', () => insertAtCursor('\n🔹 '));
  formatBulletArrowBtn.addEventListener('click', () => insertAtCursor('\n👉 '));
  formatBulletCheckBtn.addEventListener('click', () => insertAtCursor('\n✅ '));
  formatCodeBtn.addEventListener('click', () => transformSelectedText(t => `\`${t}\``));

  // Post Actions
  copyPostBtn.addEventListener('click', () => {
    const text = postOutputTextarea.value;
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('📋 Post copied to clipboard!');
  });

  saveDraftBtn.addEventListener('click', async () => {
    const content = postOutputTextarea.value.trim();
    if (!content) {
      showToast('Cannot save empty post.');
      return;
    }
    const topic = customTopicInput.value.trim() || selectedTopic;
    await StorageManager.saveDraft({ content, topic });
    updateDraftsList();
    showToast('💾 Saved to Drafts!');
  });

  openLinkedinBtn.addEventListener('click', () => {
    const text = postOutputTextarea.value;
    if (text) navigator.clipboard.writeText(text);
    window.open('https://www.linkedin.com/feed/', '_blank');
    showToast('Copied post & opening LinkedIn...');
  });

  // Viral Hooks Generator
  generateHooksBtn.addEventListener('click', async () => {
    const topic = hookTopicInput.value.trim() || selectedTopic;
    if (!topic) {
      showToast('Please enter a topic.');
      return;
    }

    if (!currentSettings.apiKey) {
      switchTab('tab-settings');
      showToast('Please set your free Gemini API key.');
      return;
    }

    generateHooksBtn.disabled = true;
    generateHooksBtn.innerHTML = `<span>⏳</span> Generating...`;

    try {
      const hooks = await GeminiClient.generateHooks(topic, currentSettings.apiKey);
      hooksListContainer.innerHTML = '';

      hooks.forEach(hook => {
        const item = document.createElement('div');
        item.className = 'hook-item-card';
        item.innerHTML = `<strong>🎣</strong> ${hook}`;

        item.addEventListener('click', () => {
          customTopicInput.value = hook;
          postNotesInput.value = `Focus on this angle: "${hook}"`;
          switchTab('tab-post-creator');
          showToast('Hook loaded into Post Studio!');
        });

        hooksListContainer.appendChild(item);
      });

      hooksResultsCard.style.display = 'block';
      showToast('3 Hooks generated! Click any to use.');
    } catch (err) {
      alert(`Hooks generation error: ${err.message}`);
    } finally {
      generateHooksBtn.disabled = false;
      generateHooksBtn.innerHTML = `<span>✨</span> Generate`;
    }
  });

  // Clear Drafts
  clearDraftsBtn.addEventListener('click', async () => {
    if (confirm('Clear all saved drafts?')) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([STORAGE_KEYS.SAVED_DRAFTS], () => {
          updateDraftsList();
          showToast('Drafts cleared.');
        });
      }
    }
  });

  // Settings Handlers
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    geminiApiKeyInput.type = geminiApiKeyInput.type === 'password' ? 'text' : 'password';
  });

  testSaveApiBtn.addEventListener('click', async () => {
    const key = geminiApiKeyInput.value.trim();
    if (!key) {
      apiTestResult.className = 'api-test-feedback error';
      apiTestResult.textContent = 'Please enter an API key.';
      return;
    }

    testSaveApiBtn.disabled = true;
    testSaveApiBtn.textContent = 'Testing connection with Gemini 1.5 Flash...';

    const test = await GeminiClient.validateApiKey(key);
    if (test.valid) {
      await StorageManager.saveSettings({ apiKey: key });
      currentSettings = await StorageManager.getSettings();
      updateApiStatus();

      apiTestResult.className = 'api-test-feedback success';
      apiTestResult.innerHTML = '✅ <strong>Connected!</strong> Google Gemini Flash API is active and ready.';
      showToast('API key saved & verified!');
    } else {
      apiTestResult.className = 'api-test-feedback error';
      apiTestResult.innerHTML = `❌ <strong>Error:</strong> ${test.error}`;
    }

    testSaveApiBtn.disabled = false;
    testSaveApiBtn.innerHTML = `<span>💾</span> Save & Test Connection`;
  });

  savePreferencesBtn.addEventListener('click', async () => {
    await StorageManager.saveSettings({
      customBio: customBioInput.value.trim(),
      autoLike: settingAutoLike.checked
    });
    currentSettings = await StorageManager.getSettings();
    showToast('Preferences saved!');
  });
});
