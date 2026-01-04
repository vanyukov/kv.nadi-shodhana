const CACHE_NAME = 'pranayama-timer-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/stats.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Установка Service Worker - обновляем при каждой установке
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Активируем новый SW сразу, не ждём закрытия всех вкладок
        return self.skipWaiting();
      })
  );
});

// Активация - очищаем старые кэши
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Берем контроль над всеми открытыми клиентами
      return self.clients.claim();
    })
  );
});

// Стратегия stale-while-revalidate: сначала кэш, потом обновление в фоне
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      // Если есть кэш - отдаём сразу, обновление в фоне
      if (cachedResponse) {
        // Запускаем обновление в фоне, не блокируя ответ
        fetch(event.request).then(function(networkResponse) {
          // Обновляем кэш с новой версией, если ответ успешный
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(function() {
          // Игнорируем ошибки сети, так как уже вернули кэш
        });
        return cachedResponse;
      }

      // Если кэша нет - ждём ответ из сети
      return fetch(event.request).then(function(networkResponse) {
        // Кэшируем успешные ответы
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});