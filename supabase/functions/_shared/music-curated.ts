// music-curated.ts — SERVER-ONLY song lists for the 11 curated bundle / legacy album download pages
// (downloads/<slug>.html). Keyed by the Stripe PRODUCT id their Payment Links / client-side Checkout sell
// (read back via GET /v1/payment_links on 2026-10-03). Titles + urls copied verbatim from what each page
// served before it was gated (titles uppercased); url null = the page showed "Coming Soon" for that row.
// Underscore folder: GitHub Pages / Jekyll never serves it.
export interface CuratedSong { title: string; url: string | null }
export interface CuratedProduct { slug: string; name: string; songs: CuratedSong[] }

export const MUSIC_CURATED: Record<string, CuratedProduct> = {
  "prod_UFHOYpElPrseJR": {
    slug: "420-pack", name: "420 Pack", // 420 Pack Bundle (3 Songs)
    songs: [
      { title: "PUFF PLANET", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/MUSIC%20ALBUM%20RAINBOW%202025/PUFF%20%20planet%20(1).wav" },
      { title: "ENCHANTED GREEN HAZE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Enchanted%20Green%20Haze.mp3" },
      { title: "HAZY BUBBLE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Untitled%20folder/SAD%20SONGS%20GRIEF%20TEARS/Hazy%20bubble.mp3" },
    ],
  },
  "prod_UFHOxsLEAm3s0F": {
    slug: "beach-vibes", name: "Beach Vibes Bundle", // Beach Vibes Bundle (4 Songs)
    songs: [
      { title: "BAREFOOT BEACH BEAUTY", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BAREFOOT%20BEACH%20BEAUTY%20(2).mp3" },
      { title: "COCONUT KISS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/COCONUT%20KISS%20(MASTER).mp3" },
      { title: "SAND IN TOES", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Sand%20in%20Toes%20(1).mp3" },
      { title: "COASTAL CANDY", url: null },
    ],
  },
  "prod_UFHNMb55PGfs2G": {
    slug: "burn-it-down", name: "Burn It Down Bundle", // Burn It Down — Rage & Empowerment Bundle (4 Songs)
    songs: [
      { title: "THE RECKONING", url: null },
      { title: "VILLAIN", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/villian-(add-vocal)%20vs1.mp3" },
      { title: "KEEP PUSHING ME", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Keep%20pushing%20me%20(1).wav" },
      { title: "STILL THE ASSHOLE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/still-the-asshole.mp3" },
    ],
  },
  "prod_UFHPr7tbY29X6d": {
    slug: "christmas-album", name: "Christmas Album", // DogMother Christmas 2025 Album (8 Songs)
    songs: [
      { title: "CHRISTMAS PUPPY", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Puppy%20Christmas%20(1).mp3" },
      { title: "CHRISTMAS ON THE BEACH", url: null },
      { title: "LUMP OF COAL", url: null },
      { title: "LUMINARIAS", url: null },
      { title: "SLOBBERY KISS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/PUPPY%20DOG%20SONGS/SLOBBERY%20KISS%20(1).mp3" },
      { title: "NAME ABOVE ALL NAMES", url: null },
      { title: "ONLY GIFT I NEED", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/the-only-gift-i-need.mp3" },
      { title: "SMOKY MOUNTAIN SNOW", url: null },
    ],
  },
  "prod_UFHPeEAmu7oXVP": {
    slug: "genx-album", name: "Gen X Album", // GenX Rage & Red Lipstick Album (6 Songs)
    songs: [
      { title: "KICK YOUR ASS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/Kick%20your%20ass%20(Remastered).wav" },
      { title: "KEEP PUSHING ME", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Keep%20pushing%20me%20(1).wav" },
      { title: "DROWN IN THE BOTTLE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Drown%20in%20the%20bottle%20(1).mp3" },
      { title: "CAN'T CURE STUPID", url: null },
      { title: "STAGE 4 LIABETES", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/Liabetes%20(Remastered)%20(1).wav" },
      { title: "ZERO RIPS LEFT", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/zero-rips-left.mp3" },
    ],
  },
  "prod_UFHOsv5g6L4n96": {
    slug: "healing", name: "Healing Bundle", // Healing After Hell Bundle (4 Songs)
    songs: [
      { title: "WOKE UP LAUGHING", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Woke%20Up%20Laughing%20(1).mp3" },
      { title: "BREATHE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/Breathe.mp3" },
      { title: "DON'T CRY AT MY FUNERAL", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Don_t%20cry%20%20(1).wav" },
      { title: "I DIDN'T DIE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/I%20DIDN_T%20DIE%20(1).mp3" },
    ],
  },
  "prod_UFRjDvEwwfZ7KR": {
    slug: "outlaw-love", name: "Outlaw Love: Wanted Dead or Alive", // Outlaw Love: Wanted Dead or Alive (7 Songs) (payment link INACTIVE)
    songs: [
      { title: "LIAR, PREACHER MAN", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/LIAR%2C%20PREACHER%20MAN%20(1).mp3" },
      { title: "I DIDN'T DIE (SCARLET LETTER)", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/I%20DIDN_T%20DIE%20(1).mp3" },
      { title: "ONE NIGHT WITH THE DEVIL", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/One%20night%20with%20the%20devil%20(1).mp3" },
      { title: "SMOKE ME", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/SMOKE%20ME%20(1).mp3" },
      { title: "NEVER LET GO / HAND IN HAND", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/NEVER%20LET%20GO%20(master).mp3" },
      { title: "GHOST WANTED DEAD OR ALIVE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/Ghost%20Wanted%20Dead%20or%20Alive%20(1).mp3" },
      { title: "RODEO COWBOY", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/OUTLAW%20WESTERN%20ALBUM/RODEO%20COWBOY%20(EDIT)%20(Edit)%20(1).mp3" },
    ],
  },
  "prod_UFHPWEsKTxGpcK": {
    slug: "rainbow-album", name: "Rainbow Album", // Rainbow Album (9 Songs)
    songs: [
      { title: "RAINBOW", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/rainbow.mp3" },
      { title: "LAS CRUCES NIGHTS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Las%20Cruces%20Nights.mp3" },
      { title: "PORT LAVACA PARADISE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/PORT%20LAVACA.mp3" },
      { title: "LEFT MY HEART IN SANTA FE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Left%20my%20heart%20in%20Santa%20Fe.mp3" },
      { title: "ENCHANTED GREEN HAZE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Enchanted%20Green%20Haze.mp3" },
      { title: "LIGHTNING STRIKES", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/LIGHTNING%20STRIKES%20MY%20HEART.mp3" },
      { title: "TATTOO IN ALBUQUERQUE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Tattoo.mp3" },
      { title: "FIELDS OF GOLD", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/MUSIC%20ALBUM%20RAINBOW%202025/Fields%20of%20Gold%20%20.wav" },
      { title: "FIREFLIES & FIREWORKS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/MUSIC%20ALBUM%20RAINBOW%202025/FIREFLYS%20%26%20FIREWORKS%20(1).wav" },
    ],
  },
  "prod_UFHO8ErfUlstjf": {
    slug: "road-trip", name: "Road Trip Bundle", // Road Trip & Travel Bundle (5 Songs)
    songs: [
      { title: "LAS CRUCES NIGHTS", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/NEW%20MEXICO%20SONGS/Las%20Cruces%20Nights.mp3" },
      { title: "PORT LAVACA PARADISE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/PORT%20LAVACA.mp3" },
      { title: "LEFT MY HEART IN SANTA FE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Left%20my%20heart%20in%20Santa%20Fe.mp3" },
      { title: "LIGHTNING STRIKES", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/LIGHTNING%20STRIKES%20MY%20HEART.mp3" },
      { title: "DOWN UNDER", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/DOWN%20UNDER.mp3" },
    ],
  },
  "prod_UFHOhA0uTygDW2": {
    slug: "sleep-relax", name: "Sleep & Relax Bundle", // Sleep & Relax Bundle (3 Songs)
    songs: [
      { title: "BREATHE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/Breathe.mp3" },
      { title: "FLOATING", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Floating%20(2).mp3" },
      { title: "SLEEP", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/Sleep%20(2).mp3" },
    ],
  },
  "prod_UFHOWyAg3tZ1ap": {
    slug: "villain-album", name: "Villain Album", // Villain Album (7 Songs)
    songs: [
      { title: "VILLAIN", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/villian-(add-vocal)%20vs1.mp3" },
      { title: "CHOKE ON THE WINE", url: null },
      { title: "OBSESSED", url: null },
      { title: "FAVORITE MISTAKE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/MUSIC%20ALBUM%20VILLAIN%202025/Favorite%20Mistake%20.wav" },
      { title: "GOOD TO ME", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/MUSIC%20ALBUM%20VILLAIN%202025/GOOD%20TO%20ME.wav" },
      { title: "DON'T CRY AT MY FUNERAL", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Don_t%20cry%20%20(1).wav" },
      { title: "STILL THE ASSHOLE", url: "https://pxcxtnabyydhbfbholvh.supabase.co/storage/v1/object/public/audio/Album%20Collections/BEACH%20VIBES/still-the-asshole.mp3" },
    ],
  },
};
