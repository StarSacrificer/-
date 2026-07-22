// Service Worker — 像素画室 Pixel Studio
// 缓存策略：Network First（优先网络，离线时使用缓存）

const CACHE_NAME = 'pixel-studio-v1';
const ASSETS_TO_CACHE = [
  './pixel-art.html',
  './manifest.json',
];

// Install: 预缓存核心文件
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First 策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 网络请求成功 → 更新缓存
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        // 网络请求失败 → 尝试返回缓存
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 对于 HTML 请求，返回缓存的 index.html（SPA fallback）
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./pixel-art.html');
          }
          // 其他资源返回简单 404
          return new Response('Offline — Resource not available.', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});
