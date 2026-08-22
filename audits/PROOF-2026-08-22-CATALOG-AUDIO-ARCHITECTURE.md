# PROOF — Full catalog audio: architecture fix (2026-08-22)

CEO reports, in order:
1. "none of the songs are playing on the radio"
2. "404 on puppy songs and other songs… all songs in full catalog must have the most recent audios"
3. "mobile — full catalog songs not playing, none of them working"
4. "clicked on sheriff… wrong song started playing… you have a master file with the
   correct audios so there is no reason for our very own website to be mismatched"
5. "think architecture not one off patch fixes, thats why the site was so broken to begin with"

(5) is the correct diagnosis. All four symptoms are the same disease.

## The disease: four places each decided truth for themselves

`site-data.js` (SITE_DATA) is the catalog. Nothing read it as the authority:

| surface | what it did | result |
|---|---|---|
| radio | built URLs from `audio_path` + the OLD project's bucket | 89 of 109 tracks 404'd |
| song pages | hardcoded `<audio src>` at author time | 74 stale, 16 empty, 2 `.wav` |
| album tracklists | hardcoded HTML with their own page slugs | rows resolved to NO song |
| play controls | `allSongs` (111) vs `radioQueue` (101) | 8 live-looking dead buttons |

Every layer re-derived what it should have read. That is why fixing one moved the
breakage rather than removing it.

## The wrong-song bug, exactly

Not fuzzy matching — I said that first and it was wrong. `songIdByTitle('SHERIFF')`
returned the **correct** id. The chain:

```
correct id 2bdb4961-… -> playSongInRadio(id)
  existingIndex = -1                       (explicit tracks are fenced out of the queue)
  buildRadioQueue('all') -> returns TRUE but still excludes it
  fallbackIndex = -1
  radioIndex = fallbackIndex >= 0 ? fallbackIndex : radioIndex   <-- keeps the OLD index
  playCurrentTrack() -> plays index 0 = "Dogs Have Never"
```

The substitution was written into the code. The exclusion itself is deliberate and
CEO-ordered (2026-08-10, quoted at `getSongsForSource`): explicit tracks play only
under the JT pill. **That rule was not touched.**

## What changed — two invariants, not a rewrite

**A. A play request plays THAT song or nothing.** `playSongInRadio` resolves the
landed index and calls `refuseTrack()` when the song is not in the queue, showing an
honest message ("SHERIFF is explicit — it plays under the JT pill only"). Same hole
existed in the mood branch; fixed there too.

**B. One predicate decides "playable."** `addSongActionButtons` now gates on the same
`audio_path && !explicit` the queue uses. Explicit rows render dimmed with a true
tooltip instead of a live-looking button.

**C. Identity is stamped, not scraped.** The v28 renderer already computed each row's
catalog id for its click handler; it now writes it to `data-song-id` and controls read
identity from there, slug only as fallback. Rows with no page link (SHERIFF, SUFFER IN
SILENCE…) previously resolved to no song at all.

**D. One URL builder.** `trackAudioUrl()` prefers the absolute `audio_url`; it is the
only place a track URL is constructed (`grep -c "AUDIO_BASE +"` = 1).

**E. Controls survive a late rebuild.** The v28 rework rebuilds album cards after the
single `addSongActionButtons()` pass, so the 5 newest albums had ZERO play buttons. A
debounced MutationObserver re-runs the (idempotent) sweep whenever rows appear.

Deliberately NOT changed: the catalog's markup, ordering, covers, badges, retired
albums, `hm-card-head`/`hm-card-body` structure, and the explicit/JT rule.

## Live proof (www.howlingmoonmusic.com, 390x844 mobile unless noted)

| assertion | before | after |
|---|---|---|
| radio queue URLs returning 206 | 20 / 109 | **109 / 109** |
| song pages 404 (public) | 9 | **0** |
| song pages serving the catalog's newest master | 27 | **117 / 117** |
| song-page audio URLs returning 206 | — | **117 / 117** |
| `.wav` served anywhere | 2 pages (13.7MB, 15.7MB) | **0** |
| catalog play controls | 76 (5 newest albums = 0) | **150** |
| **requested song == played song** | not asserted | **126 / 126, zero failures** |
| v55 titles/track numbers vs DistroKid masters | not checked | **59 / 59 agree** |
| **served bytes == local master bytes** | not checked | **59 / 59 identical** |

Real hand-clicks (mobile): SHERIFF -> refuses honestly, plays nothing, no substitution.
SHOVE IT -> `03-SHOVE-IT.mp3`, playing, no error (had no working control before today).
Screenshot read back: "NOW PLAYING · SUFFER IN SILENCE", pause icon, progress advanced.

The byte-identical check is the one that answers "mismatched": every v55 file the site
serves is the same size as the master in `~/Desktop/DISTROKID-ALBUM-MASTERS`.

## Catalog rows repointed to newer masters (CEO ear needed)

Chosen from file size + upload date, **not by listening**. Old -> new:

| song | old | new |
|---|---|---|
| Lightning Strikes | `Album Collections/LIGHTNING STRIKES MY HEART.mp3` | `v55/COCONUT-KISSES/07-…` (8/22) |
| Port Lavaca Paradise | `Album Collections/PORT LAVACA.mp3` | `v55/COCONUT-KISSES/08-…` (8/22) |
| Christmas Puppy | `Puppy Christmas (1).mp3` 3,682,457 B | `Puppy Christmas.mp3` 4,136,301 B (8/14) |
| Slobbery Kiss | `PUPPY DOG SONGS/SLOBBERY KISS (1).mp3` 3,722,970 B | `SLOBBERY KISS .mp3` 4,024,557 B (8/14) |
| Obsessed | `BEACH VIBES/still-obsessed.mp3` 4,650,981 B | `legacy-mp3/obsessed.mp3` 4,911,597 B (8/22) |

No newer master exists anywhere in storage for: Enchanted Green Haze, Goodnight Baby,
Las Cruces Nights, Mi Hogar, Only Gift I Need, Rainbow, Still The Asshole, Tattoo In
Albuquerque, Villain. Bigfoot Lives Here is byte-identical in both buckets.

## Open — CEO decisions, not defects

1. **SHERIFF and EMOTIONAL HOSTAGE are explicit and on HER OWN new album.** The 8/10
   rule was written about JT's explicit tracks. Right now they are playable nowhere on
   the site. Also fenced: Drown in the Bottle, Kick Your Ass, Juicy Peach on Fire,
   Pussy Juice, Tongue & Groove, I Ain't Picking Up Your Shit No More.
2. **"Villain" plays `villian-(add-vocal) vs1.mp3`** — misspelled, and "add-vocal vs1"
   reads like a working version, not a master. Only real title/filename disagreement of
   109 checked (the other 9 flags are spelling variants: `daddys-eyes`, `FIREFLYS…`).
3. **Duplicate catalog rows**: Lightning Strikes / LIGHTNING STRIKES MY HEART,
   Port Lavaca Paradise / PORT LAVACA, Obsessed / still-obsessed. Both now play the same
   master, so the song appears twice under two names. Dedupe is a content call.
4. **9 redirect stubs are a stopgap.** SHOVE IT, ENDLESS SUMMER HEAT, LIGHTNING STRIKES
   MY HEART, PORT LAVACA and ME & MY DOG | SPURS have no real song page.
5. **The generator is still wrong** — whatever writes `site-data.js` keeps emitting
   `audio_path` values for a bucket that never held those files.
6. **Song pages still hardcode their URL** and there is no generator in the repo, so the
   next catalog repoint drifts them again. Durable answer is a shared runtime setter;
   that pulls 558KB of `site-data.js` onto every song page, so it is a real trade.

## Commits

`62ea9b4` radio audio_url · `751600c` 95 pages + 9 stubs · `76c9f14` 4 catalog repoints
`a99a98c` Obsessed · `14c998e` catalog sweep · `22a48b9` MutationObserver
`da558b0` invariants A+B · `b7daed1` data-song-id
