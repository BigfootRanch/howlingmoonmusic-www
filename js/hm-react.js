/* ============================================
   Howling Moon Music — Reaction System
   Shared across music.html, mood pages, song pages
   Toast feedback + Supabase song_reactions
   ============================================ */
(function() {
  'use strict';

  // Inject toast element + styles
  var style = document.createElement('style');
  style.textContent = '#hm-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(100px);background:linear-gradient(135deg,#1a1622,#2a2035);color:#faf6f0;padding:1rem 2rem;border-radius:12px;font-size:.95rem;z-index:9999;opacity:0;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid rgba(184,146,47,.25);text-align:center;max-width:90vw;font-family:Inter,-apple-system,sans-serif}#hm-toast.show{transform:translateX(-50%) translateY(0);opacity:1}.sa-react{background:none;border:none;cursor:pointer;font-size:1rem;padding:.2rem .3rem;transition:transform .2s cubic-bezier(.34,1.56,.64,1);opacity:.5}.sa-react:hover{opacity:1;transform:scale(1.2)}.sa-react.pop{transform:scale(1.5)}.sa-react.active{opacity:1;filter:drop-shadow(0 0 6px rgba(255,45,123,.6))}.sr-actions{display:inline-flex;gap:.3rem;align-items:center;margin-left:.75rem}.sa-buy-link{color:#b8922f;font-weight:700;font-size:.8rem;text-decoration:none;padding:.15rem .5rem;border:1px solid rgba(184,146,47,.3);border-radius:4px;transition:all .2s}.sa-buy-link:hover{background:rgba(184,146,47,.15)}';
  document.head.appendChild(style);

  if (!document.getElementById('hm-toast')) {
    var toast = document.createElement('div');
    toast.id = 'hm-toast';
    document.body.appendChild(toast);
  }

  var msgs = {
    lips: ["thanks darling for the love \uD83D\uDC8B", "love you for that \uD83D\uDC8B", "you get me \uD83D\uDC8B"],
    fire: ["thanks for the vibe \uD83D\uDD25", "you feel that too? \uD83D\uDD25", "that's the energy \uD83D\uDD25"]
  };
  var timer = null;

  function showToast(type) {
    var pool = msgs[type] || msgs.lips;
    var el = document.getElementById('hm-toast');
    el.textContent = pool[Math.floor(Math.random() * pool.length)];
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function() { el.classList.remove('show'); }, 2500);
  }

  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3h0bmFieXlkaGJmYmhvbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzAxNTQsImV4cCI6MjA4OTQ0NjE1NH0.4FUt6aghawOpAHM87DVhz-ZDZNj4w-b2n64ZphVyu78';
  var API_URL = 'https://pxcxtnabyydhbfbholvh.supabase.co/rest/v1/song_reactions';

  function react(slug, type, btn) {
    var key = 'react-' + slug + '-' + type;
    if (localStorage.getItem(key)) { showToast(type); return; }
    btn.classList.add('active', 'pop');
    setTimeout(function() { btn.classList.remove('pop'); }, 300);
    localStorage.setItem(key, '1');
    showToast(type);
    fetch(API_URL, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ song_slug: slug, reaction_type: type })
    });
  }

  function makeBtn(slug, type, emoji, title) {
    var btn = document.createElement('button');
    btn.className = 'sa-react' + (localStorage.getItem('react-' + slug + '-' + type) ? ' active' : '');
    btn.title = title;
    btn.textContent = emoji;
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      react(slug, type, btn);
    });
    return btn;
  }

  // Inject into mood page .song-row elements
  document.querySelectorAll('.song-row').forEach(function(row) {
    if (row.querySelector('.sr-actions')) return;
    var link = row.querySelector('.song-row__info h3 a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var slug = href.replace(/^\/?(songs\/)?/, '').replace('.html', '').replace(/#.*/, '');
    var actions = document.createElement('div');
    actions.className = 'sr-actions';
    actions.appendChild(makeBtn(slug, 'lips', '\uD83D\uDC8B', 'Love it'));
    actions.appendChild(makeBtn(slug, 'fire', '\uD83D\uDD25', 'Fire'));
    var buyLink = document.createElement('a');
    buyLink.href = '/songs/' + slug + '.html#buy';
    buyLink.className = 'sa-buy-link';
    buyLink.title = 'Buy $1.29';
    buyLink.textContent = '$';
    actions.appendChild(buyLink);
    // Insert before the Play button
    var playBtn = row.querySelector('.song-row__play');
    if (playBtn) {
      playBtn.parentNode.insertBefore(actions, playBtn);
    } else {
      row.appendChild(actions);
    }
  });

  // Expose for pages that use inline quickReact
  window.showToast = window.showToast || showToast;
})();
