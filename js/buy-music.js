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

function buyBundle(slugOrPrice, slug) {
  var priceId = slugOrPrice;
  if (!slug && STRIPE_PRICES[slugOrPrice]) {
    slug = slugOrPrice;
    priceId = STRIPE_PRICES[slugOrPrice];
  }

  var script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.onload = function() {
    var stripe = Stripe('pk_live_51TGmT8PY5LxVsiI5diLmOi0Fq1x7yh2buFo2UZbhvD6mVv0LqOnpG7LJ8dxMaZyorCPav1YCWM1oKz5QlF4Uzp5X003y4isVcf');
    stripe.redirectToCheckout({
      lineItems: [{price: priceId, quantity: 1}],
      mode: 'payment',
      successUrl: 'https://howlingmoonmusic.com/downloads/' + slug + '.html',
      cancelUrl: 'https://howlingmoonmusic.com/music.html'
    }).then(function(result) {
      if (result.error) alert(result.error.message);
    });
  };
  document.head.appendChild(script);
}
