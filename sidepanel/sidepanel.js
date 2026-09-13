// sidepanel/sidepanel.js - Main logic for LinkedIn DE Copilot Studio with Trending Engine

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const apiStatusIndicator = document.getElementById('api-status-indicator');
  const draftCounter = document.getElementById('draft-counter');
  const appToast = document.getElementById('app-toast');

  // Daily Tracker
  const streakDays = document.getElementById('streak-days');
  const dailyCommentsCount = document.getElementById('daily-comments-count');
  const commentsProgress = document.getElementById('comments-progress');

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

  // Tab 2: Trending Topics Elements
  const trendingTopicsContainer = document.getElementById('trending-topics-container');

  // Tab 3: Comment Copilot Elements
  const grabPostBtn = document.getElementById('grab-post-btn');
  const commentPostInput = document.getElementById('comment-post-input');
  const commentLengthPills = document.getElementById('comment-length-pills');
  const generateCommentsBtn = document.getElementById('generate-comments-btn');
  const commentResultsContainer = document.getElementById('comment-results-container');
  const commentsList = document.getElementById('comments-list');

  // Tab 4: Hooks Elements
  const hookTopicInput = document.getElementById('hook-topic-input');
  const generateHooksBtn = document.getElementById('generate-hooks-btn');
  const hooksResultsCard = document.getElementById('hooks-results-card');
  const hooksListContainer = document.getElementById('hooks-list-container');

  // Tab 5: Drafts Elements
  const draftsListContainer = document.getElementById('drafts-list-container');
  const clearDraftsBtn = document.getElementById('clear-drafts-btn');

  // Tab 6: Settings Elements
  const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility-btn');
  const testSaveApiBtn = document.getElementById('test-save-api-btn');
  const apiTestResult = document.getElementById('api-test-result');
  const customBioInput = document.getElementById('custom-bio-input');
  const settingAutoLike = document.getElementById('setting-auto-like');
  const savePreferencesBtn = document.getElementById('save-preferences-btn');

  let currentSettings = await StorageManager.getSettings();
  let selectedTopic = 'Apache Iceberg vs Delta Lake: The Open Catalog & Compaction Debt';
  let selectedLength = 'standard';

  function showToast(message) {
    if (!appToast) return;
    appToast.textContent = message;
    appToast.classList.add('show');
    setTimeout(() => appToast.classList.remove('show'), 2600);
  }

  async function updateDailyTracker() {
    const stats = await StorageManager.getDailyStats();
    if (streakDays) streakDays.textContent = stats.streak || 1;
    if (dailyCommentsCount) dailyCommentsCount.textContent = stats.comments || 0;
    if (commentsProgress) {
      const pct = Math.min(100, Math.round(((stats.comments || 0) / 10) * 100));
      commentsProgress.style.width = `${pct}%`;
    }
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

  // Render Trending Topics Tab
  function renderTrendingTopics() {
    if (!trendingTopicsContainer || typeof TRENDING_DE_TOPICS === 'undefined') return;

    trendingTopicsContainer.innerHTML = '';
    TRENDING_DE_TOPICS.forEach((trend) => {
      const card = document.createElement('div');
      card.className = 'hook-item-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <strong style="color: var(--accent-cyan); font-size: 13px;">${trend.title}</strong>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 8px 0; line-height: 1.4;">${trend.description}</p>
        <button class="action-btn action-primary generate-trend-btn" style="width: 100%; padding: 7px; font-weight: 700;">
          <span>⚡</span> Generate Masterclass Post
        </button>
      `;

      card.querySelector('.generate-trend-btn').addEventListener('click', () => {
        customTopicInput.value = trend.title;
        postNotesInput.value = trend.context;
        frameworkSelect.value = 'viral_masterclass';
        switchTab('tab-post-creator');
        generatePostBtn.click();
      });

      trendingTopicsContainer.appendChild(card);
    });
  }

  // Check pending reply from in-page click
  async function checkPendingReply() {
    chrome.storage.local.get(['pending_post_reply'], (res) => {
      if (res.pending_post_reply && res.pending_post_reply.postText) {
        const { postText } = res.pending_post_reply;
        commentPostInput.value = postText;
        switchTab('tab-comment-copilot');
        chrome.storage.local.remove(['pending_post_reply']);
        generateComments();
      }
    });
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TRIGGER_COPILOT_REPLY') {
      commentPostInput.value = request.postText || '';
      switchTab('tab-comment-copilot');
      generateComments();
    }
  });

  // Length Pills selection
  commentLengthPills.querySelectorAll('.length-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      commentLengthPills.querySelectorAll('.length-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedLength = pill.getAttribute('data-len');
    });
  });

  // Init UI
  geminiApiKeyInput.value = currentSettings.apiKey || '';
  customBioInput.value = currentSettings.customBio || '';
  settingAutoLike.checked = currentSettings.autoLike || false;
  updateApiStatus();
  updateDraftsList();
  updateDailyTracker();
  renderTrendingTopics();
  checkPendingReply();

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
    const words = postOutputTextarea.value.trim().split(/\s+/).filter(Boolean).length;
    charCounter.textContent = `${words} words | ${len} chars (Recommended: 1200 - 2000)`;
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
    const framework = POST_FRAMEWORKS[frameworkKey] || POST_FRAMEWORKS.viral_masterclass;
    const prompt = framework.buildPrompt(topic, postNotesInput.value.trim(), currentSettings.customBio);

    const originalBtnText = generatePostBtn.innerHTML;
    generatePostBtn.disabled = true;
    generatePostBtn.innerHTML = `<span>⏳</span> Crafting Masterclass (${topic.slice(0, 20)}...)`;

    try {
      const generatedPost = await GeminiClient.generate(prompt, currentSettings.apiKey, {
        temperature: 0.75,
        maxOutputTokens: 2500
      });

      postOutputTextarea.value = generatedPost;
      updateCharCounter();
      outputCard.style.display = 'flex';
      outputCard.scrollIntoView({ behavior: 'smooth' });
      await StorageManager.incrementActivity('posts');
      updateDailyTracker();
      showToast('✨ Masterclass post generated! Edit & format below.');
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

  // TAB 3: COMMENT COPILOT
  grabPostBtn.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          chrome.tabs.sendMessage(tab.id, { type: 'GRAB_ACTIVE_POST_CONTEXT' }, async (response) => {
            if (response && response.success && response.text) {
              commentPostInput.value = response.text;
              showToast(`📥 Grabbed post by ${response.author || 'Author'}!`);
              await generateComments();
            } else {
              // Fallback to active selection or viewport text
              try {
                const [{ result }] = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => window.getSelection().toString().trim()
                });
                if (result) {
                  commentPostInput.value = result;
                  showToast('📥 Grabbed selected text!');
                  await generateComments();
                } else {
                  showToast('Please scroll to or click the post on LinkedIn first.');
                }
              } catch (err) {
                showToast('Please click on the post on LinkedIn first.');
              }
            }
          });
        } catch (e) {
          showToast('Could not grab post: ' + e.message);
        }
      }
    }
  });

  async function generateComments() {
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
    generateCommentsBtn.innerHTML = '<span>⏳</span> Crafting 3 DE Comments...';
    commentResultsContainer.style.display = 'block';
    commentsList.innerHTML = '<div class="empty-state">⚡ Analyzing post and generating Data Engineering comments...</div>';

    try {
      const suggestions = await GeminiClient.generateCommentSuggestions(
        postText,
        'LinkedIn Peer',
        currentSettings.apiKey,
        currentSettings.customBio,
        selectedLength
      );

      renderCommentCards(suggestions);
      showToast('3 DE Comments ready!');
    } catch (err) {
      commentsList.innerHTML = `<div style="padding: 12px; color: var(--error-color);">⚠️ Error: ${err.message}</div>`;
    } finally {
      generateCommentsBtn.disabled = false;
      generateCommentsBtn.innerHTML = '<span>✨</span> Generate 3 DE Comments';
    }
  }

  function renderCommentCards(suggestions) {
    commentsList.innerHTML = '';
    suggestions.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'hook-item-card';
      card.id = `comment-card-${index}`;
      card.style.cursor = 'default';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--accent-cyan);">${item.emoji || '💡'} ${item.label || item.style}</strong>
          <div class="refine-toolbar">
            <button class="refine-btn btn-shorter" title="Condense to 1 punchy sentence">✂️ Shorter</button>
            <button class="refine-btn btn-tech" title="Inject specific code/config details">⚡ Add Config</button>
            <button class="refine-btn btn-regen" title="Regenerate this specific angle">🔄</button>
          </div>
        </div>
        <div class="comment-text-body" style="font-size: 12.5px; line-height: 1.45; color: var(--text-primary); margin: 6px 0 10px 0;">${item.comment}</div>
        <div style="display: flex; gap: 8px;">
          <button class="action-btn action-primary insert-c-btn" style="flex: 1; padding: 6px 12px; font-size: 11.5px; font-weight: 700;">✍️ Insert into Comment Box</button>
          <button class="action-btn action-secondary copy-c-btn" style="padding: 6px 10px; font-size: 11px;">📋 Copy</button>
        </div>
      `;

      const textBody = card.querySelector('.comment-text-body');

      card.querySelector('.insert-c-btn').addEventListener('click', async () => {
        const commentToInsert = textBody.textContent.trim();
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'INSERT_COMMENT_TO_PAGE',
              commentText: commentToInsert,
              autoLike: currentSettings.autoLike
            });
            await StorageManager.incrementActivity('comments');
            updateDailyTracker();
            showToast('✍️ Comment inserted into LinkedIn comment box!', '🚀');
          }
        }
      });

      card.querySelector('.copy-c-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(textBody.textContent.trim());
        showToast('📋 Comment copied to clipboard!');
      });

      card.querySelector('.btn-shorter').addEventListener('click', async () => {
        textBody.textContent = '⏳ Trimming to punchy sentence...';
        try {
          const refined = await GeminiClient.refineComment(item.comment, 'shorter', currentSettings.apiKey);
          textBody.textContent = refined;
          showToast('✂️ Condensed comment!');
        } catch (e) {
          textBody.textContent = item.comment;
          alert(e.message);
        }
      });

      card.querySelector('.btn-tech').addEventListener('click', async () => {
        textBody.textContent = '⏳ Injecting concrete configs & metrics...';
        try {
          const refined = await GeminiClient.refineComment(item.comment, 'technical', currentSettings.apiKey);
          textBody.textContent = refined;
          showToast('⚡ Injected technical parameters!');
        } catch (e) {
          textBody.textContent = item.comment;
          alert(e.message);
        }
      });

      card.querySelector('.btn-regen').addEventListener('click', async () => {
        textBody.textContent = '⏳ Regenerating fresh angle...';
        try {
          const refined = await GeminiClient.refineComment(item.comment, 'fresh', currentSettings.apiKey);
          textBody.textContent = refined;
          showToast('🔄 Fresh angle ready!');
        } catch (e) {
          textBody.textContent = item.comment;
          alert(e.message);
        }
      });

      commentsList.appendChild(card);
    });

    commentResultsContainer.style.display = 'block';
    commentResultsContainer.scrollIntoView({ behavior: 'smooth' });
  }

  generateCommentsBtn.addEventListener('click', generateComments);

  // TAB 4: Hooks
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
