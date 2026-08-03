/* ══ CONCIERGE ═══════════════════════════════════════════
   Le concierge annonce ce qu'il connaît, et propose des
   questions tirées du coffre réel plutôt qu'une liste figée.
   Corrige aussi une affirmation fausse : l'écran annonçait
   « Disponible » alors que le service ne répond pas encore.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_CONCIERGE) return;
  window.CLERVIO_CONCIERGE = true;

  function n(v){ return Array.isArray(v) ? v.length : 0; }

  /* lire() a été retirée le 03/08 : un brouillon jamais appelé,
     remplacé par collections() juste en dessous — trois lectures
     explicites plutôt qu'un eval() générique sur du texte. */
  function collections(){
    var o = [], w = [], s = [];
    try{ o = (typeof ORDS !== 'undefined' && Array.isArray(ORDS)) ? ORDS : []; }catch(e){}
    try{ w = (typeof WARR !== 'undefined' && Array.isArray(WARR)) ? WARR : []; }catch(e){}
    try{ s = (typeof SUBS !== 'undefined' && Array.isArray(SUBS)) ? SUBS : []; }catch(e){}
    return { o: o, w: w, s: s };
  }

  function portee(){
    var el = document.getElementById('ai-portee');
    if (!el) return;
    var c = collections();
    var total = n(c.o) + n(c.w) + n(c.s);

    if (total === 0){
      el.textContent = "Votre coffre est vide. Ajoutez un achat pour que je puisse vous répondre.";
      return;
    }

    var bouts = [];
    if (n(c.o)) bouts.push(n(c.o) + (n(c.o) > 1 ? ' commandes' : ' commande'));
    if (n(c.w)) bouts.push(n(c.w) + (n(c.w) > 1 ? ' garanties' : ' garantie'));
    if (n(c.s)) bouts.push(n(c.s) + (n(c.s) > 1 ? ' abonnements' : ' abonnement'));

    var liste = bouts.length > 1
      ? bouts.slice(0, -1).join(', ') + ' et ' + bouts[bouts.length - 1]
      : bouts[0];

    el.textContent = 'Je connais ' + liste + '.';
  }

  function suggestions(){
    var zone = document.getElementById('aisugg');
    if (!zone) return;
    var boutons = zone.querySelectorAll('button');
    if (!boutons.length) return;

    var c = collections();
    var propositions = [];

    /* Une garantie qui approche de son terme prime sur tout le reste */
    var urgente = null;
    for (var i = 0; i < c.w.length; i++){
      var d = Number(c.w[i] && c.w[i].days);
      if (!isNaN(d) && d > 0 && d <= 120 && (!urgente || d < Number(urgente.days))) urgente = c.w[i];
    }
    if (urgente) propositions.push('Quelles garanties expirent bientôt ?');

    if (c.s.length){
      propositions.push('Combien me coûtent mes abonnements par an ?');
    }

    var enRoute = null;
    for (var j = 0; j < c.o.length; j++){
      var st = String((c.o[j] && c.o[j].st) || '').toLowerCase();
      if (st.indexOf('transit') > -1 || st.indexOf('expédi') > -1){ enRoute = c.o[j]; break; }
    }
    if (enRoute && enRoute.brand){
      propositions.push('Où en est ma commande ' + String(enRoute.brand) + ' ?');
    }

    if (c.o.length) propositions.push('Combien ai-je dépensé ce mois-ci ?');
    propositions.push('Que peux-tu faire pour moi ?');

    for (var k = 0; k < boutons.length; k++){
      if (propositions[k]) {
        boutons[k].textContent = propositions[k];
        boutons[k].style.display = '';
      } else {
        boutons[k].style.display = 'none';
      }
    }
  }

  function rafraichir(){
    try{ portee(); suggestions(); }
    catch(e){
      try{ if (window.CLERVIO_DIAG) window.CLERVIO_DIAG.err('concierge', String(e && e.message || e)); }catch(x){}
    }
  }
  window.rafraichirConcierge = rafraichir;

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__concierge) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-ai') setTimeout(rafraichir, 70);
      return r;
    };
    w.__concierge = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 900);
  setTimeout(rafraichir, 2600);
})();
