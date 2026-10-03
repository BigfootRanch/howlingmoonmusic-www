-- Howling Moon Music project (pxcxtnabyydhbfbholvh) — 2026-10-03
-- One-time song choice for LEGACY pick-N Payment Link purchases (the old "Build Your Own Bundle (N Songs)"
-- links still printed on QR posters). The session carries no song list, so after paying the buyer picks N
-- songs exactly once; verify-music-purchase records the pick here and from then on serves only those songs.
-- New itemised orders (create-music-checkout) carry their songs in Stripe metadata and never touch this table.
create table if not exists public.music_purchase_choices (
  session_id  text primary key check (session_id ~ '^cs_(live|test)_[A-Za-z0-9]{10,}$'),
  tier        smallint not null check (tier between 1 and 50),  -- 3/5/10 per link (x quantity)
  song_ids    text[]   not null check (cardinality(song_ids) = tier),
  created_at  timestamptz not null default now()
);

comment on table public.music_purchase_choices is
  'Legacy pick-N Stripe Payment Link sessions -> the songs the buyer chose once after paying. Written only by the verify-music-purchase edge function (service role).';

-- Service role only: RLS on with NO policies, and no grants to anon/authenticated.
alter table public.music_purchase_choices enable row level security;
revoke all on public.music_purchase_choices from anon, authenticated;
