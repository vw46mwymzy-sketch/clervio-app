// Service worker NEUTRALISÉ temporairement pour débocage.
// Se désinstalle lui-même et vide tous les caches.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    // Supprimer tous les caches
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    // Se désinscrire
    await self.registration.unregister();
    // Forcer tous les onglets à recharger sans SW
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.navigate ? c.navigate(c.url) : null);
  })());
});
// Passe-tout : aucune interception, tout va au réseau
self.addEventListener('fetch', function(e){ /* ne rien faire : réseau direct */ });
