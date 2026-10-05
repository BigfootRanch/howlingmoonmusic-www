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
    try { if(isExit && navigator.sendBeacon){ navigator.sendBeacon(UX, new Blob([body],{type:'application/json'})); return; } } catch(e){}
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
