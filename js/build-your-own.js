/* Build Your Own Bundle — Preview + Cart + Stripe Checkout */
(function() {
  'use strict';

  function closeMob() { document.getElementById('mobNav').classList.remove('open'); }
  window.closeMob = closeMob;

  var SB = 'https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/';
  var selected = [];
  var currentAudio = null;
  var currentCard = null;

  var tiers = [
    {min:3, price:'$4.99', per:'$1.66/song', url:'https://buy.stripe.com/eVqaEZehY3V76Nk7BEd7q0a'},
    {min:5, price:'$6.99', per:'$1.40/song', url:'https://buy.stripe.com/6oU4gB4HofDP1t03lod7q0b'},
    {min:10, price:'$9.99', per:'$1.00/song', url:'https://buy.stripe.com/3cI8wRb5Mbnz8VscVYd7q0c'}
  ];

  function updateCart() {
    var bar = document.getElementById('cartBar');
    var count = document.getElementById('cartCount');
    var tier = document.getElementById('cartTier');
    var btn = document.getElementById('cartCheckout');
    if (selected.length === 0) { bar.classList.remove('show'); return; }
    bar.classList.add('show');
    count.textContent = selected.length + ' song' + (selected.length !== 1 ? 's' : '') + ' selected';
    var best = null;
    for (var i = tiers.length - 1; i >= 0; i--) {
      if (selected.length >= tiers[i].min) { best = tiers[i]; break; }
    }
    if (!best) best = tiers[0];
    if (selected.length < 3) {
      tier.textContent = 'Pick ' + (3 - selected.length) + ' more for ' + tiers[0].price;
      btn.textContent = 'Need ' + (3 - selected.length) + ' more';
      btn.href = '#';
      btn.style.opacity = '.5';
    } else {
      tier.textContent = best.price + ' (' + best.per + ')';
      btn.textContent = 'Checkout \u2014 ' + best.price;
      btn.href = best.url;
      btn.style.opacity = '1';
    }
  }

  function clearCart() {
    selected = [];
    document.querySelectorAll('.song-preview.selected').forEach(function(c) { c.classList.remove('selected'); });
    updateCart();
  }
  window.clearCart = clearCart;

  function toggleSelect(card, title) {
    var idx = selected.indexOf(title);
    if (idx >= 0) {
      selected.splice(idx, 1);
      card.classList.remove('selected');
    } else {
      selected.push(title);
      card.classList.add('selected');
    }
    updateCart();
  }

  function previewSong(card, audioFile) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (currentCard) { currentCard.classList.remove('playing'); }
    if (currentCard === card) { currentCard = null; return; }
    currentCard = card;
    card.classList.add('playing');
    var audio = new Audio(SB + encodeURIComponent(audioFile));
    audio.volume = 0.8;
    audio.play().catch(function() { card.classList.remove('playing'); });
    audio.onended = function() { card.classList.remove('playing'); currentCard = null; currentAudio = null; };
    currentAudio = audio;
  }

  // Song catalog with audio file mappings
  var songs = [
    {t:"Almost Called",a:"almost-called.wav"},{t:"Barefoot Beach Beauty",a:"barefoot-beach-beauty.mp3"},
    {t:"Bigfoot Lives Here",a:"bigfoot-lives-here.mp3"},{t:"Booty Boom Boom",a:"booty-boom-boom.mp3"},
    {t:"Breathe",a:"breathe.mp3"},{t:"Choke On The Wine",a:"choke-on-the-wine.wav"},
    {t:"Christmas Puppy",a:"christmas-puppy.mp3"},{t:"Christmas on the Beach",a:"christmas-on-the-beach.wav"},
    {t:"Coconut Kiss",a:"coconut-kiss.mp3"},{t:"Coffee Constellation",a:"coffee-constellation.mp3"},
    {t:"Cotton Candy",a:"cotton-candy.mp3"},{t:"Crack the Sky",a:"crack-the-sky.wav"},
    {t:"Crackhead Queen",a:"crackhead-queen.mp3"},{t:"Daddy's Eyes",a:"daddys-eyes.wav"},
    {t:"Don't Be a Mr. Magoo",a:"Dont-be-a-Mr-McGoo-Remix.wav"},{t:"Don't Cry At My Funeral",a:"dont-cry-at-my-funeral.wav"},
    {t:"Down Under",a:"down-under.mp3"},{t:"Drown Me in Slobbery Kisses",a:"drown-me-in-slobbery-kisses.mp3"},
    {t:"Drown in the Bottle",a:"drown-in-the-bottle.mp3"},{t:"Drowning In My Tears",a:"drowning-in-my-tears.mp3"},
    {t:"Enchanted Green Haze",a:"enchanted-green-haze.mp3"},{t:"Endless Summer",a:"endless-summer.mp3"},
    {t:"Favorite Mistake",a:"favorite-mistake.wav"},{t:"Fields of Gold",a:"fields-of-gold.wav"},
    {t:"Fire from Heaven",a:"fire-from-heaven.mp3"},{t:"Fireflies & Fireworks",a:"fireflies-and-fireworks.wav"},
    {t:"Floating",a:"floating.mp3"},{t:"Gaslight & Glitter",a:"gaslight-and-glitter.mp3"},
    {t:"Ghost Wanted Dead or Alive",a:"ghost-wanted-dead-or-alive.mp3"},{t:"God Is Good To Me",a:"God-Is-Good-To-Me.wav"},
    {t:"Good To Me",a:"good-to-me.wav"},{t:"Goodnight Baby",a:"goodnight-baby.mp3"},
    {t:"Hazy Bubble",a:"hazy-bubble.mp3"},{t:"Held You First",a:"held-you-first.mp3"},
    {t:"I Ain't Picking Up Your Shit No More",a:"i-aint-picking-up-your-shit-no-more.mp3"},
    {t:"I Didn't Die",a:"i-didnt-die.mp3"},{t:"I Rise",a:"I-Rise.wav"},
    {t:"If Tears Could Call Heaven",a:"if-tears-could-call-heaven.mp3"},{t:"Invisible Woman",a:"invisible-woman.mp3"},
    {t:"Just Peachy",a:"just-peachy.wav"},{t:"Keep Pushing Me",a:"keep-pushing-me.wav"},
    {t:"Kick Your Ass",a:"kick-your-ass.wav"},{t:"Las Cruces Nights",a:"las-cruces-nights.mp3"},
    {t:"Left My Heart In Santa Fe",a:"left-my-heart-in-santa-fe.mp3"},{t:"Liar, Preacher Man",a:"liar-preacher-man.mp3"},
    {t:"Lightning Strikes",a:"lightning-strikes.mp3"},{t:"Looking for My Swagger",a:"looking-for-my-swagger.mp3"},
    {t:"Lost in Santa Fe",a:"lost-in-santa-fe.mp3"},{t:"Love Me Complicated",a:"love-me-complicated.mp3"},
    {t:"Luminarias",a:"luminarias.wav"},{t:"Luminaries",a:"Luminaries (Remastered).wav"},
    {t:"Lump of Coal",a:"lump-of-coal.wav"},{t:"Mangroves & Moonlight",a:"mangroves-and-moonlight.mp3"},
    {t:"Mi Hogar",a:"mi-hogar.mp3"},{t:"My Bed Ain't Mine",a:"my-bed-aint-mine.mp3"},
    {t:"Name Above All Names",a:"name-above-all-names.wav"},{t:"Never Let Go",a:"never-let-go.mp3"},
    {t:"Not Enough Bottles",a:"not-enough-bottles.mp3"},{t:"Obsessed",a:"obsessed.wav"},
    {t:"One Night with the Devil",a:"one-night-with-the-devil.mp3"},{t:"Only Gift I Need",a:"only-gift-i-need.mp3"},
    {t:"Paper Soldier",a:"paper-soldier.mp3"},{t:"Port Lavaca Paradise",a:"port-lavaca-paradise.mp3"},
    {t:"Puff Planet",a:"puff-planet.wav"},{t:"Puppy Kisses",a:"puppy-kisses.mp3"},
    {t:"Pussy Juice",a:"pussy-juice.mp3"},{t:"Rainbow",a:"rainbow.mp3"},
    {t:"Ride or Die",a:"ride-or-die.wav"},{t:"Rock a Bye Baby",a:"rock-a-bye-baby.mp3"},
    {t:"Rodeo Cowboy",a:"rodeo-cowboy.mp3"},{t:"Sand in Toes",a:"sand-in-toes.mp3"},
    {t:"Silence Is Your Fangs",a:"silence-is-your-fangs.mp3"},{t:"Sleep",a:"sleep.mp3"},
    {t:"Slobbery Kiss",a:"slobbery-kiss.mp3"},{t:"Smoke Me",a:"smoke-me.mp3"},
    {t:"Smoky Mountain Snow",a:"smoky-mountain-snow.wav"},{t:"Spurs",a:"spurs.mp3"},
    {t:"Stage 4 Liabetes",a:"stage-4-liabetes.wav"},{t:"Still The Asshole",a:"still-the-asshole.mp3"},
    {t:"Tangled",a:"tangled.mp3"},{t:"Tattoo In Albuquerque",a:"tattoo-in-albuquerque.mp3"},
    {t:"Tear Drops in My Coffee",a:"tear-drops-in-my-coffee.mp3"},{t:"The Reckoning",a:"the-reckoning.wav"},
    {t:"This is Shame",a:"this-is-shame.wav"},{t:"Tongue & Groove",a:"tongue-and-groove.mp3"},
    {t:"Twinkle",a:"twinkle.mp3"},{t:"Uncontainable",a:"uncontainable.mp3"},
    {t:"Undo the Spell",a:"undo-the-spell.wav"},{t:"Villain",a:"villain.mp3"},
    {t:"When You Wake",a:"when-you-wake.mp3"},{t:"Woke Up Laughing",a:"woke-up-laughing.mp3"},
    {t:"World Melts Away",a:"world-melts-away.mp3"},{t:"Zero Rips Left",a:"zero-rips-left.mp3"}
  ];

  var grid = document.getElementById('songGrid');
  songs.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'song-preview';

    var icon = document.createElement('div');
    icon.className = 'song-icon';
    icon.title = 'Preview';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#ff2d7b');
    svg.setAttribute('stroke-width', '2');
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '5 3 19 12 5 21 5 3');
    svg.appendChild(poly);
    icon.appendChild(svg);

    var info = document.createElement('div');
    info.className = 'song-info';
    var name = document.createElement('div');
    name.className = 'song-name';
    name.textContent = s.t;
    info.appendChild(name);

    var addBtn = document.createElement('span');
    addBtn.className = 'song-add';
    addBtn.textContent = '+ Add';

    div.appendChild(icon);
    div.appendChild(info);
    div.appendChild(addBtn);

    icon.addEventListener('click', function(e) {
      e.stopPropagation();
      previewSong(div, s.a);
    });
    addBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleSelect(div, s.t);
    });
    div.addEventListener('click', function() { toggleSelect(div, s.t); });
    grid.appendChild(div);
  });
})();
