/* Howling Moon Music — embedded video watch stats (first-party analytics) v3 2026-10-14
   One row per watch of an embedded YouTube video: start, end, seconds actually watched,
   completion %, how it ended (finished / paused / page_closed), plus the visit's device +
   session ids. Server (hm-ux) adds IP + location + any known identity -> public.video_plays.
   Uses the YouTube IFrame Player API (a click inside a cross-origin iframe is invisible to
   page click tracking). Heartbeat every 15 s while playing; final state on pause / end /
   tab hidden / page close via sendBeacon with a plain-text body (no CORS preflight). */
(function(){
  'use strict';
  if (window.__hmVidOn) return; window.__hmVidOn = true;
  var UX = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/hm-ux';
  function g(st,k){ try{ return st.getItem(k)||''; }catch(e){ return ''; } }
  function songTitle(){ var h=document.querySelector('.song-title'); return (h?h.textContent:document.title||'').trim().slice(0,120); }
  function slug(){ return /\/songs\//.test(location.pathname) ? location.pathname.split('/').pop().replace('.html','') : null; }
  function via(){ try{ var q=new URLSearchParams(location.search), v=q.get('via')||q.get('utm_source'); if(v){ v=String(v).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,64); sessionStorage.setItem('hm_via',v); return v; } return sessionStorage.getItem('hm_via')||''; }catch(e){ return ''; } }
  function rid(){ try{ if(crypto&&crypto.randomUUID) return 'v_'+crypto.randomUUID(); }catch(e){} return 'v_'+Math.random().toString(36).slice(2)+Date.now().toString(36)+Math.random().toString(36).slice(2); }
  function post(items, exit){
    if(!items.length) return;
    var str=JSON.stringify({ device_id:g(localStorage,'hm_did'), session_id:g(sessionStorage,'hm_session'), fingerprint:g(sessionStorage,'hm_fp'),
      site:'howlingmoonmusic.com', page_url:location.pathname+location.search, media:items });
    if(exit){ try{ if(navigator.sendBeacon && navigator.sendBeacon(UX, str)) return; }catch(e){} }
    try{ fetch(UX,{method:'POST',body:str,keepalive:true}).catch(function(){}); }catch(e){}
  }

  var frames=[].slice.call(document.querySelectorAll('iframe')).filter(function(f){ return /youtube(-nocookie)?\.com\/embed\//.test(f.src||''); });
  if(!frames.length) return;
  function vidId(src){ var m=/embed\/([A-Za-z0-9_-]{6,})/.exec(src||''); return m?m[1]:''; }
  frames.forEach(function(f,i){
    if(!f.id) f.id='hmvid_'+i;
    if(!/[?&]enablejsapi=1/.test(f.src)){ f.src = f.src + (f.src.indexOf('?')<0?'?':'&') + 'enablejsapi=1&origin=' + encodeURIComponent(location.origin); }
  });

  var watches=[]; // one state per player
  function snap(w, reason){
    var p=w.p, dur=null, pos=null;
    try{ dur=Math.round((p.getDuration()||0)*10)/10||null; pos=Math.round((p.getCurrentTime()||0)*10)/10; }catch(e){}
    w.seq++;
    return { kind:'video', provider:'youtube', play_id:w.id, seq:w.seq, reason:reason, site:'howlingmoonmusic.com',
      media_id:w.vid, title:w.title, song_slug:slug(), started_at:w.start, ts:Date.now(), secs:Math.round(w.secs*10)/10,
      duration:dur, position:pos, pauses:w.pauses, seeks:w.seeks, page_url:location.pathname+location.search,
      referrer:document.referrer||'', source_code:via(), test:/claude-test/.test(location.search+via()) };
  }
  function tick(w){
    if(!w.playing) return;
    var p=0; try{ p=w.p.getCurrentTime()||0; }catch(e){ return; }
    var d=p-w.lastPos, wall=(Date.now()-w.lastT)/1000;
    if(d>0 && d<=wall+1.5) w.secs+=d; else if(Math.abs(d)>2.5) w.seeks++;
    w.lastPos=p; w.lastT=Date.now();
  }
  function emit(w, reason, exit){ if(!w.sent && w.secs<2 && reason!=='finished') return; if(!w.sent){ w.sent=true; if(reason==='heartbeat') reason='start'; } post([snap(w,reason)], exit); }
  function fresh(p, f){
    var w={ p:p, id:rid(), seq:0, start:Date.now(), secs:0, lastPos:0, lastT:Date.now(), pauses:0, seeks:0, playing:false, closed:false, sent:false,
      vid:vidId(f.src), title:((f.getAttribute('title')||'').replace(/\s*[—|-]\s*official video.*$/i,'').trim() || (songTitle()+' (video)')).slice(0,200) };
    watches.push(w); return w;
  }
  function onState(w0, f){ return function(e){
    var p=e.target, st=e.data, w=w0.cur;
    if(st===1){ // PLAYING
      if(!w || w.closed){ w=w0.cur=fresh(p,f); }
      try{ w.lastPos=p.getCurrentTime()||0; }catch(_){}
      w.lastT=Date.now(); w.playing=true;
    } else if(st===2 && w && !w.closed){ tick(w); w.playing=false; w.pauses++; emit(w,'paused'); }
    else if(st===0 && w && !w.closed){ tick(w); w.playing=false; emit(w,'finished'); w.closed=true; }
  }; }
  function attach(){ frames.forEach(function(f){ try{ var h={cur:null}; new YT.Player(f.id,{events:{onStateChange:onState(h,f)}}); }catch(e){} }); }
  setInterval(function(){ watches.forEach(function(w){ if(w.playing && !w.closed){ tick(w); emit(w,'heartbeat'); } }); }, 15000);
  setInterval(function(){ watches.forEach(function(w){ if(w.playing && !w.closed) tick(w); }); }, 1000);
  function flushAll(reason){
    var items=[]; watches.forEach(function(w){ if(w.closed || !w.playing) return; tick(w); if(!w.sent && w.secs<2) return; w.sent=true;
      items.push(snap(w,reason)); if(reason==='page_closed'){ w.closed=true; w.playing=false; } });
    post(items, true);
  }
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') flushAll('hidden'); });
  window.addEventListener('pagehide', function(){ flushAll('page_closed'); });

  window.onYouTubeIframeAPIReady = (function(prev){ return function(){ if(typeof prev==='function'){try{prev();}catch(e){}} attach(); }; })(window.onYouTubeIframeAPIReady);
  if(window.YT && window.YT.Player){ attach(); }
  else if(!document.querySelector('script[src*="youtube.com/iframe_api"]')){
    var s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }
})();
