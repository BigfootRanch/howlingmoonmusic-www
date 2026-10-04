#!/usr/bin/env python3
"""Build the readable invite links: /<platform>/ and /<platform>/<label>/ splash pages.
Each splash loads the EXISTING tracker (js/hm-track.js, untouched), shows a branded
"You're invited" card, then moves the visitor into the site. The database maps the
path to visitor_log.source_code (e.g. youtube-hear-more). Run from the repo root:
    python3 _tools/build-invite-links.py
Add a platform or label below and re-run; commit the new folders."""
import os, html
PLATFORMS = ['youtube','facebook','instagram','tiktok','x','email','text']
LABELS = {
  '':          ("You're invited to The DogMother", "Original Southwest Country Soul by Valentina Talor. Come on in.", "/"),
  'hear-more': ("Hear more like this", "Every mood has a playlist. Pick yours and press play.", "/#moods"),
  'stories':   ("Read the stories behind the music", "Every song started with a real moment. The stories live with the songs.", "/#music"),
}
LOGO = "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/branding/howling-moon-logo.png"
TPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,follow">
<title>{title} — The DogMother | Howling Moon Music</title>
<link rel="canonical" href="https://www.howlingmoonmusic.com{dest}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.howlingmoonmusic.com/{path}">
<meta property="og:title" content="{title} — The DogMother">
<meta property="og:description" content="{sub}">
<meta property="og:image" content="{logo}">
<meta property="og:site_name" content="Howling Moon Music">
<meta name="twitter:card" content="summary">
<meta name="twitter:image" content="{logo}">
<link rel="icon" href="{logo}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<noscript><meta http-equiv="refresh" content="2;url={dest}"></noscript>
<style>
  html,body{{margin:0;min-height:100%;background:#0c0a0e;color:#f5efe6;font-family:'Instrument Sans',-apple-system,sans-serif}}
  body{{display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box;background:radial-gradient(circle at top,rgba(216,179,93,.16),transparent 45%),#0c0a0e}}
  .card{{width:min(560px,100%);text-align:center;padding:40px 28px;border:1px solid rgba(216,179,93,.22);border-radius:24px;background:linear-gradient(180deg,rgba(34,30,41,.92),rgba(16,13,19,.96));box-shadow:0 30px 80px rgba(0,0,0,.5)}}
  .logo{{width:96px;height:96px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px rgba(216,179,93,.25)}}
  .eyebrow{{color:#d8b35d;text-transform:uppercase;letter-spacing:.3em;font-size:.72rem;margin:22px 0 10px}}
  h1{{font-family:'Cinzel',Georgia,serif;font-size:clamp(1.6rem,5vw,2.3rem);line-height:1.15;margin:0 0 12px;color:#f5efe6}}
  p{{color:#c9c0d3;line-height:1.6;margin:0 0 26px;font-size:1rem}}
  a.go{{display:inline-block;background:linear-gradient(135deg,#e8c777,#d8b35d);color:#0d0b0f;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:999px}}
  .wait{{margin-top:18px;font-size:.78rem;color:#8f8699}}
  .bar{{height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin:10px auto 0;width:160px}}
  .bar i{{display:block;height:100%;width:0;background:#d8b35d;animation:fill 1.6s linear forwards}}
  @keyframes fill{{to{{width:100%}}}}
</style>
</head>
<body>
  <main class="card">
    <img class="logo" src="{logo}" alt="The DogMother">
    <div class="eyebrow">The DogMother · Howling Moon Music</div>
    <h1>{title}</h1>
    <p>{sub}</p>
    <a class="go" id="go" href="{dest}">Come on in</a>
    <div class="wait">Taking you there&hellip;<div class="bar"><i></i></div></div>
  </main>
  <script src="/js/hm-track.js" defer></script>
  <script>
    (function(){{
      var dest = {dest_js};
      function go(){{ window.location.replace(dest); }}
      if (document.readyState === 'complete') setTimeout(go, 1700);
      else window.addEventListener('load', function(){{ setTimeout(go, 1700); }});
    }})();
  </script>
</body>
</html>
"""
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
made = []
for p in PLATFORMS:
    for label,(title,sub,dest) in LABELS.items():
        path = p + ('/'+label if label else '')
        d = os.path.join(root, *path.split('/')); os.makedirs(d, exist_ok=True)
        out = TPL.format(title=html.escape(title,quote=True), sub=html.escape(sub,quote=True), dest=dest, dest_js=repr(dest), path=path+'/', logo=LOGO)
        open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(out); made.append(path)
print(len(made), 'invite pages:', ', '.join(made))
