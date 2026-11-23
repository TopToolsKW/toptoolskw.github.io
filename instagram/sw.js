// Service worker voor de Instagram-story-app: werkt ook zonder internet.
// - De pagina zelf: altijd eerst vers van internet, de opgeslagen kopie alleen als je offline bent.
// - Iconen en overige bestanden: uit de opslag, en op de achtergrond ververst.
// Bij het ophalen wordt de browsercache overgeslagen, zodat er nooit een oude versie in de opslag belandt.
const CACHE = 'story-maker-v6';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('story-maker-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = () => fetch(req.url, { cache: 'no-cache' });
  if (req.mode === 'navigate') {
    // pagina: netwerk eerst
    e.respondWith(fresh().then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
      return res;
    }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const update = fresh().then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || update;
  }));
});
