// hm-ux — first-party UX event sink for howlingmoonmusic.com (owner's own analytics).
// Neutrally named on purpose so content blockers don't drop it.
// Accepts click/scroll/nav batches, inserts into public.visitor_events with the
// service role, and stamps the durable device_id onto the matching visit row so a
// device stays matchable across IP changes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: cors });
  try {
    const body = await req.json();
    const device_id = String(body.device_id || "").slice(0, 80);
    const session_id = String(body.session_id || "").slice(0, 120);
    const fingerprint = String(body.fingerprint || "").slice(0, 120);
    const page_url = String(body.page_url || "").slice(0, 300);
    const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = events.map((e: Record<string, unknown>) => ({
      device_id, session_id, fingerprint,
      page_url: String((e.page ?? page_url) || "").slice(0, 300),
      event_type: String(e.t || "event").slice(0, 24),
      target_sel: e.sel ? String(e.sel).slice(0, 120) : null,
      target_text: e.text ? String(e.text).slice(0, 120) : null,
      target_href: e.href ? String(e.href).slice(0, 300) : null,
      x: typeof e.x === "number" ? Math.round(e.x) : null,
      y: typeof e.y === "number" ? Math.round(e.y) : null,
      scroll_pct: typeof e.pct === "number" ? e.pct : (typeof e.scroll_pct === "number" ? e.scroll_pct : null),
      secs: typeof e.secs === "number" ? e.secs : null,
      client_ts: e.ts ? new Date(Number(e.ts)).toISOString() : null,
    }));

    if (rows.length) await supa.from("visitor_events").insert(rows);

    // Stamp the durable device id onto this session's visit rows that lack it.
    if (device_id && session_id) {
      await supa.from("visitor_log").update({ device_id })
        .eq("session_id", session_id).is("device_id", null);
    }
    return new Response(JSON.stringify({ ok: true, n: rows.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
