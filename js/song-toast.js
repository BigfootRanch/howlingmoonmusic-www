/* Song page toast — adds visual feedback to reaction buttons */
(function(){
  var style = document.createElement('style');
  style.textContent = '#hm-toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(100px);background:linear-gradient(135deg,#1a1622,#2a2035);color:#faf6f0;padding:1rem 2rem;border-radius:12px;font-size:.95rem;z-index:9999;opacity:0;transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid rgba(184,146,47,.25);text-align:center;max-width:90vw;font-family:Inter,-apple-system,sans-serif}#hm-toast.show{transform:translateX(-50%) translateY(0);opacity:1}';
  document.head.appendChild(style);
  var toast = document.createElement('div');
  toast.id = 'hm-toast';
  document.body.appendChild(toast);
  var lipsMsgs = ["thanks darling for the love 💋","love you for that 💋","you get me 💋"];
  var fireMsgs = ["thanks for the vibe 🔥","you feel that too? 🔥","that's the energy 🔥"];
  var timer;
  window.showSongToast = function(type) {
    var pool = type === 'fire' ? fireMsgs : lipsMsgs;
    toast.textContent = pool[Math.floor(Math.random() * pool.length)];
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function(){ toast.classList.remove('show'); }, 2500);
  };
  // Hook into existing reaction buttons
  document.querySelectorAll('.sab-lips').forEach(function(btn){
    var orig = btn.onclick;
    btn.onclick = function(e){
      if(orig) orig.call(this, e);
      this.style.transform='scale(1.3)';
      var self=this;
      setTimeout(function(){self.style.transform='';},300);
      showSongToast('lips');
    };
  });
  document.querySelectorAll('.sab-fire').forEach(function(btn){
    var orig = btn.onclick;
    btn.onclick = function(e){
      if(orig) orig.call(this, e);
      this.style.transform='scale(1.3)';
      var self=this;
      setTimeout(function(){self.style.transform='';},300);
      showSongToast('fire');
    };
  });
})();

/* PuppyReports crosslinks (CEO 2026-07-02) — DOG SONG pages only: "As heard on PuppyFM Radio |
   PuppyHowls" + Search-for-a-Puppy + PuppyHowls|PuppyFM buttons, inserted above the viral footer.
   Non-dog songs are untouched (slug allowlist). */
(function(){
  var DOG_SLUGS = ['puppy-kisses','booty-boom-boom','spurs','drown-me-in-slobbery-kisses','my-bed-aint-mine','bigfoot-lives-here','slobbery-kiss','christmas-puppy','trouble-trouble-pup','will-you-be-my-friend','zoomies-in-the-house','fleas','hungry-eyes','im-begging-you','look-in-my-eyes'];
  var slug = location.pathname.split('/').pop().replace('.html','');
  if (DOG_SLUGS.indexOf(slug) < 0) return;
  var box = document.createElement('div');
  box.style.cssText = 'max-width:1100px;margin:2.5rem auto 0;padding:1.5rem;text-align:center;border:1px solid rgba(253,203,110,.3);border-radius:12px;background:rgba(253,203,110,.06);font-family:Inter,-apple-system,sans-serif';
  box.innerHTML = '<p style="color:#c4b8a8;font-size:.95rem;margin:0 0 1rem">&#128251; As heard on <strong style="color:#fdcb6e">PuppyFM Radio</strong> | PuppyHowls &mdash; finally, social media for dogs</p>'
    + '<div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">'
    + '<a href="https://www.puppyreports.com/search" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:.45rem;background:linear-gradient(135deg,#fdcb6e,#f39c12);color:#0d0b0f;padding:.5rem 1.4rem;border-radius:20px;font-size:.85rem;font-weight:700;text-decoration:none"><img src="https://www.puppyreports.com/assets/branding/2026/puppyreports-shield-glossy.jpg" alt="PuppyReports" style="height:20px;width:20px;border-radius:5px;display:inline-block">Search for a Puppy on PuppyReports</a>'
    + '<a href="https://www.puppyreports.com/howls" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:.45rem;border:1px solid #fdcb6e;color:#fdcb6e;padding:.5rem 1.4rem;border-radius:20px;font-size:.85rem;font-weight:600;text-decoration:none"><img src="https://www.puppyreports.com/assets/branding/2026/puppyhowls-mark.jpg" alt="PuppyHowls" style="height:20px;width:20px;border-radius:5px;display:inline-block">PuppyHowls | PuppyFM Radio</a>'
    + '</div>';
  var anchor = document.querySelector('.viral-footer') || document.querySelector('.footer');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor);
  else document.body.appendChild(box);
})();
