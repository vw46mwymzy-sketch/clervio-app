/* ══ PROFIL ══════════════════════════════════════════════
   Alimente l'en-tête du profil : nom, initiale, offre,
   et l'anneau de progression de la période d'essai.
   Ces champs n'étaient alimentés par personne — le nom
   restait un tiret, et le badge annonçait « Premium »
   à des utilisateurs qui n'ont jamais payé.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_PROFIL) return;
  window.CLERVIO_PROFIL = true;

  var C = 245; /* circonférence : 2 × π × 39 */

  function journal(type, msg){
    try{ var D = window.CLERVIO_DIAG; if (D && D[type]) D[type]('profil', msg); }catch(e){}
  }

  function jours(a, b){
    return Math.ceil((a.getTime() - b.getTime()) / 86400000);
  }

  function libelle(n){
    if (n <= 0) return 'Essai terminé';
    if (n === 1) return 'Essai — dernier jour';
    return 'Essai — ' + n + ' jours restants';
  }

  function poser(profil, utilisateur){
    try{
      var email = (utilisateur && utilisateur.email) || '';
      var nom = (profil && (profil.full_name || profil.name)) || email.split('@')[0] || 'Vous';

      var elNom = document.getElementById('profile-name');
      if (elNom) elNom.textContent = nom;

      var elInit = document.getElementById('prof-init');
      if (elInit) elInit.textContent = (nom.charAt(0) || '?').toUpperCase();

      /* Ligne « Abonnement » des réglages : elle annonçait
         « Premium · 4,99 €/mois » à tout le monde, y compris
         aux comptes gratuits. */
      try{
        var at = document.getElementById('prof-abo-titre');
        var ad = document.getElementById('prof-abo-detail');
        var lib = (profil && profil.libelle_offre) || null;
        if (at) at.textContent = 'Abonnement';
        if (ad){
          var p = (profil && profil.plan) || 'gratuit';
          if (p === 'gratuit')        ad.textContent = 'Découverte · gratuit';
          else if (p === 'trial')     ad.textContent = 'Essai en cours';
          else if (p === 'essentiel') ad.textContent = 'Essentiel · 4,99 €/mois';
          else if (p === 'famille')   ad.textContent = 'Famille · 8,99 €/mois';
          else if (p === 'pro')       ad.textContent = 'Intégral · 14,99 €/mois';
          else if (p && p.indexOf('pro_') === 0) ad.textContent = 'Offre professionnelle';
          else ad.textContent = lib || 'Découverte · gratuit';
        }
      }catch(e){}

      var plan = (profil && profil.plan) || 'gratuit';
      var fin  = profil && profil.trial_ends_at ? new Date(profil.trial_ends_at) : null;
      var arc  = document.getElementById('prof-arc');
      var badge = document.getElementById('profile-badge');

      if (plan === 'trial' && fin){
        var restants = Math.max(0, jours(fin, new Date()));
        var part = Math.max(0, Math.min(1, restants / 30));
        if (arc){
          arc.style.stroke = restants <= 7 ? '#E0A05A' : 'var(--g)';
          arc.style.strokeDashoffset = String(Math.round(C * (1 - part)));
        }
        if (badge) badge.textContent = libelle(restants);
        journal('log', 'essai, ' + restants + ' jours restants');
      } else if (plan === 'expire'){
        if (arc){ arc.style.stroke = '#E0A05A'; arc.style.strokeDashoffset = String(C); }
        if (badge) badge.textContent = 'Essai terminé';
      } else {
        /* Abonné : l'anneau est plein, il marque l'appartenance */
        if (arc){ arc.style.stroke = 'var(--g)'; arc.style.strokeDashoffset = '0'; }
        if (badge) badge.textContent = 'Abonné · 4,99 € / mois';
      }
    }catch(e){ journal('err', 'affichage : ' + (e && e.message ? e.message : e)); }
  }

  async function charger(){
    try{
      if (typeof currentUser === 'undefined' || !currentUser) return false;

      var profil = (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile : null;

      if (!profil && typeof supa !== 'undefined' && supa){
        var r = await supa.from('profiles')
          .select('full_name,plan,trial_ends_at')
          .eq('id', currentUser.id).maybeSingle();
        if (r && r.data) profil = r.data;
      }

      poser(profil, currentUser);
      return true;
    }catch(e){ journal('err', 'chargement : ' + (e && e.message ? e.message : e)); return false; }
  }

  window.rafraichirProfil = charger;

  /* Le compteur d'e-mails connectés vit dans js/11-email.js,
     mais ce module ne sait pas quand le profil s'ouvre. */
  function chargerAvecCompteurs(){
    charger();
    try{ if (typeof window.rafraichirCompteurEmails === 'function') window.rafraichirCompteurEmails(); }catch(e){}
  }

  /* L'écran profil peut être atteint à tout moment : on rafraîchit
     à l'ouverture plutôt qu'une seule fois au démarrage. */
  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__profil) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-profile') setTimeout(chargerAvecCompteurs, 60);
      return r;
    };
    w.__profil = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 900);
  setTimeout(charger, 2500);
})();
