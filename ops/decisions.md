# Decisions

- Keep checkout attribution local first so Stripe redirects can land on the correct success or download page with context intact.
- Use a clearly named public Supabase edge-function intake endpoint (`/functions/v1/fan-intake`) instead of the missing `fan_subscribers` table path.
- Preserve the purchase flow visually and keep the wiring minimal so the public site still feels fast and premium.
