// Service Worker for PWA
const CACHE_NAME = 'sujata-mastani-v3'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  // Add other static assets you want to cache here
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // *** ROBUST FIX ***
  // Strategy 1: Ignore all Google API calls to prevent any interference.
  if (requestUrl.hostname.endsWith('googleapis.com')) {
    // Let the browser handle these requests normally by not calling event.respondWith.
    return;
  }

  // Strategy 2: Network falling back to cache for all other requests (app assets).
  // This ensures the user gets the latest version if online, but the app still works offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the fetch is successful, cache the new response and then return it.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // If the network request fails (e.g., user is offline),
        // try to serve the response from the cache.
        return caches.match(event.request);
      })
  );
});

