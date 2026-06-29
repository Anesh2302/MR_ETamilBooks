const CACHE = 'etamil-v1';
const BASE = '/MR_ETamilBooks';

const PRECACHE = [
  BASE + '/',
  BASE + '/404/',
  BASE + '/library/',
  BASE + '/translate/',
  BASE + '/login/',
  BASE + '/register/',
  BASE + '/admin/',
  BASE + '/summarize/',
  BASE + '/ocr/',
  BASE + '/audio/',
  BASE + '/tts/',
  BASE + '/flashcards/',
  BASE + '/profile/',
  BASE + '/upload/',
  BASE + '/admin/users/',
  BASE + '/admin/upload/',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin && url.pathname.startsWith(BASE)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(e.request).then((r) => r || fetch(e.request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            c.put(e.request, clone);
          }
          return res;
        }).catch(() => caches.match(BASE + '/404/'))
      )
    );
  }
});
