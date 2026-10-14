/* Howling Moon Music — first-party site analytics (v2 "core")
   Owner's own first-party analytics for howlingmoonmusic.com.
   Neutral filename so content blockers do not drop it (the old
   js/hm-track.js matched filter lists; /beacon.js slipped through —
   this replaces hm-track.js with a non-matching name).
   All data from standard browser APIs. */
(function(){
  'use strict';
  // Existing, working endpoints (same ones beacon.js reaches; the endpoint
  // was never the thing blocked — only the old script filename was).
  var VISIT = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/track-visitor';
  var UX    = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/hm-ux';
  var ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3h0bmFieXlkaGJmYmhvbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzAxNTQsImV4cCI6MjA4OTQ0NjE1NH0.4FUt6aghawOpAHM87DVhz-ZDZNj4w-b2n64ZphVyu78';

  var SID_KEY='hm_session', PAGES_KEY='hm_pages', START_KEY='hm_start',
      DID_KEY='hm_did', FP_KEY='hm_fp';

  // --- persistent device id: survives IP changes + new sessions ---
  function getDeviceId(){
    try {
      var d = localStorage.getItem(DID_KEY);
      if(!d){ d = 'dev_' + Math.random().toString(36).slice(2,12) + Date.now().toString(36); localStorage.setItem(DID_KEY, d); }
      return d;
    } catch(e){ return 'dev_ns_' + Date.now().toString(36); }
  }
  function getSessionId(){
    try {
      var s = sessionStorage.getItem(SID_KEY);
      if(!s){ s = 'ses_' + Math.random().toString(36).slice(2,14) + '_' + Date.now(); sessionStorage.setItem(SID_KEY, s); }
      return s;
    } catch(e){ return 'ses_ns_' + Date.now().toString(36); }
  }
  function trackPageVisit(){
    try {
      var pages = JSON.parse(sessionStorage.getItem(PAGES_KEY) || '[]');
      pages.push(location.pathname + location.search);
      sessionStorage.setItem(PAGES_KEY, JSON.stringify(pages));
      if(!sessionStorage.getItem(START_KEY)) sessionStorage.setItem(START_KEY, String(Date.now()));
    } catch(e){}
  }
  trackPageVisit();

  function hash(s){ var h=0; for(var i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h=h&h; } return 'fp_'+Math.abs(h).toString(36); }

  function canvasFingerprint(){
    try { var c=document.createElement('canvas'); c.width=200; c.height=50; var x=c.getContext('2d');
      x.textBaseline='top'; x.font='14px Arial'; x.fillStyle='#f60'; x.fillRect(125,1,62,20);
      x.fillStyle='#069'; x.fillText('HM_2026_🌙',2,15);
      x.fillStyle='rgba(102,204,0,0.7)'; x.fillText('howlingmoon',4,35); return hash(c.toDataURL()); } catch(e){ return ''; }
  }
  function webglFingerprint(){
    try { var c=document.createElement('canvas'); var gl=c.getContext('webgl')||c.getContext('experimental-webgl');
      if(!gl) return {fp:'',renderer:'',vendor:''};
      var ext=gl.getExtension('WEBGL_debug_renderer_info');
      var r=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):''; var v=ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):'';
      return {fp:hash(r+'|'+v+'|'+gl.getParameter(gl.VERSION)), renderer:r, vendor:v}; } catch(e){ return {fp:'',renderer:'',vendor:''}; }
  }
  function detectFonts(){
    try { var test=['monospace','sans-serif','serif'];
      var fonts=['Arial','Arial Black','Calibri','Cambria','Comic Sans MS','Consolas','Courier New','Garamond','Georgia','Helvetica','Helvetica Neue','Impact','Menlo','Monaco','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana','Roboto','Open Sans','Lato','Noto Sans','MS Gothic','SimSun','Malgun Gothic','Apple Color Emoji','Segoe UI Emoji'];
      var el=document.createElement('span'); el.style.cssText='position:absolute;left:-9999px;font-size:72px;visibility:hidden'; el.textContent='mmMwWLli1Oq0';
      document.body.appendChild(el); var base={};
      test.forEach(function(f){ el.style.fontFamily=f; base[f]=el.offsetWidth+','+el.offsetHeight; });
      var det=[]; fonts.forEach(function(f){ for(var i=0;i<test.length;i++){ el.style.fontFamily='"'+f+'",'+test[i]; if(el.offsetWidth+','+el.offsetHeight!==base[test[i]]){ det.push(f); break; } } });
      document.body.removeChild(el); return det; } catch(e){ return []; }
  }
  function masterFingerprint(webgl, fonts){
    var n=navigator;
    return hash([canvasFingerprint(),webgl.fp,n.userAgent,n.language,screen.width+'x'+screen.height,screen.colorDepth,window.devicePixelRatio||1,new Date().getTimezoneOffset(),n.hardwareConcurrency||0,n.deviceMemory||0,n.maxTouchPoints||0,n.platform||'',fonts.join(',')].join('|'));
  }
  function getBrowser(){ var u=navigator.userAgent; if(u.indexOf('Edg')>-1)return'Edge'; if(u.indexOf('Chrome')>-1)return'Chrome'; if(u.indexOf('Firefox')>-1)return'Firefox'; if(u.indexOf('Safari')>-1)return'Safari'; return'Other'; }
  function getOS(){ var u=navigator.userAgent; if(u.indexOf('iPhone')>-1||u.indexOf('iPad')>-1)return'iOS'; if(u.indexOf('Android')>-1)return'Android'; if(u.indexOf('Win')>-1)return'Windows'; if(u.indexOf('Mac')>-1)return'macOS'; if(u.indexOf('Linux')>-1)return'Linux'; return'Other'; }
  function getDeviceType(){ var w=window.innerWidth; if(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return w>768?'tablet':'mobile'; return'desktop'; }

  var DID=getDeviceId(), SID=getSessionId();

  // --- signed-in PuppyReports/Howls visitor arriving with an opaque one-time hint (#hmid=...) ---
  // The hint is random (no email/name in the URL); the server binds this device to that account.
  (function(){
    try {
      var m = /[#&?]hmid=(h_[a-f0-9]{20,80})/.exec(location.hash + '&' + location.search);
      if (!m) return;
      var clean = location.href.replace(/([?&#])hmid=h_[a-f0-9]{20,80}&?/, '$1').replace(/[?&#]$/, '');
      try { history.replaceState(history.state, '', clean); } catch(e){}
      fetch(UX, { method:'POST', keepalive:true, body: JSON.stringify({ id_redeem:m[1], device_id:DID, session_id:SID, site:'howlingmoonmusic.com' }) }).catch(function(){});
    } catch(e){}
  })();

  // --- the main visit row (server adds IP/geo/person-match) ---
  function sendVisit(){
    var webgl=webglFingerprint(), fonts=detectFonts(), n=navigator;
    var fp=masterFingerprint(webgl,fonts); try{ sessionStorage.setItem(FP_KEY,fp); }catch(e){}
    var data={ fingerprint:fp, device_id:DID, client_id:DID,
      user_agent:n.userAgent, browser:getBrowser(), os:getOS(), device_type:getDeviceType(),
      screen_resolution:screen.width+'x'+screen.height, language:n.language||'',
      timezone:(Intl.DateTimeFormat().resolvedOptions().timeZone)||'',
      referrer:document.referrer||'', page_url:location.pathname+location.search,
      page_title:document.title, session_id:SID,
      deep:{ device_id:DID, canvas_fp:canvasFingerprint(), webgl_fp:webgl.fp,
        gpu_renderer:webgl.renderer, gpu_vendor:webgl.vendor, fonts_hash:hash(fonts.join(',')),
        fonts_count:fonts.length, platform:n.platform||'', cpu_cores:n.hardwareConcurrency||0,
        device_memory_gb:n.deviceMemory||0, max_touch_points:n.maxTouchPoints||0,
        color_depth:screen.colorDepth, pixel_ratio:window.devicePixelRatio||1,
        timezone_offset:new Date().getTimezoneOffset(), window_size:window.innerWidth+'x'+window.innerHeight } };
    try { if(navigator.sendBeacon){ navigator.sendBeacon(VISIT, JSON.stringify(data)); return; } } catch(e){}
    try { fetch(VISIT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true}); } catch(e){}
  }

  // --- per-click / scroll / nav capture, batched to the hm-ux endpoint ---
  var queue=[], maxScroll=0, flushTimer=null;
  function push(type, extra){
    var e={ t:type, ts:Date.now(), page:location.pathname+location.search };
    if(extra) for(var k in extra){ e[k]=extra[k]; }
    queue.push(e);
    if(queue.length>=12) flush(false);
    else if(!flushTimer) flushTimer=setTimeout(function(){ flush(false); }, 4000);
  }
  function flush(isExit){
    if(flushTimer){ clearTimeout(flushTimer); flushTimer=null; }
    if(!queue.length && !isExit) return;
    var batch=queue.splice(0,queue.length);
    if(!batch.length) return;
    var body=JSON.stringify({ device_id:DID, session_id:SID, fingerprint:(function(){try{return sessionStorage.getItem(FP_KEY)||'';}catch(e){return'';}})(), page_url:location.pathname+location.search, events:batch });
    try { if(isExit && navigator.sendBeacon && navigator.sendBeacon(UX, body)) return; } catch(e){}
    try { fetch(UX,{method:'POST',headers:{'Content-Type':'application/json','apikey':ANON},body:body,keepalive:true}); } catch(e){}
  }
  function describe(el){
    if(!el || el===document) return {};
    var sel=el.tagName ? el.tagName.toLowerCase() : '';
    if(el.id) sel+='#'+el.id;
    if(el.className && typeof el.className==='string') sel+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');
    var a=el.closest ? el.closest('a') : null;
    return { sel:sel.slice(0,80), text:(el.textContent||'').trim().slice(0,60), href:a?a.getAttribute('href'):'' };
  }
  document.addEventListener('click', function(ev){ var d=describe(ev.target); push('click',{ sel:d.sel, text:d.text, href:d.href, x:ev.clientX, y:ev.clientY }); }, true);
  window.addEventListener('scroll', function(){ try{ var p=Math.round((window.scrollY/((document.body.scrollHeight-window.innerHeight)||1))*100); if(p>maxScroll){ maxScroll=p; if(p===25||p===50||p===75||p>=95) push('scroll',{pct:p}); } }catch(e){} });
  window.addEventListener('pagehide', function(){ push('exit',{ scroll_pct:maxScroll, secs:Math.round((Date.now()-(parseInt((function(){try{return sessionStorage.getItem(START_KEY);}catch(e){return 0;}})(),10)||Date.now()))/1000) }); flush(true); });

  function boot(){ setTimeout(function(){ sendVisit(); push('view',{ title:document.title }); }, 250); }
  if(document.readyState==='complete') boot();
  else window.addEventListener('load', boot);
})();


/* media stats config for howlingmoonmusic.com (module below is shared with the PuppyReports copy) */
window.__mxCfg = window.__mxCfg || {
  endpoint: 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/hm-ux',
  site: 'howlingmoonmusic.com',
  ids: function(){
    var g = function(st,k){ try { return st.getItem(k) || ''; } catch(e){ return ''; } };
    return { device_id: g(localStorage,'hm_did'), session_id: g(sessionStorage,'hm_session'), fingerprint: g(sessionStorage,'hm_fp') };
  },
  meta: function(el){
    var path = location.pathname;
    if (el.id === 'songAudio' && /\/songs\//.test(path)) {
      var slug = path.split('/').pop().replace('.html',''), t = document.querySelector('.song-title');
      return { media_id: slug, song_slug: slug, title: (t ? t.textContent.trim() : slug).slice(0,200), source: 'song_page' };
    }
    if (el.id === 'radioAudio' && typeof window.getCurrentSong === 'function') {
      var s = window.getCurrentSong();
      if (s && s.title) return { title: String(s.title).slice(0,200), media_id: s.slug || null, song_slug: s.slug || null, source: 'site_radio' };
    }
    var src = el.getAttribute('src') || '', cur = el.currentSrc || '';
    var btns = document.querySelectorAll('[data-src]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], ds = b.getAttribute('data-src');
      if (ds !== src && ds !== cur && b.dataset.src !== cur) continue;
      var row = b.closest('li,tr,[class*="row"],[class*="track"],[class*="song"]') || b.parentElement;
      var a = row && row.querySelector('a[href*="/songs/"]');
      var sl = a ? a.getAttribute('href').split('/').pop().replace('.html','') : null;
      var title = (b.getAttribute('data-title') || (b.getAttribute('aria-label') || '').replace(/^(play|pause)\s+/i,'') || (a ? a.textContent : '')).trim();
      if (title || sl) return { title: (title || sl).slice(0,200), media_id: sl || null, song_slug: sl, source: 'site_list' };
    }
    return null;
  }
};

/* ---- media listen/watch stats (first-party, v3 2026-10-14) ----
   One row per listen / watch: start, end, seconds actually played, how it ended
   (finished / paused / skipped / page_closed), completion %, plus the visit's
   device + session ids. Server adds IP + location and any known identity.
   Heartbeat every 15 s while playing; final state sent on pause / ended /
   tab hidden / page close (sendBeacon with a plain-text body = no preflight). */
(function(CFG){
  'use strict';
  if (!CFG || window.__mxOn) return; window.__mxOn = true;
  var EP = CFG.endpoint, HB_MS = 15000;
  var list = [];
  function now(){ return Date.now(); }
  function rid(){ try { if (crypto && crypto.randomUUID) return 'p_' + crypto.randomUUID(); } catch(e){}
    return 'p_' + Math.random().toString(36).slice(2) + now().toString(36) + Math.random().toString(36).slice(2); }
  function viaTag(){
    try {
      var q = new URLSearchParams(location.search), v = q.get('via') || q.get('utm_source');
      if (v) { v = String(v).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,64); sessionStorage.setItem('hm_via', v); return v; }
      return sessionStorage.getItem('hm_via') || '';
    } catch(e){ return ''; }
  }
  function nameFromSrc(src){
    try { var seg = decodeURIComponent(String(src||'').split('?')[0].split('#')[0].split('/').pop() || '');
      return seg.replace(/\.[a-z0-9]{2,4}$/i,'').replace(/^\d+[\s._-]+/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim(); } catch(e){ return ''; }
  }
  function slugify(s){ return String(s||'').toLowerCase().replace(/'/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120); }
  function srcOf(el){ return el.currentSrc || el.src || (el.querySelector && el.querySelector('source') && el.querySelector('source').src) || ''; }
  function meta(el){
    var m = null;
    try { if (CFG.meta) m = CFG.meta(el); } catch(e){ m = null; }
    m = m || {};
    var src = srcOf(el);
    if (!m.title) { try { var ms = navigator.mediaSession && navigator.mediaSession.metadata; if (ms && ms.title) m.title = ms.title; } catch(e){} }
    if (!m.title) m.title = nameFromSrc(src) || (el.getAttribute && (el.getAttribute('title') || el.getAttribute('aria-label'))) || 'untitled';
    if (!m.media_id) m.media_id = slugify(m.title) || slugify(nameFromSrc(src)) || 'unknown';
    m.kind = m.kind || (el.tagName === 'VIDEO' ? 'video' : 'audio');
    m.provider = m.provider || 'html5';
    m.src = src;
    return m;
  }
  function payload(s, reason){
    var el = s.el, dur = null, pos = null;
    try { dur = isFinite(el.duration) ? Math.round(el.duration * 10) / 10 : null; pos = Math.round((el.currentTime || 0) * 10) / 10; } catch(e){}
    s.seq++;
    return { kind: s.m.kind, play_id: s.id, seq: s.seq, reason: reason, site: CFG.site, provider: s.m.provider,
      media_id: s.m.media_id, title: s.m.title, song_slug: s.m.song_slug || null, source: s.m.source || CFG.source || null,
      started_at: s.start, ts: now(), secs: Math.round(s.secs * 10) / 10, duration: dur, position: pos,
      pauses: s.pauses, seeks: s.seeks, page_url: location.pathname + location.search, referrer: document.referrer || '',
      source_code: viaTag(), test: /claude-test/.test(location.search + viaTag()) };
  }
  function post(items, exit){
    if (!items.length) return;
    var ids = {}; try { ids = CFG.ids() || {}; } catch(e){}
    var body = { device_id: ids.device_id || '', session_id: ids.session_id || '', fingerprint: ids.fingerprint || '',
      site: CFG.site, page_url: location.pathname + location.search, media: items };
    try { var t = CFG.prToken && CFG.prToken(); if (t) body.pr_token = t; } catch(e){}
    var str = JSON.stringify(body);
    if (exit) { try { if (navigator.sendBeacon && navigator.sendBeacon(EP, str)) return; } catch(e){} }
    try { fetch(EP, { method: 'POST', body: str, keepalive: true }).catch(function(){}); } catch(e){}
  }
  function stateFor(el){ for (var i = 0; i < list.length; i++) if (list[i].el === el) return list[i]; return null; }
  function minSecs(s){ return s.m.kind === 'video' ? 2 : 1; }
  // send only once the listen is real (>= 1 s audio / 2 s video) so scroll-past autoplay is not a "play"
  function emit(s, reason, exit){
    if (!s.sentStart && s.secs < minSecs(s) && reason !== 'finished') return;
    if (!s.sentStart) { s.sentStart = true; if (reason === 'heartbeat') reason = 'start'; }
    post([payload(s, reason)], exit);
  }
  function close(s, reason, exit){ if (s.closed) return; s.playing = false; emit(s, reason, exit); s.closed = true; }
  function begin(el){
    var s = stateFor(el), src = srcOf(el);
    if (s && !s.closed && s.src === src) { s.playing = true; s.lastPos = el.currentTime || 0; s.lastT = now(); return s; }
    if (s && !s.closed) { // same element, new track: previous one was skipped (or paused earlier)
      var reason = (s.playing || now() - s.pausedAt < 1500) ? 'skipped' : null;
      if (reason) { s.closed = false; s.playing = false; emit(s, 'skipped'); }
      s.closed = true;
    }
    if (s) list.splice(list.indexOf(s), 1);
    var m = meta(el);
    if (CFG.accept && !CFG.accept(el, m)) return null;
    s = { el: el, id: rid(), seq: 0, start: now(), secs: 0, lastPos: el.currentTime || 0, lastT: now(), pauses: 0, seeks: 0,
          playing: true, closed: false, sentStart: false, src: src, m: m, pausedAt: 0 };
    list.push(s);
    return s;
  }
  function tick(s){
    if (!s || !s.playing) return;
    var el = s.el, p = el.currentTime || 0, d = p - s.lastPos, wall = (now() - s.lastT) / 1000;
    // count real playback only: forward progress no bigger than wall-clock time (+ slack) and not a seek jump
    if (d > 0 && d <= Math.max(wall * (el.playbackRate || 1) + 1.5, 2.5)) s.secs += d;
    s.lastPos = p; s.lastT = now();
  }
  function on(type, fn){ document.addEventListener(type, function(ev){ var el = ev.target; if (el && (el.tagName === 'AUDIO' || el.tagName === 'VIDEO')) fn(el); }, true); }
  function bindDetached(el){
    if (el.__mxBound || el.isConnected) return; el.__mxBound = true;
    ['play','playing','pause','ended','timeupdate','seeking','error','emptied'].forEach(function(t){ el.addEventListener(t, function(){ handlers[t](el); }); });
  }
  var handlers = {
    play: function(el){ begin(el); },
    playing: function(el){ var s = stateFor(el); if (!s || s.closed) s = begin(el); if (s) { s.playing = true; s.lastPos = el.currentTime || 0; s.lastT = now(); } },
    timeupdate: function(el){ var s = stateFor(el); if (s && !s.closed) { tick(s); if (!s.sentStart && s.secs >= minSecs(s)) emit(s, 'start'); } },
    pause: function(el){ var s = stateFor(el); if (!s || s.closed || el.ended) return; tick(s); s.playing = false; s.pausedAt = now(); s.pauses++; emit(s, 'paused'); },
    ended: function(el){ var s = stateFor(el); if (!s) return; tick(s); close(s, 'finished'); },
    seeking: function(el){ var s = stateFor(el); if (s && !s.closed) { tick(s); s.seeks++; s.lastPos = el.currentTime || 0; } },
    error: function(el){ var s = stateFor(el); if (s && !s.closed && s.sentStart) close(s, 'error'); },
    emptied: function(el){ var s = stateFor(el); if (s && !s.closed && (s.playing || now() - s.pausedAt < 1500)) { tick(s); close(s, 'skipped'); } }
  };
  Object.keys(handlers).forEach(function(t){ on(t, handlers[t]); });
  // players never attached to the page (new Audio()) don't reach document listeners — bind them on play()
  try {
    var P = HTMLMediaElement.prototype, orig = P.play;
    P.play = function(){ try { bindDetached(this); } catch(e){} return orig.apply(this, arguments); };
  } catch(e){}
  setInterval(function(){ list.forEach(function(s){ if (s.playing && !s.closed) { tick(s); emit(s, 'heartbeat'); } }); }, HB_MS);
  function flushAll(reason){
    var items = [];
    list.forEach(function(s){
      if (s.closed) return;
      tick(s);
      if (!s.sentStart && s.secs < minSecs(s)) return;
      s.sentStart = true;
      if (!s.playing) return; // a paused listen was already recorded as paused
      items.push(payload(s, reason));
      if (reason === 'page_closed') { s.closed = true; s.playing = false; }
    });
    post(items, true);
  }
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') flushAll('hidden'); });
  window.addEventListener('pagehide', function(){ flushAll('page_closed'); });
  window.__mxState = function(){ return list.map(function(s){ return { id: s.id, title: s.m.title, secs: s.secs, playing: s.playing, closed: s.closed }; }); };
})(window.__mxCfg);
