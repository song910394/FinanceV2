// FinanceV2 Service Worker — Offline-first
// 策略：app shell + assets 用 cache-first，動態 API（Google Apps Script）一律 network-only 不快取
const VERSION = 'v2.0.0';
const CACHE_NAME = `hs-finance-v2-${VERSION}`;

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Google Apps Script / 雲端 API：永遠走網路，不快取
    if (url.hostname.includes('script.google.com') ||
        url.hostname.includes('googleusercontent.com') ||
        url.hostname.includes('generativelanguage.googleapis.com')) {
        return; // let browser handle natively
    }

    // App shell / Vite assets：cache-first，背景更新
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req).then((response) => {
                if (response && response.status === 200 && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

// Allow page to trigger update / clear
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
    }
});
