var songSlug = location.pathname.split('/').pop().replace('.html','');
var SR_URL = 'https://pxcxtnabyydhbfbholvh.supabase.co';
var SR_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3h0bmFieXlkaGJmYmhvbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzAxNTQsImV4cCI6MjA4OTQ0NjE1NH0.4FUt6aghawOpAHM87DVhz-ZDZNj4w-b2n64ZphVyu78';

function reactSong(type) {
  var btn = document.querySelector('.sab-' + type);
  if (!btn || btn.classList.contains('active')) return;
  btn.classList.add('active');
  var countEl = document.getElementById(type + '-count');
  if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
  localStorage.setItem('react-' + songSlug + '-' + type, '1');
  fetch(SR_URL + '/rest/v1/song_reactions', {
    method: 'POST',
    headers: {'apikey': SR_KEY, 'Authorization': 'Bearer ' + SR_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
    body: JSON.stringify({song_slug: songSlug, reaction_type: type})
  }).catch(function(){});
}

// Load previous reactions on page load
(function(){
  if (localStorage.getItem('react-' + songSlug + '-lips')) {
    var b = document.querySelector('.sab-lips');
    if (b) b.classList.add('active');
  }
  if (localStorage.getItem('react-' + songSlug + '-fire')) {
    var b = document.querySelector('.sab-fire');
    if (b) b.classList.add('active');
  }
})();
