// Bump cache name to force clients to pick up fresh assets after updates
const CACHE_NAME = 'voyex-v6';
const STATIC_ASSETS = [
  '/',
  '/ride',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Voyex SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notification handler — native push from server
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Voyex';
  const options = {
    body: data.body || 'New update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    image: data.image || undefined,
    data: {
      url: data.url || '/',
      rideId: data.rideId || null,
      type: data.type || 'general',
    },
    requireInteraction: data.type === 'ride_request',
    vibrate: data.type === 'ride_request'
      ? [200, 100, 200, 100, 400]
      : [200, 100, 200],
    actions: data.type === 'ride_request'
      ? [
          { action: 'view', title: '🚗 View Ride' },
          { action: 'dismiss', title: 'Dismiss' },
        ]
      : [],
    tag: data.tag || `voyex-${Date.now()}`,
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { url, rideId } = event.notification.data || {};
  let targetUrl = url || '/';

  // Handle action buttons
  if (event.action === 'view' && rideId) {
    targetUrl = `/ride-detail/${rideId}`;
  } else if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (url.pathname.startsWith('/~oauth')) return;

  // Don't cache dev assets
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
