# Current Task

- Comment hardening follow-up on April 9, 2026 swapped the song-page comment lane to a shared `js/song-comments.js` client that reads/writes through `public-intake` instead of inline direct `rest/v1/song_comments` browser calls.
- Local GitHub Pages repo is ready for publication, but `https://howlingmoonmusic.com` was still serving stale comment HTML at validation time.
- Do not mark the public-access hardening migration complete until the live site serves `song-comments.js`, contains `functions/v1/public-intake`, and no longer contains `rest/v1/song_comments`.

- Task: Task 5C complete, extended into elite song-page attribution hardening.
- Scope: public-site repo only.
- Goal: ensure every published song page writes reactions and plays through `public-intake` with session/fingerprint context instead of inline anonymous REST writes.
- Status: live HTML cleanup complete on all 94 song pages; `hm-track.js` now loads before `play-tracker.js`, and the legacy inline `rest/v1/song_reactions` write path is gone from `songs/*.html`.
