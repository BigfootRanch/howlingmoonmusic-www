-- v2 first-party analytics: per-event capture + durable device id
create table if not exists public.visitor_events (
  id           bigserial primary key,
  device_id    text,
  session_id   text,
  fingerprint  text,
  page_url     text,
  event_type   text,
  target_sel   text,
  target_text  text,
  target_href  text,
  x            integer,
  y            integer,
  scroll_pct   integer,
  secs         integer,
  client_ts    timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists visitor_events_device_idx  on public.visitor_events (device_id, created_at desc);
create index if not exists visitor_events_session_idx on public.visitor_events (session_id);

-- durable device id on the visit row (stamped by the hm-ux function per session)
alter table public.visitor_log add column if not exists device_id text;
create index if not exists visitor_log_device_idx on public.visitor_log (device_id);

-- events are written only by the service-role edge function; lock out anon/auth.
alter table public.visitor_events enable row level security;
