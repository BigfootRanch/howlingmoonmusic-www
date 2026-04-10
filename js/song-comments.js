(function () {
  'use strict';

  var commentsEl = document.getElementById('campfireComments');
  if (!commentsEl) return;

  var form = document.getElementById('campfireForm');
  var DEFAULT_API = '/api/public/song-comments';
  var apiUrl = (typeof COMMENTS_API === 'string' && COMMENTS_API) || DEFAULT_API;
  var songSlug =
    (typeof SONG_SLUG === 'string' && SONG_SLUG) ||
    location.pathname.split('/').pop().replace('.html', '');
  var usesPublicIntake = /\/functions\/v1\/public-intake(?:$|\?)/.test(apiUrl);

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMessage(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  function getStorageValue(storage, key) {
    try {
      return storage.getItem(key) || null;
    } catch (error) {
      return null;
    }
  }

  function setStorageValue(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (error) {}
  }

  function getSessionId() {
    var existing = getStorageValue(sessionStorage, 'hm_session');
    if (existing) return existing;
    var next = 'ses_' + Math.random().toString(36).slice(2, 14) + '_' + Date.now();
    setStorageValue(sessionStorage, 'hm_session', next);
    return next;
  }

  function getFingerprint() {
    return getStorageValue(localStorage, 'hm_fp') || getStorageValue(sessionStorage, 'hm_fp');
  }

  function ensureTrackingScriptLoaded() {
    if (getFingerprint()) return;
    if (document.querySelector('script[src="/js/hm-track.js"]')) return;
    var script = document.createElement('script');
    script.src = '/js/hm-track.js';
    script.defer = true;
    script.setAttribute('data-hm-track-loader', '1');
    document.head.appendChild(script);
  }

  function buildReadUrl() {
    if (!usesPublicIntake) {
      return apiUrl + '?song_slug=' + encodeURIComponent(songSlug);
    }
    var separator = apiUrl.indexOf('?') === -1 ? '?' : '&';
    return apiUrl + separator + 'kind=song_comments&song_slug=' + encodeURIComponent(songSlug);
  }

  function clearEmptyState() {
    var empty = commentsEl.querySelector('.campfire-empty');
    if (empty) {
      commentsEl.innerHTML = '';
    }
  }

  function appendComment(comment, pending) {
    var author = comment.author_name || comment.display_name || 'Campfire Voice';
    var message = comment.message || comment.content || '';
    var timestamp = pending
      ? 'Waiting for approval'
      : new Date(comment.created_at || Date.now()).toLocaleDateString();
    var node = document.createElement('div');
    node.className = pending ? 'campfire-comment campfire-pending' : 'campfire-comment';
    node.innerHTML =
      '<strong class="campfire-author">' +
      escapeHtml(author) +
      '</strong><p>' +
      formatMessage(message) +
      '</p><span class="campfire-time">' +
      escapeHtml(timestamp) +
      '</span>';
    commentsEl.insertBefore(node, commentsEl.firstChild || null);
  }

  function normalizeComments(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.comments)) return payload.comments;
    return [];
  }

  function renderComments(comments) {
    if (!comments.length) return;
    commentsEl.innerHTML = '';
    comments.forEach(function (comment) {
      appendComment(comment, false);
    });
  }

  function loadComments() {
    fetch(buildReadUrl(), { headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to load comments');
        }
        return response.json();
      })
      .then(function (payload) {
        renderComments(normalizeComments(payload));
      })
      .catch(function () {});
  }

  function submitComment(event) {
    if (event) event.preventDefault();
    var nameField = document.getElementById('campfireName');
    var messageField = document.getElementById('campfireMsg');
    var name = String(nameField && nameField.value || '').trim().slice(0, 50);
    var message = String(messageField && messageField.value || '').trim().slice(0, 500);
    if (!name || !message) return false;

    ensureTrackingScriptLoaded();

    var payload = {
      song_slug: songSlug,
      author_name: name,
      message: message,
      fingerprint: getFingerprint(),
      session_id: getSessionId(),
      page_url: location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
      event_source: 'song_page_comment'
    };
    if (usesPublicIntake) {
      payload.kind = 'song_comment';
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Unable to submit comment');
        }
        return response.json().catch(function () { return { ok: true }; });
      })
      .then(function () {
        if (messageField) messageField.value = '';
        clearEmptyState();
        appendComment({ author_name: name, message: message }, true);
      })
      .catch(function () {});

    return false;
  }

  window.submitComment = submitComment;
  if (form) {
    form.onsubmit = submitComment;
  }
  loadComments();
})();
