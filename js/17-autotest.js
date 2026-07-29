/* ══ TESTS DE FUMÉE ══════════════════════════════════════ */
/* Ne s'exécute JAMAIS sans demande explicite.                     */
/*   ?selftest=1    → écrans sûrs uniquement                       */
/*   ?selftest=all  → inclut les écrans à effet de bord            */
/*   clervioTest()  → depuis la console                            */
(function(){
  'use strict';
  if (window.CLERVIO_TEST) return;
  window.CLERVIO_TEST = true;

  /* risque = l'affichage déclenche un effet de bord (caméra, biométrie, flux) */
  var ECRANS = [
    { id:'p-ob1',            risque:false },
    { id:'p-ob2',            risque:false },
    { id:'p-login',          risque:false },
    { id:'p-faceid-prompt',  risque:true  },
    { id:'p-faceid-reconnect', risque:true },
    { id:'p-analyse',        risque:true  },
    { id:'p-home',           risque:false },
    { id:'p-orders',         risque:false },
    { id:'p-od',             risque:false },
    { id:'p-vault',          risque:false },
    { id:'p-folder',         risque:false },
    { id:'p-sd',             risque:false },
    { id:'p-ai',             risque:false },
    { id:'p-profile',        risque:false },
    { id:'p-scan',           risque:true  },
    { id:'p-legal',          risque:false },
    { id:'p-add-order',      risque:false },
    { id:'p-add-sub',        risque:false },
    { id:'p-email-sources',  risque:false },
    { id:'p-forgot',         risque:false },
    { id:'p-reset-password', risque:false },
    { id:'p-pricing',        risque:false },
    { id:'p-privacy',        risque:false },
    { id:'p-cgv',            risque:false }
  ];

  /* Écrans devant porter la barre supérieure (miroir de 16-barre.js) */
  var AVEC_BARRE = ['p-folder','p-add-order','p-add-sub','p-legal','p-pricing',
                    'p-email-sources','p-forgot','p-reset-password',
                    'p-orders','p-vault','p-profile',
                    'p-od','p-sd','p-scan','p-privacy','p-cgv'];

  function nbErreurs(){
    try{
      var D = window.CLERVIO_DIAG;
      if (!D || !D.entrees) return 0;
      var e = D.entrees(), n = 0;
      for (var i=0;i<e.length;i++) if (e[i].type === 'err') n++;
      return n;
    }catch(e){ return 0; }
  }

  function attendre(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  function verifier(ec){
    var pb = [];
    var el = document.getElementById(ec.id);
    if (!el) return ['écran absent du document'];
    if (!el.classList.contains('on')) pb.push("l'écran ne s'affiche pas (classe 'on' absente)");
    if (el.children.length === 0) pb.push('aucun élément enfant');
    var txt = (el.textContent || '').trim();
    if (txt.length < 10) pb.push('contenu vide ou quasi vide (' + txt.length + ' caractères)');
    if (AVEC_BARRE.indexOf(ec.id) > -1 && !el.querySelector('.ctb')) pb.push('barre supérieure absente');
    return pb;
  }

  function lancer(tout){
    var depart = null;
    try{
      var actif = document.querySelector('.pg.on');
      depart = actif ? actif.id : 'p-home';
    }catch(e){ depart = 'p-home'; }

    var liste = ECRANS.filter(function(e){ return tout || !e.risque; });
    var resultats = [], i = 0;

    afficher([], liste.length, true);

    function suivant(){
      if (i >= liste.length){
        try{ if (typeof window.go === 'function') window.go(depart); }catch(e){}
        afficher(resultats, liste.length, false);
        return;
      }
      var ec = liste[i++];
      var avant = nbErreurs();
      var lance = Date.now();
      try{
        if (typeof window.go !== 'function') throw new Error('go() indisponible');
        window.go(ec.id);
      }catch(e){
        resultats.push({ id:ec.id, ok:false, pb:['go() a levé : ' + e.message], ms:0 });
        afficher(resultats, liste.length, true);
        return suivant();
      }
      attendre(320).then(function(){
        var pb = verifier(ec);
        var apres = nbErreurs();
        if (apres > avant) pb.push((apres-avant) + ' erreur(s) pendant la transition');
        resultats.push({ id:ec.id, ok:pb.length===0, pb:pb, ms:Date.now()-lance });
        afficher(resultats, liste.length, true);
        suivant();
      });
    }
    suivant();
  }

  var panneau = null, corps = null, entete = null;

  function afficher(res, total, encours){
    try{
      if (!document.body) return;
      if (!panneau){
        panneau = document.createElement('div');
        panneau.setAttribute('style','position:fixed;inset:0;z-index:100000;background:#08080B;'
          + 'display:flex;flex-direction:column;font:12px/1.5 ui-monospace,Menlo,monospace;color:#EDE0C8;');
        var barre = document.createElement('div');
        barre.setAttribute('style','display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px 12px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;');
        entete = document.createElement('span');
        entete.setAttribute('style','flex:1;color:#C9A84C;letter-spacing:.1em;font-weight:600;');
        var bCopier = document.createElement('button');
        bCopier.textContent = 'Copier';
        bCopier.setAttribute('style','background:#C9A84C;color:#0A0A0C;border:none;border-radius:7px;padding:7px 12px;font:600 12px -apple-system,sans-serif;');
        bCopier.onclick = function(){
          var t = res.map(function(r){
            return (r.ok?'OK   ':'ÉCHEC') + '  ' + r.id + '  ' + r.ms + 'ms'
                 + (r.pb.length ? '  — ' + r.pb.join(' ; ') : '');
          }).join(String.fromCharCode(10));
          try{ if (navigator.clipboard) navigator.clipboard.writeText(t); }catch(e){}
          bCopier.textContent = 'Copié';
          setTimeout(function(){ bCopier.textContent = 'Copier'; }, 1200);
        };
        var bFermer = document.createElement('button');
        bFermer.textContent = 'Fermer';
        bFermer.setAttribute('style','background:rgba(255,255,255,.1);color:#EDE0C8;border:none;border-radius:7px;padding:7px 12px;font:600 12px -apple-system,sans-serif;');
        bFermer.onclick = function(){ panneau.remove(); panneau = null; };
        barre.appendChild(entete); barre.appendChild(bCopier); barre.appendChild(bFermer);
        corps = document.createElement('div');
        corps.setAttribute('style','flex:1;overflow:auto;padding:12px 16px;');
        panneau.appendChild(barre); panneau.appendChild(corps);
        document.body.appendChild(panneau);
      }

      var echecs = res.filter(function(r){ return !r.ok; }).length;
      entete.textContent = encours
        ? 'TESTS  ' + res.length + '/' + total + '…'
        : 'TESTS  ' + (res.length - echecs) + '/' + res.length + ' réussis';
      entete.style.color = (!encours && echecs) ? '#FF8A7A' : '#C9A84C';

      var h = '';
      for (var i=0;i<res.length;i++){
        var r = res[i];
        h += '<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">'
          +  '<span style="color:' + (r.ok ? '#8FBF7F' : '#FF8A7A') + ';font-weight:600;">'
          +  (r.ok ? '✓' : '✗') + '</span>  '
          +  '<span style="color:#EDE0C8;">' + r.id + '</span>'
          +  '<span style="color:rgba(237,224,200,.35);">  ' + r.ms + 'ms</span>';
        for (var k=0;k<r.pb.length;k++){
          h += '<div style="color:#FF8A7A;padding-left:18px;font-size:11px;">' + r.pb[k] + '</div>';
        }
        h += '</div>';
      }
      if (encours) h += '<div style="padding:8px 0;color:rgba(237,224,200,.4);">en cours…</div>';
      corps.innerHTML = h;
      corps.scrollTop = corps.scrollHeight;
    }catch(e){}
  }

  window.clervioTest = function(tout){ lancer(tout === true); return 'tests lancés'; };

  function auto(){
    try{
      var s = location.search;
      if (s.indexOf('selftest=all') > -1) setTimeout(function(){ lancer(true); }, 1500);
      else if (s.indexOf('selftest=1') > -1) setTimeout(function(){ lancer(false); }, 1500);
    }catch(e){}
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
