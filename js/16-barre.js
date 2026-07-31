/* ══ BARRE SUPÉRIEURE ════════════════════════════════════ */
/* Pose une barre normalisée (retour / CLERVIO / action) sur les   */
/* écrans configurés. N'altère aucun balisage existant : la barre  */
/* est insérée à l'exécution et le padding du bloc suivant ajusté. */
(function(){
  'use strict';
  if (window.CLERVIO_BARRE) return;
  window.CLERVIO_BARRE = true;

  /* page : { retour: id ou null } — null = pas de chevron */
  var CONFIG = {
    'p-folder':         { retour: 'p-vault'   },
    'p-add-order':      { retour: 'p-vault'   },
    'p-add-sub':        { retour: 'p-vault'   },
    'p-legal':          { retour: 'p-profile' },
    'p-privacy':        { retour: 'p-legal'   },
    'p-pro':            { retour: 'p-ob1'     },
    'p-ob2':            { retour: 'p-ob1'     },
    'p-login':          { retour: 'p-ob1'     },
    'p-cgv':            { retour: 'p-legal'   },
    'p-pricing':        { retour: 'p-profile' },
    'p-email-sources':  { retour: 'p-profile' },
    'p-forgot':         { retour: 'p-login'   },
    'p-reset-password': { retour: 'p-login'   },
    'p-orders':         { retour: null },
    'p-vault':          { retour: null },
    'p-profile':        { retour: null }
  };

  var CHEVRON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  function style(el, s){ el.setAttribute('style', s); }

  function construire(page, cfg){
    var barre = document.createElement('div');
    barre.className = 'ctb';
    style(barre, 'display:grid;grid-template-columns:44px 1fr 44px;align-items:center;'
      + 'padding:calc(env(safe-area-inset-top,0px) + 46px) 22px 14px;'
      + 'border-bottom:1px solid rgba(237,224,200,.09);flex-shrink:0;');

    var gauche = document.createElement('div');
    if (cfg.retour){
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Retour');
      style(b, 'width:34px;height:34px;border-radius:50%;border:1px solid rgba(237,224,200,.13);'
        + 'background:none;display:flex;align-items:center;justify-content:center;'
        + 'color:rgba(237,224,200,.55);cursor:pointer;padding:0;');
      b.innerHTML = CHEVRON;
      b.onclick = function(){
        try{ if (typeof window.go === 'function') window.go(cfg.retour); }catch(e){}
      };
      gauche.appendChild(b);
    }

    var titre = document.createElement('div');
    titre.textContent = 'CLERVIO';
    style(titre, 'text-align:center;font-size:12px;font-weight:500;letter-spacing:.32em;'
      + 'text-indent:.32em;color:var(--cr);font-family:Inter,-apple-system,sans-serif;');

    var droite = document.createElement('div');

    barre.appendChild(gauche);
    barre.appendChild(titre);
    barre.appendChild(droite);
    return barre;
  }

  function poser(id){
    var cfg = CONFIG[id];
    if (!cfg) return false;
    var page = document.getElementById(id);
    if (!page) return false;
    var hote = page.querySelector('.sc') || page;
    if (hote.querySelector(':scope > .ctb')) return false;

    var barre = construire(id, cfg);
    hote.insertBefore(barre, hote.firstElementChild);

    /* L'ancien chevron flottant fait doublon avec celui de la barre.
       Deux boutons retour sur un meme ecran, c'est une hesitation
       offerte a l'utilisateur pour rien. */
    var bk = page.querySelector('.bk');
    if (bk) bk.style.display = 'none';

    /* Le bloc suivant porte un padding haut prévu sans barre : on le réduit. */
    var suivant = barre.nextElementSibling;
    if (suivant && suivant.style){
      suivant.dataset.ctbPad = suivant.style.paddingTop || '';
      suivant.style.paddingTop = '14px';
    }
    return true;
  }

  function passe(){
    var n = 0;
    for (var id in CONFIG){ if (poser(id)) n++; }
    if (n){
      try{
        var D = window.CLERVIO_DIAG;
        if (D && D.log) D.log('barre', n + ' barres posées');
      }catch(e){}
    }
  }

  /* ── Écrans reconstruits en JavaScript ─────────────────── */
  /* La barre est posée hors du conteneur .sc : les rendus     */
  /* successifs réécrivent .sc sans jamais l'effacer.          */
  var DYNAMIQUES = { 'p-od':'p-orders', 'p-sd':'p-vault', 'p-scan':'p-home' };

  function ajusterContenu(sc){
    try{
      var premier = sc.firstElementChild;
      if (premier && premier.style && premier.dataset && !premier.dataset.ctbAjuste){
        premier.dataset.ctbAjuste = '1';
        premier.style.paddingTop = '14px';
      }
    }catch(e){}
  }

  function poserDynamique(id, retour){
    var page = document.getElementById(id);
    if (!page) return false;
    var sc = page.querySelector('.sc');
    if (!sc) return false;
    if (!page.querySelector('.ctb')){
      page.insertBefore(construire(id, { retour: retour }), sc);
      var bk = page.querySelector('.bk');
      if (bk) bk.style.display = 'none';
      if (window.MutationObserver){
        try{
          new MutationObserver(function(){ ajusterContenu(sc); }).observe(sc, { childList: true });
        }catch(e){}
      }
    }
    ajusterContenu(sc);
    return true;
  }

  function passeDynamique(){
    for (var id in DYNAMIQUES){
      try{ poserDynamique(id, DYNAMIQUES[id]); }catch(e){}
    }
  }

  function tout(){ passe(); passeDynamique(); }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', tout);
  else tout();
  window.addEventListener('load', tout);
  setTimeout(tout, 600);
  setTimeout(tout, 2000);
})();
