const scope = self.registration.scope;
const entry = new URL('admin.html', scope);

const prefix = 'tehranshop-admin:' + scope + ':';
const cacheName = prefix + '0d1c577eca4ef4f6';
const assets = new Set(["admin.html", "admin.webmanifest", "media/posters/tehran-shop-new-collection.webp", "static/store/admin-demo.css?v=1", "static/store/admin-demo.js?v=1", "static/store/admin-pwa.js?v=1", "static/store/admin.css?v=2", "static/store/admin.js?v=2", "static/store/assets/basketball-sunset.webp", "static/store/assets/product-placeholder.svg", "static/store/assets/shayan-demo-compression.webp", "static/store/assets/shayan-demo-hoodie.webp", "static/store/assets/shayan-demo-jersey.webp", "static/store/assets/shayan-demo-pants.webp", "static/store/assets/shayan-demo-socks.webp", "static/store/assets/shayan-demo-sweatshirt.webp", "static/store/assets/shayan-demo-tank.webp", "static/store/assets/shayan-demo-tee.webp", "static/store/assets/shayan-demo-wristband.webp", "static/store/assets/shayan-demo-zip-jacket.webp", "static/store/assets/tehran-admin-192.png", "static/store/assets/tehran-admin-512.png", "static/store/assets/tehran-shop-icon.png", "static/store/assets/tehran-shop-logo.webp", "static/store/assets/vazirmatn.woff2"].map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...assets])));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)))
  ));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== entry.origin) return;
  if (event.request.mode === 'navigate' && url.pathname === entry.pathname) {
    event.respondWith(fetch(event.request).catch(() => caches.open(cacheName).then(cache => cache.match(entry.href))));
  } else if (assets.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(url.href)).then(response => response || fetch(event.request)));
  }
});

