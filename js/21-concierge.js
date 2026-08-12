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
    try{ if (typeof window.prepareAI === 'function') window.prepareAI(); }catch(e){}
  }

  function rafraichir(){
    try{ portee(); suggestions(); }
    catch(e){
      try{ if (window.CLERVIO_DIAG) window.CLERVIO_DIAG.err('concierge', String(e && e.message || e)); }catch(x){}
    }
  }
  window.rafraichirConcierge = rafraichir;

  window.addEventListener('clervio:navigated', function(event){
    if (event && event.detail && event.detail.to === 'p-ai') setTimeout(rafraichir, 20);
  });
  setTimeout(rafraichir, 2600);
})();
