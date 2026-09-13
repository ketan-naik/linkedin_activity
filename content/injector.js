// content/injector.js - In-Feed trigger that links directly to Side Panel Copilot

(function () {
  console.log('%c[LinkedIn DE Copilot]%c In-Feed Comment Assistant Ready!', 'color: #00D2FF; font-weight: bold;', 'color: #fff;');

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

  // Extract author and post text
  function extractPostDetails(postEl) {
    if (!postEl) return { author: 'Peer', text: '' };

    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, .feed-shared-actor__title, a[href*="/in/"] span[aria-hidden="true"]'
    );
    let author = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Data Engineering Author';

    const textEl = postEl.querySelector(
      '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text, .feed-shared-text-view, [data-ad-preview="message"], .feed-shared-update-v2__commentary'
    );
    let text = textEl ? textEl.innerText.trim() : '';

    return { author, text };
  }

  // Handle clicking "⚡ AI DE Reply" in any comment box
  function triggerCopilotForPost(postEl, editorEl) {
    // Mark this editor as the active target for 1-click insertion
    document.querySelectorAll('[data-de-active-target]').forEach(el => el.removeAttribute('data-de-active-target'));
    if (editorEl) {
      editorEl.setAttribute('data-de-active-target', 'true');
    } else if (postEl) {
      postEl.setAttribute('data-de-active-target', 'true');
    }

    const { author, text } = extractPostDetails(postEl);

    // Save to storage and send message to open sidepanel & trigger comment generation
    chrome.storage.local.set({
      pending_post_reply: {
        postText: text || 'Data Engineering best practices, distributed systems, PySpark, dbt, Lakehouse architectures.',
        authorName: author,
        timestamp: Date.now()
      }
    }, () => {
      chrome.runtime.sendMessage({
        type: 'TRIGGER_COPILOT_REPLY',
        postText: text,
        authorName: author
      });
      showToast('⚡ Opening DE Copilot Studio to generate replies...', '🚀');
    });
  }

  // Insert text into targeted editor
  function insertCommentIntoActiveBox(commentText, autoLike) {
    let targetEditor = document.querySelector('[data-de-active-target="true"] [contenteditable="true"], [contenteditable="true"][data-de-active-target="true"]');
    let targetPost = document.querySelector('[data-de-active-target="true"]');

    if (!targetEditor) {
      targetEditor = document.querySelector('div.ql-editor[contenteditable="true"], .comments-comment-box [contenteditable="true"], div[contenteditable="true"]');
    }

    if (targetEditor) {
      targetEditor.focus();
      const p = targetEditor.querySelector('p') || targetEditor;
      p.textContent = commentText;

      targetEditor.dispatchEvent(new Event('input', { bubbles: true }));
      targetEditor.dispatchEvent(new Event('change', { bubbles: true }));
      targetEditor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      targetEditor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

      showToast('✍️ Comment inserted! You can review or click Post.', '✅');
    }

    if (autoLike && targetPost) {
      const postCard = targetPost.closest('[data-urn*="activity:"], .feed-shared-update-v2, .artdeco-card') || targetPost;
      const likeBtn = postCard.querySelector('button[aria-label*="React Like"], button[aria-label*="Like"], .react-button__trigger');
      if (likeBtn && !likeBtn.classList.contains('react-button--active') && likeBtn.getAttribute('aria-pressed') !== 'true') {
        likeBtn.click();
      }
    }
  }

  // Listen for messages from sidepanel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INSERT_COMMENT_TO_PAGE') {
      insertCommentIntoActiveBox(request.commentText, request.autoLike);
      sendResponse({ success: true });
    }
  });

  // Inject the button above/inside every comment box
  function scanAndInject() {
    const commentBoxes = document.querySelectorAll(
      '.comments-comment-box, .comments-comment-texteditor, .comments-comment-box__input-container, form.comments-comment-box__form, .feed-shared-update-v2__comments-container'
    );

    commentBoxes.forEach((box) => {
      if (box.querySelector('.de-copilot-comment-btn') || box.parentElement?.querySelector('.de-copilot-comment-btn')) return;

      const postEl = box.closest(
        '[data-urn*="activity:"], .feed-shared-update-v2, .occludable-update, div[data-id*="urn:li:activity"], .artdeco-card'
      );

      const btnContainer = document.createElement('div');
      btnContainer.className = 'de-copilot-comment-btn';

      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'de-copilot-pill-btn';
      replyBtn.innerHTML = `
        <span class="de-sparkle">⚡</span>
        <span>AI DE Reply</span>
      `;

      replyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopilotForPost(postEl, box);
      });

      btnContainer.appendChild(replyBtn);

      if (box.parentNode) {
        box.parentNode.insertBefore(btnContainer, box);
      }
    });

    // Also add to post action bar (beside Comment)
    const actionBars = document.querySelectorAll(
      '.feed-shared-social-actions, .social-details-social-actions, .feed-shared-social-action-bar'
    );

    actionBars.forEach((bar) => {
      if (bar.querySelector('.de-copilot-bar-btn')) return;

      const postEl = bar.closest(
        '[data-urn*="activity:"], .feed-shared-update-v2, .occludable-update, div[data-id*="urn:li:activity"], .artdeco-card'
      );

      const barBtn = document.createElement('button');
      barBtn.type = 'button';
      barBtn.className = 'de-copilot-bar-btn';
      barBtn.innerHTML = `<span>⚡</span> <span>AI Reply</span>`;

      barBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopilotForPost(postEl, postEl);
      });

      bar.appendChild(barBtn);
    });
  }

  setInterval(scanAndInject, 1200);
  scanAndInject();

  const observer = new MutationObserver(scanAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})();
