// Local static-serve smoke test for the pick-first checkout + gated downloads.
//   node _tests/smoke.mjs            (needs Playwright; serves this worktree on a random port)
// Edge functions are MOCKED via request interception — this proves the front-end contract only.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/homebrew/lib/node_modules/playwright"); }

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const body = await readFile(join(root, p === "/" ? "index.html" : p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;

const AUDIO_RE = /supabase\.co\/storage\/v1\/object\/public\/(audio|howls-music)\/|\.wav\b|\.mp3\b/i;
const SID = "cs_test_a1B2c3D4e5F6g7H8i9J0";
const browser = await pw.chromium.launch();
const results = [];
function ok(name) { results.push("PASS " + name); }

try {
  // ---------- 1. picker has NO download links / audio urls without a session ----------
  for (const q of ["?tier=3", "?tier=5", "?tier=10", "?tier=3&pack=puppy", ""]) {
    const page = await browser.newPage();
    const texts = [];
    page.on("response", async (r) => {
      if (r.url().startsWith(base)) texts.push(await r.text().catch(() => ""));
    });
    await page.route("**/storage/v1/object/public/branding/**", (r) => r.fulfill({ status: 200, body: "" }));
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, body: "" }));
    await page.goto(base + "/downloads/my-bundle.html" + q, { waitUntil: "networkidle" });
    const dl = await page.locator("a.dl-btn, a[download]").count();
    assert.equal(dl, 0, "download buttons on my-bundle " + q);
    const html = await page.content();
    assert.doesNotMatch(html, AUDIO_RE, "audio url in DOM " + q);
    for (const t of texts) assert.doesNotMatch(t, AUDIO_RE, "audio url in served source " + q);
    const rows = await page.locator(".song-row").count();
    assert.equal(rows, q.includes("puppy") ? 14 : 87);
    ok("my-bundle.html" + (q || "(no params)") + ": 0 a.dl-btn, 0 audio storage urls in DOM + served HTML/JS, " + rows + " pickable songs");
    await page.close();
  }

  // ---------- 2. pick exactly N → POST create-music-checkout with exactly those ids ----------
  {
    const page = await browser.newPage();
    let posted = null;
    await page.route("**/functions/v1/create-music-checkout", async (r) => {
      posted = JSON.parse(r.request().postData());
      await r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, url: base + "/index.html#stripe-mock" }) });
    });
    await page.goto(base + "/downloads/my-bundle.html?tier=3&src=puppyfm", { waitUntil: "domcontentloaded" });
    const btn = page.locator("#checkoutBtn");
    assert.equal(await btn.isDisabled(), true);
    const boxes = page.locator(".song-row input");
    await boxes.nth(0).check(); await boxes.nth(20).check();
    assert.equal(await btn.isDisabled(), true, "disabled at 2/3");
    await boxes.nth(40).check();
    assert.equal(await page.locator(".song-row.locked").count(), 84, "others locked at 3/3");
    assert.match(await btn.textContent(), /Checkout — \$4\.99/);
    const picks = await page.locator("#checkoutPicks").textContent();
    await btn.click();
    await page.waitForURL(/stripe-mock/);
    assert.equal(posted.kind, "bundle"); assert.equal(posted.tier, 3); assert.equal(posted.source, "puppyfm");
    assert.equal(posted.song_ids.length, 3);
    assert.match(posted.return_url, /my-bundle\.html\?.*pre=/);
    ok("pick 3 → button 'Checkout — $4.99' → POST {kind:bundle,tier:3,source:puppyfm," + posted.song_ids.join(",") + "}; summary: " + picks.trim().slice(0, 90));
    await page.close();
  }

  // ---------- 3. ?pre= preselects ----------
  {
    const page = await browser.newPage();
    await page.goto(base + "/downloads/my-bundle.html?tier=5&pre=spurs,almost-called", { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(".song-row input:checked").count(), 2);
    ok("?pre=spurs,almost-called preselects 2 of 5");
    await page.close();
  }

  // ---------- 4. legacy Payment Link redirect (…my-bundle.html?tier=N&session_id=…) → download.html ----------
  {
    const page = await browser.newPage();
    await page.route("**/functions/v1/verify-music-purchase", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, legacy: true, needs_choice: true, tier: 3 }) }));
    await page.goto(base + "/downloads/my-bundle.html?tier=3&pack=puppy&session_id=" + SID, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/download\.html\?session_id=/);
    assert.ok(page.url().includes("session_id=" + SID));
    ok("legacy redirect my-bundle.html?tier=3&pack=puppy&session_id=… → " + page.url().replace(base, ""));
    await page.close();
  }

  // ---------- 5. download.html: legacy chooser → choose once → only those songs ----------
  {
    const page = await browser.newPage();
    const posts = [];
    await page.route("**/functions/v1/verify-music-purchase", async (r) => {
      const b = JSON.parse(r.request().postData());
      posts.push(b);
      const body = b.choose
        ? { ok: true, legacy: true, tier: 3, songs: b.choose.map((id, i) => ({ id, title: "SONG " + i, url: "https://x.supabase.co/storage/v1/object/public/howls-music/" + id + ".wav" })) }
        : { ok: true, legacy: true, needs_choice: true, tier: 3 };
      await r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });
    });
    page.on("dialog", (d) => d.accept());
    await page.goto(base + "/download.html?session_id=" + SID, { waitUntil: "domcontentloaded" });
    await page.locator("#chooseWrap:not(.hidden)").waitFor();
    assert.equal(await page.locator("a.dl-btn").count(), 0, "no downloads before choosing");
    const boxes = page.locator("#chooseRows input");
    for (const n of [1, 2, 3]) await boxes.nth(n).check();
    await page.locator("#chooseBtn").click();
    await page.locator("#songsWrap:not(.hidden)").waitFor();
    assert.equal(await page.locator("#songRows a.dl-btn").count(), 3);
    const href = await page.locator("#songRows a.dl-btn").first().getAttribute("href");
    assert.match(href, /\.wav\?download=01%20SONG%200\.wav$/);
    assert.equal(posts.length, 2); assert.equal(posts[1].choose.length, 3);
    ok("download.html legacy: chooser (0 downloads) → confirm 3 → exactly 3 download buttons (" + href.split("/").pop() + ")");
    await page.close();
  }

  // ---------- 6. download.html: itemised order shows only purchased songs; failure shows error ----------
  {
    const page = await browser.newPage();
    await page.route("**/functions/v1/verify-music-purchase", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, kind: "song", songs: [{ id: "spurs", title: "SPURS", url: "https://x.supabase.co/storage/v1/object/public/howls-music/Spurs.mp3" }] }) }));
    await page.goto(base + "/download.html?session_id=" + SID, { waitUntil: "domcontentloaded" });
    await page.locator("#songsWrap:not(.hidden)").waitFor();
    assert.equal(await page.locator("a.dl-btn").count(), 1);
    assert.equal(await page.locator("#albumTitle").textContent(), "SPURS");
    ok("download.html single song: title SPURS, exactly 1 download button");
    await page.close();

    const p2 = await browser.newPage();
    await p2.route("**/functions/v1/verify-music-purchase", (r) => r.fulfill({ status: 403, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: false, message: "We couldn't verify your purchase." }) }));
    await p2.goto(base + "/download.html?session_id=" + SID, { waitUntil: "domcontentloaded" });
    await p2.locator("#errorBox:not(.hidden)").waitFor();
    assert.equal(await p2.locator("a.dl-btn").count(), 0);
    ok("download.html unpaid/refused session: error box, 0 download buttons");
    await p2.close();

    const p3 = await browser.newPage();
    await p3.goto(base + "/download.html", { waitUntil: "domcontentloaded" });
    await p3.locator("#errorBox:not(.hidden)").waitFor();
    ok("download.html with no session: error box");
    await p3.close();
  }

  // ---------- 7. album flow still calls verify-album-purchase ----------
  {
    const page = await browser.newPage();
    let hit = "";
    await page.route("**/functions/v1/verify-*", (r) => { hit = r.request().url(); r.fulfill({ status: 403, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" }); });
    await page.goto(base + "/download.html?album=unleashed&session_id=" + SID, { waitUntil: "domcontentloaded" });
    await page.locator("#errorBox:not(.hidden)").waitFor();
    assert.match(hit, /verify-album-purchase\?album=unleashed&session_id=/);
    ok("download.html?album=… still uses verify-album-purchase");
    await page.close();
  }

  // ---------- 8. buy-song.html → POST kind song; unknown id → picker ----------
  {
    const page = await browser.newPage();
    let posted = null;
    await page.route("**/functions/v1/create-music-checkout", async (r) => {
      posted = JSON.parse(r.request().postData());
      await r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, url: base + "/index.html#stripe-song" }) });
    });
    await page.goto(base + "/buy-song.html?id=x&t=" + encodeURIComponent("My Bed Ain't Mine") + "&src=puppyfm", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/stripe-song/);
    assert.deepEqual(posted.song_ids, ["my-bed-aint-mine"]); assert.equal(posted.kind, "song"); assert.equal(posted.source, "puppyfm");
    ok("buy-song.html resolves by title → POST {kind:song, song_ids:[my-bed-aint-mine], source:puppyfm}");
    await page.close();

    const p2 = await browser.newPage();
    await p2.goto(base + "/buy-song.html?id=not-a-real-song", { waitUntil: "domcontentloaded" });
    await p2.waitForURL(/my-bundle\.html\?tier=3/);
    ok("buy-song.html unknown song → falls back to pick-3 picker");
    await p2.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(results.join("\n"));
console.log("ALL " + results.length + " SMOKE CHECKS PASSED");
