# PROOF — Howling Moon Radio audio fix (2026-08-22)

**Reported:** "none of the songs are playing on the radio"
**Status:** 🟢 DONE — LIVE-PROVEN desktop + mobile
**Commit:** `62ea9b4` on `main` (deploy branch — byte-verified identical to live before edit)

## Root cause (NOT a player bug)

`SITE_DATA.songs` carries two location fields:

| field | meaning |
|---|---|
| `audio_path` | bucket-relative, legacy |
| `audio_url`  | absolute, authoritative |

Commit `9d02de7` ("v57: all 145 songs repointed to verified-live MP3s") moved the
catalog to the **v55 masters**, which live in bucket `howls-music` on Supabase
project `vwedcmdtsvktbirlgvdb`. Only `audio_url` recorded that.

The radio still built every URL as `AUDIO_BASE + audio_path`, i.e. the **old**
project `pxcxtnabyydhbfbholvh`, bucket `audio` — which never received those files.

Verified: bucket `audio` was listed recursively (432 objects). It contains
**no `v55/` and no `legacy-mp3/` folder at all.**

## Measured, before the fix (all 109 public radio-queue tracks)

| URL built from | 206 OK | 400 `NoSuchKey` |
|---|---|---|
| `audio_path` (what the player used) | **20** | **89** |
| `audio_url` (already in the data)   | **109** | **0** |

Literal error body:
```
{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

The 20 that still played were exactly the rows whose `audio_path` happened to be
an absolute URL already, hitting the `/^https?:\/\//` escape hatch.

Only the radio was affected: all **36** hardcoded album-preview `data-src` /
`src` URLs on the homepage returned 206 before and after.

## The fix

One helper is now the only place a track URL is constructed:

```js
function trackAudioUrl(song) {
  if (!song) return null;
  if (song.audio_url) return song.audio_url;
  const audioPath = song.audio_path || (song.slug + '.mp3');
  return /^https?:\/\//.test(audioPath) ? audioPath : AUDIO_BASE + encodeURIComponent(audioPath).replace(/%2F/g, '/');
}
```

Routed through **both** call sites — `primeCurrentTrack()` and the resume
src-match guard in the `#radioBtn` handler. Patching only the first would have
left the guard computing the old URL, comparing it to the new `audioEl.src`,
never matching, and reloading forever.

Gate: `grep -c "AUDIO_BASE +" index.html` = **1** (before: 2).
Syntax: 10 inline scripts parsed, 1 error = the pre-existing `application/ld+json`
block — identical count on the unpatched file (negative control).

## Live proof

**Rendered page** (not the deploy): `curl` with cache-buster →
`function trackAudioUrl` present, `AUDIO_BASE +` count = 1.

**Patched code path over live data:** 109 queue tracks → helper → **109 × HTTP 206**, 0 nulls.

**Real hand-click, desktop 1440×900:**
```json
{"src":"https://vwedcmdtsvktbirlgvdb.supabase.co/storage/v1/object/public/howls-music/v55/COCONUT-KISSES/10-BOOTY-BOOM-BOOM.mp3",
 "paused":false,"currentTime":10.3,"duration":229.7,"readyState":4,"errorCode":null,"label":"Now Playing"}
```
Then 4 consecutive Next clicks — Cotton Candy, NEVER LET GO, Barefoot Beach
Beauty, Sand in Toes — all `playing:true`, `err:null`, all from `howls-music`.
Screenshot read back: "NOW PLAYING · Sand in Toes — Valentina", pause icon shown.

**Real hand-click, mobile 390×844:** resumed the persisted session and played
`14-SAND-IN-TOES.mp3` at `currentTime 52.04`, `paused:false`, `readyState:4`,
`err:null`. Screenshot read back: NOW PLAYING + advanced progress bar.
(This also proves the resume guard — the path that would have broken on a
half-fix.)

## Open, NOT fixed here (own row)

1. 🔴 **The generator is still wrong.** Whatever writes `site-data.js` keeps
   emitting `audio_path` values (`v55/…`, `legacy-mp3/…`) for a bucket that has
   never held those files, while putting the true location in `audio_url`. The
   helper makes the site correct today and self-healing for new songs, but the
   generator should be fixed at source.
2. 🟡 Console error `Cannot close a closed AudioContext` on the mobile resume
   path. Pre-existing, unrelated to this change, benign (visualizer teardown).
3. 🟡 `gh` CLI token is invalid and the `puppyreports_deploy` SSH key is
   **read-only** on this repo. Push worked via `GITHUB_PERSONAL_ACCESS_TOKEN`.
4. 🟡 Desktop clone `~/Desktop/2-HOWLING-MOON-MUSIC/Howling Moon Music/howlingmoonmusic-www`
   is stale (May 29) and has a stuck `.git/index.lock` — left untouched. Work was
   done in a fresh clone.
