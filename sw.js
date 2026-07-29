/* ══ SERVICE WORKER CLERVIO ══════════════════════════════
   Rôle unique : recevoir les notifications push.
   AUCUN gestionnaire 'fetch' — le réseau passe directement,
   donc aucun risque de servir une version périmée de l'app.
   ════════════════════════════════════════════════════════ */

const VERSION = '2026-07-29';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    /* Purge d'éventuels caches laissés par une version antérieure */
    try {
      const noms = await caches.keys();
      await Promise.all(noms.map((n) => caches.delete(n)));
    } catch (err) { /* sans conséquence */ }
    await self.clients.claim();
  })());
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) {
    try { d = { corps: e.data ? e.data.text() : '' }; } catch (err2) { d = {}; }
  }

  const titre = d.titre || d.title || 'CLERVIO';
  const options = {
    body: d.corps || d.body || '',
    icon: d.icone || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: d.tag || 'clervio',
    renotify: false,
    requireInteraction: false,
    data: { url: d.url || '/', recu: Date.now() }
  };

  e.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil((async () => {
    const liste = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of liste) {
      if ('focus' in c) {
        try { c.postMessage({ type: 'notification', url: cible }); } catch (err) { /* ignore */ }
        return c.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(cible);
  })());
});

/* Renouvellement d'abonnement décidé par le navigateur */
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    const liste = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    liste.forEach((c) => {
      try { c.postMessage({ type: 'push-resouscrire' }); } catch (err) { /* ignore */ }
    });
  })());
});
