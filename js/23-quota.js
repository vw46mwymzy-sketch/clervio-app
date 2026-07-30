/* ══ JAUGE D'OFFRE ═══════════════════════════════════════
   Montre à l'utilisateur où il en est, et propose de monter
   quand il approche — jamais quand il bute.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_QUOTA) return;
  window.CLERVIO_QUOTA = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('offre',m); }catch(e){} }
  function pret(){
    try{ return (typeof supa!=='undefined'&&supa)&&(typeof currentUser!=='undefined'&&currentUser&&currentUser.id); }
    catch(e){ return false; }
  }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }

  function barre(part, alerte){
    var pct = Math.max(0, Math.min(100, Math.round(part*100)));
    var teinte = alerte
      ? 'linear-gradient(90deg,#C98A4A,#E0A05A)'
      : 'linear-gradient(90deg,var(--gd),var(--g) 55%,var(--gh))';
    return '<div style="height:3px;background:rgba(237,224,200,.07);border-radius:3px;overflow:hidden;margin-top:9px;">'
         + '<div style="height:100%;width:' + pct + '%;background:' + teinte + ';border-radius:3px;'
         + 'transition:width .9s cubic-bezier(0.16,1,0.3,1);"></div></div>';
  }

  function ligne(libelle, utilise, max, alerte){
    if (max < 0) return '';
    return '<div style="margin-bottom:15px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
      + '<span style="font-size:13px;color:var(--cr);">' + esc(libelle) + '</span>'
      + '<span style="font-family:\'Cormorant Garamond\',serif;font-size:1.05rem;color:'
      + (alerte ? '#E0A05A' : 'var(--cr)') + ';">' + utilise
      + '<span style="font-size:.68em;color:var(--d2);"> / ' + max + '</span></span></div>'
      + barre(max ? utilise/max : 0, alerte) + '</div>';
  }

  async function rendre(){
    var bloc = document.getElementById('quota-bloc');
    if (!bloc || !pret()) return;

    try{
      var [el, doc, al] = await Promise.all([
        supa.rpc('verifier_quota', { p_user_id: currentUser.id, p_action: 'element' }),
        supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id }),
        supa.rpc('verifier_quota', { p_user_id: currentUser.id, p_action: 'alerte' })
      ]);

      var e = el && el.data, d = doc && doc.data, a = al && al.data;
      if (!e) return;

      var illimite = Number(e.max) < 0;
      if (illimite && (!d || Number(d.documents_max) <= 0)) { bloc.style.display='none'; return; }

      /* On alerte à 70 %, pas à 100 : proposer avant de buter. */
      var partEl  = illimite ? 0 : Number(e.used)/Math.max(1,Number(e.max));
      var partDoc = d ? Number(d.documents)/Math.max(1,Number(d.documents_max)) : 0;
      var proche  = partEl >= 0.7 || partDoc >= 0.7;

      var html = '<div style="background:linear-gradient(158deg,#161419,#100F13 62%,#0C0B0E);'
        + 'border-radius:19px;padding:19px 20px;'
        + 'box-shadow:0 0 0 1px ' + (proche ? 'rgba(224,160,90,.28)' : 'rgba(237,224,200,.075)')
        + ',inset 0 1px 0 rgba(255,255,255,.045),0 6px 22px rgba(0,0,0,.46);">'
        + '<div style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--d2);margin-bottom:16px;">'
        + 'Votre offre · ' + esc(e.libelle || '') + '</div>';

      html += ligne('Achats suivis', Number(e.used), Number(e.max), partEl >= 0.7);
      if (d) html += ligne('Documents', Number(d.documents), Number(d.documents_max), partDoc >= 0.7);
      if (a && Number(a.max) >= 0) html += ligne('Alertes envoyées', Number(a.used), Number(a.max), false);

      if (proche || (a && Number(a.max) >= 0 && Number(a.remaining) === 0)){
        html += '<div style="margin-top:4px;padding-top:15px;border-top:1px solid rgba(237,224,200,.07);">'
          + '<p style="font-size:12.5px;color:var(--d1);line-height:1.55;margin-bottom:13px;">'
          + 'CLERVIO continue de détecter vos achats. Passez à Essentiel pour qu\'il puisse tout garder.</p>'
          + '<button onclick="go(\'p-pricing\')" style="width:100%;height:46px;border:none;border-radius:100px;'
          + 'cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;color:#0B0906;'
          + 'background:linear-gradient(102deg,var(--gd),var(--g) 26%,var(--gh) 52%,var(--g) 78%,var(--gd));'
          + 'box-shadow:0 6px 22px rgba(201,168,76,.20),inset 0 1px 0 rgba(255,255,255,.35);">'
          + 'Voir les offres</button></div>';
      }

      html += '</div>';
      bloc.innerHTML = html;
      bloc.style.display = 'block';
      journal('log', e.used + '/' + e.max + ' achats suivis');
    }catch(err){
      journal('err', 'jauge : ' + ((err && err.message) || err));
    }
  }

  window.rafraichirQuota = rendre;

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__quota) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-profile') setTimeout(rendre, 90);
      return r;
    };
    w.__quota = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 1000);
})();
