// sw.js — Service Worker для BloodyKey
// Обеспечивает офлайн-работу и кэширование ресурсов

const CACHE_NAME = 'bloodykey-v3.2';
const ASSETS = [
  './',
  './index.html',
  './argon2-bundled.min.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 📦 Установка: кэшируем все необходимые файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Кэширование файлов...');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('✓ Все файлы закешированы');
        return self.skipWaiting(); // Активировать новый SW сразу
      })
      .catch((err) => {
        console.error('✗ Ошибка кэширования:', err);
      })
  );
});

// 🧹 Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('🗑 Удаление старого кэша:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('✓ Service Worker активирован');
      return self.clients.claim(); // Взять под контроль все страницы
    })
  );
});

// 🌐 Обработка запросов: сначала кэш, потом сеть
self.addEventListener('fetch', (event) => {
  // Игнорируем сторонние запросы (например, аналитика)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Если есть в кэше — отдаём сразу
        if (cachedResponse) {
          return cachedResponse;
        }
        // Иначе — загружаем из сети и кэшируем
        return fetch(event.request)
          .then((networkResponse) => {
            // Кэшируем только успешные ответы
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.error('✗ Ошибка сети:', err);
            // Если офлайн и нет в кэше — возвращаем заглушку
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 🔄 Обработка обновлений: если изменился manifest.json — обновляем кэш
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
