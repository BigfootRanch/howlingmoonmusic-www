// Howling Moon Music — Service Worker v1
// Cache-first for shell, pass-through for API calls

const CACHE_NAME = 'hmm-admin-v4';
const SHELL_FILES = [
  '/admin/v4.html',
  '/admin/manifest.json'
];

// Install — cache shell files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache shell, pass through Supabase/API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('stripe.com') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // Cache-first for shell files
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful responses for admin files
          if (response.ok && url.pathname.startsWith('/admin/')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => caches.match('/admin/v4.html'))
  );
});
