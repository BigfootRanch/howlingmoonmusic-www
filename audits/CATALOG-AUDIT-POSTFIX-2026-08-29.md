# Catalog Audit + Postfix — 2026-08-29

Reconciliation of howlingmoonmusic.com against DISTROKID-ALBUM-MASTERS (authority #1) and
00-MASTERFILE-DISTROKID-ALBUMS.xlsx (authority #1). Per-track PASS/FAIL detail is in
`CATALOG-AUDIT-POSTFIX-2026-08-29.csv` (147 song pages). This file is the narrative summary,
totals, and the FLAG list for CEO decisions.

## Authoritative source used
- `DISTROKID-ALBUM-MASTERS/{COCONUT-KISSES,GHOST-WANTED-DEAD-OR-ALIVE,SONGS-TO-CRY-TO,SILENT-TREATMENT,
  HEALING-FREQUENCIES,NEW-MEXICO-NIGHTS,HEALING-INSTRUMENTAL-FREQUENCIES}/*/song-metadata.json + lyrics.txt`
- `00-MASTERFILE-DISTROKID-ALBUMS.xlsx` sheets: ALBUMS-MASTER, the 7 per-album sheets, and
  AUDIO-SWAP-AUDIT (used to verify the Villain P0-3 claim against today's DK swap log).
- TRACKS-INTERNAL-LEDGER was read for context only — nothing from it was copied into the public site.

## Totals (147 song pages)
- Audio identity: 134 PASS, 10 REDIRECT-STUB (converted, no audio to check), 3 NO-SITE-DATA (pre-existing orphan pages, not created this session).
- WAV players found streaming as primary audio: **11 pages** (all fixed — see P0-2 below), plus a homepage widget streaming ~10 WAV files (fixed) and one homepage row streaming a stale UNLEASHED mix instead of the canonical COCONUT KISSES v55 master (fixed).
- Track-97 / "Healing Frequencies" template contamination: **16 pages found, 16 fixed** (folded into the 49-page reconciliation below).
- Stale "Website Exclusive" label on a released track: **33 pages found, all 33 resolved.** The 6 pages still showing "Website Exclusive" after the fix pass (crack-the-sky, fire-from-heaven, looking-for-my-swagger, paper-soldier, tear-drops-in-my-coffee, when-you-wake) are verified **not stale** — they are genuinely still in the "Unreleased / In Progress" bucket in site-data.js, not on any of the 7 current albums, so the label is correct.
- Album/track badge + JSON-LD reconciled against the current 7 albums: **49 pages fixed** in one pass (title casing, `song-details` div, `inAlbum` JSON-LD), covering every page whose slug matches a current-album song record — not just the pages named in the original list (per the "no hand-patching only named ones" instruction). Two more (`rock-a-bye-baby.html`, and `brown-eyes-say.html`/`booty-boom-boom.html` structurally) were caught by a second verification pass and fixed by hand.
- Redirect stubs created for retired canonical-title URLs: **3** (`endless-summer.html`, `lightning-strikes.html`, `port-lavaca-paradise.html`) — all converted to the existing site convention (meta-refresh + `noindex` + canonical link), never deleted.
- Remaining FLAGS needing a CEO decision: **7** (see below), plus 3 pre-existing orphan pages noted for awareness.

## P0 fixes — verified live-testable in the repo (curl list is in the report to the user)

**P0-1 — LEFT MY HEART IN SANTA FE (Rainbow/Port-Lavaca corruption).** Confirmed exactly as described:
page showed "Rainbow Album — Track 30" and Port Lavaca's lyrics while already streaming GHOST trk15
audio (today's earlier commit had already fixed the Stripe buy buttons to GHOST + NM Nights cross-list,
but not the badge/JSON-LD/lyrics). Fixed: badge → GHOST WANTED DEAD OR ALIVE / Track 15, JSON-LD
`inAlbum`, lyrics replaced byte-for-byte from `GHOST-WANTED-DEAD-OR-ALIVE/15-.../lyrics.txt` (structural
labels like "Hook –", "Final Hook – Overlapping Layers" stripped per the site's existing convention,
seen already on `brown-eyes-say.html`), stray trailing "VILLAIN ALBUM" text removed, "More Songs" links
repointed off the two pages that are now redirect stubs.

**P0-2 — WAV regressions.** Found 11 pages (not 5) with a leftover `<audio controls>` block in the hero
section streaming a `.wav` from the old `pxcxtnabyydhbfbholvh` bucket, duplicating (and shadowing) an
already-correct MP3 player lower on the page: `luminarias`, `undo-the-spell`, `choke-on-the-wine`,
`smoky-mountain-snow`, `christmas-on-the-beach` (the 5 named) plus `just-peachy`, `lump-of-coal`,
`my-bed-aint-mine`, `name-above-all-names`, `obsessed`, `the-reckoning`. All 11 blocks removed (identical
pattern, stripped with one regex, verified each page's `songAudio` MP3 player is intact and untouched).
Also found and fixed: `index.html`'s "Unleashed Tracklist" widget played 10 tracks as `.wav` from the
`howls-music` bucket even though the identical-name `.mp3` already existed there (verified 200 on all 10
before swapping); and its "COCONUT KISSES" preview row played the entire album from **old,
pre-remaster `Album%20Collections/...` files on a different Supabase project**, including one `.wav`
(Booty Boom Boom, UNLEASHED mix) — repointed all 14 rows to the canonical `v55/COCONUT-KISSES/...` (and
`v55/GHOST-WANTED-DEAD-OR-ALIVE/14-WORLD-MELTS-AWAY.mp3` for World Melts Away) paths, each verified 200
before the swap, and fixed the two `<a>` hrefs on that row that still pointed at legacy song-page slugs.

**P0-3 — Villain.** The GPT audit's premise doesn't hold: cross-checked `AUDIO-SWAP-AUDIT` in the
masterfile xlsx, which logs today's DK canonical swap for VILLAIN as `villian-(add-vocal) vs1.mp3`,
186.0s — i.e. the ugly-named file already live on the site **is** the file DK adopted as canonical today
(confirmed by downloading the live URL: 186.04s, matches the audit-logged 186s; a different local file at
`Desktop/2-HOWLING-MOON-MUSIC/ALBUMS/VILLAIN/01 - VILLAIN/VILLAIN.mp3` is a different, non-canonical
render — 186.64s, different bytes/MD5 — and was correctly NOT swapped in). No audio change made.
What genuinely was broken: the page's lyrics were paraphrased/incomplete relative to
`ALBUMS/VILLAIN/01 - VILLAIN/VILLAIN - LYRICS.txt` (missing the outro line, one word added that isn't in
the master). Replaced byte-for-byte. FLAG: the storage object's filename (`villian-(add-vocal) vs1.mp3`)
is cosmetically ugly but functionally correct — renaming it is optional cleanup, not a functional fix,
and wasn't attempted (would require the upload/redeploy dance in the hosting note for zero functional
gain).

**P0-4 — Endless Summer / Lightning Strikes My Heart / Port Lavaca.** Confirmed the described bug but
the actual live state was the *reverse* of what P0-4 assumed for two of the three: `lightning-strikes.html`
and `port-lavaca-paradise.html` (the old slugs) already had correct v55 COCONUT KISSES audio, just a
stale "Rainbow Album" badge and truncated/incomplete lyrics; `lightning-strikes-my-heart.html` and
`port-lavaca.html` (the canonical slugs) were noindex meta-refresh stubs to the homepage radio player
with no real content at all. `endless-summer.html` was the indexed page as described, but was still
playing an old `(Cover)` render, not the v55 master. Built all three canonical pages properly (audio,
badge, JSON-LD, full lyrics from the DK masters, canonical/OG/twitter URLs, share-link URLs including
the `%2F`-encoded WhatsApp/SMS variants), converted the three old slugs to redirect stubs matching the
site's existing convention, and swept every other page (`music-archive.html`, `coconut-kisses.html`,
`index.html`, 5 mood pages, 5 more song pages) that still linked to the old slugs. Also discovered
`me-my-dog-spurs.html` (GHOST trk13) was in the same broken state — a noindex radio-stub with no real
page — even though it wasn't named in the P0-4 list; built it the same way from the DK master (lyrics,
audio already correct, full Template B chrome), added an explicit cross-link to `spurs.html` (the
distinct UNLEASHED dog-novelty mix of the same title) so the two are never confused.

**P0-5 — Multi-album songs.** SPURS: confirmed genuinely different recordings — GHOST trk13
`13-ME-MY-DOG-SPURS.mp3` (country ballad, Valentina) vs UNLEASHED's `ME & MY DOG - SPURS (UNLEASHED
mix).mp3` (different mix, vocalist tagged JT in site-data) — kept as two distinct pages, cross-linked.
BROWN EYES SAY: confirmed this was the P0-5 case exactly as described — a leftover UNLEASHED
single-song microsite template (`unleashed-cover.png` hero, "UNLEASHED — Out Aug 14" badge, "More From
UNLEASHED" footer) still live under `brown-eyes-say.html` even though site-data.js had already been
repointed to GHOST trk12 weeks/days ago (audio + lyrics were already correct). Rebuilt the page chrome
to the GHOST identity. Also fixed `explicit: false → true` and `genre: "Country / Dog Songs" →
"Outlaw Country"` in site-data.js to match the DK master (`explicit_reason` on file: "let 'em bark, let
'em bitch, let 'em block me"). BOOTY BOOM BOOM: found in the identical broken state as Brown Eyes Say
(same UNLEASHED microsite template, audio already correct) even though it wasn't named in the list —
rebuilt the same way to COCONUT KISSES trk10. WORLD MELTS AWAY / LOST IN SANTA FE: both are deliberately
cross-listed with GHOST per today's earlier commit (same recording, listed under both albums where
applicable) — reconciled their own badge/JSON-LD via the 49-page batch fix; no merge performed.

## P1 fixes
- **P1-1 (Track 97 contamination)** and **P1-2 (stale Website Exclusive)**: folded into the 49-page
  systematic reconciliation above, which checked *every* page against its true site-data.js album/track
  — not just the named examples.
- **P1-3 (JT credits / title spelling)**: the "(feat. JT)" title-suffix claim does not check out against
  the DK masters — no GHOST track's `song-metadata.json` title carries a "(feat. JT)" suffix (matches the
  standing law that JT is a guest vocalist credit, never a title-level feature). What *is* correct and
  present in site-data.js: a `vocalist` field of `"JT"` or `"JT & Valentina"` on `drown-in-the-bottle`,
  `ghost-wanted-dead-or-alive`, `held-you-first`, `rodeo-cowboy` — already reflected correctly in 3 of
  the 4 pages' `song-artist` line; `rodeo-cowboy.html` was missing it and has been fixed to "JT &
  Valentina". Title spelling ("BROWN EYES SAY" not "...Baby Let It Go)"; "ME & MY DOG | SPURS") was
  already correct in site-data and is now correct on every page after the ALL-CAPS title sync (below).
- **ALL CAPS title law**: cross-checked all 90 current-album track titles against the xlsx per-album
  sheets (authority #1) and found `site-data.js` itself had ~55 titles in mixed case, not the canonical
  ALL CAPS. Corrected `site-data.js` titles to match the xlsx exactly, then synced every page's `<h1>`,
  `<title>`, and JSON-LD `name` to match.
- **P1-4 (sitemap)**: regenerated. Removed the 3 stale-slug entries, added 21 currently-indexed pages
  that were missing entirely (mostly HEALING FREQUENCIES / GHOST tracks that were never added, unrelated
  to this session's fixes, plus the 3 new canonical pages). Verified well-formed XML.
- **P1-5 (homepage JSON-LD)**: `MusicGroup.album[]` on `index.html` updated from `["UNLEASHED", "New
  Mexico Serenade", "Outlaw Hearts & Desert Stars"]` (the last two don't exist anywhere in the current
  catalog) to the 8 real current albums (UNLEASHED + the 7 current-2026-08 albums).

## Data-layer fixes (site-data.js)
- Album slug collision: the legacy "Healing Frequencies" album (`f1d37778-...`) had the same slug
  (`healing-frequencies`) as the current `healing-frequencies-2026-08` album — renamed the legacy one's
  slug to `healing-frequencies-legacy` and marked it `archived: true` (matching the pattern already used
  for other superseded albums).
- Song slug collision: two songs shared the slug `never-let-go` (the COCONUT KISSES released track and
  an unrelated "Never Let Go / Hand in Hand" row still in Unreleased/In Progress) — renamed the
  unreleased one's slug to `never-let-go-hand-in-hand`.
- `explicit` flag corrected against DK master metadata: `drown-in-the-bottle` True→False, `brown-eyes-say`
  False→True.

## FLAGS — need a CEO decision, not executed this session
1. **Lyrics-trimming pattern on 7 pre-existing pages** (not touched by any P0/P1 item, found during the
   systematic audio/lyrics cross-check): `down-under` (~80% word-overlap with master), `drown-in-the-bottle`
   (~77%), `i-didnt-die` (~74%), `rodeo-cowboy` (~72%), `smoke-me` (~67%), `woke-up-laughing` (~71%). Each
   page's lyrics section is a genuine subset of the DK master's `lyrics.txt` (missing verses/repeats), not
   a wrong-song substitution — audio and album/track badge are correct on all of them. This looks like a
   pre-existing site-wide editorial convention (trim repeated choruses for web readability) rather than
   corruption, but I did not expand any of these to the full master lyrics myself: that's dozens of lines
   of body copy across 6 pages and the task scope named only one specific lyrics-corruption case (P0-1).
   Recommend CEO decide: leave as trimmed (if intentional), or authorize a follow-up pass to paste in full
   master lyrics for these 6.
2. **3 pre-existing orphan pages** with no matching site-data.js record: `hungry-eyes.html`,
   `im-begging-you.html`, `peach-on-fire.html` (note: `peach-on-fire.html` is a *different* file from the
   real, correctly-wired `juicy-peach-on-fire.html` redirect stub → the live `peach-on-fire.html` page
   itself has content but nothing in site-data.js points to it). Not created or touched this session;
   flagging for awareness since they won't show up in any site-data-driven audit going forward.
3. **Villain storage filename** (`villian-(add-vocal) vs1.mp3`) — functionally correct (see P0-3 above)
   but cosmetically unprofessional in a public URL. Optional rename via the edge-function upload path in
   the hosting note; not done (no functional benefit, real cost/risk).

## P2 — architecture recommendation (not implemented, per instructions)
The root cause of nearly every defect in this audit is that a song's identity lives in **three
independent places that can drift**: (1) `site-data.js`'s `songs[]` array (album_id/track_number/title),
(2) each song's individually hand-authored static HTML page (its own copy of album/track/title/JSON-LD/
audio src), and (3) whichever DistroKid album the recording actually shipped on. Nothing enforces that
(2) stays in sync with (1), and nothing enforces that (1) stays in sync with (3) — which is exactly how
`brown-eyes-say.html` and `booty-boom-boom.html` ended up months behind their own site-data.js records,
and how 55 titles drifted out of ALL-CAPS compliance without anyone noticing.

Recommended (not built): a `composition` (song identity) / `recording` (a specific master, keyed by DK
song_id/ISRC) / `release_track` (recording × album × track_number) model, with the static HTML pages
generated from that data at build time instead of hand-authored, plus a CI check that fails a push if any
song page's rendered album/track/title/genre doesn't match its `release_track` row, or if any `<audio>`
src resolves to a `.wav`, or if a released track's title isn't ALL CAPS. That single gate would have
caught essentially every defect in this audit automatically instead of requiring a full manual sweep.
