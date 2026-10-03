// create-music-checkout — Howling Moon Music itemised song / pick-N bundle checkout (2026-10-03).
// The buyer picks songs FIRST on the site; this function prices the order server-side from the embedded
// catalog (never trusts client prices) and opens a Stripe Checkout Session whose line item NAMES what they
// are buying ("Your 3 songs — The DogMother" + every title). After payment Stripe sends them to
// download.html?session_id=…, where verify-music-purchase returns ONLY the purchased songs.
// Stripe key: Supabase Vault via rpc hm_get_stripe_key (service_role only) — same pattern as
// verify-album-purchase. verify_jwt is OFF (public endpoint for the static sites); deploy with the
// ../_shared/music.ts + ../_shared/music-catalog.ts + ../_shared/music-curated.ts files included
// (music.ts imports all three).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ALLOWED_ORIGINS, checkoutForm, safeReturnUrl, validateOrder } from "../_shared/music.ts";

const SUPPORT = "dogsongstudio@gmail.com";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}
function fail(origin: string | null, status: number, error: string): Response {
  return new Response(JSON.stringify({
    ok: false, error,
    message: "We couldn't start checkout. Please try again — or email " + SUPPORT + " and we'll sort it out.",
  }), { status, headers: corsHeaders(origin) });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return fail(origin, 403, "origin_not_allowed");
  if (req.method !== "POST") return fail(origin, 405, "method_not_allowed");

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch (_e) { return fail(origin, 400, "bad_json"); }

  const order = validateOrder(body);
  if (!order.ok) return fail(origin, 400, order.error);
  const cancelUrl = safeReturnUrl(body.return_url);

  try {
    const key = await getStripeKey();
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
      body: checkoutForm(order, cancelUrl).toString(),
    });
    const session = await res.json();
    if (!res.ok || !session?.url) {
      console.error("stripe create session failed", res.status, session?.error?.type, session?.error?.message);
      return fail(origin, 502, "stripe_error");
    }
    return new Response(JSON.stringify({ ok: true, url: session.url }), { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("create-music-checkout error", (e as Error)?.message);
    return fail(origin, 502, "server_error");
  }
});
