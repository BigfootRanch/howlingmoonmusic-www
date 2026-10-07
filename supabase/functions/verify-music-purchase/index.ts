// verify-music-purchase — Howling Moon Music song / pick-N bundle download gate (2026-10-03).
// Given a Stripe Checkout session id, confirms payment_status=paid with Stripe, then returns ONLY the
// songs that session bought:
//   • itemised orders from create-music-checkout → song ids from session metadata (hm_order=hm-music-v1)
//   • LEGACY pick-N Payment Links (old QR posters; product → N) → the buyer chooses N songs ONCE
//     (POST {session_id, choose:[ids]}), recorded in public.music_purchase_choices; afterwards only those.
//   • curated bundles / legacy albums (downloads/<slug>.html; product → fixed list in _shared/music-curated.ts)
//     → kind "curated" with exactly that page's songs (added 2026-10-03; nothing is recorded).
// Albums keep using verify-album-purchase (untouched). Stripe key: Vault rpc hm_get_stripe_key (service role).
// verify_jwt is OFF (public endpoint for the static site); the gate is the paid-session check + origin allowlist.
// Deploy with ../_shared/music.ts + ../_shared/music-catalog.ts + ../_shared/music-curated.ts included.
// PRIV-01b (2026-10-07): every returned song url is a 24-hour SIGNED url into the PRIVATE pxcx bucket
// `music-masters` (+ `filename` "<TITLE>.<ext>"), never the old public storage url. Signing fails CLOSED:
// if any song can't be signed the whole response is refused. url:null ("Coming Soon") rows stay null.
// Signed urls are never logged. The download PAGE link never expires: each visit re-verifies and re-signs.
// If Stripe can't be read, falls back to the webhook-recorded public.stripe_purchases row (see loadPaidSession).
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  ALLOWED_ORIGINS, classifySession, type PurchaseRow, sessionFromPurchaseRow, type StripeSessionLite, downloadNameFor, masterPathFor, MASTERS_BUCKET, SESSION_ID_RE,
  SIGNED_URL_TTL_SECONDS, songsFor, validateChoice,
} from "../_shared/music.ts";

const SUPPORT = "dogsongstudio@gmail.com";
const FRIENDLY = "We couldn't verify your purchase. If you just paid, give it a minute and refresh — or email " +
  SUPPORT + " and we'll get your music to you.";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let stripeKey: string | null = null;
async function getStripeKey(): Promise<string> {
  if (stripeKey) return stripeKey;
  const { data, error } = await admin.rpc("hm_get_stripe_key");
  if (error || !data) throw new Error("stripe key unavailable: " + (error?.message ?? "empty"));
  stripeKey = data as string;
  return stripeKey;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}
function json(origin: string | null, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}
function refuse(origin: string | null, status = 403, error = "verification_failed"): Response {
  return json(origin, status, { ok: false, error, message: FRIENDLY, support: SUPPORT });
}

async function readChoice(sessionId: string): Promise<string[] | null> {
  const { data, error } = await admin.from("music_purchase_choices").select("song_ids").eq("session_id", sessionId).maybeSingle();
  if (error) throw new Error("choice read failed: " + error.message);
  return data ? (data.song_ids as string[]) : null;
}

/**
 * The paid session, from Stripe; or — only if Stripe can't be read (404 / 401 / 5xx / network) — rebuilt from the
 * webhook-recorded public.stripe_purchases row, so old purchases keep unlocking forever.
 * Returns "not_paid" when Stripe itself says the session is unpaid (never overridden), null when nothing verifies.
 */
async function loadPaidSession(sessionId: string): Promise<StripeSessionLite | "not_paid" | null> {
  try {
    const key = await getStripeKey();
    const sRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=line_items",
      { headers: { Authorization: "Bearer " + key } },
    );
    if (sRes.ok) {
      const s = await sRes.json();
      return s.payment_status === "paid" ? s as StripeSessionLite : "not_paid";
    }
    console.warn("verify-music-purchase: stripe read failed, status", sRes.status, "- trying stripe_purchases");
  } catch (e) {
    console.warn("verify-music-purchase: stripe read error -", (e as Error)?.message, "- trying stripe_purchases");
  }
  const { data, error } = await admin.from("stripe_purchases").select("*")
    .eq("checkout_session", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("purchase row read failed: " + error.message);
  return sessionFromPurchaseRow(data as PurchaseRow | null);
}

/** Replace each stored public url with a short-lived signed url from the private masters bucket. */
async function signSongs<T extends { title: string; url: string | null }>(songs: T[]): Promise<T[]> {
  return await Promise.all(songs.map(async (s) => {
    if (s.url === null) return s; // "Coming Soon" row: nothing to sign
    const path = masterPathFor(s.url);
    if (!path) throw new Error("no master mapping for song: " + s.title);
    // No `download` option here on purpose: download.html / js/curated-download.js already append
    // "&download=<NN TITLE.ext>" to every song url, and a second download= param on /object/sign/ urls is
    // not safe. The clean "<TITLE>.<ext>" name is returned as `filename` for clients that want it.
    const { data, error } = await admin.storage.from(MASTERS_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw new Error("sign failed for song: " + s.title + " (" + (error?.message ?? "empty") + ")");
    return { ...s, url: data.signedUrl, filename: downloadNameFor(s.title, path) };
  }));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return refuse(origin, 403);

  let sessionId = "";
  let choose: unknown = undefined;
  try {
    if (req.method === "POST") {
      const body = await req.json();
      sessionId = String(body.session_id ?? "");
      choose = body.choose;
    } else {
      sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
    }
  } catch (_e) { return refuse(origin, 400); }
  if (!SESSION_ID_RE.test(sessionId)) return refuse(origin, 400);

  try {
    const session = await loadPaidSession(sessionId);
    if (session === "not_paid") return refuse(origin, 403, "not_paid");
    if (!session) return refuse(origin, 403);

    const p = classifySession(session);
    if (p.type === "none") return refuse(origin, 403, "not_a_song_purchase");

    if (p.type === "curated") {
      // curated bundle / legacy album page: exactly that product's song list (url null = "Coming Soon")
      return json(origin, 200, { ok: true, kind: "curated", slug: p.slug, name: p.name, songs: await signSongs(p.songs) });
    }

    if (p.type === "songs") {
      return json(origin, 200, { ok: true, kind: p.kind, songs: await signSongs(songsFor(p.ids)) });
    }

    // LEGACY pick-N: return the recorded choice, or record it once, or ask for it.
    const existing = await readChoice(sessionId);
    if (existing) return json(origin, 200, { ok: true, kind: "bundle", legacy: true, tier: p.tier, songs: await signSongs(songsFor(existing)) });

    if (choose === undefined) return json(origin, 200, { ok: true, kind: "bundle", legacy: true, needs_choice: true, tier: p.tier });

    const c = validateChoice(choose, p.tier);
    if (!c.ok) return json(origin, 400, { ok: false, error: c.error, tier: p.tier, message: "Please pick exactly " + p.tier + " different songs." });

    // First write wins (two tabs can't record two different picks); then re-read what is stored.
    const { error: insErr } = await admin.from("music_purchase_choices")
      .upsert({ session_id: sessionId, tier: p.tier, song_ids: c.ids }, { onConflict: "session_id", ignoreDuplicates: true });
    if (insErr) throw new Error("choice write failed: " + insErr.message);
    const stored = await readChoice(sessionId);
    if (!stored) throw new Error("choice missing after write");
    return json(origin, 200, { ok: true, kind: "bundle", legacy: true, tier: p.tier, songs: await signSongs(songsFor(stored)) });
  } catch (e) {
    console.error("verify-music-purchase error", (e as Error)?.message);
    return refuse(origin, 403);
  }
});
