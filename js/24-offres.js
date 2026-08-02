/* ══ OFFRES ══════════════════════════════════════════════
   Les tarifs affichés viennent de la base, jamais du HTML.

   Raison d'être : ce soir, l'écran tarifs annonçait encore
   « 30 jours d'essai » et « Premium » — un modèle remplacé
   quelques heures plus tôt. La règle vivait dans plan_limites,
   le discours dans le balisage, et rien ne les reliait.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_OFFRES) return;
  window.CLERVIO_OFFRES = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('offres',m); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }
  function euros(cents){
    return (Number(cents)/100).toFixed(2).replace('.', ',');
  }

  var cache = null;

  async function charger(){
    if (cache) return cache;
    try{
      if (typeof supa === 'undefined' || !supa) return null;
      var r = await supa.from('plan_limites')
        .select('plan,libelle,prix_cents,ordre,actif,usage_pro,elements_max,alertes_max,documents_max,notes')
        .eq('actif', true).order('ordre');
      if (r && r.error){ journal('err', r.error.message); return null; }
      cache = (r && r.data) ? r.data : null;
      return cache;
    }catch(e){ journal('err', String(e && e.message || e)); return null; }
  }

  function ligne(txt){
    return '<div style="font-size:13px;color:var(--d1);line-height:1.5;">' + esc(txt) + '</div>';
  }

  function carte(o, accent){
    var illimite = function(v){ return Number(v) < 0; };
    var details = [];

    if (illimite(o.elements_max)) details.push('Achats suivis sans limite');
    else details.push(o.elements_max + ' achats suivis');

    if (illimite(o.alertes_max)) details.push('Alertes illimitées');
    else details.push(o.alertes_max + ' alertes avant échéance');

    details.push(o.documents_max + ' documents conservés');

    var fond = accent
      ? 'linear-gradient(158deg,#1A1712,#131009 62%,#0D0B07)'
      : 'linear-gradient(158deg,#161419,#100F13 62%,#0C0B0E)';
    var filet = accent ? 'rgba(201,168,76,.26)' : 'rgba(237,224,200,.075)';
    var prix = Number(o.prix_cents) === 0
      ? '<span style="font-family:\'Cormorant Garamond\',serif;font-size:2.5rem;font-weight:300;color:var(--cr);line-height:1;">Gratuit</span>'
      : '<span style="font-family:\'Cormorant Garamond\',serif;font-size:2.5rem;font-weight:300;line-height:1;'
        + (accent ? 'background:linear-gradient(120deg,var(--gh),var(--g));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;' : 'color:var(--cr);')
        + '">' + euros(o.prix_cents) + '<span style="font-size:.42em;color:var(--d2);-webkit-text-fill-color:var(--d2);"> €/mois</span></span>';

    return '<div style="padding:24px;margin-bottom:12px;border-radius:19px;background:' + fond
      + ';box-shadow:0 0 0 1px ' + filet + ',inset 0 1px 0 rgba(255,255,255,.045),0 6px 22px rgba(0,0,0,.46);">'
      + '<div style="font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--d2);margin-bottom:12px;">'
      + esc(o.libelle) + '</div>'
      + '<div style="margin-bottom:16px;">' + prix + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:9px;">' + details.map(ligne).join('') + '</div>'
      + '</div>';
  }

  async function rendre(){
    var hote = document.getElementById('offres-liste');
    if (!hote) return;
    var offres = await charger();
    if (!offres || !offres.length) return;   /* on laisse le HTML de secours */

    var visibles = offres.filter(function(o){ return o.usage_pro !== true && o.plan !== 'trial' && o.plan !== 'expire'; });
    if (!visibles.length) return;

    var payantes = visibles.filter(function(o){ return Number(o.prix_cents) > 0; });
    var mise = payantes.length ? payantes[0].plan : null;

    hote.innerHTML = visibles.map(function(o){ return carte(o, o.plan === mise); }).join('');
    journal('log', visibles.length + ' offres affichées depuis la base');
  }

  window.rafraichirOffres = rendre;

  /* La page professionnelle promet un export et une TVA qui
     n'existent pas encore : accessible par lien, pas au tout-venant. */
  function ouvrirPro(){
    try{
      if (location.search.indexOf('pro=1') === -1) return;
      var b = document.getElementById('ob1-pro');
      if (b) b.style.display = 'block';
    }catch(e){}
  }

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__offres) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-pricing') setTimeout(rendre, 80);
      return r;
    };
    w.__offres = true;
    window.go = w;
  }

  function demarrer(){ surNavigation(); ouvrirPro(); }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
  window.addEventListener('load', demarrer);
  setTimeout(demarrer, 1000);
})();
