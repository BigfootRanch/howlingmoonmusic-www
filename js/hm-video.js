/* Howling Moon Music — hero video engagement (first-party analytics)
   Captures plays of the embedded YouTube hero video on song pages via the
   YouTube IFrame Player API, as events distinct from audio plays and page
   views. Posts to the same neutral hm-ux endpoint as hm-core.js.
   A click inside a cross-origin YouTube iframe is invisible to page click
   tracking, which is why this API hook is needed. */
(function(){
  'use strict';
  var UX='https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/hm-ux';
  function did(){ try{return localStorage.getItem('hm_did')||'';}catch(e){return '';} }
  function sid(){ try{return sessionStorage.getItem('hm_session')||'';}catch(e){return '';} }
  function fp(){ try{return sessionStorage.getItem('hm_fp')||'';}catch(e){return '';} }
  function songTitle(){ var h=document.querySelector('.song-title'); return (h?h.textContent:document.title||'').trim().slice(0,80); }
  function slug(){ return location.pathname.split('/').pop().replace('.html',''); }

  function send(ev){
    var body=JSON.stringify({ device_id:did(), session_id:sid(), fingerprint:fp(),
      page_url:location.pathname+location.search, events:[ev] });
    try{ if(navigator.sendBeacon){ navigator.sendBeacon(UX, new Blob([body],{type:'application/json'})); return; } }catch(e){}
    try{ fetch(UX,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}); }catch(e){}
  }

  // find YouTube hero iframes
  var frames=[].slice.call(document.querySelectorAll('iframe')).filter(function(f){
    return /youtube(-nocookie)?\.com\/embed\//.test(f.src||'');
  });
  if(!frames.length) return;

  function vidId(src){ var m=/embed\/([A-Za-z0-9_-]{6,})/.exec(src||''); return m?m[1]:''; }

  // ensure enablejsapi + id so the API can attach (adds param only if missing)
  frames.forEach(function(f,i){
    if(!f.id) f.id='hmvid_'+i;
    if(!/[?&]enablejsapi=1/.test(f.src)){
      f.src = f.src + (f.src.indexOf('?')<0?'?':'&') + 'enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    }
  });

  var players=[], started={};
  function onState(e){
    var p=e.target, id=vidId(p.getVideoUrl?p.getVideoUrl():''), st=e.data;
    if(st===1){ // PLAYING
      if(!started[id]){ started[id]=true; send({t:'video_play', href:id, text:songTitle(), ts:Date.now(), page:'/songs/'+slug()+'.html'}); }
    } else if(st===2 || st===0){ // PAUSED or ENDED
      var secs=0; try{ secs=Math.round(p.getCurrentTime()||0); }catch(_){}
      send({t: st===0?'video_ended':'video_pause', href:id, text:songTitle(), secs:secs, ts:Date.now(), page:'/songs/'+slug()+'.html'});
      if(st===0) started[id]=false;
    }
  }
  function attach(){ frames.forEach(function(f){ try{ players.push(new YT.Player(f.id,{events:{onStateChange:onState}})); }catch(e){} }); }

  // load the IFrame API once, chaining any existing ready callback
  window.onYouTubeIframeAPIReady = (function(prev){ return function(){ if(typeof prev==='function'){try{prev();}catch(e){}} attach(); }; })(window.onYouTubeIframeAPIReady);
  if(window.YT && window.YT.Player){ attach(); }
  else if(!document.querySelector('script[src*="youtube.com/iframe_api"]')){
    var s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }
})();
