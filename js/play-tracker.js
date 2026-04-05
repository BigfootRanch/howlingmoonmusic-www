/**
 * Play Tracker — Howling Moon Music
 * Logs song plays, duration listened, and completion to Supabase.
 */
(function () {
  'use strict';

  var SB_URL = 'https://pxcxtnabyydhbfbholvh.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3h0bmFieXlkaGJmYmhvbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzAxNTQsImV4cCI6MjA4OTQ0NjE1NH0.4FUt6aghawOpAHM87DVhz-ZDZNj4w-b2n64ZphVyu78';

  var audio = document.getElementById('songAudio');
  if (!audio) return; // No audio element on this page

  // Extract song slug from URL path: /songs/my-song.html -> my-song
  var slug = location.pathname.split('/').pop().replace('.html', '');

  // Get song title from the page <h1>
  var titleEl = document.querySelector('.song-title');
  var songTitle = titleEl ? titleEl.textContent.trim() : slug;

  // Get existing fingerprint from visitor tracking if available
  var fingerprint = null;
  try {
    fingerprint = localStorage.getItem('hm_fp') || null;
  } catch (e) { /* ignore */ }

  // State for this play session
  var playRecordId = null;
  var playStartTime = null;
  var totalListened = 0; // accumulated seconds
  var lastTimeUpdate = 0;

  function supabasePost(path, body) {
    return fetch(SB_URL + '/rest/v1/' + path, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });
  }

  function supabasePatch(path, body) {
    return fetch(SB_URL + '/rest/v1/' + path, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
  }

  // When play starts, insert a new row
  audio.addEventListener('play', function () {
    // Only create a new record if we don't already have one for this session
    if (playRecordId) {
      // Resuming after pause — just track time
      playStartTime = Date.now();
      return;
    }

    playStartTime = Date.now();
    totalListened = 0;
    lastTimeUpdate = 0;

    supabasePost('song_plays', {
      song_slug: slug,
      song_title: songTitle,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
      fingerprint: fingerprint,
      completed: false,
      duration_listened: 0
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.length > 0) {
        playRecordId = data[0].id;
      }
    })
    .catch(function () { /* silent fail — don't break the music */ });
  });

  // Track time listened on pause
  audio.addEventListener('pause', function () {
    if (playStartTime) {
      totalListened += Math.round((Date.now() - playStartTime) / 1000);
      playStartTime = null;
    }
    // Update duration in Supabase
    if (playRecordId) {
      supabasePatch('song_plays?id=eq.' + playRecordId, {
        duration_listened: totalListened
      }).catch(function () {});
    }
  });

  // When song ends — mark completed
  audio.addEventListener('ended', function () {
    if (playStartTime) {
      totalListened += Math.round((Date.now() - playStartTime) / 1000);
      playStartTime = null;
    }
    if (playRecordId) {
      supabasePatch('song_plays?id=eq.' + playRecordId, {
        duration_listened: totalListened,
        completed: true
      }).catch(function () {});
    }
    // Reset for potential replay
    playRecordId = null;
  });

  // Periodic time update — save progress every 30 seconds
  audio.addEventListener('timeupdate', function () {
    var currentTime = Math.floor(audio.currentTime);
    if (currentTime - lastTimeUpdate >= 30) {
      lastTimeUpdate = currentTime;
      if (playRecordId && playStartTime) {
        var elapsed = totalListened + Math.round((Date.now() - playStartTime) / 1000);
        supabasePatch('song_plays?id=eq.' + playRecordId, {
          duration_listened: elapsed
        }).catch(function () {});
      }
    }
  });

  // Save progress if user navigates away
  window.addEventListener('beforeunload', function () {
    if (playRecordId && playStartTime) {
      totalListened += Math.round((Date.now() - playStartTime) / 1000);
      // Use sendBeacon for reliability on page unload
      var url = SB_URL + '/rest/v1/song_plays?id=eq.' + playRecordId;
      var body = JSON.stringify({
        duration_listened: totalListened,
        completed: audio.ended || false
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        // sendBeacon doesn't support custom headers, so fall back to fetch with keepalive
        fetch(url, {
          method: 'PATCH',
          headers: {
            'apikey': SB_KEY,
            'Authorization': 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    }
  });
})();
