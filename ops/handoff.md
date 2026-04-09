# Handoff

- Homepage checkout buttons now record product and session context before leaving for Stripe.
- Download pages no longer write directly to the missing `fan_subscribers` table path; they call the shared intake helper instead, and that helper now targets `/functions/v1/public-intake`.
- `js/buy-music.js` now owns the shared purchase context and intake helpers, and `js/hm-track.js` now stores `hm_fp` for downstream attribution.
- The public-site repo still has unrelated pre-existing dirty files that were intentionally left untouched.
