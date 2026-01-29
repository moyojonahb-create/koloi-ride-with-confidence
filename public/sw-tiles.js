// Service Worker for caching OSM map tiles for offline use
// Gwanda service area tiles are prioritized for caching

const CACHE_NAME = 'koloi-tiles-v1';
const TILE_CACHE_LIMIT = 500; // Max number of tiles to cache

// Tile URL patterns to cache
const TILE_PATTERNS = [
  /tile\.openstreetmap\.org/,
  /tile\.openstreetmap\.fr/,
];

// Install event - cache core app files
self.addEventListener('install', (event) => {
  console.log('[Koloi SW] Installing tile cache service worker');
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Koloi SW] Activating tile cache service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('koloi-tiles-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[Koloi SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache tiles
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Only handle tile requests
  const isTileRequest = TILE_PATTERNS.some((pattern) => pattern.test(url));
  if (!isTileRequest) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try cache first
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        console.log('[Koloi SW] Serving tile from cache:', url);
        return cachedResponse;
      }

      // Fetch from network
      try {
        const networkResponse = await fetch(event.request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          // Clone response before caching (response can only be read once)
          const responseToCache = networkResponse.clone();
          
          // Limit cache size
          await limitCacheSize(cache);
          
          // Cache the tile
          cache.put(event.request, responseToCache);
          console.log('[Koloi SW] Cached new tile:', url);
        }
        
        return networkResponse;
      } catch (error) {
        console.error('[Koloi SW] Tile fetch failed:', error);
        // Return a placeholder or error response for offline
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      }
    })
  );
});

// Limit cache size to prevent storage issues
async function limitCacheSize(cache) {
  const keys = await cache.keys();
  if (keys.length >= TILE_CACHE_LIMIT) {
    // Remove oldest cached tiles (FIFO)
    const tilesToRemove = keys.slice(0, keys.length - TILE_CACHE_LIMIT + 50);
    await Promise.all(tilesToRemove.map((key) => cache.delete(key)));
    console.log('[Koloi SW] Cleaned up', tilesToRemove.length, 'old tiles');
  }
}

// Message handler for manual cache operations
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_TILE_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[Koloi SW] Tile cache cleared');
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data.type === 'GET_CACHE_SIZE') {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      event.ports[0].postMessage({ tileCount: keys.length });
    });
  }
});
