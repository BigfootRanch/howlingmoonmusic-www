var STRIPE_PRICES = {
  'burn-it-down': 'price_1TGmoNPY5LxVsiI5gvW9nEqf',
  'beach-vibes': 'price_1TGmpFPY5LxVsiI51TqL0oZi',
  'road-trip': 'price_1TGmpQPY5LxVsiI5r6g6g3LP',
  'healing': 'price_1TGmpaPY5LxVsiI59hdVPCop',
  'sleep-relax': 'price_1TGmplPY5LxVsiI5dAOUr9Vb',
  '420-pack': 'price_1TGmpwPY5LxVsiI5IeDnPLo2',
  'villain-album': 'price_1TGmq6PY5LxVsiI5OkJsGT1i',
  'rainbow-album': 'price_1TGmqHPY5LxVsiI5NcMGfh3R',
  'genx-album': 'price_1TGmqSPY5LxVsiI5wbv7MFDp',
  'christmas-album': 'price_1TGmqdPY5LxVsiI5OdWO5dsi'
};

(function() {
  'use strict';

  var SB = 'https://pxcxtnabyydhbfbholvh.supabase.co';
  var PURCHASE_KEY = 'hm_purchase_context_v1';
  var INTAKE_URL = window.HM_PURCHASE_INTAKE_URL || (SB + '/functions/v1/fan-intake');
  var STRIPE_KEY = 'pk_live_51TGmT8PY5LxVsiI5diLmOi0Fq1x7yh2buFo2UZbhvD6mVv0LqOnpG7LJ8dxMaZyorCPav1YCWM1oKz5QlF4Uzp5X003y4isVcf';

  function safeJsonParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function safeStorage(storage, key, value) {
    try {
      if (typeof value === 'undefined') return storage.getItem(key);
      storage.setItem(key, value);
    } catch (e) {}
    return null;
  }

  function getSessionId() {
    var sessionId = safeStorage(sessionStorage, 'hm_session');
    if (!sessionId) {
      sessionId = 'ses_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now();
      safeStorage(sessionStorage, 'hm_session', sessionId);
    }
    return sessionId;
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search || '');
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function(key) {
      var value = params.get(key);
      if (value) utm[key] = value;
    });
    return utm;
  }

  function readContext() {
    return safeJsonParse(safeStorage(localStorage, PURCHASE_KEY) || 'null', null) || null;
  }

  function saveContext(context) {
    try { localStorage.setItem(PURCHASE_KEY, JSON.stringify(context)); } catch (e) {}
    return context;
  }

  function buildContext(details) {
    var saved = readContext() || {};
    var next = details || {};
    var context = {
      product_slug: next.product_slug || saved.product_slug || '',
      product_name: next.product_name || saved.product_name || '',
      bundle_slug: next.bundle_slug || saved.bundle_slug || next.product_slug || saved.product_slug || '',
      checkout_url: next.checkout_url || saved.checkout_url || '',
      price_id: next.price_id || saved.price_id || '',
      price_label: next.price_label || saved.price_label || '',
      landing_page: next.landing_page || saved.landing_page || window.location.pathname,
      landing_title: next.landing_title || saved.landing_title || document.title,
      referrer: next.referrer || saved.referrer || document.referrer || '',
      session_id: next.session_id || saved.session_id || getSessionId(),
      hm_fp: next.hm_fp || saved.hm_fp || safeStorage(sessionStorage, 'hm_fp') || '',
      utm: next.utm || saved.utm || getUtmParams(),
      captured_at: new Date().toISOString(),
      purchase_source: next.purchase_source || saved.purchase_source || 'web'
    };
    return saveContext(context);
  }

  function openExternal(url, details) {
    buildContext(Object.assign({}, details || {}, { checkout_url: url }));
    var win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) win.opener = null;
    return false;
  }

  function ensureStripe(cb) {
    if (window.Stripe) { cb(); return; }
    var script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = cb;
    document.head.appendChild(script);
  }

  function startStripeCheckout(details) {
    var next = details || {};
    var priceId = next.price_id || '';
    if (!priceId) {
      if (next.slug && STRIPE_PRICES[next.slug]) priceId = STRIPE_PRICES[next.slug];
    }
    if (!priceId) {
      alert('Bundle not found: ' + (next.slug || 'unknown'));
      return;
    }

    buildContext(Object.assign({}, next, {
      price_id: priceId,
      checkout_url: next.success_url || ''
    }));

    ensureStripe(function() {
      var stripe = Stripe(STRIPE_KEY);
      stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        successUrl: next.success_url || (window.location.origin + '/downloads/' + next.slug + '.html'),
        cancelUrl: next.cancel_url || (window.location.origin + '/music.html')
      }).then(function(result) {
        if (result.error) alert(result.error.message);
      });
    });
  }

  function submitPurchaseCapture(data) {
    var formData = data || {};
    var context = buildContext({
      product_slug: formData.product_slug || formData.bundle || formData.slug || '',
      product_name: formData.product_name || formData.bundle_label || document.title,
      bundle_slug: formData.bundle || formData.slug || formData.product_slug || '',
      purchase_source: 'download-form'
    });

    var payload = {
      email: formData.email || '',
      name: formData.name || '',
      source: formData.source || 'purchase',
      purchased_bundle: formData.bundle || formData.slug || formData.product_slug || '',
      product_slug: context.product_slug,
      product_name: context.product_name,
      landing_page: context.landing_page,
      landing_title: context.landing_title,
      referrer: context.referrer,
      session_id: context.session_id,
      hm_fp: context.hm_fp,
      utm: context.utm,
      checkout_url: context.checkout_url,
      purchase_context: context,
      page_url: window.location.pathname,
      page_title: document.title
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(INTAKE_URL, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        return Promise.resolve(true);
      }
    } catch (e) {}

    return fetch(INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function(response) {
      return response.ok;
    }).catch(function() {
      return false;
    });
  }

  window.hmPurchase = {
    buildContext: buildContext,
    getContext: readContext,
    saveContext: saveContext,
    openExternal: openExternal,
    startStripeCheckout: startStripeCheckout,
    submitPurchaseCapture: submitPurchaseCapture,
    sessionId: getSessionId
  };
  window.hmCapturePurchaseContext = buildContext;
  window.hmOpenStripeCheckout = openExternal;
  window.hmStartStripeCheckout = startStripeCheckout;
  window.hmSubmitPurchaseCapture = submitPurchaseCapture;
})();

function buyBundle(slugOrPrice, slug) {
  if (!slug && STRIPE_PRICES[slugOrPrice]) {
    slug = slugOrPrice;
  }

  window.hmStartStripeCheckout({
    slug: slug,
    product_slug: slug,
    product_name: slug ? slug.replace(/-/g, ' ') : '',
    purchase_source: 'music-archive',
    success_url: 'https://howlingmoonmusic.com/downloads/' + slug + '.html',
    cancel_url: 'https://howlingmoonmusic.com/music.html'
  });
}
