/* ══ GARDE-FOU DE CONTEXTE ═══════════════════════════════
   Les écrans de détail n'ont de sens qu'avec un élément choisi.
   Ouverts sans contexte, ils affichent une page blanche.
   Ce module les renvoie vers leur écran parent après un délai
   assez large pour ne jamais couper un rendu en cours.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_CONTEXTE) return;
  window.CLERVIO_CONTEXTE = true;

  var PARENT = { 'p-od': 'p-orders', 'p-sd': 'p-vault', 'p-folder': 'p-vault' };
  var DELAI = 1200;

  /* Longueur du contenu réel, barre supérieure exclue. */
  function contenuUtile(page){
    try{
      var sc = page.querySelector('.sc');
      if (!sc) return 0;
      var t = '';
      for (var i = 0; i < sc.children.length; i++){
        var el = sc.children[i];
        if (el.classList && el.classList.contains('ctb')) continue;
        t += (el.textContent || '');
      }
      return t.replace(/\s+/g, '').length;
    }catch(e){ return 999; }
  }

  function verifier(id){
    try{
      var parent = PARENT[id];
      if (!parent) return;
      var page = document.getElementById(id);
      if (!page || !page.classList.contains('on')) return;
      if (contenuUtile(page) >= 12) return;
      if (window.CLERVIO_DIAG && window.CLERVIO_DIAG.log){
        window.CLERVIO_DIAG.log('contexte', id + ' ouvert sans donnée, retour vers ' + parent);
      }
      if (typeof window.go === 'function') window.go(parent);
    }catch(e){}
  }

  function enrober(){
    if (typeof window.go !== 'function' || window.go.__contexte) return;
    var orig = window.go;
    var enveloppe = function(id){
      var r = orig.apply(window, arguments);
      if (PARENT[id]) setTimeout(function(){ verifier(id); }, DELAI);
      return r;
    };
    enveloppe.__contexte = true;
    window.go = enveloppe;
    if (window.CLERVIO_DIAG && window.CLERVIO_DIAG.log){
      window.CLERVIO_DIAG.log('contexte', 'garde-fou actif');
    }
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', enrober);
  else enrober();
  window.addEventListener('load', enrober);
  setTimeout(enrober, 800);
  setTimeout(enrober, 2500);
})();
