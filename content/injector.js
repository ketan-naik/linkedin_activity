// content/injector.js - LinkedIn in-feed Data Engineering Copilot injector

(function () {
  console.log('[LinkedIn DE Copilot] Content script initialized.');

  let activePopover = null;

  // Helper: Show toast notification
  function showToast(message, icon = '✨') {
    const existing = document.querySelector('.de-copilot-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'de-copilot-toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Helper: Extract text from post container
  function extractPostDetails(postEl) {
    if (!postEl) return { author: 'Peer', text: '' };

    // Find author
    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, .feed-shared-actor__title'
    );
    let author = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Data Engineering Peer';

    // Find post text
    const textEl = postEl.querySelector(
      '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text'
    );
    let text = textEl ? textEl.innerText.trim() : '';

    return { author, text };
  }

  // Helper: Insert text into LinkedIn contenteditable / Quill editor
  function insertTextIntoEditor(editorEl, textToInsert) {
    if (!editorEl) return false;

    editorEl.focus();

    // LinkedIn uses Quill editor or standard contenteditable with <p> tags
    const pTag = editorEl.querySelector('p') || editorEl;
    pTag.textContent = textToInsert;

    // Trigger synthetic input events so LinkedIn's React state registers the change
    editorEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    editorEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    editorEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
    editorEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

    return true;
  }

  // Helper: Auto-like the post if requested
  function triggerPostLike(postEl) {
    if (!postEl) return;
    const likeBtn = postEl.querySelector(
      'button.react-button__trigger, button[aria-label*="React Like"], button[aria-label*="Like"], .reactions-react-button button'
    );

    if (likeBtn) {
      const isAlreadyLiked = likeBtn.getAttribute('aria-pressed') === 'true' || 
                             likeBtn.classList.contains('react-button--active');
      if (!isAlreadyLiked) {
        likeBtn.click();
        console.log('[LinkedIn DE Copilot] Post liked automatically.');
      }
    }
  }

  // Build the inline Popover UI
  async function createPopover(container, postEl, editorEl) {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }

    const popover = document.createElement('div');
    popover.className = 'de-copilot-popover';

    const settings = await StorageManager.getSettings();
    const { author, text } = extractPostDetails(postEl);

    popover.innerHTML = `
      <div class="de-copilot-popover-header">
        <div class="de-copilot-popover-title">
          <span>⚡</span> DE Growth Copilot
        </div>
        <button class="de-copilot-close-btn" title="Close">✕</button>
      </div>

      <div class="de-copilot-persona-pills">
        <button class="de-copilot-pill active" data-style="practical_experience">💡 Practical Nuance</button>
        <button class="de-copilot-pill" data-style="architectural_tradeoff">⚖️ Trade-off</button>
        <button class="de-copilot-pill" data-style="thoughtful_question">❓ Senior Inquiry</button>
        <button class="de-copilot-pill" data-style="concise_value">⚡ Quick Insight</button>
      </div>

      <div class="de-copilot-suggestions">
        <div class="de-copilot-loading">
          <div class="de-copilot-spinner"></div>
          <span>Analyzing post & crafting Data Engineering insights...</span>
        </div>
      </div>

      <div class="de-copilot-popover-footer">
        <label class="de-copilot-checkbox-label">
          <input type="checkbox" id="de-auto-like-chk" ${settings.autoLike ? 'checked' : ''}>
          <span>Auto-like post on insert</span>
        </label>
        <span style="font-size: 10px; color: #70B5F9; cursor: pointer;" id="de-open-studio-btn">Open Studio ↗</span>
      </div>
    `;

    container.appendChild(popover);
    activePopover = popover;

    // Close button
    popover.querySelector('.de-copilot-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
      activePopover = null;
    });

    // Open Studio in side panel
    popover.querySelector('#de-open-studio-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      }
    });

    // Check API Key
    if (!settings.apiKey) {
      const suggestionsEl = popover.querySelector('.de-copilot-suggestions');
      suggestionsEl.innerHTML = `
        <div style="padding: 12px; text-align: center; color: #FFAA44; line-height: 1.5; font-size: 12px;">
          <strong>Gemini API Key Required</strong><br>
          Get your free API key from <a href="https://aistudio.google.com/" target="_blank" style="color: #70B5F9; text-decoration: underline;">Google AI Studio</a>, then click the extension icon to save it.
        </div>
      `;
      return;
    }

    // Function to load and render suggestions
    async function loadSuggestions() {
      const suggestionsEl = popover.querySelector('.de-copilot-suggestions');
      suggestionsEl.innerHTML = `
        <div class="de-copilot-loading">
          <div class="de-copilot-spinner"></div>
          <span>Analyzing architecture & generating high-impact comments...</span>
        </div>
      `;

      try {
        const results = await GeminiClient.generateCommentSuggestions(
          text || 'General Data Engineering best practices, distributed systems, Spark, dbt, Lakehouses.',
          author,
          settings.apiKey,
          settings.customBio
        );

        suggestionsEl.innerHTML = '';
        results.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'de-copilot-suggestion-card';
          card.innerHTML = `
            <div class="de-copilot-card-header">
              <span>${item.emoji || '💡'} ${item.label || item.style}</span>
              <span style="font-size: 10px; opacity: 0.7;">Click to insert</span>
            </div>
            <div class="de-copilot-card-text">${item.comment}</div>
            <div class="de-copilot-insert-hint">👉 Inserts directly into comment box</div>
          `;

          card.addEventListener('click', (e) => {
            e.stopPropagation();
            insertTextIntoEditor(editorEl, item.comment);
            
            const autoLikeChecked = popover.querySelector('#de-auto-like-chk')?.checked;
            if (autoLikeChecked) {
              triggerPostLike(postEl);
            }

            showToast('Data Engineering comment inserted!', '🚀');
            popover.remove();
            activePopover = null;
          });

          suggestionsEl.appendChild(card);
        });
      } catch (err) {
        suggestionsEl.innerHTML = `
          <div style="padding: 10px; color: #FF6B6B; font-size: 12px; line-height: 1.4;">
            ⚠️ <strong>Error:</strong> ${err.message || 'Failed to generate comments. Check your API key.'}
          </div>
        `;
      }
    }

    // Persona pill click handlers
    popover.querySelectorAll('.de-copilot-pill').forEach((pill) => {
      pill.addEventListener('click', async (e) => {
        e.stopPropagation();
        popover.querySelectorAll('.de-copilot-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const style = pill.getAttribute('data-style');
        const persona = COMMENT_PERSONAS[style] || COMMENT_PERSONAS.practical_experience;
        const prompt = persona.buildPrompt(text, author, settings.customBio);

        const suggestionsEl = popover.querySelector('.de-copilot-suggestions');
        suggestionsEl.innerHTML = `
          <div class="de-copilot-loading">
            <div class="de-copilot-spinner"></div>
            <span>Generating ${persona.name}...</span>
          </div>
        `;

        try {
          const commentText = await GeminiClient.generate(prompt, settings.apiKey);
          suggestionsEl.innerHTML = '';

          const card = document.createElement('div');
          card.className = 'de-copilot-suggestion-card';
          card.innerHTML = `
            <div class="de-copilot-card-header">
              <span>${persona.name}</span>
              <span style="font-size: 10px; opacity: 0.7;">Click to insert</span>
            </div>
            <div class="de-copilot-card-text">${commentText}</div>
            <div class="de-copilot-insert-hint">👉 Inserts directly into comment box</div>
          `;

          card.addEventListener('click', () => {
            insertTextIntoEditor(editorEl, commentText);
            if (popover.querySelector('#de-auto-like-chk')?.checked) {
              triggerPostLike(postEl);
            }
            showToast('Comment inserted!', '🚀');
            popover.remove();
            activePopover = null;
          });

          suggestionsEl.appendChild(card);
        } catch (err) {
          suggestionsEl.innerHTML = `<div style="padding: 10px; color: #FF6B6B; font-size: 12px;">⚠️ ${err.message}</div>`;
        }
      });
    });

    // Auto-load 3 suggestions initially
    loadSuggestions();
  }

  // Scan LinkedIn page for comment input boxes and inject buttons
  function scanAndInject() {
    // Select comment boxes / editors across various LinkedIn DOM templates
    const commentEditors = document.querySelectorAll(
      '.comments-comment-box__form, .comments-comment-texteditor, div.ql-editor[contenteditable="true"], .editor-content'
    );

    commentEditors.forEach((editorWrapper) => {
      // Find post container
      const postEl = editorWrapper.closest(
        '[data-urn*="activity:"], .feed-shared-update-v2, .occludable-update, div[data-id*="urn:li:activity"], .artdeco-card'
      );

      // Find actual contenteditable editor
      const editor = editorWrapper.isContentEditable 
        ? editorWrapper 
        : editorWrapper.querySelector('[contenteditable="true"]') || editorWrapper;

      // Check if already injected
      const parentContainer = editorWrapper.closest('.comments-comment-box') || editorWrapper.parentElement;
      if (!parentContainer || parentContainer.querySelector('.de-copilot-badge-container')) {
        return;
      }

      // Create Copilot Badge & Trigger Button
      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'de-copilot-badge-container';

      const triggerBtn = document.createElement('button');
      triggerBtn.type = 'button';
      triggerBtn.className = 'de-copilot-trigger-btn';
      triggerBtn.innerHTML = `
        <span class="de-sparkle">✨</span>
        <span>AI DE Reply</span>
      `;

      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        createPopover(badgeContainer, postEl, editor);
      });

      badgeContainer.appendChild(triggerBtn);

      // Insert cleanly above or inside the comment box
      if (editorWrapper.parentNode) {
        editorWrapper.parentNode.insertBefore(badgeContainer, editorWrapper);
      }
    });
  }

  // Close active popover if clicking outside
  document.addEventListener('click', (e) => {
    if (activePopover && !activePopover.contains(e.target) && !e.target.closest('.de-copilot-trigger-btn')) {
      activePopover.remove();
      activePopover = null;
    }
  });

  // Initial scan & MutationObserver for infinite scroll dynamic content
  setTimeout(scanAndInject, 1500);

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndInject, 800);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
