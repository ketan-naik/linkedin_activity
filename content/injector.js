// content/injector.js - Instant AI Reply Trigger for LinkedIn Comment Boxes

(function () {
  console.log('%c[LinkedIn DE Copilot]%c Interactive Comment Box Assistant Ready!', 'color: #00D2FF; font-weight: bold;', 'color: #fff;');

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

  // Deep recursive extraction of Post + Sub-comment context
  function extractContextFromElement(el) {
    if (!el) return { author: 'Peer', text: '', isCommentReply: false };

    // Check if clicked inside a specific comment thread
    const commentItem = el.closest('.comments-comment-item, .comments-reply-item, article.comments-comment-item, .comments-comment-item-content-body');
    let commentAuthor = '';
    let commentText = '';

    if (commentItem) {
      const cAuthorEl = commentItem.querySelector('.comments-comment-meta__description-title, .comments-post-meta__name, a[href*="/in/"] span[aria-hidden="true"], .comments-comment-item__main-content a');
      commentAuthor = cAuthorEl ? cAuthorEl.innerText.trim().split('\n')[0] : 'Peer';

      const cTextEl = commentItem.querySelector('.comments-comment-item__main-content, .comments-comment-item-content-body, .feed-shared-inline-show-more-text, span.dir-ltr');
      commentText = cTextEl ? cTextEl.innerText.trim() : '';
    }

    // Find enclosing Main Post Card
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

    if (!postEl) postEl = el;

    // Post Author
    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, .feed-shared-actor__title, a[href*="/in/"] span[aria-hidden="true"], .feed-shared-actor__name span, .feed-shared-actor__title'
    );
    let postAuthor = authorEl ? authorEl.innerText.trim().split('\n')[0] : 'Data Engineering Author';

    // Post Text
    let postText = '';
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
        postText = found.innerText.trim();
        break;
      }
    }

    // Image alt
    const imgEl = postEl.querySelector('img.feed-shared-image__image, .update-components-image__image, img[alt]');
    const imgAlt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    if (imgAlt && imgAlt.length > 10 && !postText.includes(imgAlt)) {
      postText = postText ? `${postText}\n[Infographic: ${imgAlt}]` : `[Infographic: ${imgAlt}]`;
    }

    if (commentText && commentText.length > 5) {
      const fullContext = `Main Post by ${postAuthor}:\n"${postText.slice(0, 300)}..."\n\nReplying to comment by ${commentAuthor}:\n"${commentText}"`;
      return { author: commentAuthor, text: fullContext, isCommentReply: true };
    }

    return {
      author: postAuthor,
      text: postText || 'Data Engineering, Distributed Systems, Cloud Architectures.',
      isCommentReply: false
    };
  }

  // Trigger Copilot from Click
  function triggerCopilotForPost(targetEl) {
    document.querySelectorAll('[data-de-active-target]').forEach(e => e.removeAttribute('data-de-active-target'));
    if (targetEl) {
      targetEl.setAttribute('data-de-active-target', 'true');
    }

    const { author, text, isCommentReply } = extractContextFromElement(targetEl);

    chrome.storage.local.set({
      pending_post_reply: {
        postText: text,
        authorName: author,
        isCommentReply: isCommentReply,
        timestamp: Date.now()
      }
    }, () => {
      chrome.runtime.sendMessage({
        type: 'TRIGGER_COPILOT_REPLY',
        postText: text,
        authorName: author
      });
      showToast(`⚡ Opening Copilot to generate reply for ${author}...`, '🚀');
    });
  }

  // Create or attach the helper banner to a comment box
  function attachHelperToCommentBox(commentBox) {
    if (!commentBox) return;
    if (commentBox.querySelector('.de-copilot-comment-banner') || commentBox.parentElement?.querySelector('.de-copilot-comment-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'de-copilot-comment-banner';
    banner.innerHTML = `
      <button type="button" class="de-copilot-banner-btn">
        <span class="de-sparkle-icon">✨</span>
        <span class="de-btn-main-text">Generate AI Reply for this post</span>
        <span class="de-badge-tag">DE Copilot ⚡</span>
      </button>
    `;

    banner.querySelector('button').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerCopilotForPost(commentBox);
    });

    if (commentBox.parentNode) {
      commentBox.parentNode.insertBefore(banner, commentBox);
    }
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

  // Focus and Click listener on any comment input box
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target && (target.matches('[contenteditable="true"], .ql-editor, [data-placeholder*="comment"]') || target.closest('.comments-comment-box'))) {
      const box = target.closest('.comments-comment-box') || target.parentElement;
      attachHelperToCommentBox(box);
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest('.comments-comment-box, .comments-comment-texteditor, form.comments-comment-box__form')) {
      const box = target.closest('.comments-comment-box') || target.parentElement;
      attachHelperToCommentBox(box);
    }
  });

  // Continuous Scan
  function scanAndInject() {
    // 1. Comment boxes
    const commentBoxes = document.querySelectorAll(
      '.comments-comment-box, .comments-comment-texteditor, .comments-comment-box__input-container, form.comments-comment-box__form, .feed-shared-update-v2__comments-container'
    );
    commentBoxes.forEach(attachHelperToCommentBox);

    // 2. Individual comment reply links
    const commentItems = document.querySelectorAll('.comments-comment-item, .comments-reply-item');
    commentItems.forEach((cItem) => {
      if (cItem.querySelector('.de-copilot-thread-reply-btn')) return;

      const actionsRow = cItem.querySelector('.comments-comment-social-bar, .comments-comment-actions, .comments-comment-item__actions');
      if (actionsRow) {
        const threadBtn = document.createElement('button');
        threadBtn.type = 'button';
        threadBtn.className = 'de-copilot-thread-reply-btn';
        threadBtn.innerHTML = `⚡ AI Reply`;

        threadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerCopilotForPost(cItem);
        });

        actionsRow.appendChild(threadBtn);
      }
    });

    // 3. Post action bars
    const actionBars = document.querySelectorAll(
      '.feed-shared-social-actions, .social-details-social-actions, .feed-shared-social-action-bar'
    );
    actionBars.forEach((bar) => {
      if (bar.querySelector('.de-copilot-action-bar-btn')) return;

      const barBtn = document.createElement('button');
      barBtn.type = 'button';
      barBtn.className = 'de-copilot-action-bar-btn';
      barBtn.innerHTML = `<span>⚡</span> <span>AI Reply</span>`;

      barBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopilotForPost(bar);
      });

      bar.appendChild(barBtn);
    });
  }

  setInterval(scanAndInject, 1000);
  scanAndInject();

  const observer = new MutationObserver(scanAndInject);
  observer.observe(document.body, { childList: true, subtree: true });
})();
