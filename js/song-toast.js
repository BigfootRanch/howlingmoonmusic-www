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
