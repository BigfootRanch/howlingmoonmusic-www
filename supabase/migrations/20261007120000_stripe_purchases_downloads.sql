-- PRIV-01b (2026-10-07) — NOT YET APPLIED. Lets verify-music-purchase / verify-album-purchase re-verify a purchase
-- from the webhook-recorded row if the Stripe API ever can't return the Checkout Session (permanent buyer downloads).
-- Additive + nullable only: safe for the live webhook (old code ignores the columns).
alter table public.stripe_purchases
  add column if not exists line_product_ids text[],
  add column if not exists session_metadata jsonb,
  add column if not exists payment_status text;
create index if not exists stripe_purchases_checkout_session_idx on public.stripe_purchases (checkout_session);
