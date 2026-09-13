// content/injector.js - Robust Multi-Anchor LinkedIn DE Copilot Injector

(function () {
  console.log('%c[LinkedIn DE Copilot]%c Content script loaded & monitoring feed!', 'color: #00D2FF; font-weight: bold;', 'color: #fff;');

  let activePopover = null;

  // Helper: Show toast notification
  function showToast(message, icon = '✨') {
    const existing = document.querySelector('.de-copilot-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'de-copilot-toast';
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Helper: Extract text and author from post container
  function extractPostDetails(postEl) {
    if (!postEl) return { author: 'Peer', text: '' };

    // Author
    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, .feed-shared-actor__title, .actor-name, a[href*="/in/"] span[aria-hidden="true"], .feed-shared-actor__container-link'
    );
    let author = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Data Engineering Author';

    // Post content text
    const textEl = postEl.querySelector(
      '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text, .feed-shared-text-view, [data-ad-preview="message"], .feed-shared-update-v2__commentary'
    );
    let text = textEl ? textEl.innerText.trim() : '';

    return { author, text };
  }

  // Helper: Find or expand comment box for a post
  function getOrOpenCommentBox(postEl) {
    if (!postEl) return null;

    let editor = postEl.querySelector(
      'div.ql-editor[contenteditable="true"], .comments-comment-box [contenteditable="true"], div[contenteditable="true"], .comments-comment-box-comment__text-editor [contenteditable="true"]'
    );

    if (editor) return editor;

    // If collapsed, trigger comment button
    const commentBtn = postEl.querySelector(
      'button[aria-label*="Comment"], button[aria-label*="comment"], .comment-button, button.artdeco-button--tertiary.social-actions-button'
    );
    if (commentBtn) {
      commentBtn.click();
    }

    return postEl.querySelector('div[contenteditable="true"], .comments-comment-box [contenteditable="true"]');
  }

  // Helper: Insert text into LinkedIn editor
  function insertTextIntoEditor(editorEl, textToInsert) {
    if (!editorEl) return false;

    editorEl.focus();

    const pTag = editorEl.querySelector('p') || editorEl;
    pTag.textContent = textToInsert;

    editorEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    editorEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    editorEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ', code: 'Space' }));
    editorEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ', code: 'Space' }));

    return true;
  }

  // Helper: Auto-like the post
  function triggerPostLike(postEl) {
    if (!postEl) return;
    const likeBtn = postEl.querySelector(
      'button.react-button__trigger, button[aria-label*="React Like"], button[aria-label*="Like"], button[aria-label*="like"], .reactions-react-button button'
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
  async function openCopilotPopover(anchorEl, postEl) {
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
          <span>⚡</span> DE Copilot Reply
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
          <span>Analyzing architecture & generating high-impact comments...</span>
        </div>
      </div>

      <div class="de-copilot-popover-footer">
        <label class="de-copilot-checkbox-label">
          <input type="checkbox" id="de-auto-like-chk" ${settings.autoLike ? 'checked' : ''}>
          <span>Auto-like post on insert</span>
        </label>
        <span style="font-size: 11px; color: #00D2FF; cursor: pointer; font-weight: 600;" id="de-open-studio-btn">Open Studio ↗</span>
      </div>
    `;

    anchorEl.style.position = 'relative';
    anchorEl.appendChild(popover);
    activePopover = popover;

    popover.querySelector('.de-copilot-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      popover.remove();
      activePopover = null;
    });

    popover.querySelector('#de-open-studio-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      }
    });

    if (!settings.apiKey) {
      const suggestionsEl = popover.querySelector('.de-copilot-suggestions');
      suggestionsEl.innerHTML = `
        <div style="padding: 14px; text-align: center; color: #FFAA44; line-height: 1.5; font-size: 12px;">
          <strong>Gemini API Key Required</strong><br>
          Click the extension icon in your toolbar to save your free Gemini API key in Settings.
        </div>
      `;
      return;
    }

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
              <span style="font-size: 10px; opacity: 0.8; color: #00D2FF;">Click to insert</span>
            </div>
            <div class="de-copilot-card-text">${item.comment}</div>
            <div class="de-copilot-insert-hint">👉 Inserts directly into comment box</div>
          `;

          card.addEventListener('click', (e) => {
            e.stopPropagation();
            let editor = getOrOpenCommentBox(postEl);
            if (!editor) {
              setTimeout(() => {
                editor = getOrOpenCommentBox(postEl);
                if (editor) insertTextIntoEditor(editor, item.comment);
              }, 300);
            } else {
              insertTextIntoEditor(editor, item.comment);
            }

            if (popover.querySelector('#de-auto-like-chk')?.checked) {
              triggerPostLike(postEl);
            }

            showToast('Comment inserted! You can make edits or hit Post.', '🚀');
            popover.remove();
            activePopover = null;
          });

          suggestionsEl.appendChild(card);
        });
      } catch (err) {
        suggestionsEl.innerHTML = `
          <div style="padding: 12px; color: #FF6B6B; font-size: 12px; line-height: 1.4;">
            ⚠️ <strong>Error:</strong> ${err.message || 'Failed to generate comments. Check your API key in settings.'}
          </div>
        `;
      }
    }

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
              <span style="font-size: 10px; opacity: 0.8; color: #00D2FF;">Click to insert</span>
            </div>
            <div class="de-copilot-card-text">${commentText}</div>
            <div class="de-copilot-insert-hint">👉 Inserts directly into comment box</div>
          `;

          card.addEventListener('click', () => {
            let editor = getOrOpenCommentBox(postEl);
            if (!editor) {
              setTimeout(() => {
                editor = getOrOpenCommentBox(postEl);
                if (editor) insertTextIntoEditor(editor, commentText);
              }, 300);
            } else {
              insertTextIntoEditor(editor, commentText);
            }

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

    loadSuggestions();
  }

  // Scan LinkedIn DOM and inject buttons
  function scanAndInject() {
    // Select all posts
    const postCards = document.querySelectorAll(
      '[data-urn*="activity:"], .feed-shared-update-v2, .occludable-update, div[data-id*="urn:li:activity"], .artdeco-card'
    );

    postCards.forEach((postEl) => {
      // 1. Post Action Row (Like, Comment, Repost, Send)
      const actionRow = postEl.querySelector(
        '.feed-shared-social-actions, .social-details-social-actions, .feed-shared-social-action-bar, .social-actions-bar'
      );

      if (actionRow && !actionRow.querySelector('.de-copilot-action-bar-btn-wrapper')) {
        const btnWrapper = document.createElement('span');
        btnWrapper.className = 'de-copilot-action-bar-btn-wrapper';

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'de-copilot-action-bar-btn';
        actionBtn.innerHTML = `
          <span class="de-sparkle-icon">⚡</span>
          <span>AI DE Reply</span>
        `;

        actionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCopilotPopover(btnWrapper, postEl);
        });

        btnWrapper.appendChild(actionBtn);

        // Place right after Comment button or prepend
        const commentBtn = actionRow.querySelector('button[aria-label*="Comment"], .comment-button');
        if (commentBtn && commentBtn.parentElement && commentBtn.parentElement !== actionRow) {
          commentBtn.parentElement.after(btnWrapper);
        } else {
          actionRow.appendChild(btnWrapper);
        }
      }

      // 2. Comment Input Row ("Add a comment..." pill)
      const commentBoxes = postEl.querySelectorAll(
        '.comments-comment-box, .comments-comment-texteditor, .comments-comment-box__input-container, form.comments-comment-box__form, .feed-shared-update-v2__comments-container'
      );

      commentBoxes.forEach((box) => {
        if (box.querySelector('.de-copilot-comment-inline-btn') || box.parentElement?.querySelector('.de-copilot-comment-inline-btn')) return;

        const inlineContainer = document.createElement('div');
        inlineContainer.className = 'de-copilot-comment-inline-btn';

        const inlineBtn = document.createElement('button');
        inlineBtn.type = 'button';
        inlineBtn.className = 'de-copilot-trigger-btn';
        inlineBtn.innerHTML = `
          <span class="de-sparkle">✨</span>
          <span>AI DE Reply</span>
        `;

        inlineBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCopilotPopover(inlineContainer, postEl);
        });

        inlineContainer.appendChild(inlineBtn);

        if (box.parentNode) {
          box.parentNode.insertBefore(inlineContainer, box);
        }
      });
    });
  }

  // Interactive Focus/Click Listener on any comment editor
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target && (target.matches('[contenteditable="true"], .ql-editor, [data-placeholder*="comment"]') || target.closest('.comments-comment-box'))) {
      const postEl = target.closest('[data-urn*="activity:"], .feed-shared-update-v2, .artdeco-card');
      const container = target.closest('.comments-comment-box') || target.parentElement;
      if (container && !container.querySelector('.de-copilot-trigger-btn') && !container.parentElement?.querySelector('.de-copilot-trigger-btn')) {
        const floatBtn = document.createElement('div');
        floatBtn.className = 'de-copilot-comment-inline-btn';
        floatBtn.innerHTML = `<button type="button" class="de-copilot-trigger-btn"><span class="de-sparkle">✨</span> <span>AI DE Reply</span></button>`;
        floatBtn.querySelector('button').addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openCopilotPopover(floatBtn, postEl);
        });
        container.parentNode.insertBefore(floatBtn, container);
      }
    }
  });

  // Close active popover when clicking outside
  document.addEventListener('click', (e) => {
    if (activePopover && !activePopover.contains(e.target) && !e.target.closest('.de-copilot-action-bar-btn') && !e.target.closest('.de-copilot-trigger-btn')) {
      activePopover.remove();
      activePopover = null;
    }
  });

  // Continuous injection scans
  setInterval(scanAndInject, 1200);
  scanAndInject();

  const observer = new MutationObserver(scanAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})();
