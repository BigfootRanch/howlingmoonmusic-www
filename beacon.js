// =====================================================================
// Howling Moon Music — Visitor Beacon
// Sovereign Intelligence Platform Phase 1 (CEO-authorized 2026-05-28)
//
// POSTs to the existing track-visitor Supabase Edge Function on every
// page load + exit. Server handles geo lookup (ip-api.com), VPN/GOV/BOT
// detection, known_persons join (stalker matching), and security_alerts.
// =====================================================================
(function () {
  'use strict';

  var PR_BEACON_URL = 'https://vwedcmdtsvktbirlgvdb.supabase.co/functions/v1/track-visitor';

  function parseUA() {
    var ua = navigator.userAgent || '';
    var l = ua.toLowerCase();
    var browser = 'Unknown';
    if (l.indexOf('edg/') > -1) browser = 'Edge';
    else if (l.indexOf('chrome/') > -1) browser = 'Chrome';
    else if (l.indexOf('safari/') > -1) browser = 'Safari';
    else if (l.indexOf('firefox/') > -1) browser = 'Firefox';
    var os = 'Unknown';
    if (l.indexOf('windows nt') > -1) os = 'Windows';
    else if (l.indexOf('mac os x') > -1 || l.indexOf('macintosh') > -1) os = 'macOS';
    else if (l.indexOf('iphone') > -1 || l.indexOf('ipad') > -1) os = 'iOS';
    else if (l.indexOf('android') > -1) os = 'Android';
    else if (l.indexOf('linux') > -1) os = 'Linux';
    var device_type = 'desktop';
    if (l.indexOf('mobile') > -1 || l.indexOf('iphone') > -1 || l.indexOf('android') > -1) {
      device_type = 'mobile';
    } else if (l.indexOf('ipad') > -1 || l.indexOf('tablet') > -1) {
      device_type = 'tablet';
    }
    return { ua: ua, browser: browser, os: os, device_type: device_type };
  }

  function clientFingerprint() {
    var parts = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.platform || '',
      (screen && screen.width + 'x' + screen.height) || '',
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
      navigator.vendor || ''
    ].join('|');
    var h = 5381;
    for (var i = 0; i < parts.length; i++) {
      h = ((h << 5) + h) + parts.charCodeAt(i);
      h = h | 0;
    }
    return ('hmm_fp_' + Math.abs(h).toString(36) + '_' + (parts.length).toString(36));
  }

  function getSessionId() {
    try {
      var sid = sessionStorage.getItem('hmm_sid');
      if (!sid) {
        sid = 'hmm_s_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('hmm_sid', sid);
        sessionStorage.setItem('hmm_session_start', Date.now().toString());
      }
      return sid;
    } catch (e) {
      return 'hmm_s_no_' + Date.now().toString(36);
    }
  }

  function getSessionStart() {
    try {
      return parseInt(sessionStorage.getItem('hmm_session_start') || Date.now().toString(), 10);
    } catch (e) {
      return Date.now();
    }
  }

  function fire(payload, isExit) {
    var body = JSON.stringify(payload);
    try {
      if (isExit && navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(PR_BEACON_URL, blob)) return;
      }
    } catch (e) { /* fall through */ }
    try {
      fetch(PR_BEACON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) { /* swallow */ }
  }

  function fireEntry() {
    try {
      var p = parseUA();
      fire({
        action: 'enter',
        page_url: window.location.href,
        referrer: document.referrer || '',
        user_agent: p.ua,
        browser: p.browser,
        os: p.os,
        device_type: p.device_type,
        session_id: getSessionId(),
        fingerprint: clientFingerprint(),
        screen: (screen && (screen.width + 'x' + screen.height)) || '',
        viewport: (window.innerWidth + 'x' + window.innerHeight),
        language: navigator.language || '',
        title: document.title || '',
        site: 'howlingmoonmusic'
      }, false);
    } catch (e) { /* swallow */ }
  }

  function fireExit() {
    try {
      var startMs = getSessionStart();
      var timeOnPage = Math.round((Date.now() - startMs) / 1000);
      var scrollMax = 0;
      try {
        var doc = document.documentElement;
        var scrollTop = (window.pageYOffset || doc.scrollTop || 0);
        var height = Math.max((doc.scrollHeight || 0), (document.body && document.body.scrollHeight || 0)) - window.innerHeight;
        scrollMax = height > 0 ? Math.min(100, Math.round((scrollTop / height) * 100)) : 0;
      } catch (e) { /* ignore */ }
      fire({
        action: 'exit',
        session_id: getSessionId(),
        time_on_page: timeOnPage,
        scroll_depth_pct: scrollMax,
        page_url: window.location.href,
        site: 'howlingmoonmusic'
      }, true);
    } catch (e) { /* swallow */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireEntry);
  } else {
    setTimeout(fireEntry, 0);
  }

  window.addEventListener('pagehide', fireExit, { capture: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') fireExit();
  });
})();
