# Current Task

- Comment hardening follow-up on April 9, 2026 swapped the song-page comment lane to a shared `js/song-comments.js` client that reads/writes through `public-intake` instead of inline direct `rest/v1/song_comments` browser calls.
- GitHub Pages publication is complete: live validation on April 10, 2026 confirmed song pages now serve `song-comments.js`, point at `functions/v1/public-intake`, and no longer contain `rest/v1/song_comments`.
- The homepage quick-react block was also rewired off raw `song_reactions` REST; live root-page validation confirmed `song_reactions_total` via `public-intake` and removal of direct `rest/v1/song_reactions`.

- Task: Task 5C complete, extended into elite song-page attribution hardening.
- Scope: public-site repo only.
- Goal: ensure every published song page writes reactions and plays through `public-intake` with session/fingerprint context instead of inline anonymous REST writes.
- Status: live HTML cleanup complete on all 94 song pages; `hm-track.js` now loads before `play-tracker.js`, and the legacy inline `rest/v1/song_reactions` write path is gone from `songs/*.html`.
