// verify-album-purchase — Howling Moon Music post-purchase download verification
// Deployed 2026-08-26; v2 2026-08-29 adds NEW MEXICO NIGHTS + HEALING INSTRUMENTAL FREQUENCIES.
// v3 PRIV-01b (2026-10-07, first time this function's source is in the repo — rebuilt from deployed v2):
//   • tracks[].url = 24 h SIGNED url from the PRIVATE pxcx bucket `music-masters` (same relative path the old
//     public howls-music url had) — never the public url. Signing fails CLOSED. Signed urls are never logged.
//     No `download` option on track urls: download.html appends "&download=<NN TITLE.mp3>" itself.
//   • If Stripe can't be read (404 / 401 / 5xx / network) the purchase is verified against the webhook-recorded
//     public.stripe_purchases row (needs line_product_ids, added by migration 20261007120000_stripe_purchases_downloads).
//   • The buyer's download PAGE link (download.html?album=…&session_id=…) never expires: every visit re-verifies
//     and mints fresh signed urls (ZIP + tracks, 24 h each).
// Stripe key lives in Supabase Vault (rpc hm_get_stripe_key, service_role only).
// verify_jwt is OFF: public endpoint for the static site; the real gate is the Stripe
// checkout-session verification below plus the origin allowlist.
// Deploy with ../_shared/music.ts + ../_shared/music-catalog.ts + ../_shared/music-curated.ts included.
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type PurchaseRow, sessionFromPurchaseRow, SESSION_ID_RE, SIGNED_URL_TTL_SECONDS, MASTERS_BUCKET,
} from "../_shared/music.ts";

type Track = { n: number; title: string; path: string }; // path inside music-masters (= old howls-music path)
type Album = { title: string; cover: string; product: string; zip: string; tracks: Track[] };

const HM = "https://vwedcmdtsvktbirlgvdb.supabase.co/storage/v1/object/public/howls-music/";
const t = (n: number, title: string, path: string): Track => ({ n, title, path });
const GW = "v55/GHOST-WANTED-DEAD-OR-ALIVE/", CK = "v55/COCONUT-KISSES/", HF = "v55/HEALING-FREQUENCIES/";
const SC = "v55/SONGS-TO-CRY-TO/", ST = "v55/SILENT-TREATMENT/", NM = "v55/NEW-MEXICO-NIGHTS/";
const HI = "v55/HEALING-INSTRUMENTAL-FREQUENCIES/";

const ALBUMS: Record<string, Album> = {
  "ghost-wanted-dead-or-alive": {
    title: "GHOST WANTED DEAD OR ALIVE", cover: HM + "ghost-wanted-dead-or-alive.jpg",
    product: "prod_V97ar6HAGea8Ub", zip: "ghost-wanted-dead-or-alive.zip",
    tracks: [
      t(1, "LIAR, PREACHER MAN", GW + "01-LIAR-PREACHER-MAN.mp3"),
      t(2, "I DIDN'T DIE", GW + "02-I-DIDN-T-DIE.mp3"),
      t(3, "ONE NIGHT WITH THE DEVIL", GW + "03-ONE-NIGHT-WITH-THE-DEVIL.mp3"),
      t(4, "SMOKE ME", GW + "04-SMOKE-ME.mp3"),
      t(5, "RODEO COWBOY", GW + "05-RODEO-COWBOY.mp3"),
      t(6, "GHOST WANTED DEAD OR ALIVE", GW + "06-GHOST-WANTED-DEAD-OR-ALIVE.mp3"),
      t(7, "HELD YOU FIRST", GW + "07-HELD-YOU-FIRST.mp3"),
      t(8, "DROWN IN THE BOTTLE", GW + "08-DROWN-IN-THE-BOTTLE.mp3"),
      t(9, "HE JUST CALLED MY NAME", GW + "09-HE-JUST-CALLED-MY-NAME.mp3"),
      t(10, "WISH YOU WERE ME", GW + "10-WISH-YOU-WERE-ME.mp3"),
      t(11, "LOST IN SANTA FE", GW + "11-LOST-IN-SANTA-FE.mp3"),
      t(12, "BROWN EYES SAY", GW + "12-BROWN-EYES-SAY.mp3"),
      t(13, "ME & MY DOG | SPURS", GW + "13-ME-MY-DOG-SPURS.mp3"),
      t(14, "WORLD MELTS AWAY", GW + "14-WORLD-MELTS-AWAY.mp3"),
      t(15, "LEFT MY HEART IN SANTA FE", GW + "15-LEFT-MY-HEART-IN-SANTA-FE.mp3"),
    ],
  },
  "coconut-kisses": {
    title: "COCONUT KISSES", cover: HM + "coconut-kisses.jpg",
    product: "prod_V97a4YoOdTNz73", zip: "coconut-kisses.zip",
    tracks: [
      t(1, "WOKE UP LAUGHING", CK + "01-WOKE-UP-LAUGHING.mp3"),
      t(2, "MANGROVES & MOONLIGHT", CK + "02-MANGROVES-MOONLIGHT.mp3"),
      t(3, "ENDLESS SUMMER HEAT", CK + "03-ENDLESS-SUMMER-HEAT.mp3"),
      t(4, "DOWN UNDER", CK + "04-DOWN-UNDER.mp3"),
      t(5, "COCONUT KISS", CK + "05-COCONUT-KISS.mp3"),
      t(6, "TANGLED", CK + "06-TANGLED.mp3"),
      t(7, "LIGHTNING STRIKES MY HEART", CK + "07-LIGHTNING-STRIKES-MY-HEART.mp3"),
      t(8, "PORT LAVACA", CK + "08-PORT-LAVACA.mp3"),
      t(9, "WORLD MELTS AWAY", GW + "14-WORLD-MELTS-AWAY.mp3"),
      t(10, "BOOTY BOOM BOOM", CK + "10-BOOTY-BOOM-BOOM.mp3"),
      t(11, "COTTON CANDY", CK + "11-COTTON-CANDY.mp3"),
      t(12, "NEVER LET GO", CK + "12-NEVER-LET-GO.mp3"),
      t(13, "BAREFOOT BEACH BEAUTY", CK + "13-BAREFOOT-BEACH-BEAUTY.mp3"),
      t(14, "SAND IN TOES", CK + "14-SAND-IN-TOES.mp3"),
      t(15, "GET STONED WITH YOU", CK + "15-GET-STONED-WITH-YOU.mp3"),
      t(16, "WILDFLOWER DREAMS", CK + "16-WILDFLOWER-DREAMS.mp3"),
    ],
  },
  "healing-frequencies": {
    title: "HEALING FREQUENCIES", cover: HM + "healing-frequencies.jpg",
    product: "prod_V97af5r4zSn7Mi", zip: "healing-frequencies.zip",
    tracks: [
      t(1, "BREATHE", HF + "01-BREATHE.mp3"),
      t(2, "FLOATING", HF + "02-FLOATING.mp3"),
      t(3, "HEALING WATERS", HF + "03-HEALING-WATERS.mp3"),
      t(4, "MY CUP", HF + "04-MY-CUP.mp3"),
      t(5, "FILL ME WITH LOVE", HF + "05-FILL-ME-WITH-LOVE.mp3"),
      t(6, "NO FEAR", HF + "06-NO-FEAR.mp3"),
      t(7, "PEACE", HF + "07-PEACE.mp3"),
      t(8, "SLEEP", HF + "08-SLEEP.mp3"),
    ],
  },
  "songs-to-cry-to": {
    title: "SONGS TO CRY TO", cover: HM + "songs-to-cry-to.jpg",
    product: "prod_V97aH2XOJW37il", zip: "songs-to-cry-to.zip",
    tracks: [
      t(1, "TEARDROPS IN MY COFFEE", SC + "01-TEARDROPS-IN-MY-COFFEE.mp3"),
      t(2, "HAZY BUBBLE", SC + "02-HAZY-BUBBLE.mp3"),
      t(3, "COFFEE CONSTELLATION", SC + "03-COFFEE-CONSTELLATION.mp3"),
      t(4, "ROCK A BYE BABY", SC + "04-ROCK-A-BYE-BABY.mp3"),
      t(5, "ALMOST CALLED", SC + "05-ALMOST-CALLED.mp3"),
      t(6, "THE LAST TIME", SC + "06-THE-LAST-TIME.mp3"),
      t(7, "HAPPY BIRTHDAY", SC + "07-HAPPY-BIRTHDAY.mp3"),
      t(8, "DROWNING IN MY TEARS", SC + "08-DROWNING-IN-MY-TEARS.mp3"),
      t(9, "NOT ENOUGH BOTTLES", SC + "09-NOT-ENOUGH-BOTTLES.mp3"),
      t(10, "BROKEN HEART AND BUSTED DREAMS", SC + "10-BROKEN-HEART-AND-BUSTED-DREAMS.mp3"),
      t(11, "IF TEARS COULD CALL HEAVEN", SC + "11-IF-TEARS-COULD-CALL-HEAVEN.mp3"),
    ],
  },
  "silent-treatment": {
    title: "SILENT TREATMENT", cover: HM + "silent-treatment.jpg",
    product: "prod_V97ar7P7gr6Z9N", zip: "silent-treatment.zip",
    tracks: [
      t(1, "SHERIFF", ST + "01-SHERIFF.mp3"),
      t(2, "SILENCE IS YOUR FANGS", ST + "02-SILENCE-IS-YOUR-FANGS.mp3"),
      t(3, "SHOVE IT", ST + "03-SHOVE-IT.mp3"),
      t(4, "SUFFER IN SILENCE", ST + "04-SUFFER-IN-SILENCE.mp3"),
      t(5, "EMOTIONAL HOSTAGE", ST + "05-EMOTIONAL-HOSTAGE.mp3"),
      t(6, "INVISIBLE WOMAN", ST + "06-INVISIBLE-WOMAN.mp3"),
      t(7, "LOVE ME COMPLICATED", ST + "07-LOVE-ME-COMPLICATED.mp3"),
      t(8, "UNCONTAINABLE", ST + "08-UNCONTAINABLE.mp3"),
    ],
  },
  "unleashed": {
    title: "UNLEASHED", cover: HM + "unleashed-cover.png",
    product: "prod_V3bnciBZf9DE6V", zip: "unleashed.zip",
    tracks: [
      t(1, "BOOTY BOOM BOOM", CK + "10-BOOTY-BOOM-BOOM.mp3"),
      t(2, "DROWN ME IN SLOBBERY KISSES", "DROWN ME IN SLOBBERY KISSES (UNLEASHED album v2).mp3"),
      t(3, "I AIN'T PICKING UP YOUR SHIT NO MORE", "I AINT PICKING UP YOUR SHIT NO MORE (UNLEASHED album v2).mp3"),
      t(4, "JUICY PEACH ON FIRE", "PEACH ON FIRE (UNLEASHED album v3).mp3"),
      t(5, "PUPPY KISSES", "PUPPY KISSES (UNLEASHED mix).mp3"),
      t(6, "SPURS", "ME & MY DOG - SPURS (UNLEASHED mix).mp3"),
      t(7, "TONGUE & GROOVE", "TONGUE & GROOVE (UNLEASHED album v3).mp3"),
      t(8, "DOGS HAVE NEVER", "Dogs Have Never.mp3"),
      t(9, "BROWN EYES SAY", GW + "12-BROWN-EYES-SAY.mp3"),
      t(10, "LOOK INTO MY EYES", "LOOK IN MY EYES (UNLEASHED mix).mp3"),
      t(11, "UH OH I DID IT AGAIN", "UH OH I DID IT AGAIN (UNLEASHED mix).mp3"),
      t(12, "TROUBLE TROUBLE", "TROUBLE TROUBLE (UNLEASHED mix).mp3"),
      t(13, "FLEAS", "FLEAS (UNLEASHED mix).mp3"),
      t(14, "WILL YOU BE MY FRIEND", "WILL YOU BE MY FRIEND (UNLEASHED mix).mp3"),
      t(15, "THOSE BIG BROWN EYES", "Those Big Brown Eyes.mp3"),
    ],
  },
  "new-mexico-nights": {
    title: "NEW MEXICO NIGHTS", cover: "https://howlingmoonmusic.com/img/covers/new-mexico-nights.jpg",
    product: "prod_VABppTwhCV14As", zip: "new-mexico-nights.zip",
    tracks: [
      t(1, "LOST IN SANTA FE", GW + "11-LOST-IN-SANTA-FE.mp3"),
      t(2, "TATTOO IN ALBUQUERQUE", NM + "02-TATTOO-IN-ALBUQUERQUE.mp3"),
      t(3, "STONY ROAD", NM + "03-STONY-ROAD.mp3"),
      t(4, "ENCHANTED GREEN HAZE", NM + "04-ENCHANTED-GREEN-HAZE.mp3"),
      t(5, "WHITE SANDS", NM + "05-WHITE-SANDS.mp3"),
      t(6, "WILDFLOWER", NM + "06-WILDFLOWER.mp3"),
      t(7, "MI HOGAR", NM + "07-MI-HOGAR.mp3"),
      t(8, "LAS CRUCES NIGHTS", NM + "08-LAS-CRUCES-NIGHTS.mp3"),
      t(9, "HIGH WITH YOU", NM + "09-HIGH-WITH-YOU.mp3"),
      t(10, "LEFT MY HEART IN SANTA FE", GW + "15-LEFT-MY-HEART-IN-SANTA-FE.mp3"),
    ],
  },
  "healing-instrumental-frequencies": {
    title: "HEALING INSTRUMENTAL FREQUENCIES", cover: "https://howlingmoonmusic.com/img/covers/healing-instrumental-frequencies.jpg",
    product: "prod_VABpKp9711jD97", zip: "healing-instrumental-frequencies.zip",
    tracks: [
      t(1, "MOONLIGHT ON WARM WAVES", HI + "01-MOONLIGHT-ON-WARM-WAVES.mp3"),
      t(2, "MOONLIT DESERT PULSE", HI + "02-MOONLIT-DESERT-PULSE.mp3"),
      t(3, "RESONANT STILLNESS", HI + "03-RESONANT-STILLNESS.mp3"),
      t(4, "SILENT DUNES", HI + "04-SILENT-DUNES.mp3"),
      t(5, "CANYON NIGHT GLOW", HI + "05-CANYON-NIGHT-GLOW.mp3"),
      t(6, "WARM WAVES AT MIDNIGHT", HI + "06-WARM-WAVES-AT-MIDNIGHT.mp3"),
      t(7, "DESERT HEARTBEAT", HI + "07-DESERT-HEARTBEAT.mp3"),
      t(8, "RETURN TO LOVE FREQUENCY", HI + "08-RETURN-TO-LOVE-FREQUENCY.mp3"),
      t(9, "MOONLIT DESERT SILENCE", HI + "09-MOONLIT-DESERT-SILENCE.mp3"),
      t(10, "STILLNESS IN BLOOM", HI + "10-STILLNESS-IN-BLOOM.mp3"),
      t(11, "DESERT NIGHT SINE", HI + "11-DESERT-NIGHT-SINE.mp3"),
      t(12, "THE LOVE FREQUENCY (528 HZ INSPIRED)", HI + "12-THE-LOVE-FREQUENCY-528-HZ-INSPIRED.mp3"),
    ],
  },
};

const ALLOWED_ORIGINS = ["https://www.howlingmoonmusic.com", "https://howlingmoonmusic.com"];
const SUPPORT = "dogsongstudio@gmail.com";
const FRIENDLY = "We couldn't verify your purchase. If you just bought this album, give it a minute and refresh — or email " + SUPPORT + " and we'll get your music to you.";

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
function refuse(origin: string | null, status = 403): Response {
  return new Response(JSON.stringify({ ok: false, error: "verification_failed", message: FRIENDLY, support: SUPPORT }), { status, headers: corsHeaders(origin) });
}

/** Product ids bought in a PAID session: Stripe first; webhook-recorded stripe_purchases row only if Stripe can't be read. */
async function paidProducts(sessionId: string): Promise<string[] | null> {
  try {
    const key = await getStripeKey();
    const sRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=line_items",
      { headers: { Authorization: "Bearer " + key } },
    );
    if (sRes.ok) {
      const session = await sRes.json();
      if (session.payment_status !== "paid") return null; // Stripe says unpaid: never overridden
      return (session.line_items?.data ?? []).map((i: { price?: { product?: string } }) => i.price?.product ?? "");
    }
    console.warn("verify-album-purchase: stripe read failed, status", sRes.status, "- trying stripe_purchases");
  } catch (e) {
    console.warn("verify-album-purchase: stripe read error -", (e as Error)?.message, "- trying stripe_purchases");
  }
  const { data, error } = await admin.from("stripe_purchases").select("*")
    .eq("checkout_session", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("purchase row read failed: " + error.message);
  const s = sessionFromPurchaseRow(data as PurchaseRow | null);
  if (!s) return null;
  return (s.line_items?.data ?? []).map((i) => {
    const p = i.price?.product;
    return typeof p === "string" ? p : p?.id ?? "";
  });
}

async function signTracks(tracks: Track[]): Promise<{ n: number; title: string; url: string }[]> {
  return await Promise.all(tracks.map(async (tr) => {
    const { data, error } = await admin.storage.from(MASTERS_BUCKET).createSignedUrl(tr.path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw new Error("sign failed for track: " + tr.title + " (" + (error?.message ?? "empty") + ")");
    return { n: tr.n, title: tr.title, url: data.signedUrl };
  }));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return refuse(origin, 403);

  let album = "", sessionId = "";
  try {
    if (req.method === "POST") {
      const body = await req.json();
      album = String(body.album ?? "");
      sessionId = String(body.session_id ?? "");
    } else {
      const u = new URL(req.url);
      album = u.searchParams.get("album") ?? "";
      sessionId = u.searchParams.get("session_id") ?? "";
    }
  } catch (_e) { return refuse(origin, 400); }

  const a = Object.prototype.hasOwnProperty.call(ALBUMS, album) ? ALBUMS[album] : undefined;
  if (!a) return refuse(origin, 400);
  if (!SESSION_ID_RE.test(sessionId)) return refuse(origin, 400);

  try {
    const products = await paidProducts(sessionId);
    if (!products || !products.includes(a.product)) return refuse(origin, 403);

    const { data: signed, error } = await admin.storage.from("album-zips").createSignedUrl(a.zip, SIGNED_URL_TTL_SECONDS, { download: true });
    if (error || !signed?.signedUrl) return refuse(origin, 403);
    const tracks = await signTracks(a.tracks);

    return new Response(JSON.stringify({
      ok: true, album, title: a.title, cover: a.cover,
      zip_url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS, tracks,
    }), { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("verify-album-purchase error", (e as Error)?.message);
    return refuse(origin, 403);
  }
});
