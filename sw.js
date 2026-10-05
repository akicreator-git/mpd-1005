// Offline cache: everything is downloaded on the first launch, so on set it works even without internet.
const CACHE = 'moneypoly-v1';
const PRIZES = ['console', 'phone', 'speaker', 'headphones', 'watch', 'camera', 'laptop', 'coffee', 'vacuum', 'tv', 'chair'];
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'assets/home.jpg', 'assets/tabbar.png', 'assets/preloader.jpg', 'assets/prize.jpg', 'assets/cards-bg.jpg',
  'assets/mpay.mp4', 'assets/fonts/nunito-cyr.woff2', 'assets/fonts/nunito-lat.woff2',
].concat(PRIZES.map(p => `assets/prizes/${p}.png`));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return; // video range requests go straight to network

  // Page itself: network first (to pick up updates, e.g. new names), cache as fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Assets: cache first
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
