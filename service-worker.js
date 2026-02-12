// Service Worker dla Fiszkownica PWA

const CACHE_NAME = 'fiszkownica-v1.0.2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalacja Service Workera
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalacja');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache otwarty');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Wszystkie zasoby zostały zcacheowane');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Błąd podczas cacheowania:', error);
      })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktywacja');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Service Worker został aktywowany');
      return self.clients.claim();
    })
  );
});

// Interceptowanie żądań
self.addEventListener('fetch', event => {
  // Pomiń żądania do API
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Strategia: Cache First, Fallback to Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] Zasób znaleziony w cache:', event.request.url);
          return response;
        }
        
        console.log('[Service Worker] Pobieranie z sieci:', event.request.url);
        
        return fetch(event.request)
          .then(response => {
            // Ignoruj cache'owanie zasobów z chrome-extension
            if (event.request.url.startsWith('chrome-extension://')) {
              return response;
            }
            // Sprawdź czy otrzymaliśmy poprawną odpowiedź
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Klonuj odpowiedź
            const responseToCache = response.clone();
            // Dodaj do cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Zasób dodany do cache:', event.request.url);
              });
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Błąd podczas fetch:', error);
            
            // Fallback dla strony głównej
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Fallback dla zasobów
            return new Response('Brak połączenia z internetem', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Obsługa wiadomości
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync (jeśli przeglądarka wspiera)
if ('sync' in self.registration) {
  self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
      console.log('[Service Worker] Synchronizacja danych w tle');
      event.waitUntil(syncData());
    }
  });
}

async function syncData() {
  // Tutaj można dodać logikę synchronizacji danych
  console.log('[Service Worker] Synchronizacja zakończona');
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data.text(),
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Fiszkownica', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});