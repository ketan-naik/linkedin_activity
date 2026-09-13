/**
 * LinkedIn DE Copilot - Content Injector & DOM Interactor
 * Multi-post smart target tracking, viewport awareness, and DOM insertion
 */

(function () {
  'use strict';

  let activeTargetElement = null;
  let activeEditorElement = null;
  let activePostId = null;

  // Helper: Toast Notification
  function showToast(message, icon = '⚡') {
    const existing = document.getElementById('de-copilot-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'de-copilot-toast';
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('de-toast-hide');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // Get post container from any element inside it
  function findPostCard(el) {
    if (!el) return null;
    return el.closest('div.feed-shared-update-v2, article, [data-urn*="activity:"], .artdeco-card, .feed-shared-update-v2__comments-container') || el;
  }

  // Set an element as the current active target
  function setActiveTarget(el) {
    if (!el) return;
    const postCard = findPostCard(el);
    
    // Clear previous highlights/targets
    document.querySelectorAll('[data-de-active-target]').forEach(e => e.removeAttribute('data-de-active-target'));
    
    if (postCard) {
      postCard.setAttribute('data-de-active-target', 'true');
      activeTargetElement = postCard;
      activePostId = postCard.getAttribute('data-urn') || postCard.getAttribute('data-id') || postCard.id;
    } else {
      el.setAttribute('data-de-active-target', 'true');
      activeTargetElement = el;
    }

    // If el is an editor, remember it
    if (el.matches && (el.matches('[contenteditable="true"]') || el.matches('.ql-editor'))) {
      activeEditorElement = el;
    } else if (postCard) {
      activeEditorElement = postCard.querySelector('div.ql-editor[contenteditable="true"], [contenteditable="true"]');
    }
  }

  // Find post closest to center of viewport
  function getPostClosestToViewportCenter() {
    const posts = Array.from(document.querySelectorAll('div.feed-shared-update-v2, article, [data-urn*="activity:"]'));
    if (posts.length === 0) return null;

    const centerY = window.innerHeight / 2;
    let closestPost = null;
    let minDistance = Infinity;

    posts.forEach(post => {
      const rect = post.getBoundingClientRect();
      // Only consider posts that are visible on screen
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const postCenterY = rect.top + (rect.height / 2);
        const dist = Math.abs(centerY - postCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          closestPost = post;
        }
      }
    });

    return closestPost || posts[0];
  }

  // Context Extractor from Element or Post Card
  function extractContextFromElement(element) {
    const postEl = findPostCard(element) || document.body;

    // Sub-comment reply context
    const commentItem = element ? element.closest('.comments-comment-item, .comments-reply-item') : null;
    let commentText = '';
    let commentAuthor = '';

    if (commentItem) {
      const cTextEl = commentItem.querySelector('.comments-comment-item__main-content, .update-components-text, .feed-shared-inline-show-more-text');
      const cAuthorEl = commentItem.querySelector('.comments-post-meta__name-text, .comments-comment-meta__description-title');
      if (cTextEl) commentText = cTextEl.innerText.trim();
      if (cAuthorEl) commentAuthor = cAuthorEl.innerText.trim().split('\n')[0];
    }

    // Author
    const authorEl = postEl.querySelector(
      '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title, span[dir="ltr"] strong'
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

    // Image / Infographic alt text
    const imgEl = postEl.querySelector('img.feed-shared-image__image, .update-components-image__image, img[alt]');
    const imgAlt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    if (imgAlt && imgAlt.length > 10 && !postText.includes(imgAlt)) {
      postText = postText ? `${postText}\n[Infographic: ${imgAlt}]` : `[Infographic: ${imgAlt}]`;
    }

    if (commentText && commentText.length > 5) {
      const fullContext = `Main Post by ${postAuthor}:\n"${postText.slice(0, 300)}..."\n\nReplying to comment by ${commentAuthor}:\n"${commentText}"`;
      return { author: commentAuthor || postAuthor, text: fullContext, isCommentReply: true, postEl };
    }

    return {
      author: postAuthor,
      text: postText || 'Data Engineering, Distributed Systems, Cloud Architectures.',
      isCommentReply: false,
      postEl
    };
  }

  // Trigger Copilot from Click on a specific post
  function triggerCopilotForPost(targetEl) {
    setActiveTarget(targetEl);
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
      showToast(`⚡ Selected post by ${author} for AI Reply!`, '🚀');
    });
  }

  // Create or attach helper banner to a comment box
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

  // Insert text into target comment box
  function insertCommentIntoActiveBox(commentText, autoLike) {
    let targetEditor = null;
    let targetContainer = document.querySelector('[data-de-active-target="true"]') || activeTargetElement;

    if (targetContainer) {
      targetEditor = targetContainer.querySelector('div.ql-editor[contenteditable="true"], [contenteditable="true"]');
      if (!targetEditor && targetContainer.isContentEditable) targetEditor = targetContainer;

      // If comment box is not open on this post, try clicking the Comment button
      if (!targetEditor) {
        const commentOpenBtn = targetContainer.querySelector('button[aria-label*="Comment"], button.comment-button, button[aria-label*="comment"]');
        if (commentOpenBtn) {
          commentOpenBtn.click();
          setTimeout(() => {
            const newlyOpenedEditor = targetContainer.querySelector('div.ql-editor[contenteditable="true"], [contenteditable="true"]');
            if (newlyOpenedEditor) {
              writeTextToEditor(newlyOpenedEditor, commentText, targetContainer, autoLike);
            }
          }, 300);
          return;
        }
      }
    }

    // Fallback: check if activeEditorElement is valid and connected
    if (!targetEditor && activeEditorElement && document.body.contains(activeEditorElement)) {
      targetEditor = activeEditorElement;
    }

    // Fallback: check post closest to viewport center
    if (!targetEditor) {
      const centerPost = getPostClosestToViewportCenter();
      if (centerPost) {
        targetContainer = centerPost;
        targetEditor = centerPost.querySelector('div.ql-editor[contenteditable="true"], [contenteditable="true"]');
      }
    }

    // Final fallback: any open comment box
    if (!targetEditor) {
      targetEditor = document.querySelector('div.ql-editor[contenteditable="true"], .comments-comment-box [contenteditable="true"], div[contenteditable="true"]');
    }

    if (targetEditor) {
      writeTextToEditor(targetEditor, commentText, targetContainer, autoLike);
    } else {
      navigator.clipboard.writeText(commentText);
      showToast('Comment copied to clipboard! Click in the comment box and press Ctrl+V', '📋');
    }
  }

  function writeTextToEditor(editor, commentText, postContainer, autoLike) {
    editor.focus();
    
    // Check if Quill editor
    const p = editor.querySelector('p');
    if (p) {
      p.textContent = commentText;
    } else {
      editor.textContent = commentText;
    }

    // Trigger input events for LinkedIn's reactive framework
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
    editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

    // Flash highlight on the editor so user clearly sees where it was inserted
    editor.style.outline = '2px solid #00D4FF';
    editor.style.boxShadow = '0 0 14px rgba(0, 212, 255, 0.6)';
    editor.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      editor.style.outline = '';
      editor.style.boxShadow = '';
    }, 2000);

    // Scroll smoothly to the editor
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('✍️ Comment inserted into this post!', '✅');

    // Auto-like if enabled
    if (autoLike && postContainer) {
      const postCard = findPostCard(postContainer);
      if (postCard) {
        const likeBtn = postCard.querySelector('button[aria-label*="React Like"], button[aria-label*="Like"], .react-button__trigger');
        if (likeBtn && !likeBtn.classList.contains('react-button--active') && likeBtn.getAttribute('aria-pressed') !== 'true') {
          likeBtn.click();
        }
      }
    }
  }

  // Listen for messages from Side Panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INSERT_COMMENT_TO_PAGE') {
      insertCommentIntoActiveBox(request.commentText, request.autoLike);
      sendResponse({ success: true });
    } else if (request.type === 'GRAB_ACTIVE_POST_CONTEXT') {
      // Pick active target or post closest to center of screen
      const target = activeTargetElement || getPostClosestToViewportCenter();
      if (target) {
        setActiveTarget(target);
        const context = extractContextFromElement(target);
        sendResponse({ success: true, text: context.text, author: context.author });
      } else {
        sendResponse({ success: false, error: 'No post found in view' });
      }
    }
    return true;
  });

  // Track active target whenever user clicks or focuses ANY element in LinkedIn feed
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target && (target.matches('[contenteditable="true"], .ql-editor, [data-placeholder*="comment"]') || target.closest('.comments-comment-box'))) {
      const box = target.closest('.comments-comment-box') || target.parentElement;
      setActiveTarget(target);
      attachHelperToCommentBox(box);
    }
  }, true);

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;

    // If clicking on any post or comment box, update active target
    const postCard = target.closest('div.feed-shared-update-v2, article, [data-urn*="activity:"], .comments-comment-box');
    if (postCard) {
      setActiveTarget(postCard);
    }

    if (target.closest('.comments-comment-box, .comments-comment-texteditor, form.comments-comment-box__form')) {
      const box = target.closest('.comments-comment-box') || target.parentElement;
      attachHelperToCommentBox(box);
    }
  }, true);

  // Continuous Scan for adding UI helper buttons
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
