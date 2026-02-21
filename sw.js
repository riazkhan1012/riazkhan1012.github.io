// ─────────────────────────────────────────────
// Riaz Food Map — Service Worker
// Caches the app shell + map tiles for offline use
// ─────────────────────────────────────────────

var CACHE_NAME    = 'riaz-foodmap-v1';
var TILE_CACHE    = 'riaz-tiles-v1';

var APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install: cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL).catch(function(err) {
        console.warn('Some shell resources failed to cache:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys
        .filter(function(k) { return k !== CACHE_NAME && k !== TILE_CACHE; })
        .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Map tiles: cache-first (great for offline)
  if (url.hostname.includes('basemaps.cartocdn.com') || url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(response) {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(function() {
            return new Response('', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // Supabase API: network-first, fall back to last cache (stale data shown offline)
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request.clone()).then(function(response) {
        if (response.ok) {
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, response.clone()); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Geocoding (Nominatim): network only, don't cache
  if (url.hostname.includes('nominatim.openstreetmap.org')) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // Everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response.ok && e.request.method === 'GET') {
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, response.clone()); });
        }
        return response;
      }).catch(function() {
        // Offline fallback for navigation requests
        if (e.request.mode === 'navigate') return caches.match('/index.html');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
