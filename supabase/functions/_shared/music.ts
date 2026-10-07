// music.ts — pure pricing / validation / Stripe-form logic shared by create-music-checkout and
// verify-music-purchase. NO Deno or network APIs in here: it is unit-tested under plain Node
// (_tests/music.test.ts, `node --test`), and the edge functions import it as-is.
// Erasable TypeScript only (no enums / namespaces / parameter properties) so Node type-stripping runs it.
import { MUSIC_CATALOG, type CatalogSong } from "./music-catalog.ts";
import { MUSIC_CURATED, type CuratedProduct, type CuratedSong } from "./music-curated.ts";

export const ARTIST = "The DogMother";
export const SITE = "https://www.howlingmoonmusic.com";
export const ALLOWED_ORIGINS = [
  "https://www.howlingmoonmusic.com",
  "https://howlingmoonmusic.com",
  "https://www.puppyreports.com",
];
export const SUCCESS_URL = SITE + "/download.html?session_id={CHECKOUT_SESSION_ID}";
export const DEFAULT_CANCEL_URL = SITE + "/build-your-own.html";

// CEO pricing law (2026-08-29): every track $1.29. Pick-N bundle prices are the long-standing ladder.
export const SONG_PRICE_CENTS = 129;
export const BUNDLE_PRICE_CENTS: Record<number, number> = { 3: 499, 5: 699, 10: 999 };

// Legacy fixed Payment Links ("Build Your Own Bundle (N Songs)") — still printed on QR posters. Their
// sessions carry no song list; the buyer chooses N songs once after paying. Keyed by Stripe product id
// (read back from GET /v1/payment_links on 2026-10-03; the puppy pick-3 link shares the 3-song product).
export const LEGACY_BUNDLE_PRODUCTS: Record<string, number> = {
  "prod_UFRjXdopdLCcWd": 3,
  "prod_UFRj2oaSjPWnZv": 5,
  "prod_UFRjd7iLxa4r2s": 10,
};

export const ORDER_MARKER = "hm-music-v1"; // metadata.hm_order on every session this function creates
export const SOURCES = ["hmm", "puppyfm"];

export const CATALOG_BY_ID: Record<string, CatalogSong> = Object.fromEntries(
  MUSIC_CATALOG.map((s) => [s.id, s]),
);

/** Own-property lookup only — ids like "__proto__" / "constructor" must never resolve. */
export function has<T>(map: Record<string, T>, key: string): boolean {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(map, key);
}

export function formatUsd(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

export type Order =
  | { ok: true; kind: "song" | "bundle"; tier: number; ids: string[]; amount: number; source: string }
  | { ok: false; error: string };

/** Validate an untrusted checkout request body and price it server-side. */
export function validateOrder(body: unknown, catalog: Record<string, CatalogSong> = CATALOG_BY_ID): Order {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_request" };
  const b = body as Record<string, unknown>;
  const kind = b.kind;
  const source = typeof b.source === "string" && SOURCES.includes(b.source) ? b.source : "hmm";
  const raw = Array.isArray(b.song_ids) ? b.song_ids : null;
  if (!raw || raw.some((x) => typeof x !== "string")) return { ok: false, error: "bad_song_ids" };
  const ids = (raw as string[]).map((x) => x.trim());
  if (new Set(ids).size !== ids.length) return { ok: false, error: "duplicate_songs" };
  for (const id of ids) if (!has(catalog, id)) return { ok: false, error: "unknown_song" };

  if (kind === "song") {
    if (ids.length !== 1) return { ok: false, error: "song_needs_exactly_one" };
    return { ok: true, kind: "song", tier: 1, ids, amount: SONG_PRICE_CENTS, source };
  }
  if (kind === "bundle") {
    const tier = Number(b.tier);
    const amount = BUNDLE_PRICE_CENTS[tier];
    if (!amount) return { ok: false, error: "bad_tier" };
    if (ids.length !== tier) return { ok: false, error: "wrong_song_count" };
    return { ok: true, kind: "bundle", tier, ids, amount, source };
  }
  return { ok: false, error: "bad_kind" };
}

/** Only allow a cancel/return URL on one of our own https origins; otherwise fall back. */
export function safeReturnUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 1000) return DEFAULT_CANCEL_URL;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || !ALLOWED_ORIGINS.includes(u.origin)) return DEFAULT_CANCEL_URL;
    return u.toString();
  } catch (_e) {
    return DEFAULT_CANCEL_URL;
  }
}

/** Human line item: what the buyer sees on the Stripe Checkout page. */
export function lineItemFor(order: { kind: string; tier: number; ids: string[] }, catalog = CATALOG_BY_ID) {
  const titles = order.ids.map((id) => catalog[id].title.toUpperCase());
  if (order.kind === "song") {
    return {
      name: titles[0],
      description: "Instant song download — " + ARTIST + " · yours to keep",
    };
  }
  return {
    name: "Your " + order.tier + " songs — " + ARTIST,
    description: titles.join(" · "),
  };
}

/** Song ids → metadata fields (Stripe caps each value at 500 chars; split defensively). */
export function encodeSongIds(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let part = "", n = 1;
  for (const id of ids) {
    const next = part ? part + "," + id : id;
    if (next.length > 490) {
      out[n === 1 ? "song_ids" : "song_ids_" + n] = part;
      n++;
      part = id;
    } else part = next;
  }
  out[n === 1 ? "song_ids" : "song_ids_" + n] = part;
  return out;
}

export function decodeSongIds(meta: Record<string, string> | null | undefined): string[] {
  if (!meta) return [];
  const parts = [meta.song_ids || ""];
  for (let n = 2; meta["song_ids_" + n]; n++) parts.push(meta["song_ids_" + n]);
  return parts.join(",").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Form body for POST https://api.stripe.com/v1/checkout/sessions (application/x-www-form-urlencoded). */
export function checkoutForm(
  order: { kind: "song" | "bundle"; tier: number; ids: string[]; amount: number; source: string },
  cancelUrl: string,
  catalog = CATALOG_BY_ID,
): URLSearchParams {
  const li = lineItemFor(order, catalog);
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", SUCCESS_URL);
  f.set("cancel_url", cancelUrl);
  f.set("client_reference_id", order.source);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "usd");
  f.set("line_items[0][price_data][unit_amount]", String(order.amount));
  f.set("line_items[0][price_data][product_data][name]", li.name);
  f.set("line_items[0][price_data][product_data][description]", li.description);
  f.set(
    "custom_text[submit][message]",
    "Right after payment you'll land on your download page with " +
      (order.kind === "song" ? "this song" : "these " + order.tier + " songs") + " ready to save.",
  );
  const meta: Record<string, string> = {
    hm_order: ORDER_MARKER,
    kind: order.kind,
    tier: String(order.tier),
    source: order.source,
    ...encodeSongIds(order.ids),
  };
  for (const [k, v] of Object.entries(meta)) {
    f.set("metadata[" + k + "]", v);
    f.set("payment_intent_data[metadata][" + k + "]", v);
  }
  f.set("payment_intent_data[description]", li.name + (order.kind === "bundle" ? ": " + li.description : ""));
  return f;
}

// ---------------- verification side ----------------

export interface StripeSessionLite {
  payment_status?: string;
  metadata?: Record<string, string> | null;
  line_items?: { data?: { quantity?: number | null; price?: { product?: string | { id?: string } } | null }[] } | null;
}

export type Purchase =
  | { type: "songs"; kind: string; ids: string[] }
  | { type: "legacy"; tier: number }
  | { type: "curated"; slug: string; name: string; products: string[]; songs: CuratedSong[] }
  | { type: "none" };

/** Classify a PAID session: new itemised order, legacy pick-N link, or not a song purchase. */
export function classifySession(
  s: StripeSessionLite,
  catalog = CATALOG_BY_ID,
  curated: Record<string, CuratedProduct> = MUSIC_CURATED,
): Purchase {
  const m = s.metadata || {};
  if (m.hm_order === ORDER_MARKER && (m.kind === "song" || m.kind === "bundle")) {
    const ids = decodeSongIds(m).filter((id) => has(catalog, id));
    if (ids.length) return { type: "songs", kind: m.kind, ids };
    return { type: "none" };
  }
  let tier = 0;
  for (const it of s.line_items?.data ?? []) {
    const p = it.price?.product;
    const pid = typeof p === "string" ? p : p?.id;
    const n = pid && has(LEGACY_BUNDLE_PRODUCTS, pid) ? LEGACY_BUNDLE_PRODUCTS[pid] : undefined;
    if (n) tier += n * Math.max(1, Number(it.quantity) || 1);
  }
  if (tier) return { type: "legacy", tier };
  return curatedPurchase(s, curated);
}

/** Curated bundle / legacy album pages (downloads/<slug>.html): product id → that page's exact song list. */
export function curatedPurchase(
  s: StripeSessionLite,
  curated: Record<string, CuratedProduct> = MUSIC_CURATED,
): Purchase {
  const hits: string[] = [];
  for (const it of s.line_items?.data ?? []) {
    const p = it.price?.product;
    const pid = typeof p === "string" ? p : p?.id;
    if (pid && has(curated, pid) && !hits.includes(pid)) hits.push(pid);
  }
  if (!hits.length) return { type: "none" };
  const first = curated[hits[0]];
  return {
    type: "curated",
    slug: first.slug,
    name: hits.length === 1 ? first.name : hits.map((h) => curated[h].name).join(" + "),
    products: hits,
    songs: hits.flatMap((h) => curated[h].songs.map((x) => ({ title: x.title, url: x.url }))),
  };
}

/** Validate a legacy buyer's one-time choice. */
export function validateChoice(choose: unknown, tier: number, catalog = CATALOG_BY_ID):
  { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(choose) || choose.some((x) => typeof x !== "string")) return { ok: false, error: "bad_song_ids" };
  const ids = (choose as string[]).map((x) => x.trim());
  if (new Set(ids).size !== ids.length) return { ok: false, error: "duplicate_songs" };
  if (ids.length !== tier) return { ok: false, error: "wrong_song_count" };
  for (const id of ids) if (!has(catalog, id)) return { ok: false, error: "unknown_song" };
  return { ok: true, ids };
}

export function songsFor(ids: string[], catalog = CATALOG_BY_ID) {
  return ids.filter((id) => has(catalog, id)).map((id) => ({ id, title: catalog[id].title, url: catalog[id].url }));
}

export const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,}$/;

// ---------------- PRIV-01b (2026-10-07): paid masters live in the PRIVATE pxcx bucket `music-masters` ----------------
// The catalog / curated lists keep their historical public URLs as stable keys; at download time each one is mapped
// to its copy in `music-masters` and handed out as a short-lived signed URL (never the public URL):
//   vwedc  .../object/public/howls-music/<path>  → music-masters/<path>          (same relative path)
//   pxcx   .../object/public/audio/<path>        → music-masters/audio/<path>
export const MASTERS_BUCKET = "music-masters";
// CEO 2026-10-07: 24 h so a slow / large WAV download never breaks. The buyer's download PAGE link
// (download.html?session_id=… / downloads/<slug>.html?session_id=…) never expires: every visit re-verifies
// the paid session and mints FRESH signed urls.
export const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const MASTER_SOURCES: { prefix: string; dest: string }[] = [
  { prefix: "https://vwedcmdtsvktbirlgvdb.supabase.co/storage/v1/object/public/howls-music/", dest: "" },
  { prefix: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/", dest: "audio/" },
];

/** Stored public URL → object path inside `music-masters` (url-decoded), or null if it isn't a known master URL. */
export function masterPathFor(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  for (const src of MASTER_SOURCES) {
    if (!url.startsWith(src.prefix)) continue;
    let rest: string;
    try {
      rest = decodeURIComponent(url.slice(src.prefix.length).split(/[?#]/)[0]);
    } catch (_e) {
      return null;
    }
    if (!rest || rest.startsWith("/") || rest.split("/").some((seg) => seg === ".." || seg === ".")) return null;
    return src.dest + rest;
  }
  return null;
}

/** "<TITLE>.<ext>" — the filename the buyer's browser saves (ext taken from the master object). */
export function downloadNameFor(title: string, masterPath: string): string {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(masterPath);
  const ext = m ? m[1].toLowerCase() : "mp3";
  const base = String(title || "song")
    .replace(/[\/\\:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "song";
  return base + "." + ext;
}

// ---------------- PRIV-01b fallback: verify against public.stripe_purchases when Stripe can't be read ----------------
// Rows are written ONLY by the signature-verified stripe-webhook on checkout.session.completed, so a row for the
// exact session id is proof of a completed purchase. Used only when the Stripe API call fails (404 / 401 / 5xx /
// network) — never to override Stripe saying a session is unpaid.
// Product NAME → product id, for historical rows that only stored "Name xQty; …" (product_description).
// "Build Your Own Bundle (3 Songs)" and "Sleep & Relax Bundle (3 Songs)" are confirmed by real rows (2026-10-07);
// the other names come from the Payment Link read-back comments in music-curated.ts.
export const PRODUCT_NAME_TO_ID: Record<string, string> = {
  "Build Your Own Bundle (3 Songs)": "prod_UFRjXdopdLCcWd",
  "Build Your Own Bundle (5 Songs)": "prod_UFRj2oaSjPWnZv",
  "Build Your Own Bundle (10 Songs)": "prod_UFRjd7iLxa4r2s",
  "420 Pack Bundle (3 Songs)": "prod_UFHOYpElPrseJR",
  "Beach Vibes Bundle (4 Songs)": "prod_UFHOxsLEAm3s0F",
  "Burn It Down — Rage & Empowerment Bundle (4 Songs)": "prod_UFHNMb55PGfs2G",
  "DogMother Christmas 2025 Album (8 Songs)": "prod_UFHPr7tbY29X6d",
  "GenX Rage & Red Lipstick Album (6 Songs)": "prod_UFHPeEAmu7oXVP",
  "Healing After Hell Bundle (4 Songs)": "prod_UFHOsv5g6L4n96",
  "Outlaw Love: Wanted Dead or Alive (7 Songs)": "prod_UFRjDvEwwfZ7KR",
  "Rainbow Album (9 Songs)": "prod_UFHPWEsKTxGpcK",
  "Road Trip & Travel Bundle (5 Songs)": "prod_UFHO8ErfUlstjf",
  "Sleep & Relax Bundle (3 Songs)": "prod_UFHOhA0uTygDW2",
  "Villain Album (7 Songs)": "prod_UFHOWyAg3tZ1ap",
};

export interface PurchaseRow {
  checkout_session?: string | null;
  amount_cents?: number | null;
  product_description?: string | null;
  // added by migration 20261007120000_stripe_purchases_downloads.sql (optional until it is applied)
  line_product_ids?: string[] | null;
  session_metadata?: Record<string, string> | null;
  payment_status?: string | null;
}

/** Rebuild the minimal paid-session shape classifySession() needs from a webhook-recorded purchase row. */
export function sessionFromPurchaseRow(row: PurchaseRow | null | undefined): StripeSessionLite | null {
  if (!row || !(Number(row.amount_cents) > 0)) return null;
  if (row.payment_status && row.payment_status !== "paid") return null; // async payment not settled
  const data: { quantity: number; price: { product: string } }[] = [];
  if (Array.isArray(row.line_product_ids) && row.line_product_ids.length) {
    for (const pid of row.line_product_ids) if (typeof pid === "string" && pid) data.push({ quantity: 1, price: { product: pid } });
  } else if (typeof row.product_description === "string") {
    for (const part of row.product_description.split("; ")) {
      const m = /^(.*) x(\d+)$/.exec(part.trim());
      const name = m ? m[1] : part.trim();
      const pid = has(PRODUCT_NAME_TO_ID, name) ? PRODUCT_NAME_TO_ID[name] : undefined;
      if (pid) data.push({ quantity: m ? Math.max(1, Number(m[2]) || 1) : 1, price: { product: pid } });
    }
  }
  const meta = row.session_metadata && typeof row.session_metadata === "object" ? row.session_metadata : null;
  if (!data.length && !meta) return null;
  return { payment_status: "paid", metadata: meta, line_items: { data } };
}
