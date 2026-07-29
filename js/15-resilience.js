/* ══ RÉSILIENCE ══════════════════════════════════════════ */
/* Enveloppe les points d'entrée appelés depuis le HTML.            */
/* Une erreur dans un module ne fige plus l'écran : elle est        */
/* tracée dans le journal et signalée sans bloquer l'interface.     */
(function(){
  'use strict';
  if (window.CLERVIO_RESILIENCE) return;
  window.CLERVIO_RESILIENCE = true;

  var NOMS = ('activateFaceID,addDocToFolder,closeMailIntroModal,confirmMailIntro,confirmScannedOrder,'
    + 'createFolder,deleteCurrentFolder,deleteMyAccount,doFaceIDReconnect,editPersonalInfo,exportMyData,'
    + 'fO,fV,go,goVaultTab,handleEmailAuth,handlePendingAction,handlePhoto,hideFabMenu,hideFolderMenu,'
    + 'hideNewFolder,installApp,loginDemo,markAlertRead,openDocumentUrl,openEmailAuth,openFolder,'
    + 'openSocialAuth,openSupport,renameCurrentFolder,renderOrds,renderScan,requestPushPermission,'
    + 'returningUser,sAI,sAIi,selectColor,selectIcon,selectPeriod,selectSubType,sendResetEmail,'
    + 'showFolderMenu,showForgotPassword,showMailIntroModal,showNewFolder,showOrd,showSub,'
    + 'signInWithApple,signInWithGoogle,signOut,startMailImport,submitOrder,submitSub,'
    + 'toggleAccordion,toggleFabMenu,togglePw,trackDelivery,updatePassword').split(',');

  function journal(type, mod, msg){
    try{
      var D = window.CLERVIO_DIAG;
      if (D && D[type]) D[type](mod, msg);
      else if (window.console && console.warn) console.warn('[' + mod + '] ' + msg);
    }catch(e){}
  }

  var banniere = null, minuteur = null;

  function masquer(){ if (banniere) banniere.style.display = 'none'; }

  function afficher(){
    try{
      if (!document.body) return;
      if (!banniere){
        banniere = document.createElement('div');
        banniere.setAttribute('style','position:fixed;left:14px;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:99998;background:#17151A;border:1px solid rgba(255,122,102,.35);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;font:13px/1.4 -apple-system,system-ui,sans-serif;color:#EDE0C8;box-shadow:0 8px 28px rgba(0,0,0,.55);');
        var texte = document.createElement('span');
        texte.textContent = "Cette action n'a pas abouti.";
        texte.setAttribute('style','flex:1;');
        var recharger = document.createElement('button');
        recharger.textContent = 'Recharger';
        recharger.setAttribute('style','background:rgba(201,168,76,.92);color:#0A0A0C;border:none;border-radius:9px;padding:7px 13px;font:600 12px -apple-system,sans-serif;');
        recharger.onclick = function(){ try{ location.reload(); }catch(e){} };
        var fermer = document.createElement('button');
        fermer.textContent = '✕';
        fermer.setAttribute('style','background:none;border:none;color:rgba(237,224,200,.5);font-size:15px;padding:2px 4px;');
        fermer.onclick = masquer;
        banniere.appendChild(texte);
        banniere.appendChild(recharger);
        banniere.appendChild(fermer);
        document.body.appendChild(banniere);
      }
      banniere.style.display = 'flex';
      clearTimeout(minuteur);
      minuteur = setTimeout(masquer, 7000);
    }catch(e){}
  }

  function signaler(nom, err){
    journal('err', 'résilience', nom + '() a échoué : ' + ((err && err.message) || err));
    afficher();
  }

  function proteger(nom){
    var orig = window[nom];
    if (typeof orig !== 'function' || orig.__protege) return false;
    var enveloppe = function(){
      var res;
      try{
        res = orig.apply(this, arguments);
      }catch(e){
        signaler(nom, e);
        return undefined;
      }
      if (res && typeof res.then === 'function' && typeof res['catch'] === 'function'){
        return res['catch'](function(e){ signaler(nom, e); return undefined; });
      }
      return res;
    };
    enveloppe.__protege = true;
    enveloppe.__nom = nom;
    try{ window[nom] = enveloppe; }catch(e){ return false; }
    return true;
  }

  var totalProteges = 0;
  function passe(){
    var n = 0;
    for (var i = 0; i < NOMS.length; i++){ if (proteger(NOMS[i])) n++; }
    if (n){
      totalProteges += n;
      journal('log', 'résilience', n + ' gestionnaires protégés (total ' + totalProteges + ')');
    }
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', passe);
  else passe();
  window.addEventListener('load', passe);
  setTimeout(passe, 1200);
  setTimeout(passe, 3000);
})();
