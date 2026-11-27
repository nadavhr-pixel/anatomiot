// אנטומיות ושות׳ – offline support for the home-screen app.
// Pages: network first (always the newest version when online), the last copy when offline.
// 3D packs: their file names carry a content hash, so a cached copy never goes stale – served from the cache.
const BUILD = '1795809802', PAGE = 'anat-page', PACKS = 'anat-packs';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGE).then(c => c.addAll(['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'])).catch(() => { }));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // keep only the packs the current page still uses
    try {
      const html = await (await fetch('./', { cache: 'no-store' })).text();
      const used = new Set((html.match(/packs\/[\w.-]+\.js/g) || []));
      const c = await caches.open(PACKS);
      for (const r of await c.keys()) { const p = (new URL(r.url).pathname.match(/packs\/[\w.-]+\.js$/) || [''])[0]; if (!used.has(p)) await c.delete(r); }
    } catch (err) { }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('version.txt')) return;
  if (/\/packs\/[\w.-]+\.js$/.test(u.pathname)) {
    e.respondWith(caches.open(PACKS).then(async (c) => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }));
    return;
  }
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  e.respondWith(fetch(req).then((r) => { if (r.ok && isPage) { const cp = r.clone(); caches.open(PAGE).then(c => c.put('./', cp)); } return r; })
    .catch(() => caches.open(PAGE).then(c => c.match(isPage ? './' : req).then(h => h || c.match('./')))));
});
