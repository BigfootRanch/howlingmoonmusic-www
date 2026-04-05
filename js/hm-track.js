/* Howling Moon Music — Deep Visitor Intelligence
   Collects comprehensive visitor metadata for security analytics.
   All data from standard browser APIs — no spyware, no exploits. */
(function(){
  var EDGE = 'https://pxcxtnabyydhbfbholvh.supabase.co/functions/v1/track-visitor';
  var SID_KEY = 'hm_session';
  var PAGES_KEY = 'hm_pages';
  var START_KEY = 'hm_start';

  function getSessionId(){
    var s = sessionStorage.getItem(SID_KEY);
    if(!s){ s = 'ses_' + Math.random().toString(36).substr(2,12) + '_' + Date.now(); sessionStorage.setItem(SID_KEY, s); }
    return s;
  }

  // Track pages visited this session
  function trackPageVisit(){
    var pages = [];
    try { pages = JSON.parse(sessionStorage.getItem(PAGES_KEY) || '[]'); } catch(e){}
    pages.push(location.pathname);
    sessionStorage.setItem(PAGES_KEY, JSON.stringify(pages));
    if(!sessionStorage.getItem(START_KEY)) sessionStorage.setItem(START_KEY, String(Date.now()));
  }
  trackPageVisit();

  // === DEEP FINGERPRINTING ===

  // Canvas fingerprint (unique per device/browser)
  function canvasFingerprint(){
    try {
      var c = document.createElement('canvas');
      c.width = 200; c.height = 50;
      var ctx = c.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125,1,62,20);
      ctx.fillStyle = '#069';
      ctx.fillText('HM_2026_\ud83c\udf19', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('howlingmoon', 4, 35);
      return hash(c.toDataURL());
    } catch(e){ return ''; }
  }

  // WebGL fingerprint (reveals GPU hardware)
  function webglFingerprint(){
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if(!gl) return {fp:'', renderer:'', vendor:''};
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      var renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      var vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '';
      var raw = renderer + '|' + vendor + '|' + gl.getParameter(gl.VERSION);
      return {fp: hash(raw), renderer: renderer, vendor: vendor};
    } catch(e){ return {fp:'', renderer:'', vendor:''}; }
  }

  // AudioContext fingerprint (unique audio processing signature)
  function audioFingerprint(cb){
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC){ cb(''); return; }
      var ctx = new AC();
      var osc = ctx.createOscillator();
      var analyser = ctx.createAnalyser();
      var gain = ctx.createGain();
      var proc = ctx.createScriptProcessor(4096, 1, 1);
      gain.gain.value = 0; // silent
      osc.type = 'triangle';
      osc.connect(analyser);
      analyser.connect(proc);
      proc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      proc.onaudioprocess = function(e){
        var buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        var sum = 0;
        for(var i = 0; i < buf.length; i++) sum += Math.abs(buf[i]);
        cb(hash(String(sum)));
        proc.onaudioprocess = null;
        osc.stop();
        ctx.close();
      };
      setTimeout(function(){ try { osc.stop(); ctx.close(); } catch(e){} cb('timeout'); }, 1000);
    } catch(e){ cb(''); }
  }

  // Font detection (reveals installed fonts = OS + language + profession clues)
  function detectFonts(){
    var test = ['monospace','sans-serif','serif'];
    var fonts = [
      'Arial','Arial Black','Calibri','Cambria','Century Gothic','Comic Sans MS',
      'Consolas','Courier New','Futura','Garamond','Geneva','Georgia','Gill Sans',
      'Helvetica','Helvetica Neue','Impact','Lucida Console','Menlo','Monaco',
      'Palatino','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana',
      'Adobe Caslon Pro','Myriad Pro','Minion Pro','Fira Code','Source Code Pro',
      'Roboto','Open Sans','Lato','Noto Sans','Noto Sans CJK','MS Gothic',
      'SimSun','PMingLiU','Malgun Gothic','Apple Color Emoji','Segoe UI Emoji'
    ];
    var el = document.createElement('span');
    el.style.cssText = 'position:absolute;left:-9999px;font-size:72px;visibility:hidden';
    el.textContent = 'mmMwWLli1Oq0';
    document.body.appendChild(el);
    var base = {};
    test.forEach(function(f){
      el.style.fontFamily = f;
      base[f] = el.offsetWidth + ',' + el.offsetHeight;
    });
    var detected = [];
    fonts.forEach(function(f){
      for(var i = 0; i < test.length; i++){
        el.style.fontFamily = '"' + f + '",' + test[i];
        if(el.offsetWidth + ',' + el.offsetHeight !== base[test[i]]){
          detected.push(f);
          break;
        }
      }
    });
    document.body.removeChild(el);
    return detected;
  }

  // Battery status (reveals device state — charging = at home/office)
  function getBattery(cb){
    if(navigator.getBattery){
      navigator.getBattery().then(function(b){
        cb({ level: Math.round(b.level * 100), charging: b.charging });
      }).catch(function(){ cb(null); });
    } else { cb(null); }
  }

  // Network connection info
  function getConnection(){
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!c) return null;
    return {
      type: c.effectiveType || c.type || '',
      downlink: c.downlink || 0,
      rtt: c.rtt || 0,
      saveData: c.saveData || false
    };
  }

  // Ad blocker detection
  function hasAdBlocker(){
    var el = document.createElement('div');
    el.className = 'adsbox ad-placement ad_unit';
    el.style.cssText = 'position:absolute;left:-9999px;height:1px';
    document.body.appendChild(el);
    var blocked = el.offsetHeight === 0 || el.clientHeight === 0;
    document.body.removeChild(el);
    return blocked;
  }

  // Hash function
  function hash(s){
    var h = 0;
    for(var i = 0; i < s.length; i++){
      var ch = s.charCodeAt(i);
      h = ((h << 5) - h) + ch;
      h = h & h;
    }
    return 'fp_' + Math.abs(h).toString(36);
  }

  // Master fingerprint (combines all signals for unique ID)
  function masterFingerprint(webgl, audioFp, fonts){
    var nav = navigator;
    var raw = [
      canvasFingerprint(),
      webgl.fp,
      audioFp,
      nav.userAgent,
      nav.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      window.devicePixelRatio || 1,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency || 0,
      nav.deviceMemory || 0,
      nav.maxTouchPoints || 0,
      nav.platform || '',
      fonts.join(',')
    ].join('|');
    return hash(raw);
  }

  function getBrowser(){
    var ua = navigator.userAgent;
    if(ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
    if(ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
    if(ua.indexOf('Firefox') > -1) return 'Firefox';
    if(ua.indexOf('Edg') > -1) return 'Edge';
    if(ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    return 'Other';
  }

  function getOS(){
    var ua = navigator.userAgent;
    if(ua.indexOf('Win') > -1) return 'Windows';
    if(ua.indexOf('Mac') > -1) return 'macOS';
    if(ua.indexOf('Linux') > -1) return 'Linux';
    if(ua.indexOf('Android') > -1) return 'Android';
    if(ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Other';
  }

  function getDeviceType(){
    var w = window.innerWidth;
    if(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
      return w > 768 ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  // Guess device brand from GPU + user agent
  function getDeviceBrand(){
    var ua = navigator.userAgent;
    if(ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1 || ua.indexOf('Mac') > -1) return 'Apple';
    if(ua.indexOf('Samsung') > -1 || ua.indexOf('SM-') > -1) return 'Samsung';
    if(ua.indexOf('Pixel') > -1) return 'Google Pixel';
    if(ua.indexOf('OnePlus') > -1) return 'OnePlus';
    if(ua.indexOf('Huawei') > -1 || ua.indexOf('HUAWEI') > -1) return 'Huawei';
    if(ua.indexOf('Xiaomi') > -1 || ua.indexOf('Redmi') > -1) return 'Xiaomi';
    if(ua.indexOf('LG') > -1) return 'LG';
    if(ua.indexOf('Sony') > -1) return 'Sony';
    if(ua.indexOf('Motorola') > -1 || ua.indexOf('moto') > -1) return 'Motorola';
    if(ua.indexOf('Nokia') > -1) return 'Nokia';
    if(ua.indexOf('Win') > -1) return 'Windows PC';
    if(ua.indexOf('Linux') > -1) return 'Linux PC';
    return 'Unknown';
  }

  // === MAIN TRACK FUNCTION ===
  function track(){
    var webgl = webglFingerprint();
    var fonts = detectFonts();
    var conn = getConnection();
    var adBlock = hasAdBlocker();
    var nav = navigator;

    audioFingerprint(function(audioFp){
      getBattery(function(battery){
        var fp = masterFingerprint(webgl, audioFp, fonts);

        var data = {
          fingerprint: fp,
          user_agent: nav.userAgent,
          browser: getBrowser(),
          os: getOS(),
          device_type: getDeviceType(),
          screen_resolution: screen.width + 'x' + screen.height,
          language: nav.language || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
          referrer: document.referrer || '',
          page_url: location.pathname,
          page_title: document.title,
          session_id: getSessionId(),
          // Deep intel
          deep: {
            canvas_fp: canvasFingerprint(),
            webgl_fp: webgl.fp,
            gpu_renderer: webgl.renderer,
            gpu_vendor: webgl.vendor,
            audio_fp: audioFp,
            fonts_hash: hash(fonts.join(',')),
            fonts_count: fonts.length,
            font_list: fonts.slice(0, 20), // top 20 for profiling
            device_brand: getDeviceBrand(),
            connection: conn,
            battery: battery,
            ad_blocker: adBlock,
            do_not_track: nav.doNotTrack === '1' || nav.doNotTrack === 'yes',
            touch_support: 'ontouchstart' in window || nav.maxTouchPoints > 0,
            max_touch_points: nav.maxTouchPoints || 0,
            device_memory_gb: nav.deviceMemory || 0,
            cpu_cores: nav.hardwareConcurrency || 0,
            platform: nav.platform || '',
            languages: nav.languages ? Array.from(nav.languages) : [nav.language],
            color_depth: screen.colorDepth,
            pixel_ratio: window.devicePixelRatio || 1,
            timezone_offset: new Date().getTimezoneOffset(),
            screen_avail: screen.availWidth + 'x' + screen.availHeight,
            window_size: window.innerWidth + 'x' + window.innerHeight,
            page_count: (function(){ try { return JSON.parse(sessionStorage.getItem('hm_pages') || '[]').length; } catch(e){ return 1; } })(),
            session_start: sessionStorage.getItem('hm_start') || String(Date.now())
          }
        };

        if(navigator.sendBeacon){
          navigator.sendBeacon(EDGE, JSON.stringify(data));
        } else {
          var x = new XMLHttpRequest();
          x.open('POST', EDGE, true);
          x.setRequestHeader('Content-Type','application/json');
          x.send(JSON.stringify(data));
        }
      });
    });
  }

  // Track scroll depth (how far they read)
  var maxScroll = 0;
  window.addEventListener('scroll', function(){
    var pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if(pct > maxScroll) maxScroll = pct;
  });

  // Send exit data when leaving page
  window.addEventListener('beforeunload', function(){
    var exitData = {
      action: 'exit',
      fingerprint: sessionStorage.getItem('hm_fp') || '',
      session_id: getSessionId(),
      page_url: location.pathname,
      scroll_depth: maxScroll,
      time_on_page: Math.round((Date.now() - (parseInt(sessionStorage.getItem(START_KEY)) || Date.now())) / 1000)
    };
    if(navigator.sendBeacon){
      navigator.sendBeacon(EDGE, JSON.stringify(exitData));
    }
  });

  // Delay to not block rendering
  if(document.readyState === 'complete'){
    setTimeout(track, 300);
  } else {
    window.addEventListener('load', function(){ setTimeout(track, 300); });
  }
})();
