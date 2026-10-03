/* Curated bundle / legacy album download pages — payment gate (2026-10-03).
   downloads/<slug>.html no longer contains any audio URL. Buyers arrive from Stripe with
   ?session_id={CHECKOUT_SESSION_ID}; this script asks the verify-music-purchase edge function, which checks
   the session is PAID with Stripe and returns exactly the songs that product includes. Without a verified
   session the page shows the friendly "couldn't verify" box and a link to buy.
   Config lives on <div id="curatedGate" data-slug data-buy data-buy-label data-numbered>. */
(function () {
  'use strict';
  var VERIFY_URL = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/verify-music-purchase';
  var LOG_URL = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/log-download';
  var SUPPORT = 'dogsongstudio@gmail.com';
  var DL_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  var gate = document.getElementById('curatedGate');
  if (!gate) return;
  var cfg = {
    slug: gate.getAttribute('data-slug') || '',
    buy: gate.getAttribute('data-buy') || '',
    buyLabel: gate.getAttribute('data-buy-label') || 'Buy this bundle',
    numbered: gate.getAttribute('data-numbered') === '1'
  };
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('session_id') || '';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function show(id) { var el = $(id); if (el) el.classList.remove('cur-hidden'); }
  function hide(id) { var el = $(id); if (el) el.classList.add('cur-hidden'); }

  function showError(msg) {
    hide('curatedLoading'); hide('curatedList'); hide('curatedExtras');
    if (msg) $('curatedErrorMsg').textContent = msg;
    var buy = $('curatedBuy');
    if (buy && cfg.buy) { buy.setAttribute('href', cfg.buy); buy.textContent = cfg.buyLabel; }
    else if (buy) buy.parentNode.removeChild(buy); // not offered for sale (e.g. GenX): verify box + support only
    show('curatedError');
  }

  function logDownload(title) {
    try {
      var payload = JSON.stringify({ song_title: title, payment_ref: sessionId, email: null, page: cfg.slug || 'curated' });
      if (navigator.sendBeacon) navigator.sendBeacon(LOG_URL, new Blob([payload], { type: 'text/plain' }));
      else fetch(LOG_URL, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'text/plain' } });
    } catch (e) { /* logging must never block a download */ }
  }

  function fileName(n, title, url) {
    var m = /\.(mp3|wav|m4a)(?:$|\?)/i.exec(url);
    var safe = String(title).replace(/[<>:"\/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
    return (n < 10 ? '0' + n : '' + n) + ' ' + safe + '.' + (m ? m[1].toLowerCase() : 'mp3');
  }

  function render(d) {
    var songs = d.songs || [];
    if (d.name) {
      var h1 = document.querySelector('.header h1');
      if (h1 && d.slug && d.slug !== cfg.slug) h1.textContent = d.name; // session bought a different bundle
    }
    var count = $('curatedCount');
    if (count) count.textContent = songs.length + ' tracks';
    var html = '';
    songs.forEach(function (s, i) {
      html += '<div class="dl-row">' +
        (cfg.numbered ? '<span class="dl-num">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' : '') +
        '<span class="dl-title">' + esc(s.title) + '</span>' +
        (s.url
          ? '<a href="' + esc(s.url + (s.url.indexOf('?') === -1 ? '?' : '&') + 'download=' + encodeURIComponent(fileName(i + 1, s.title, s.url))) +
            '" download class="dl-btn" data-title="' + esc(s.title) + '" title="Download ' + esc(s.title) + '">' + DL_SVG + ' Download</a>'
          : '<span class="dl-coming">Coming Soon</span>') +
        '</div>';
    });
    var rows = $('curatedRows');
    rows.innerHTML = html;
    rows.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.dl-btn');
      if (a) logDownload(a.getAttribute('data-title'));
    });
    hide('curatedLoading'); hide('curatedError');
    show('curatedList'); show('curatedExtras');
  }

  if (!/^cs_(live|test)_[A-Za-z0-9]{10,}$/.test(sessionId)) {
    showError("This download page opens after checkout. If you already bought this, use the link from your Stripe receipt email — or email " + SUPPORT + " and we'll get your music to you.");
    return;
  }

  fetch(VERIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) })
    .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
    .then(function (res) {
      var d = res.data;
      if (res.status !== 200 || !d || !d.ok) { showError(d && d.message); return; }
      if (d.needs_choice) { window.location.replace('/download.html?session_id=' + encodeURIComponent(sessionId)); return; }
      render(d);
    })
    .catch(function () {
      showError("We couldn't reach the verification service. Check your connection and refresh — or email " + SUPPORT + " and we'll get your music to you.");
    });
})();
