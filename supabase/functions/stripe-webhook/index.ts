// Howling Moon Music — Stripe webhook receiver
// Verifies Stripe signature (STRIPE_WEBHOOK_SECRET) and records
// checkout.session.completed events into public.stripe_purchases.
// v3 PRIV-01b (2026-10-07; first time this source is in the repo — rebuilt from deployed v2). Deployed 2026-10-07 as v3.
//   Also stores line_product_ids, session_metadata and payment_status (migration
//   20261007120000_stripe_purchases_downloads.sql MUST be applied first) so verify-music-purchase /
//   verify-album-purchase can re-verify any purchase from this table if Stripe can't return the session.
//   Rows are only ever written here, after signature verification — that is what makes the fallback safe.
// This function sends NO email. The buyer's permanent download link is
//   https://www.howlingmoonmusic.com/download.html?session_id=<id>   (songs / bundles / curated)
//   https://www.howlingmoonmusic.com/download.html?album=<slug>&session_id=<id>   (albums)
// — see the cutover checklist §"Buyer email" for how to deliver it.
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing stripe-signature", { status: 400 });
  }
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("signature verification failed:", (err as Error).message);
    return new Response("signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Expand line items for the product description + product ids
    let productDescription: string | null = null;
    let lineProductIds: string[] | null = null;
    try {
      const items = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 20,
      });
      productDescription = items.data
        .map((i) => `${i.description ?? "item"} x${i.quantity ?? 1}`)
        .join("; ") || null;
      lineProductIds = items.data
        .map((i) => (typeof i.price?.product === "string" ? i.price.product : i.price?.product?.id) ?? "")
        .filter(Boolean);
    } catch (err) {
      console.error("line_items fetch failed:", (err as Error).message);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("stripe_purchases").upsert(
      {
        stripe_event_id: event.id,
        payment_intent: typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        checkout_session: session.id,
        buyer_name: session.customer_details?.name ?? null,
        buyer_email: session.customer_details?.email ?? null,
        product_description: productDescription,
        amount_cents: session.amount_total,
        currency: session.currency,
        payment_link: typeof session.payment_link === "string"
          ? session.payment_link
          : session.payment_link?.id ?? null,
        line_product_ids: lineProductIds,
        session_metadata: session.metadata ?? null,
        payment_status: session.payment_status ?? null,
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("db insert failed:", error.message);
      return new Response("db insert failed", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
