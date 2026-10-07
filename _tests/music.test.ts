// Unit tests for the pure checkout / verification logic.  Run:  node --test _tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUNDLE_PRICE_CENTS, CATALOG_BY_ID, checkoutForm, classifySession, decodeSongIds, DEFAULT_CANCEL_URL,
  encodeSongIds, lineItemFor, ORDER_MARKER, safeReturnUrl, SONG_PRICE_CENTS, songsFor, SUCCESS_URL,
  validateChoice, validateOrder, masterPathFor, downloadNameFor, sessionFromPurchaseRow, SIGNED_URL_TTL_SECONDS,
} from "../supabase/functions/_shared/music.ts";
import { MUSIC_CATALOG, PUPPY_SONG_IDS } from "../supabase/functions/_shared/music-catalog.ts";

const ids = MUSIC_CATALOG.map((s) => s.id);
// brand law: a certain AI-tool name must never appear in any file; build the pattern without spelling it
const BANNED = new RegExp(["s", "u", "n", "o"].join(""), "i");

test("catalog: unique ids, ALL CAPS titles, https urls, no forbidden words", () => {
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 80);
  for (const s of MUSIC_CATALOG) {
    assert.equal(s.title, s.title.toUpperCase(), s.id);
    assert.match(s.url, /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\//);
    assert.doesNotMatch(s.url + s.title + s.id, BANNED);
  }
  for (const p of PUPPY_SONG_IDS) assert.ok(CATALOG_BY_ID[p], p);
});

test("public catalog js matches server catalog and carries no urls", () => {
  const js = readFileSync(new URL("../js/music-catalog.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /https?:|supabase|\.mp3|\.wav/i);
  const list = JSON.parse(js.slice(js.indexOf("["), js.lastIndexOf("]") + 1));
  assert.deepEqual(list.map((s: { id: string }) => s.id), ids);
});

test("pricing: song $1.29, bundles 3/5/10 = $4.99/$6.99/$9.99", () => {
  assert.equal(SONG_PRICE_CENTS, 129);
  assert.deepEqual(BUNDLE_PRICE_CENTS, { 3: 499, 5: 699, 10: 999 });
  const o = validateOrder({ kind: "song", song_ids: [ids[0]] });
  assert.ok(o.ok && o.amount === 129 && o.tier === 1);
  for (const n of [3, 5, 10]) {
    const b = validateOrder({ kind: "bundle", tier: n, song_ids: ids.slice(0, n), price: 1 });
    assert.ok(b.ok && b.amount === BUNDLE_PRICE_CENTS[n], "tier " + n);
  }
});

test("validation rejects bad orders", () => {
  const bad: [unknown, string][] = [
    [null, "bad_request"],
    [{ kind: "bundle", tier: 3, song_ids: ids.slice(0, 2) }, "wrong_song_count"],
    [{ kind: "bundle", tier: 3, song_ids: ids.slice(0, 4) }, "wrong_song_count"],
    [{ kind: "bundle", tier: 4, song_ids: ids.slice(0, 4) }, "bad_tier"],
    [{ kind: "bundle", tier: 3, song_ids: [ids[0], ids[0], ids[1]] }, "duplicate_songs"],
    [{ kind: "bundle", tier: 3, song_ids: [ids[0], ids[1], "not-a-song"] }, "unknown_song"],
    [{ kind: "bundle", tier: 3, song_ids: "a,b,c" }, "bad_song_ids"],
    [{ kind: "bundle", tier: 3, song_ids: [1, 2, 3] }, "bad_song_ids"],
    [{ kind: "song", song_ids: ids.slice(0, 2) }, "song_needs_exactly_one"],
    [{ kind: "album", song_ids: [ids[0]] }, "bad_kind"],
    [{ kind: "song", song_ids: ["__proto__"] }, "unknown_song"],
  ];
  for (const [body, err] of bad) {
    const r = validateOrder(body);
    assert.ok(!r.ok, JSON.stringify(body));
    if (!r.ok) assert.equal(r.error, err, JSON.stringify(body));
  }
});

test("source is whitelisted", () => {
  const a = validateOrder({ kind: "song", song_ids: [ids[0]], source: "puppyfm" });
  const b = validateOrder({ kind: "song", song_ids: [ids[0]], source: "<script>" });
  assert.ok(a.ok && a.source === "puppyfm");
  assert.ok(b.ok && b.source === "hmm");
});

test("return url only on our own https origins", () => {
  assert.equal(safeReturnUrl("https://www.howlingmoonmusic.com/songs/spurs.html"), "https://www.howlingmoonmusic.com/songs/spurs.html");
  assert.equal(safeReturnUrl("https://www.puppyreports.com/puppyfm#songs"), "https://www.puppyreports.com/puppyfm#songs");
  for (const u of ["https://evil.com/x", "http://www.howlingmoonmusic.com/", "javascript:alert(1)", "//evil.com", 5, "https://www.howlingmoonmusic.com.evil.com/"]) {
    assert.equal(safeReturnUrl(u), DEFAULT_CANCEL_URL, String(u));
  }
});

test("Stripe line item names what is being bought", () => {
  const pick = ids.slice(0, 3);
  const li = lineItemFor({ kind: "bundle", tier: 3, ids: pick });
  assert.equal(li.name, "Your 3 songs — The DogMother");
  assert.equal(li.description, pick.map((i) => CATALOG_BY_ID[i].title).join(" · "));
  const one = lineItemFor({ kind: "song", tier: 1, ids: [ids[5]] });
  assert.equal(one.name, CATALOG_BY_ID[ids[5]].title);
});

test("checkout form: price, success url, metadata", () => {
  const o = validateOrder({ kind: "bundle", tier: 10, song_ids: ids.slice(0, 10), source: "puppyfm" });
  assert.ok(o.ok);
  if (!o.ok) return;
  const f = checkoutForm(o, "https://www.howlingmoonmusic.com/downloads/my-bundle.html?tier=10");
  assert.equal(f.get("mode"), "payment");
  assert.equal(f.get("line_items[0][price_data][unit_amount]"), "999");
  assert.equal(f.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(f.get("success_url"), SUCCESS_URL);
  assert.ok(SUCCESS_URL.includes("{CHECKOUT_SESSION_ID}"));
  assert.equal(f.get("metadata[hm_order]"), ORDER_MARKER);
  assert.equal(f.get("metadata[kind]"), "bundle");
  assert.equal(f.get("metadata[tier]"), "10");
  assert.equal(f.get("metadata[source]"), "puppyfm");
  assert.equal(f.get("metadata[song_ids]"), ids.slice(0, 10).join(","));
  assert.ok((f.get("metadata[song_ids]") || "").length < 500);
  assert.equal(f.get("client_reference_id"), "puppyfm");
});

test("longest possible 10-song id list fits in Stripe metadata", () => {
  const longest = [...ids].sort((a, b) => b.length - a.length).slice(0, 10);
  const enc = encodeSongIds(longest);
  for (const v of Object.values(enc)) assert.ok(v.length <= 500);
  assert.deepEqual(decodeSongIds(enc), longest);
});

test("encode/decode splits long id lists", () => {
  const many = Array.from({ length: 60 }, (_, i) => "song-number-" + i);
  const enc = encodeSongIds(many);
  assert.ok(Object.keys(enc).length > 1);
  for (const v of Object.values(enc)) assert.ok(v.length <= 500);
  assert.deepEqual(decodeSongIds(enc), many);
});

test("classifySession: itemised order → only those songs", () => {
  const s = { payment_status: "paid", metadata: { hm_order: ORDER_MARKER, kind: "bundle", tier: "3", song_ids: ids.slice(3, 6).join(",") } };
  const p = classifySession(s);
  assert.deepEqual(p, { type: "songs", kind: "bundle", ids: ids.slice(3, 6) });
  assert.deepEqual(songsFor(ids.slice(3, 6)).map((x) => x.id), ids.slice(3, 6));
});

test("classifySession: metadata without our marker is not trusted", () => {
  const s = { metadata: { kind: "bundle", song_ids: ids.slice(0, 10).join(",") }, line_items: { data: [] } };
  assert.deepEqual(classifySession(s), { type: "none" });
});

test("classifySession: legacy pick-N links by product id", () => {
  const li = (product: string, quantity = 1) => ({ line_items: { data: [{ quantity, price: { product } }] } });
  assert.deepEqual(classifySession(li("prod_UFRjXdopdLCcWd")), { type: "legacy", tier: 3 });
  assert.deepEqual(classifySession(li("prod_UFRj2oaSjPWnZv")), { type: "legacy", tier: 5 });
  assert.deepEqual(classifySession(li("prod_UFRjd7iLxa4r2s")), { type: "legacy", tier: 10 });
  assert.deepEqual(classifySession(li("prod_UFRjXdopdLCcWd", 2)), { type: "legacy", tier: 6 });
  // albums / curated bundles are not song purchases
  assert.deepEqual(classifySession(li("prod_V3bnciBZf9DE6V")), { type: "none" });
  // curated bundles are their own type now (see curated tests below)
  assert.equal(classifySession(li("prod_UFHOYpElPrseJR")).type, "curated");
});

test("validateChoice enforces exactly N distinct catalog songs", () => {
  assert.deepEqual(validateChoice(ids.slice(0, 5), 5), { ok: true, ids: ids.slice(0, 5) });
  assert.equal((validateChoice(ids.slice(0, 4), 5) as { error: string }).error, "wrong_song_count");
  assert.equal((validateChoice([ids[0], ids[0], ids[1]], 3) as { error: string }).error, "duplicate_songs");
  assert.equal((validateChoice([ids[0], ids[1], "nope"], 3) as { error: string }).error, "unknown_song");
  assert.equal((validateChoice("x", 3) as { error: string }).error, "bad_song_ids");
});

// ---------------- curated bundle / legacy album pages (2026-10-03) ----------------
import { MUSIC_CURATED } from "../supabase/functions/_shared/music-curated.ts";

const CURATED_SLUGS = ["420-pack", "beach-vibes", "burn-it-down", "christmas-album", "genx-album", "healing",
  "outlaw-love", "rainbow-album", "road-trip", "sleep-relax", "villain-album"];

test("curated map: 11 pages, ALL CAPS titles, https storage urls or null", () => {
  const slugs = Object.values(MUSIC_CURATED).map((c) => c.slug).sort();
  assert.deepEqual(slugs, [...CURATED_SLUGS].sort());
  assert.ok(MUSIC_CURATED["prod_UFRjDvEwwfZ7KR"], "inactive outlaw-love product kept");
  for (const c of Object.values(MUSIC_CURATED)) {
    assert.ok(c.songs.length > 0, c.slug);
    for (const s of c.songs) {
      assert.equal(s.title, s.title.toUpperCase());
      if (s.url !== null) assert.match(s.url, /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\//);
      assert.doesNotMatch(String(s.url) + s.title, BANNED);
    }
  }
  // no curated product collides with the legacy pick-N products
  for (const pid of Object.keys(MUSIC_CURATED)) assert.ok(!["prod_UFRjXdopdLCcWd", "prod_UFRj2oaSjPWnZv", "prod_UFRjd7iLxa4r2s"].includes(pid));
});

test("classifySession: curated product → exactly that page's songs", () => {
  const s = { payment_status: "paid", line_items: { data: [{ quantity: 1, price: { product: "prod_UFHOhA0uTygDW2" } }] } };
  const p = classifySession(s);
  assert.equal(p.type, "curated");
  if (p.type !== "curated") return;
  assert.equal(p.slug, "sleep-relax");
  assert.deepEqual(p.songs, MUSIC_CURATED["prod_UFHOhA0uTygDW2"].songs);
  assert.deepEqual(p.products, ["prod_UFHOhA0uTygDW2"]);
  // expanded product object form
  const p2 = classifySession({ line_items: { data: [{ price: { product: { id: "prod_UFRjDvEwwfZ7KR" } } }] } });
  assert.ok(p2.type === "curated" && p2.slug === "outlaw-love" && p2.songs.length === 7);
});

test("classifySession: curated keeps 'Coming Soon' rows as url null", () => {
  const p = classifySession({ line_items: { data: [{ price: { product: "prod_UFHOWyAg3tZ1ap" } }] } }); // Villain: 2 not yet recorded
  assert.ok(p.type === "curated");
  if (p.type !== "curated") return;
  assert.equal(p.songs.length, 7);
  assert.ok(p.songs.some((x) => x.url === null));
});

test("classifySession: Christmas album delivers all 8 masters (10/3), no Coming Soon", () => {
  const p = classifySession({ line_items: { data: [{ price: { product: "prod_UFHPr7tbY29X6d" } }] } });
  assert.ok(p.type === "curated");
  if (p.type !== "curated") return;
  assert.equal(p.songs.length, 8);
  assert.ok(p.songs.every((x) => typeof x.url === "string" && x.url.includes("/DOGMOTHER-CHRISTMAS-2025/")));
});

test("classifySession: existing behaviour unchanged with curated map present", () => {
  const li = (product: string) => ({ line_items: { data: [{ quantity: 1, price: { product } }] } });
  assert.deepEqual(classifySession(li("prod_UFRjXdopdLCcWd")), { type: "legacy", tier: 3 });
  assert.deepEqual(classifySession(li("prod_V3bnciBZf9DE6V")), { type: "none" }); // album → still none
  const meta = { metadata: { hm_order: ORDER_MARKER, kind: "song", tier: "1", song_ids: ids[0] }, ...li("prod_UFHOhA0uTygDW2") };
  assert.deepEqual(classifySession(meta), { type: "songs", kind: "song", ids: [ids[0]] }); // itemised wins
  assert.deepEqual(classifySession(li("__proto__")), { type: "none" });
  assert.deepEqual(classifySession({}), { type: "none" });
});

test("CEO 2026-10-03: phantom rows removed; GenX kept for past buyers", () => {
  const bv = MUSIC_CURATED["prod_UFHOxsLEAm3s0F"], bid = MUSIC_CURATED["prod_UFHNMb55PGfs2G"];
  assert.ok(!bv.songs.some((x) => x.title === "COASTAL CANDY") && bv.songs.length === 3);
  assert.ok(!bid.songs.some((x) => x.title === "THE RECKONING") && bid.songs.length === 3);
  assert.equal(MUSIC_CURATED["prod_UFHPeEAmu7oXVP"].slug, "genx-album");
});

test("catalog: the 3 PuppyFM songs are sellable singles + PuppySongs", () => {
  for (const id of ["dogs-have-never", "brown-eyes-say", "those-big-brown-eyes"]) {
    assert.ok(CATALOG_BY_ID[id], id);
    assert.ok(PUPPY_SONG_IDS.includes(id), id);
    const o = validateOrder({ kind: "song", song_ids: [id] });
    assert.ok(o.ok && o.amount === 129);
  }
});

// PRIV-01b: every sellable url must map to a music-masters path (98/98 verified present in the bucket 2026-10-07)
test("PRIV-01b: every catalog + curated url maps to a music-masters path", () => {
  const urls = [
    ...MUSIC_CATALOG.map((s) => s.url),
    ...Object.values(MUSIC_CURATED).flatMap((c) => c.songs.map((s) => s.url)).filter((u): u is string => u !== null),
  ];
  assert.ok(urls.length > 100);
  for (const u of urls) {
    const p = masterPathFor(u);
    assert.ok(p, u);
    assert.doesNotMatch(p!, /%[0-9A-F]{2}/i, "decoded: " + u);
    if (u.includes("/object/public/audio/")) assert.ok(p!.startsWith("audio/"), u);
    else assert.ok(!p!.startsWith("audio/"), u);
  }
});

test("PRIV-01b: masterPathFor mapping + rejects", () => {
  assert.equal(masterPathFor("https://vwedcmdtsvktbirlgvdb.supabase.co/storage/v1/object/public/howls-music/I'm%20Begging%20You.wav"), "I'm Begging You.wav");
  assert.equal(masterPathFor("https://vwedcmdtsvktbirlgvdb.supabase.co/storage/v1/object/public/howls-music/v55/COCONUT-KISSES/01-WOKE-UP-LAUGHING.mp3"), "v55/COCONUT-KISSES/01-WOKE-UP-LAUGHING.mp3");
  assert.equal(masterPathFor("https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/rainbow.mp3"), "audio/Album Collections/BEACH VIBES/rainbow.mp3");
  assert.equal(masterPathFor("https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/GASLIGHT%20%26%20GLITTER.mp3"), "audio/Album Collections/BEACH VIBES/GASLIGHT & GLITTER.mp3");
  assert.equal(masterPathFor(null), null);
  assert.equal(masterPathFor("https://evil.example.com/storage/v1/object/public/audio/x.mp3"), null);
  assert.equal(masterPathFor("https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/album-zips/x.zip"), null);
  assert.equal(masterPathFor("https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/%2E%2E/x.mp3"), null);
  assert.equal(masterPathFor("https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/%E0%A4%A"), null);
});

test("PRIV-01b: downloadNameFor = <TITLE>.<ext>, filesystem-safe", () => {
  assert.equal(downloadNameFor("PUPPY KISSES", "Puppy Kisses.wav"), "PUPPY KISSES.wav");
  assert.equal(downloadNameFor("I'M BEGGING YOU", "I'm Begging You.wav"), "I'M BEGGING YOU.wav");
  assert.equal(downloadNameFor("ME & MY DOG / SPURS", "Spurs.mp3"), "ME & MY DOG SPURS.mp3");
  assert.equal(downloadNameFor("", "x.MP3"), "song.mp3");
});

test("PRIV-01b: 24 h signed-url TTL", () => assert.equal(SIGNED_URL_TTL_SECONDS, 86400));

test("PRIV-01b fallback: stripe_purchases row → classifiable paid session", () => {
  // the two real historical row shapes (2026-03-31 curated, 2026-07-02 legacy pick-3)
  const curated = classifySession(sessionFromPurchaseRow({ amount_cents: 499, product_description: "Sleep & Relax Bundle (3 Songs) x1" })!);
  assert.equal(curated.type, "curated");
  assert.equal(curated.type === "curated" && curated.slug, "sleep-relax");
  const legacy = classifySession(sessionFromPurchaseRow({ amount_cents: 499, product_description: "Build Your Own Bundle (3 Songs) x1" })!);
  assert.deepEqual(legacy, { type: "legacy", tier: 3 });
  // new rows: product ids + metadata straight from the webhook
  const songs = classifySession(sessionFromPurchaseRow({
    amount_cents: 129, line_product_ids: ["prod_x"], session_metadata: { hm_order: ORDER_MARKER, kind: "song", song_ids: "puppy-kisses" },
  })!);
  assert.deepEqual(songs, { type: "songs", kind: "song", ids: ["puppy-kisses"] });
  // refusals
  assert.equal(sessionFromPurchaseRow(null), null);
  assert.equal(sessionFromPurchaseRow({ amount_cents: 0, product_description: "Sleep & Relax Bundle (3 Songs) x1" }), null);
  assert.equal(sessionFromPurchaseRow({ amount_cents: 499, product_description: "Something Else x1" }), null);
  assert.equal(sessionFromPurchaseRow({ amount_cents: 499, payment_status: "unpaid", line_product_ids: ["prod_UFHOhA0uTygDW2"] }), null);
});
