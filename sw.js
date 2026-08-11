/* ══ SERVICE WORKER CLERVIO ══════════════════════════════
   App shell hors ligne + notifications. Les appels Supabase et
   toutes les requêtes non GET restent strictement réseau.
   ════════════════════════════════════════════════════════ */

const VERSION = '2026-08-11-legendary-2';
const STATIC_CACHE = 'clervio-static-' + VERSION;
const PAGE_CACHE = 'clervio-pages-' + VERSION;
const APP_SHELL = [
  '/index.html','/offline.html','/manifest.json',
  '/css/atmosphere.css','/css/legendary.css',
  '/js/00-diagnostic.js','/js/01-nav.js','/js/02-auth.js','/js/03-analyse.js',
  '/js/04-storage.js','/js/05-ai.js','/js/06-scan.js','/js/07-vault.js',
  '/js/08-data.js','/js/09-compte.js','/js/10-home.js','/js/11-email.js',
  '/js/12-concierge.js','/js/13-ui.js','/js/14-init.js','/js/15-resilience.js',
  '/js/16-barre.js','/js/17-autotest.js','/js/18-contexte.js','/js/19-push.js',
  '/js/20-profil.js','/js/21-concierge.js','/js/22-coffre.js','/js/23-quota.js',
  '/js/24-offres.js','/js/25-facture.js','/js/26-motdepasse.js','/js/27-agir.js',
  '/js/28-intelligence.js','/js/29-motion.js',
  '/icons/icon-192.png','/icons/icon-512.png','/icons/badge-72.png','/icons/apple-touch-icon.png'
];

function notificationTarget(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/', self.location.origin);
    if (url.origin !== self.location.origin) return '/';
    return url.pathname + url.search + url.hash;
  } catch (err) { return '/'; }
}

async function networkWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(request, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('clervio-') && ![STATIC_CACHE, PAGE_CACHE].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await networkWithTimeout(request, 4500);
        if (response && response.ok) {
          const cache = await caches.open(PAGE_CACHE);
          cache.put('/index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (err) {
        return (await caches.match('/index.html')) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  if (['script','style','image','font','manifest'].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const update = fetch(request).then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);
      return cached || (await update) || Response.error();
    })());
  }
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (err) {
    try { d = { corps: event.data ? event.data.text() : '' }; } catch (err2) { d = {}; }
  }

  const titre = d.titre || d.title || 'CLERVIO';
  const options = {
    body: d.corps || d.body || '',
    icon: d.icone || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: d.tag || 'clervio',
    renotify: false,
    requireInteraction: false,
    data: { url: notificationTarget(d.url), recu: Date.now() }
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = notificationTarget(event.notification.data && event.notification.data.url);
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        try { client.postMessage({ type: 'notification', url: target }); } catch (err) {}
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      try { client.postMessage({ type: 'push-resouscrire' }); } catch (err) {}
    });
  })());
});
