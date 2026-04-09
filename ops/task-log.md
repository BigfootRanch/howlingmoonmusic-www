# Task Log

- 2026-04-09: Audited repo state and confirmed the public-site checkout pages still referenced the dead `fan_subscribers` path.
- 2026-04-09: Added a shared purchase helper that captures session, landing page, referrer, product, and UTM context before leaving for Stripe.
- 2026-04-09: Rewired homepage, build-your-own, and Outlaw Love checkout entry points to persist attribution locally before checkout.
- 2026-04-09: Replaced the download-page REST writes with a public edge-function intake call and removed the dead table dependency.
