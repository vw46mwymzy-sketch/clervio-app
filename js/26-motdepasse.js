/* ══ MOT DE PASSE OUBLIÉ ═════════════════════════════════
   Le bouton « Envoyer le lien » appelait sendResetEmail(),
   fonction absente des dix-neuf modules. Quelqu'un bloqué
   hors de son compte appuyait, et rien ne se passait —
   ni erreur, ni message. Trouvé en vérifiant ce parcours.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_RESET) return;
  window.CLERVIO_RESET = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('mdp',m); }catch(e){} }

  function valide(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim());
  }

  window.sendResetEmail = async function(){
    var champ = document.getElementById('forgot-email');
    var email = champ ? champ.value.trim() : '';
    var confirmation = document.getElementById('forgot-confirm');
    var bouton = document.querySelector('#p-forgot .bg');

    if (!valide(email)){
      if (champ){ champ.style.boxShadow = '0 0 0 1px rgba(224,138,122,.6)'; champ.focus(); }
      return;
    }
    if (champ) champ.style.boxShadow = '';

    if (typeof supa === 'undefined' || !supa){
      journal('err', 'client Supabase indisponible');
      return;
    }

    var libelle = bouton ? bouton.textContent : '';
    if (bouton){ bouton.textContent = 'Envoi…'; bouton.disabled = true; }

    try{
      var r = await supa.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + '/?reset=1'
      });

      /* Toujours confirmer, que l'adresse existe ou non : révéler
         l'inexistence d'un compte est une fuite d'information. */
      if (confirmation) confirmation.style.display = 'block';
      if (champ) champ.value = '';
      journal('log', r && r.error ? 'échec silencieux, confirmation affichée quand même' : 'lien envoyé');
    }catch(e){
      if (confirmation) confirmation.style.display = 'block';
      journal('err', 'reset : ' + ((e && e.message) || e));
    }finally{
      if (bouton){ bouton.textContent = libelle || 'Envoyer le lien'; bouton.disabled = false; }
    }
  };
})();
