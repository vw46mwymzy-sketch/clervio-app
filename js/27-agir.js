/* ══ AIDER À AGIR ════════════════════════════════════════
   CLERVIO détectait et alertait, sans jamais aider à faire
   quoi que ce soit avec cette information. Une alerte de
   renouvellement ne change presque jamais le comportement
   toute seule — il faut un texte prêt, pas juste une date.

   Choix délibéré : aucun annuaire d'adresses par marchand.
   Les contacts changent sans prévenir ; un lien mort casse
   la confiance. La lettre, elle, ne se périme jamais —
   l'utilisateur l'envoie où le marchand le lui permet.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_AGIR) return;
  window.CLERVIO_AGIR = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('agir',m); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }
  function dateFR(iso){
    if (!iso) return null;
    try{ return new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e){ return iso; }
  }
  function joursRestants(iso){
    if (!iso) return null;
    try{ return Math.ceil((new Date(iso+'T00:00:00') - new Date()) / 86400000); }
    catch(e){ return null; }
  }

  /* ── Résiliation ── */
  function genererResiliation(sub){
    var nom = sub.name || sub.brand || 'ce service';
    var depart = dateFR(sub.start_date || sub.startDate);
    var montant = sub.amount ? Number(sub.amount).toFixed(2).replace('.',',') + ' €' : null;

    var lignes = [];
    lignes.push('Objet : Résiliation de mon abonnement — ' + nom);
    lignes.push('');
    lignes.push('Madame, Monsieur,');
    lignes.push('');
    lignes.push('Je vous informe par la présente de ma décision de résilier mon abonnement ' + nom
      + (depart ? ', souscrit le ' + depart : '') + '.');
    lignes.push('');
    lignes.push('Je vous demande de bien vouloir prendre en compte cette résiliation dans les meilleurs délais et de m\'en confirmer la prise en effet, ainsi que la date d\'arrêt des prélèvements' + (montant ? ' (actuellement ' + montant + ')' : '') + '.');
    lignes.push('');
    lignes.push('Je vous remercie de votre compréhension.');
    lignes.push('');
    lignes.push('Cordialement.');
    return lignes.join('\\n');
  }

  /* ── Réclamation : rétractation, garantie commerciale, ou garantie légale ── */
  function genererReclamation(o){
    var nom = o.name || o.brand || 'cet article';
    var marque = o.brand || '';
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = o.order_number || o.orderNumber || o.tracking || null;
    var montant = o.amount ? Number(o.amount).toFixed(2).replace('.',',') + ' €' : null;

    var joursRetour = joursRestants(o.return_deadline || o.returnDeadline);
    var joursGarantie = joursRestants(o.warranty_ends_at || o.warrantyEndsAt);

    var lignes = [];

    if (joursRetour !== null && joursRetour >= 0){
      /* Droit de rétractation encore ouvert */
      lignes.push('Objet : Exercice de mon droit de rétractation — Commande ' + (numero ? 'n° ' + numero : nom));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('Par la présente, j\\'exerce mon droit de rétractation concernant ma commande de ' + nom
        + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ', passée le ' + achat : '')
        + (numero ? ', référence ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Conformément à l\\'article L221-18 du Code de la consommation, je dispose de 14 jours pour me rétracter sans avoir à justifier de motif. Je vous demande de bien vouloir procéder au remboursement' + (montant ? ' de ' + montant : '') + ' selon les modalités prévues.');
      lignes.push('');
      lignes.push('Je me tiens à votre disposition pour les modalités de retour du produit.');
      lignes.push('');
      lignes.push('Cordialement.');
    } else if (joursGarantie !== null && joursGarantie >= 0){
      /* Garantie commerciale du vendeur, encore valide */
      lignes.push('Objet : Mise en œuvre de la garantie — ' + nom + (numero ? ' (commande n° ' + numero + ')' : ''));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('J\\'ai acheté ' + nom + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ' le ' + achat : '') + (numero ? ', commande n° ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Ce produit présente un défaut de fonctionnement et je souhaite faire jouer la garantie dont il bénéficie encore. Je vous remercie de m\\'indiquer la marche à suivre pour la réparation, l\\'échange, ou à défaut le remboursement du produit.');
      lignes.push('');
      lignes.push('Je reste à votre disposition pour tout justificatif complémentaire.');
      lignes.push('');
      lignes.push('Cordialement.');
    } else {
      /* Hors garantie commerciale affichée : la garantie légale de conformité
         (2 ans) s'applique quoi qu'il arrive, et c'est ce qui protège le mieux
         l'utilisateur quand le vendeur n'a rien annoncé ou que sa garantie est passée. */
      lignes.push('Objet : Défaut de conformité — ' + nom + (numero ? ' (commande n° ' + numero + ')' : ''));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('J\\'ai acheté ' + nom + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ' le ' + achat : '') + (numero ? ', commande n° ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Ce produit présente un défaut. Conformément aux articles L217-3 et suivants du Code de la consommation relatifs à la garantie légale de conformité, applicable pendant deux ans à compter de la livraison, je vous demande la réparation ou le remplacement du produit, sans frais de ma part.');
      lignes.push('');
      lignes.push('À défaut de réponse satisfaisante sous 30 jours, je me réserve la possibilité de solliciter le médiateur de la consommation compétent.');
      lignes.push('');
      lignes.push('Cordialement.');
    }

    return { texte: lignes.join('\\n'), type: joursRetour>=0?'retractation':(joursGarantie>=0?'garantie':'conformite') };
  }

  /* ── Interface : une lettre à copier ou envoyer ── */
  function afficherLettre(titre, texte){
    var ancien = document.getElementById('agir-overlay');
    if (ancien) ancien.remove();

    var ov = document.createElement('div');
    ov.id = 'agir-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(5,4,6,.86);backdrop-filter:blur(6px);display:flex;align-items:flex-end;';
    ov.innerHTML =
      '<div style="width:100%;max-width:430px;margin:0 auto;background:linear-gradient(180deg,#141217,#0C0B0E);border-radius:24px 24px 0 0;padding:26px 22px calc(env(safe-area-inset-bottom,0px) + 22px);max-height:86vh;display:flex;flex-direction:column;">'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
      +     '<span style="font-family:\\'Cormorant Garamond\\',serif;font-size:1.5rem;color:var(--cr);">' + esc(titre) + '</span>'
      +     '<button onclick="document.getElementById(\\'agir-overlay\\').remove()" style="background:none;border:none;color:var(--d2);font-size:22px;padding:4px;">×</button>'
      +   '</div>'
      +   '<div style="font-size:11.5px;color:var(--d2);line-height:1.5;margin-bottom:14px;">Un brouillon, pas un envoi automatique. Relisez, adaptez si besoin, puis envoyez-le où le service client vous répond habituellement.</div>'
      +   '<textarea id="agir-texte" readonly style="flex:1;min-height:280px;background:rgba(255,255,255,.03);border:1px solid rgba(237,224,200,.10);border-radius:14px;padding:16px;color:var(--cr);font-size:13.5px;line-height:1.65;font-family:inherit;resize:none;margin-bottom:16px;">' + esc(texte) + '</textarea>'
      +   '<div style="display:flex;gap:10px;">'
      +     '<button onclick="window.copierLettre()" style="flex:1;height:50px;border:1px solid rgba(237,224,200,.16);border-radius:100px;background:none;color:var(--cr);font-size:14px;font-family:inherit;">Copier le texte</button>'
      +     '<button onclick="window.envoyerLettre(\\'' + esc(titre).replace(/'/g,"\\\\'") + '\\')" style="flex:1;height:50px;border:none;border-radius:100px;background:linear-gradient(102deg,var(--gd),var(--g) 26%,var(--gh) 52%,var(--g) 78%,var(--gd));color:#0B0906;font-size:14px;font-weight:500;font-family:inherit;">Envoyer par e-mail</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(ov);
  }

  window.copierLettre = function(){
    var t = document.getElementById('agir-texte');
    if (!t) return;
    try{
      navigator.clipboard.writeText(t.value);
      if (typeof toast === 'function') toast('Texte copié.');
    }catch(e){ t.select(); }
  };

  window.envoyerLettre = function(sujet){
    var t = document.getElementById('agir-texte');
    if (!t) return;
    var corps = t.value.split('\\n').slice(2).join('\\n'); /* le sujet est déjà dans le corps, mailto le reprend séparément */
    var lignes = t.value.split('\\n');
    var objetLigne = (lignes[0] || '').replace(/^Objet\\s*:\\s*/i,'');
    var reste = lignes.slice(2).join('\\n');
    var url = 'mailto:?subject=' + encodeURIComponent(objetLigne) + '&body=' + encodeURIComponent(reste);
    window.location.href = url;
  };

  /* ── Points d'entrée ── */
  window.aiderResiliation = function(sub){
    if (!sub){ journal('err','résiliation : données manquantes'); return; }
    var texte = genererResiliation(sub);
    afficherLettre('Résiliation', texte);
    journal('log','lettre de résiliation générée : ' + (sub.name||sub.brand||'?'));
  };

  window.aiderReclamation = function(o){
    if (!o){ journal('err','réclamation : données manquantes'); return; }
    var r = genererReclamation(o);
    var titres = { retractation:'Rétractation', garantie:'Garantie', conformite:'Réclamation' };
    afficherLettre(titres[r.type] || 'Réclamation', r.texte);
    journal('log','lettre de réclamation générée (' + r.type + ') : ' + (o.name||o.brand||'?'));
  };
})();
