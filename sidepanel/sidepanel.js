// sidepanel/sidepanel.js - Main logic for LinkedIn DE Copilot Studio

document.addEventListener('DOMContentLoaded', async () => {
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

  // Tab 2: Comment Copilot Elements
  const grabPostBtn = document.getElementById('grab-post-btn');
  const commentPostInput = document.getElementById('comment-post-input');
  const commentPersonaPills = document.getElementById('comment-persona-pills');
  const generateCommentsBtn = document.getElementById('generate-comments-btn');
  const commentResultsContainer = document.getElementById('comment-results-container');
  const commentsList = document.getElementById('comments-list');

  // Tab 3: Hooks Elements
  const hookTopicInput = document.getElementById('hook-topic-input');
  const generateHooksBtn = document.getElementById('generate-hooks-btn');
  const hooksResultsCard = document.getElementById('hooks-results-card');
  const hooksListContainer = document.getElementById('hooks-list-container');

  // Tab 4: Drafts Elements
  const draftsListContainer = document.getElementById('drafts-list-container');
  const clearDraftsBtn = document.getElementById('clear-drafts-btn');

  // Tab 5: Settings Elements
  const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility-btn');
  const testSaveApiBtn = document.getElementById('test-save-api-btn');
  const apiTestResult = document.getElementById('api-test-result');
  const customBioInput = document.getElementById('custom-bio-input');
  const settingAutoLike = document.getElementById('setting-auto-like');
  const savePreferencesBtn = document.getElementById('save-preferences-btn');

  let currentSettings = await StorageManager.getSettings();
  let selectedTopic = 'PySpark Partition Skew & Memory Spill';
  let selectedCommentPersona = 'practical_experience';

  function showToast(message) {
    if (!appToast) return;
    appToast.textContent = message;
    appToast.classList.add('show');
    setTimeout(() => appToast.classList.remove('show'), 2600);
  }

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

  function switchTab(targetTabId) {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeTabBtn = document.querySelector(`.nav-tab[data-tab="${targetTabId}"]`);
    const activeContent = document.getElementById(targetTabId);

    if (activeTabBtn) activeTabBtn.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  // Init UI
  geminiApiKeyInput.value = currentSettings.apiKey || '';
  customBioInput.value = currentSettings.customBio || '';
  settingAutoLike.checked = currentSettings.autoLike || false;
  updateApiStatus();
  updateDraftsList();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

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

  function updateCharCounter() {
    const len = postOutputTextarea.value.length;
    charCounter.textContent = `${len} chars (Recommended: 800 - 1800)`;
  }
  postOutputTextarea.addEventListener('input', updateCharCounter);

  // Generate Post
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

  // Formatting tools
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

  // TAB 2: COMMENT COPILOT IN SIDEPANEL
  grabPostBtn.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const textEl = document.querySelector(
                '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text, .feed-shared-update-v2__commentary'
              );
              return textEl ? textEl.innerText.trim() : window.getSelection().toString();
            }
          });
          if (result) {
            commentPostInput.value = result;
            showToast('📥 Grabbed post text from page!');
          } else {
            showToast('No post text found on page. Please select or paste text.');
          }
        } catch (e) {
          showToast('Could not grab post: ' + e.message);
        }
      }
    }
  });

  commentPersonaPills.querySelectorAll('.topic-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      commentPersonaPills.querySelectorAll('.topic-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedCommentPersona = pill.getAttribute('data-style');
    });
  });

  generateCommentsBtn.addEventListener('click', async () => {
    const postText = commentPostInput.value.trim();
    if (!postText) {
      showToast('Please paste or grab a post text first.');
      return;
    }

    if (!currentSettings.apiKey) {
      switchTab('tab-settings');
      showToast('Please set your free Gemini API key.');
      return;
    }

    generateCommentsBtn.disabled = true;
    generateCommentsBtn.innerHTML = '<span>⏳</span> Generating DE Comments...';

    try {
      const suggestions = await GeminiClient.generateCommentSuggestions(
        postText,
        'LinkedIn Peer',
        currentSettings.apiKey,
        currentSettings.customBio
      );

      commentsList.innerHTML = '';
      suggestions.forEach(item => {
        const card = document.createElement('div');
        card.className = 'hook-item-card';
        card.style.cursor = 'default';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: var(--accent-cyan);">${item.emoji || '💡'} ${item.label || item.style}</strong>
          </div>
          <div style="font-size: 12.5px; line-height: 1.45; color: var(--text-primary); margin-bottom: 8px;">${item.comment}</div>
          <div style="display: flex; gap: 6px;">
            <button class="action-btn action-primary copy-c-btn" style="padding: 4px 10px; font-size: 11px;">📋 Copy Comment</button>
            <button class="action-btn action-accent insert-c-btn" style="padding: 4px 10px; font-size: 11px;">✍️ Insert into LinkedIn</button>
          </div>
        `;

        card.querySelector('.copy-c-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(item.comment);
          showToast('📋 Comment copied to clipboard!');
        });

        card.querySelector('.insert-c-btn').addEventListener('click', async () => {
          navigator.clipboard.writeText(item.comment);
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [item.comment, currentSettings.autoLike],
                func: (commentText, shouldLike) => {
                  let editor = document.querySelector(
                    'div.ql-editor[contenteditable="true"], .comments-comment-box [contenteditable="true"], div[contenteditable="true"]'
                  );
                  if (!editor) {
                    const commentBtn = document.querySelector('button[aria-label*="Comment"], .comment-button');
                    if (commentBtn) commentBtn.click();
                    editor = document.querySelector('div[contenteditable="true"], .comments-comment-box [contenteditable="true"]');
                  }
                  if (editor) {
                    editor.focus();
                    const p = editor.querySelector('p') || editor;
                    p.textContent = commentText;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                    editor.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  if (shouldLike) {
                    const likeBtn = document.querySelector('button[aria-label*="Like"], .react-button__trigger');
                    if (likeBtn && !likeBtn.classList.contains('react-button--active')) {
                      likeBtn.click();
                    }
                  }
                }
              });
              showToast('✍️ Comment inserted into LinkedIn page!');
            }
          }
        });

        commentsList.appendChild(card);
      });

      commentResultsContainer.style.display = 'block';
      commentResultsContainer.scrollIntoView({ behavior: 'smooth' });
      showToast('3 DE Comments ready!');
    } catch (err) {
      alert(`Comment generation error: ${err.message}`);
    } finally {
      generateCommentsBtn.disabled = false;
      generateCommentsBtn.innerHTML = '<span>✨</span> Generate 3 DE Comments';
    }
  });

  // TAB 3: Viral Hooks
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
    generateHooksBtn.innerHTML = '<span>⏳</span> Generating...';

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
      generateHooksBtn.innerHTML = '<span>✨</span> Generate';
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
    testSaveApiBtn.textContent = 'Testing connection with Gemini Flash...';

    const test = await GeminiClient.validateApiKey(key);
    if (test.valid) {
      await StorageManager.saveSettings({ apiKey: key });
      currentSettings = await StorageManager.getSettings();
      updateApiStatus();

      apiTestResult.className = 'api-test-feedback success';
      apiTestResult.innerHTML = `✅ <strong>Connected!</strong> Google Gemini Flash is active (${test.model || 'gemini-3.6-flash'}).`;
      showToast('API key saved & verified!');
    } else {
      apiTestResult.className = 'api-test-feedback error';
      apiTestResult.innerHTML = `❌ <strong>Error:</strong> ${test.error}`;
    }

    testSaveApiBtn.disabled = false;
    testSaveApiBtn.innerHTML = '<span>💾</span> Save & Test Connection';
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
