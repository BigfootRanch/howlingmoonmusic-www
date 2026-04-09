# Decisions

- Keep the public site focused on content and remove direct admin affordances.
- Preserve the admin URLs as local-only notices instead of deleting them, so old links fail safely without exposing controls.
- Update service worker and manifest together so the browser does not cache or advertise the old admin shell.
