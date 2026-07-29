/* ══ NOTIFICATIONS PUSH ══════════════════════════════════
   Inscription de l'appareil et enregistrement de l'abonnement.
   Sur iOS, les notifications web n'existent QUE si la PWA est
   installée sur l'écran d'accueil — l'onglet Safari ne suffit pas.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_PUSH) return;
  window.CLERVIO_PUSH = true;

  var CLE_PUBLIQUE = 'BBuuyDn6AQ-GQm5eBnW8ch5UeVuRPngZYnNgkHgNb0X0BOr0CzHN74Qw03R9nBPB1VfKqDSH_lQ9rTML8Zpqrv4';

  function journal(type, msg){
    try{
      var D = window.CLERVIO_DIAG;
      if (D && D[type]) D[type]('push', msg);
    }catch(e){}
  }

  function b64urlVersOctets(s){
    var p = (s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(p);
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }

  function octetsVersB64url(buf){
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function installee(){
    try{
      return window.navigator.standalone === true ||
             (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    }catch(e){ return false; }
  }

  function iOS(){
    try{ return /iPad|iPhone|iPod/.test(navigator.userAgent); }catch(e){ return false; }
  }

  function dire(msg){
    try{ if (typeof window.toast === 'function') window.toast(msg); }catch(e){}
  }

  window.notificationsEtat = function(){
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'non supporte';
    if (iOS() && !installee()) return 'installation requise';
    try{ return Notification.permission; }catch(e){ return 'inconnu'; }
  };

  async function souscrire(silencieux){
    try{
      if (!('serviceWorker' in navigator) || !('PushManager' in window)){
        if (!silencieux) dire("Les notifications ne sont pas prises en charge sur ce navigateur.");
        return false;
      }
      if (iOS() && !installee()){
        if (!silencieux) dire("Installez d'abord CLERVIO sur votre écran d'accueil pour recevoir les alertes.");
        journal('log', 'iOS sans installation, inscription impossible');
        return false;
      }

      var perm = Notification.permission;
      if (perm === 'default' && !silencieux) perm = await Notification.requestPermission();
      if (perm !== 'granted'){
        if (!silencieux) dire('Notifications refusées.');
        journal('log', 'permission ' + perm);
        return false;
      }

      var reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      var abo = await reg.pushManager.getSubscription();
      if (!abo){
        abo = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64urlVersOctets(CLE_PUBLIQUE)
        });
      }

      var j = abo.toJSON ? abo.toJSON() : null;
      var p256dh = j && j.keys ? j.keys.p256dh : octetsVersB64url(abo.getKey('p256dh'));
      var auth   = j && j.keys ? j.keys.auth   : octetsVersB64url(abo.getKey('auth'));

      if (typeof supa === 'undefined' || !supa) { journal('err', 'client Supabase indisponible'); return false; }
      if (typeof currentUser === 'undefined' || !currentUser || !currentUser.id){
        journal('log', 'utilisateur non connecté, abonnement non enregistré');
        return false;
      }

      var res = await supa.from('push_subscriptions').upsert({
        user_id: currentUser.id,
        endpoint: abo.endpoint,
        p256dh: p256dh,
        auth: auth,
        user_agent: (navigator.userAgent || '').slice(0, 300)
      }, { onConflict: 'user_id,endpoint' });

      if (res && res.error){ journal('err', 'enregistrement : ' + res.error.message); return false; }

      journal('log', 'appareil abonné');
      if (!silencieux) dire('Notifications activées.');
      return true;
    }catch(e){
      journal('err', 'souscription : ' + (e && e.message ? e.message : e));
      if (!silencieux) dire("Impossible d'activer les notifications.");
      return false;
    }
  }

  /* Remplace l'ancienne fonction appelée depuis l'interface */
  window.requestPushPermission = function(){ return souscrire(false); };
  window.activerNotifications  = function(){ return souscrire(false); };

  /* Renouvellement demandé par le navigateur */
  try{
    navigator.serviceWorker.addEventListener('message', function(e){
      if (e && e.data && e.data.type === 'push-resouscrire') souscrire(true);
      if (e && e.data && e.data.type === 'notification' && e.data.url && e.data.url !== '/'){
        try{ if (typeof window.go === 'function') window.go(e.data.url.replace(/^\//, '')); }catch(err){}
      }
    });
  }catch(e){}

  /* Si la permission est déjà accordée, on garde l'abonnement à jour en silence */
  setTimeout(function(){
    try{ if (Notification.permission === 'granted') souscrire(true); }catch(e){}
  }, 4000);
})();
