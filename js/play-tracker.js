/* Retired 2026-10-14. Song-page listens are now recorded by /js/hm-core.js (media stats v3 ->
   hm-ux -> song_plays with start/end/seconds/how-it-ended + IP/identity). This file wrote straight
   to song_plays, which has been closed to public writes since the 4/8 security lockdown, so every
   write failed silently; its filename is also on ad-blocker lists. Kept as a no-op so the ~137
   song pages that still reference it don't 404 and nothing is double-counted. */
