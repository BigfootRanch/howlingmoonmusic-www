#!/usr/bin/env python3
"""GHOST WANTED DEAD OR ALIVE: $15.99 -> $14.99 (CEO pricing law), the safe way.

Stripe part (only with --apply; needs the Howling Moon secret key in env STRIPE_SECRET_KEY, never printed):
  1. POST /v1/prices          new one-time $14.99 USD Price on the SAME product prod_V97ar6HAGea8Ub
                              (verify-album-purchase matches on product, so new buyers still verify)
  2. POST /v1/payment_links   new link cloned from plink_1U8pLZPY5LxVsiI52UTrypyh's settings
                              (redirect incl. {CHECKOUT_SESSION_ID}, metadata album=..., billing auto, etc.)
  3. POST /v1/payment_links/plink_1U8pLZPY5LxVsiI52UTrypyh active=false
     NOTE: the OLD buy.stripe.com/eVqcN71vc1MZefM4psd7q0g URL stops working for anyone holding it
     (printed QR / old shares). Old buyers' download links are unaffected (their sessions stay paid).
Site part: replaces the old link URL with the new one everywhere and fixes the Ghost "$15.99" labels.

Usage (from the music-site repo root):
  python3 _tools/ghost-price-fix.py                      # dry run: show planned Stripe calls + site edits
  python3 _tools/ghost-price-fix.py --site-only <URL>    # only patch the site to a link you already created
  STRIPE_SECRET_KEY=... python3 _tools/ghost-price-fix.py --apply
"""
import json, os, re, sys, urllib.parse, urllib.request, base64, pathlib

PRODUCT = "prod_V97ar6HAGea8Ub"
OLD_LINK_ID = "plink_1U8pLZPY5LxVsiI52UTrypyh"
OLD_URL = "https://buy.stripe.com/eVqcN71vc1MZefM4psd7q0g"
REDIRECT = "https://www.howlingmoonmusic.com/download.html?album=ghost-wanted-dead-or-alive&session_id={CHECKOUT_SESSION_ID}"
ROOT = pathlib.Path(__file__).resolve().parent.parent


def stripe(method, path, params=None, idem=None):
    key = os.environ["STRIPE_SECRET_KEY"]
    data = urllib.parse.urlencode(params or {}).encode() if method == "POST" else None
    req = urllib.request.Request("https://api.stripe.com" + path, data=data, method=method)
    req.add_header("Authorization", "Basic " + base64.b64encode((key + ":").encode()).decode())
    if idem:
        req.add_header("Idempotency-Key", idem)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


PRICE_PARAMS = {"product": PRODUCT, "unit_amount": "1499", "currency": "usd",
                "nickname": "GHOST WANTED DEAD OR ALIVE album $14.99 (pricing law 2026-10-03)"}


def link_params(price_id):
    return {
        "line_items[0][price]": price_id, "line_items[0][quantity]": "1",
        "after_completion[type]": "redirect", "after_completion[redirect][url]": REDIRECT,
        "metadata[album]": "GHOST WANTED DEAD OR ALIVE",
        "billing_address_collection": "auto", "customer_creation": "if_required",
        "allow_promotion_codes": "false", "submit_type": "auto",
    }


def patch_site(new_url, write):
    changed = {}
    files = [p for p in ROOT.rglob("*") if p.suffix in (".html", ".js", ".json")
             and not any(part.startswith(("_", ".")) for part in p.relative_to(ROOT).parts)
             and "supabase" not in p.relative_to(ROOT).parts]
    for p in files:
        s = p.read_text(encoding="utf-8")
        if OLD_URL not in s and not re.search(r'GHOST WANTED DEAD OR ALIVE[^<\n"]{0,40}\$15\.99', s):
            continue
        o = s
        s = s.replace(OLD_URL, new_url)
        s = re.sub(r"(product_slug:'ghost-wanted-dead-or-alive'[^}]*?price_label:')\$15\.99", r"\g<1>$14.99", s)
        s = s.replace('"u":"%s","l":"$15.99"' % new_url, '"u":"%s","l":"$14.99"' % new_url)
        s = re.sub(r'(GHOST WANTED DEAD OR ALIVE[^<\n"]{0,40})\$15\.99', r"\g<1>$14.99", s)
        # button text on the line(s) right after a line carrying the link ("Buy Collection — $15.99")
        lines = s.split("\n")
        for i, ln in enumerate(lines):
            if new_url in ln:
                for j in range(i, min(i + 4, len(lines))):
                    if j > i and "buy.stripe.com" in lines[j]:
                        break
                    if "coconut" in lines[j].lower():
                        continue
                    lines[j] = re.sub(r"(Buy Collection &mdash; |Buy &mdash; |&mdash; )\$15\.99", r"\g<1>$14.99", lines[j])
        s = "\n".join(lines)
        if s != o:
            changed[str(p.relative_to(ROOT))] = (o.count(OLD_URL), o.count("$15.99") - s.count("$15.99"))
            if write:
                p.write_text(s, encoding="utf-8")
    return changed


def main():
    args = sys.argv[1:]
    if args[:1] == ["--site-only"]:
        new_url = args[1]
        assert re.match(r"^https://buy\.stripe\.com/[A-Za-z0-9]+$", new_url), new_url
        ch = patch_site(new_url, True)
        for f, (links, prices) in sorted(ch.items()):
            print(f"{f}: {links} link(s) repointed, {prices} $15.99->$14.99")
        print(len(ch), "files changed")
        return
    if "--apply" not in args:
        print("DRY RUN (no Stripe calls, no file writes)")
        print("POST /v1/prices", PRICE_PARAMS)
        print("POST /v1/payment_links", link_params("<new price id>"))
        print("POST /v1/payment_links/" + OLD_LINK_ID, {"active": "false"})
        ch = patch_site("https://buy.stripe.com/NEWLINKPLACEHOLDER", False)
        for f, (links, prices) in sorted(ch.items()):
            print(f"  would patch {f}: {links} link(s), {prices} price label(s)")
        print(len(ch), "files would change")
        return
    price = stripe("POST", "/v1/prices", PRICE_PARAMS, idem="hmm-ghost-1499-price-20261003")
    print("new price", price["id"], price["unit_amount"], price["product"])
    link = stripe("POST", "/v1/payment_links", link_params(price["id"]), idem="hmm-ghost-1499-link-20261003")
    print("new link", link["id"], link["url"], "redirect", link["after_completion"]["redirect"]["url"])
    old = stripe("POST", "/v1/payment_links/" + OLD_LINK_ID, {"active": "false"}, idem="hmm-ghost-old-off-20261003")
    print("old link", old["id"], "active", old["active"])
    ch = patch_site(link["url"], True)
    print(len(ch), "site files patched:", ", ".join(sorted(ch)))


if __name__ == "__main__":
    main()
