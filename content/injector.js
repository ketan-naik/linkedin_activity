// content/injector.js - Accurate Post Text Extraction & 1-Click Bridge

(function () {
  console.log('%c[LinkedIn DE Copilot]%c Auto-Extractor & In-Feed Trigger Ready!', 'color: #00D2FF; font-weight: bold;', 'color: #fff;');

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

  // Deep recursive extraction of post content & author
  function extractPostDetailsFromElement(el) {
    if (!el) return { author: 'Peer', text: '' };

    let postEl = el.closest('article, [data-urn*="activity:"], .feed-shared-update-v2, div[data-id*="urn:li:activity"], .occludable-update, .artdeco-card');

    if (!postEl) {
      let curr = el.parentElement;
      while (curr && curr !== document.body) {
        if (curr.querySelector('.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text')) {
          postEl = curr;
          break;
        }
        curr = curr.parentElement;
      }
    }

    if (!postEl) {
      postEl = el;
    }

    // 1. Extract Author
    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, .feed-shared-actor__title, a[href*="/in/"] span[aria-hidden="true"], .feed-shared-actor__name span, .feed-shared-actor__title'
    );
    let author = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Data Engineering Author';

    // 2. Extract Full Post Text
    let text = '';
    const textSelectors = [
      '.feed-shared-update-v2__description',
      '.feed-shared-text',
      '.update-components-text',
      '.feed-shared-inline-show-more-text',
      '.feed-shared-text-view',
      '.feed-shared-update-v2__commentary',
      '[data-ad-preview="message"]',
      '.break-words span[dir="ltr"]'
    ];

    for (const selector of textSelectors) {
      const found = postEl.querySelector(selector);
      if (found && found.innerText.trim().length > 10) {
        text = found.innerText.trim();
        break;
      }
    }

    if (!text && window.getSelection().toString().trim().length > 5) {
      text = window.getSelection().toString().trim();
    }

    return { author, text };
  }

  // Trigger Copilot from Click
  function triggerCopilotForPost(targetEl) {
    document.querySelectorAll('[data-de-active-target]').forEach(e => e.removeAttribute('data-de-active-target'));
    if (targetEl) {
      targetEl.setAttribute('data-de-active-target', 'true');
    }

    const { author, text } = extractPostDetailsFromElement(targetEl);

    chrome.storage.local.set({
      pending_post_reply: {
        postText: text || 'Distributed systems and Data Engineering best practices, Apache Spark, dbt, Iceberg, Snowflake.',
        authorName: author,
        timestamp: Date.now()
      }
    }, () => {
      chrome.runtime.sendMessage({
        type: 'TRIGGER_COPILOT_REPLY',
        postText: text,
        authorName: author
      });
      showToast('⚡ Opening Copilot with extracted post content...', '🚀');
    });
  }

  // Insert text into comment box
  function insertCommentIntoActiveBox(commentText, autoLike) {
    let targetContainer = document.querySelector('[data-de-active-target="true"]');
    let targetEditor = null;

    if (targetContainer) {
      targetEditor = targetContainer.querySelector('div.ql-editor[contenteditable="true"], [contenteditable="true"]');
      if (!targetEditor && targetContainer.isContentEditable) targetEditor = targetContainer;
    }

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

      showToast('✍️ Comment inserted into LinkedIn comment box!', '✅');
    } else {
      showToast('Comment copied to clipboard! Paste with Ctrl+V', '📋');
    }

    if (autoLike && targetContainer) {
      const postCard = targetContainer.closest('article, [data-urn*="activity:"], .feed-shared-update-v2, .artdeco-card') || targetContainer;
      const likeBtn = postCard.querySelector('button[aria-label*="React Like"], button[aria-label*="Like"], .react-button__trigger');
      if (likeBtn && !likeBtn.classList.contains('react-button--active') && likeBtn.getAttribute('aria-pressed') !== 'true') {
        likeBtn.click();
      }
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INSERT_COMMENT_TO_PAGE') {
      insertCommentIntoActiveBox(request.commentText, request.autoLike);
      sendResponse({ success: true });
    }
  });

  // Inject the button above every comment box
  function scanAndInject() {
    const commentContainers = document.querySelectorAll(
      '.comments-comment-box, .comments-comment-texteditor, .comments-comment-box__input-container, form.comments-comment-box__form, .feed-shared-update-v2__comments-container'
    );

    commentContainers.forEach((box) => {
      if (box.querySelector('.de-copilot-comment-btn') || box.parentElement?.querySelector('.de-copilot-comment-btn')) return;

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
        triggerCopilotForPost(box);
      });

      btnContainer.appendChild(replyBtn);

      if (box.parentNode) {
        box.parentNode.insertBefore(btnContainer, box);
      }
    });

    // Also add to post action bar
    const actionBars = document.querySelectorAll(
      '.feed-shared-social-actions, .social-details-social-actions, .feed-shared-social-action-bar'
    );

    actionBars.forEach((bar) => {
      if (bar.querySelector('.de-copilot-bar-btn')) return;

      const barBtn = document.createElement('button');
      barBtn.type = 'button';
      barBtn.className = 'de-copilot-bar-btn';
      barBtn.innerHTML = `<span>⚡</span> <span>AI Reply</span>`;

      barBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopilotForPost(bar);
      });

      bar.appendChild(barBtn);
    });
  }

  setInterval(scanAndInject, 1200);
  scanAndInject();

  const observer = new MutationObserver(scanAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})();
