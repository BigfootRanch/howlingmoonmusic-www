/* Howling Moon Music — Fan Interaction Zone
   Reactions, comments, profiles on song pages.
   Talks to fan-auth Edge Function + Supabase REST. */
(function(){
  var SB = 'https://pxcxtnabyydhbfbholvh.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3h0bmFieXlkaGJmYmhvbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzAxNTQsImV4cCI6MjA4OTQ0NjE1NH0.4FUt6aghawOpAHM87DVhz-ZDZNj4w-b2n64ZphVyu78';
  var EDGE = SB + '/functions/v1/fan-auth';
  var REST = SB + '/rest/v1';

  // State
  var fan = null; // { fan_id, display_name, token }
  var slug = '';
  var reactions = {}; // { heart: 5, fire: 2, ... }
  var myReactions = {}; // { heart: true, ... }
  var comments = [];

  // --- Utilities ---
  function $(id){ return document.getElementById(id); }
  function mk(tag, attrs){
    var el = document.createElement(tag);
    if(attrs){
      if(attrs.cls) el.className = attrs.cls;
      if(attrs.text) el.textContent = attrs.text;
      if(attrs.id) el.id = attrs.id;
      if(attrs.type) el.type = attrs.type;
      if(attrs.placeholder) el.placeholder = attrs.placeholder;
      if(attrs.onclick) el.onclick = attrs.onclick;
      if(attrs.style) el.style.cssText = attrs.style;
    }
    return el;
  }

  function getSlug(){
    var p = location.pathname;
    var m = p.match(/songs\/([^.\/]+)/);
    return m ? m[1] : '';
  }

  function timeAgo(d){
    var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if(s < 60) return 'just now';
    if(s < 3600) return Math.floor(s/60) + 'm ago';
    if(s < 86400) return Math.floor(s/3600) + 'h ago';
    if(s < 604800) return Math.floor(s/86400) + 'd ago';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function initials(name){
    if(!name) return '?';
    var parts = name.trim().split(/\s+/);
    if(parts.length === 1) return parts[0][0];
    return parts[0][0] + parts[parts.length-1][0];
  }

  function fingerprint(){
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('HM_FAN', 2, 2);
    var raw = [c.toDataURL(), navigator.userAgent, screen.width+'x'+screen.height, navigator.language].join('|');
    var h = 0;
    for(var i = 0; i < raw.length; i++){ var ch = raw.charCodeAt(i); h = ((h<<5)-h)+ch; h = h&h; }
    return 'fp_' + Math.abs(h).toString(36);
  }

  // --- API calls ---
  function sbGet(path){
    return fetch(REST + '/' + path, {
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
    }).then(function(r){ return r.json(); });
  }

  function edgeCall(data){
    return fetch(EDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify(data)
    }).then(function(r){ return r.json(); });
  }

  // --- Session ---
  function loadSession(){
    try {
      var s = localStorage.getItem('hm_fan');
      if(s){
        fan = JSON.parse(s);
        edgeCall({ action: 'verify', token: fan.token }).then(function(res){
          if(res.error){ fan = null; localStorage.removeItem('hm_fan'); renderComposer(); }
        });
      }
    } catch(e){ fan = null; }
  }

  function saveSession(data){
    fan = data;
    localStorage.setItem('hm_fan', JSON.stringify(data));
  }

  function signOut(){
    fan = null;
    localStorage.removeItem('hm_fan');
    myReactions = {};
    renderComposer();
    renderReactions();
  }

  // --- Load Data ---
  function loadReactions(){
    sbGet('song_reactions?song_slug=eq.' + encodeURIComponent(slug) + '&select=reaction_type,fan_id').then(function(data){
      reactions = {};
      myReactions = {};
      var types = ['heart','fire','howl','star','clap'];
      types.forEach(function(t){ reactions[t] = 0; });
      if(Array.isArray(data)){
        data.forEach(function(r){
          reactions[r.reaction_type] = (reactions[r.reaction_type] || 0) + 1;
          if(fan && r.fan_id === fan.fan_id) myReactions[r.reaction_type] = true;
        });
      }
      renderReactions();
    });
  }

  function loadComments(){
    sbGet('song_comments?song_slug=eq.' + encodeURIComponent(slug) + '&is_approved=eq.true&is_flagged=eq.false&order=created_at.desc&select=id,content,created_at,parent_id,likes_count,fan_id,fan_profiles(display_name,avatar_url)').then(function(data){
      comments = Array.isArray(data) ? data : [];
      renderComments();
    });
  }

  // --- React ---
  function toggleReaction(type){
    if(!fan){ showSignIn(); return; }
    edgeCall({ action: 'react', token: fan.token, song_slug: slug, reaction_type: type }).then(function(res){
      if(res.error){ if(res.error === 'Invalid session'){ signOut(); showSignIn(); } return; }
      if(res.action === 'added'){
        myReactions[type] = true;
        reactions[type] = (reactions[type] || 0) + 1;
      } else {
        delete myReactions[type];
        reactions[type] = Math.max(0, (reactions[type] || 0) - 1);
      }
      renderReactions();
    });
  }

  // --- Comment ---
  function postComment(content, parentId){
    if(!fan){ showSignIn(); return Promise.resolve(); }
    return edgeCall({ action: 'comment', token: fan.token, song_slug: slug, content: content, parent_id: parentId || null }).then(function(res){
      if(res.error){ if(res.error === 'Invalid session'){ signOut(); showSignIn(); } return; }
      if(res.comment){
        res.comment.fan_profiles = { display_name: fan.display_name, avatar_url: null };
        comments.unshift(res.comment);
        renderComments();
      }
      if(res.flagged){
        var note = mk('div', { cls: 'no-comments', text: 'Your comment is being reviewed. Thanks for your patience.' });
        var list = $('fanCommentList');
        if(list && list.firstChild) list.insertBefore(note, list.firstChild);
        else if(list) list.appendChild(note);
      }
    });
  }

  // --- Sign In Modal ---
  function showSignIn(){
    if(document.querySelector('.fan-modal-overlay')) return;
    var overlay = mk('div', { cls: 'fan-modal-overlay' });
    var modal = mk('div', { cls: 'fan-modal' });

    var close = mk('button', { cls: 'fan-modal__close', text: '\u00D7' });
    close.onclick = function(){ overlay.remove(); };
    modal.appendChild(close);

        modal.appendChild(mk('div', { cls: 'fan-modal__title', text: 'Pull Up a Chair' }));
    modal.appendChild(mk('div', { cls: 'fan-modal__sub', text: 'Tell us who you are. Every voice matters around this fire.' }));

    var errDiv = mk('div', { cls: 'fan-modal__error', id: 'fanModalErr' });
    modal.appendChild(errDiv);

    var lbl1 = mk('label', { text: 'Your Name' });
    modal.appendChild(lbl1);
    var nameInput = mk('input', { type: 'text', placeholder: 'How should we call you?' });
    nameInput.id = 'fanNameInput';
    nameInput.maxLength = 50;
    modal.appendChild(nameInput);

    var lbl2 = mk('label', { text: 'Email' });
    modal.appendChild(lbl2);
    var emailInput = mk('input', { type: 'email', placeholder: 'your@email.com' });
    emailInput.id = 'fanEmailInput';
    modal.appendChild(emailInput);

    var note = mk('div', { style: 'font-size:0.72rem;color:rgba(255,255,255,.25);margin-bottom:1.2rem;', text: 'Email kept private. Used only to remember you.' });
    modal.appendChild(note);

    var submitBtn = mk('button', { cls: 'fan-modal__submit', text: 'Pull Up a Chair' });
    submitBtn.id = 'fanSubmitBtn';
    submitBtn.onclick = function(){
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      if(!name || !email){ errDiv.textContent = 'Both fields required.'; errDiv.style.display = 'block'; return; }
      if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ errDiv.textContent = 'Enter a valid email.'; errDiv.style.display = 'block'; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';
      edgeCall({ action: 'register', display_name: name, email: email, fingerprint: fingerprint() }).then(function(res){
        if(res.error){ errDiv.textContent = res.error; errDiv.style.display = 'block'; submitBtn.disabled = false; submitBtn.textContent = 'Pull Up a Chair'; return; }
        saveSession({ fan_id: res.fan_id, display_name: res.display_name, token: res.token });
        overlay.remove();
        renderComposer();
        renderReactions();
        loadReactions();
      }).catch(function(){ submitBtn.disabled = false; submitBtn.textContent = 'Pull Up a Chair'; });
    };
    modal.appendChild(submitBtn);

    overlay.appendChild(modal);
    overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    setTimeout(function(){ nameInput.focus(); }, 100);
  }

  // --- Render ---
  var REACTION_MAP = {
    heart: { emoji: '\u2764\uFE0F', label: 'Love' },
    fire:  { emoji: '\uD83D\uDD25', label: 'Fire' },
    howl:  { emoji: '\uD83C\uDF19', label: 'Howl' },
    star:  { emoji: '\u2B50', label: 'Star' },
    clap:  { emoji: '\uD83D\uDC4F', label: 'Clap' }
  };

  function renderReactions(){
    var bar = $('fanReactionBar');
    if(!bar) return;
    while(bar.firstChild) bar.removeChild(bar.firstChild);
    ['heart','fire','howl','star','clap'].forEach(function(type){
      var r = REACTION_MAP[type];
      var btn = mk('button', { cls: 'reaction-btn r-' + type + (myReactions[type] ? ' active' : '') });
      btn.appendChild(mk('span', { cls: 'reaction-emoji', text: r.emoji }));
      var count = reactions[type] || 0;
      if(count > 0) btn.appendChild(mk('span', { cls: 'reaction-count', text: String(count) }));
      btn.title = r.label;
      btn.onclick = function(){ toggleReaction(type); };
      bar.appendChild(btn);
    });
  }

  function renderComposer(){
    var zone = $('fanComposerArea');
    if(!zone) return;
    while(zone.firstChild) zone.removeChild(zone.firstChild);

    if(!fan){
      var prompt = mk('div', { cls: 'fan-signin-prompt' });
      prompt.appendChild(mk('p', { text: 'Got something to say about this song?' }));
      var btn = mk('button', { cls: 'fan-signin-btn', text: 'Sign in to join the conversation' });
      btn.onclick = showSignIn;
      prompt.appendChild(btn);
      zone.appendChild(prompt);
      return;
    }

    // Logged in badge
    var badge = mk('div', { cls: 'fan-badge' });
    badge.appendChild(mk('span', { text: '\uD83D\uDC3E ' + fan.display_name }));
    var signoutBtn = mk('span', { cls: 'fan-badge__signout', text: '(sign out)' });
    signoutBtn.onclick = signOut;
    badge.appendChild(signoutBtn);
    zone.appendChild(badge);

    // Composer
    var composer = mk('div', { cls: 'comment-composer' });
    var avatar = mk('div', { cls: 'composer-avatar', text: initials(fan.display_name) });
    composer.appendChild(avatar);
    var wrap = mk('div', { cls: 'composer-input-wrap' });
    var input = mk('textarea', { cls: 'composer-input', placeholder: 'Share your thoughts on this song...' });
    input.id = 'fanCommentInput';
    input.rows = 1;
    input.maxLength = 2000;
    wrap.appendChild(input);

    var actions = mk('div', { cls: 'composer-actions', id: 'composerActions' });
    var cancelBtn = mk('button', { cls: 'composer-btn composer-btn--cancel', text: 'Cancel' });
    cancelBtn.onclick = function(){ input.value = ''; input.blur(); actions.classList.remove('show'); };
    actions.appendChild(cancelBtn);
    var postBtn = mk('button', { cls: 'composer-btn composer-btn--post', text: 'Post' });
    postBtn.id = 'fanPostBtn';
    postBtn.onclick = function(){
      var content = input.value.trim();
      if(!content) return;
      postBtn.disabled = true;
      postBtn.textContent = 'Posting...';
      postComment(content).then(function(){
        input.value = '';
        postBtn.disabled = false;
        postBtn.textContent = 'Post';
        actions.classList.remove('show');
      });
    };
    actions.appendChild(postBtn);
    wrap.appendChild(actions);
    composer.appendChild(wrap);
    zone.appendChild(composer);

    input.addEventListener('focus', function(){ actions.classList.add('show'); });
  }

  function renderComments(){
    var list = $('fanCommentList');
    var countEl = $('fanCommentCount');
    if(!list) return;

    var topLevel = comments.filter(function(c){ return !c.parent_id; });
    var replies = comments.filter(function(c){ return c.parent_id; });

    if(countEl) countEl.textContent = comments.length + (comments.length === 1 ? ' comment' : ' comments');

    while(list.firstChild) list.removeChild(list.firstChild);
    if(topLevel.length === 0){
      list.appendChild(mk('div', { cls: 'no-comments', text: 'Be the first to share your thoughts.' }));
      return;
    }

    topLevel.forEach(function(c){
      list.appendChild(renderOneComment(c, replies));
    });
  }

  function renderOneComment(c, allReplies){
    var item = mk('div', { cls: 'comment-item' });
    var displayName = c.fan_profiles ? c.fan_profiles.display_name : 'Fan';
    var isDogmother = displayName.toLowerCase().indexOf('valentina') > -1 || displayName.toLowerCase().indexOf('dogmother') > -1;

    var avatar = mk('div', { cls: 'comment-avatar', text: initials(displayName) });
    item.appendChild(avatar);

    var body = mk('div', { cls: 'comment-body' });
    var meta = mk('div', { cls: 'comment-meta' });
    var author = mk('span', { cls: 'comment-author' + (isDogmother ? ' is-dogmother' : ''), text: displayName });
    meta.appendChild(author);
    meta.appendChild(mk('span', { cls: 'comment-time', text: timeAgo(c.created_at) }));
    body.appendChild(meta);
    body.appendChild(mk('div', { cls: 'comment-text', text: c.content }));

    // Actions
    var actions = mk('div', { cls: 'comment-actions' });

    // Like button — using text content only, no innerHTML
    var currentLikes = c.likes_count || 0;
    var isLiked = false;
    var likeBtn = mk('button', { cls: 'comment-action-btn', text: '\u2661 ' + (currentLikes > 0 ? currentLikes : '') });
    likeBtn.onclick = function(){
      if(!fan){ showSignIn(); return; }
      isLiked = !isLiked;
      if(isLiked){
        likeBtn.classList.add('liked');
        likeBtn.textContent = '\u2665 ' + (currentLikes + 1);
      } else {
        likeBtn.classList.remove('liked');
        likeBtn.textContent = '\u2661 ' + (currentLikes > 0 ? currentLikes : '');
      }
    };
    actions.appendChild(likeBtn);

    var replyBtn = mk('button', { cls: 'comment-action-btn', text: 'Reply' });
    replyBtn.onclick = function(){
      if(!fan){ showSignIn(); return; }
      var existing = body.querySelector('.comment-composer');
      if(existing){ existing.remove(); return; }
      var miniComposer = mk('div', { cls: 'comment-composer', style: 'margin-top:0.5rem;' });
      var miniAvatar = mk('div', { cls: 'composer-avatar', text: initials(fan.display_name), style: 'width:28px;height:28px;font-size:0.65rem;' });
      miniComposer.appendChild(miniAvatar);
      var miniWrap = mk('div', { cls: 'composer-input-wrap' });
      var miniInput = mk('textarea', { cls: 'composer-input', placeholder: 'Reply to ' + displayName + '...' });
      miniInput.rows = 1;
      miniInput.style.minHeight = '36px';
      miniInput.style.fontSize = '0.85rem';
      miniWrap.appendChild(miniInput);
      var miniActions = mk('div', { cls: 'composer-actions show' });
      var miniCancel = mk('button', { cls: 'composer-btn composer-btn--cancel', text: 'Cancel' });
      miniCancel.onclick = function(){ miniComposer.remove(); };
      miniActions.appendChild(miniCancel);
      var miniPost = mk('button', { cls: 'composer-btn composer-btn--post', text: 'Reply' });
      miniPost.onclick = function(){
        var txt = miniInput.value.trim();
        if(!txt) return;
        miniPost.disabled = true;
        postComment(txt, c.id).then(function(){ miniComposer.remove(); });
      };
      miniActions.appendChild(miniPost);
      miniWrap.appendChild(miniActions);
      miniComposer.appendChild(miniWrap);
      body.appendChild(miniComposer);
      miniInput.focus();
    };
    actions.appendChild(replyBtn);
    body.appendChild(actions);

    // Render replies
    if(allReplies){
      var childReplies = allReplies.filter(function(r){ return r.parent_id === c.id; });
      if(childReplies.length > 0){
        var repliesDiv = mk('div', { cls: 'comment-replies' });
        childReplies.forEach(function(r){
          repliesDiv.appendChild(renderOneComment(r, []));
        });
        body.appendChild(repliesDiv);
      }
    }

    item.appendChild(body);
    return item;
  }

  // --- Build the zone ---
  function buildFanZone(){
    slug = getSlug();
    if(!slug) return;

    var target = document.querySelector('.fan-zone-mount');
    if(!target){
      var viral = document.querySelector('.viral-footer');
      if(!viral) return;
      target = mk('div', { cls: 'fan-zone-mount' });
      viral.parentNode.insertBefore(target, viral);
    }

    var zone = mk('div', { cls: 'fan-zone' });

    // Header
    var header = mk('div', { cls: 'fan-zone__header' });
    header.appendChild(mk('div', { cls: 'fan-zone__title', text: 'Around the Fire' }));
    header.appendChild(mk('div', { cls: 'fan-zone__sub', text: 'Tell us what this song does to you' }));
    zone.appendChild(header);

    // Reaction bar
    zone.appendChild(mk('div', { cls: 'reaction-bar', id: 'fanReactionBar' }));

    // Comments section
    var commSec = mk('div', { cls: 'comments-section' });
    var commHead = mk('div', { cls: 'comments-header' });
    commHead.appendChild(mk('span', { cls: 'comments-count', id: 'fanCommentCount', text: '0 comments' }));
    commSec.appendChild(commHead);

    commSec.appendChild(mk('div', { id: 'fanComposerArea' }));
    commSec.appendChild(mk('div', { id: 'fanCommentList' }));

    zone.appendChild(commSec);
    target.appendChild(zone);

    loadSession();
    renderComposer();
    renderReactions();
    loadReactions();
    loadComments();
  }

  // --- Init ---
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(buildFanZone, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(buildFanZone, 100); });
  }
})();
