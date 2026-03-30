/* ============================================
   Howling Moon Music — Stripe Checkout
   buy-music.js
   ============================================ */

(function () {
  'use strict';

  var STRIPE_PK = 'pk_live_51TGmT8PY5LxVsiI5diLmOi0Fq1x7yh2buFo2UZbhvD6mVv0LqOnpG7LJ8dxMaZyorCPav1YCWM1oKz5QlF4Uzp5X003y4isVcf';
  var stripe = null;

  /* Price IDs keyed by bundle/album slug */
  var PRICES = {
    'burn-it-down':      'price_1TGmoNPY5LxVsiI5gvW9nEqf',
    'beach-vibes':       'price_1TGmpFPY5LxVsiI51TqL0oZi',
    'road-trip':         'price_1TGmpQPY5LxVsiI5r6g6g3LP',
    'healing':           'price_1TGmpaPY5LxVsiI59hdVPCop',
    'sleep-relax':       'price_1TGmplPY5LxVsiI5dAOUr9Vb',
    '420-pack':          'price_1TGmpwPY5LxVsiI5IeDnPLo2',
    'villain-album':     'price_1TGmq6PY5LxVsiI5OkJsGT1i',
    'rainbow-album':     'price_1TGmqHPY5LxVsiI5NcMGfh3R',
    'genx-album':        'price_1TGmqSPY5LxVsiI5wbv7MFDp',
    'christmas-album':   'price_1TGmqdPY5LxVsiI5OdWO5dsi'
  };

  /* Load Stripe.js from CDN */
  function loadStripe(cb) {
    if (window.Stripe) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = cb;
    document.head.appendChild(s);
  }

  /* Initialize Stripe instance (lazy) */
  function getStripe() {
    if (!stripe) { stripe = Stripe(STRIPE_PK); }
    return stripe;
  }

  /**
   * Redirect to Stripe Checkout for a bundle/album purchase.
   * @param {string} priceId  — Stripe price ID (or slug to auto-resolve)
   * @param {string} slug     — bundle/album slug for success redirect
   */
  window.buyBundle = function (priceId, slug) {
    /* Allow calling with just a slug — resolve price automatically */
    if (!slug && PRICES[priceId]) {
      slug = priceId;
      priceId = PRICES[priceId];
    }

    loadStripe(function () {
      getStripe().redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        successUrl: 'https://howlingmoonmusic.com/downloads/' + slug + '.html',
        cancelUrl: 'https://howlingmoonmusic.com/music.html'
      }).then(function (result) {
        if (result.error) {
          alert(result.error.message);
        }
      });
    });
  };
})();
