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
    var montant = (sub.amount || sub.amt) ? Number(sub.amount || sub.amt).toFixed(2).replace('.',',') + ' €' : null;

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
  function afficherLettre(titre, texte, orderIdPourSuivi){
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
      +   (orderIdPourSuivi ? '<button onclick="suivreRemboursement(\'' + esc(orderIdPourSuivi) + '\')" style="width:100%;height:44px;border:1px solid rgba(201,168,76,.28);border-radius:100px;background:none;color:var(--gh);font-size:12.5px;font-family:inherit;margin-bottom:10px;">Suivre ce remboursement dans CLERVIO</button>' : '')
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
  window.aiderReclamationParId = function(id){
    try{
      var o = (typeof ORDS !== 'undefined' ? ORDS : []).find(function(x){ return String(x.id)===String(id); });
      if (o) aiderReclamation(o);
    }catch(e){ journal('err','lookup réclamation : ' + ((e&&e.message)||e)); }
  };
  window.aiderResiliationParId = function(id){
    try{
      var todo = [];
      try{ todo = todo.concat(typeof SUBS !== 'undefined' ? SUBS : []); }catch(x){}
      try{ todo = todo.concat(typeof CONTR !== 'undefined' ? CONTR : []); }catch(x){}
      var s = todo.find(function(x){ return String(x.id)===String(id); });
      if (s) aiderResiliation(s);
    }catch(e){ journal('err','lookup résiliation : ' + ((e&&e.message)||e)); }
  };

  window.aiderResiliation = function(sub){
    if (!sub){ journal('err','résiliation : données manquantes'); return; }
    var texte = genererResiliation(sub);
    afficherLettre('Résiliation', texte);
    journal('log','lettre de résiliation générée : ' + (sub.name||sub.brand||'?'));
  };

  function dateJournal(){
    return new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
      + ' ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }

  async function ajouterAuJournal(orderId, ligne){
    if (typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return;
    try{
      var lu = await supa.from('orders').select('notes').eq('id', orderId).eq('user_id', currentUser.id).maybeSingle();
      var existant = (lu && lu.data && lu.data.notes) ? lu.data.notes : '';
      var nouvelle = '[' + dateJournal() + '] ' + ligne;
      var complet = existant ? (existant + '\\n' + nouvelle) : nouvelle;
      await supa.from('orders').update({ notes: complet }).eq('id', orderId).eq('user_id', currentUser.id);
    }catch(e){ journal('err','journal litige : ' + ((e&&e.message)||e)); }
  }

  async function marquerRemboursement(orderId, statut, montant){
    if (typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return false;
    try{
      var maj = { refund_status: statut };
      if (montant !== undefined) maj.refund_amount = montant;
      var r = await supa.from('orders').update(maj).eq('id', orderId).eq('user_id', currentUser.id);
      if (r && r.error){ journal('err','maj remboursement : '+r.error.message); return false; }
      var _libelles = { attente:'Réclamation suivie — remboursement en attente', recu:'Remboursement reçu' + (montant!=null?' ('+Number(montant).toFixed(2).replace('.',',')+' €)':''), refuse:'Remboursement refusé par le marchand' };
      ajouterAuJournal(orderId, _libelles[statut] || ('Statut : '+statut));
      return true;
    }catch(e){ journal('err','maj remboursement : '+((e&&e.message)||e)); return false; }
  }

  window.suivreRemboursement = async function(orderId){
    var ok = await marquerRemboursement(orderId, 'attente');
    if (ok){
      if (typeof toast === 'function') toast('Remboursement suivi. CLERVIO vous le rappellera.');
      try{ document.getElementById('agir-overlay').remove(); }catch(e){}
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.confirmerRemboursementRecu = async function(orderId, montantDefaut){
    var saisie = null;
    try{ saisie = window.prompt('Montant reçu (€)', montantDefaut != null ? String(montantDefaut) : ''); }catch(e){}
    if (saisie === null) return;
    var n = parseFloat(String(saisie).replace(',','.'));
    if (isNaN(n) || n < 0){ if (typeof toast === 'function') toast('Montant invalide.'); return; }
    var ok = await marquerRemboursement(orderId, 'recu', n);
    if (ok){
      if (typeof toast === 'function') toast('Remboursement enregistré : ' + n.toFixed(2).replace('.',',') + ' €');
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.marquerRemboursementRefuse = async function(orderId){
    var ok = true;
    try{ ok = window.confirm('Le marchand a-t-il refusé le remboursement ?'); }catch(e){}
    if (!ok) return;
    var fait = await marquerRemboursement(orderId, 'refuse');
    if (fait){
      if (typeof toast === 'function') toast('Noté. Vous pouvez saisir le médiateur de la consommation si besoin.');
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.rafraichirRemboursements = async function(){
    var el = document.querySelector('.stat-refunds');
    if (!el || typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return;
    try{
      var r = await supa.from('orders').select('id',{count:'exact',head:true})
        .eq('user_id', currentUser.id).eq('refund_status','attente');
      var n = (r && typeof r.count === 'number') ? r.count : 0;
      el.textContent = String(n);
    }catch(e){ journal('err','compteur remboursements : '+((e&&e.message)||e)); }
  };

  window.aiderReclamation = function(o){
    if (!o){ journal('err','réclamation : données manquantes'); return; }
    var r = genererReclamation(o);
    var titres = { retractation:'Rétractation', garantie:'Garantie', conformite:'Réclamation' };
    var _libellesType = { retractation:'Lettre de rétractation générée', garantie:'Lettre de mise en jeu de garantie générée', conformite:'Lettre de réclamation (garantie légale) générée' };
    ajouterAuJournal(o.id, _libellesType[r.type] || 'Lettre de réclamation générée');
    var suiviDisponible = (r.type === 'garantie' || r.type === 'conformite') ? o.id : null;
    afficherLettre(titres[r.type] || 'Réclamation', r.texte, suiviDisponible);
    journal('log','lettre de réclamation générée (' + r.type + ') : ' + (o.name||o.brand||'?'));
  };

  /* Le compteur de l'accueil affichait « 0 » figé dans le HTML,
     jamais relié aux remboursements réellement suivis. */
  function surNavigationRemboursements(){
    if (typeof window.go !== 'function' || window.go.__remb) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-home') setTimeout(function(){
        try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      }, 200);
      return r;
    };
    w.__remb = true;
    window.go = w;
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigationRemboursements);
  else surNavigationRemboursements();
  window.addEventListener('load', surNavigationRemboursements);
  setTimeout(surNavigationRemboursements, 1000);
  setTimeout(function(){ try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){} }, 1200);

  function genererBonDeRetourHTML(o){
    var nom = esc(o.name || o.brand || 'Article');
    var marque = esc(o.brand || '');
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = esc(o.order_number || o.orderNumber || o.ref || '—');
    var montant = o.amt || o.amount;
    var aujourd = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

    return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
      + '<title>Bon de retour — ' + nom + '</title>'
      + '<style>'
      + '@page{margin:22mm}'
      + 'body{font-family:Georgia,serif;color:#111;max-width:640px;margin:0 auto;padding:20px;}'
      + 'h1{font-size:20px;font-weight:400;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;}'
      + '.ligne{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:14px;}'
      + '.lbl{color:#666;}'
      + '.val{font-weight:600;}'
      + '.motif{margin-top:24px;padding:16px;border:1px solid #ccc;min-height:70px;font-size:13px;}'
      + '.avert{margin-top:28px;padding:14px;background:#fdf3e2;border:1px solid #e8c98a;font-size:11.5px;line-height:1.6;color:#5a4a20;}'
      + '.pied{margin-top:30px;font-size:11px;color:#999;text-align:center;}'
      + '@media print{.noprint{display:none}}'
      + '</style></head><body>'
      + '<h1>Bon de retour</h1>'
      + '<div class="ligne"><span class="lbl">Article</span><span class="val">' + nom + (marque && marque!==nom ? ' — '+marque : '') + '</span></div>'
      + '<div class="ligne"><span class="lbl">Référence de commande</span><span class="val">' + numero + '</span></div>'
      + (achat ? '<div class="ligne"><span class="lbl">Date d\\'achat</span><span class="val">' + achat + '</span></div>' : '')
      + (montant ? '<div class="ligne"><span class="lbl">Montant</span><span class="val">' + Number(montant).toFixed(2).replace('.',',') + ' €</span></div>' : '')
      + '<div class="ligne"><span class="lbl">Date du retour</span><span class="val">' + aujourd + '</span></div>'
      + '<div class="motif"><div class="lbl" style="font-size:12px;margin-bottom:8px;">Motif du retour</div></div>'
      + '<div class="avert">Ce document est un bon de référence à joindre au colis, généré par CLERVIO. <strong>Ce n\\'est pas une étiquette d\\'affranchissement</strong> : l\\'adresse de retour et le mode d\\'envoi restent ceux indiqués par le vendeur dans sa procédure de retour.</div>'
      + '<div class="pied">Généré par CLERVIO le ' + aujourd + '</div>'
      + '<div class="noprint" style="margin-top:24px;text-align:center;"><button onclick="window.print()" style="padding:12px 28px;font-size:14px;cursor:pointer;">Imprimer</button></div>'
      + '</body></html>';
  }

  window.imprimerBonRetour = function(orderId){
    try{
      var todo = (typeof ORDS !== 'undefined' ? ORDS : []);
      var o = todo.find(function(x){ return String(x.id)===String(orderId); });
      if (!o){ journal('err','bon de retour : commande introuvable'); return; }
      var html = genererBonDeRetourHTML(o);
      var w = window.open('', '_blank');
      if (!w){ if (typeof toast==='function') toast('Autorisez les fenêtres pop-up pour imprimer le bon.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      journal('log','bon de retour généré : ' + (o.name||o.brand||'?'));
    }catch(e){ journal('err','bon de retour : ' + ((e&&e.message)||e)); }
  };

  function genererDossierLitigeHTML(o){
    var nom = esc(o.name || o.brand || 'Article');
    var marque = esc(o.brand || '');
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = esc(o.order_number || o.orderNumber || o.ref || '—');
    var montant = o.amt || o.amount;
    var aujourd = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

    var lignesJournal = (o.notes || '').split('\\n').filter(function(l){ return l.trim(); });
    var journalHTML = lignesJournal.length
      ? lignesJournal.map(function(l){
          var m = l.match(/^\\[([^\\]]+)\\]\\s*(.*)$/);
          return '<div class="evt"><span class="evt-d">' + esc(m?m[1]:'') + '</span><span class="evt-t">' + esc(m?m[2]:l) + '</span></div>';
        }).join('')
      : '<div class="evt"><span class="evt-t" style="color:#999;">Aucune démarche enregistrée pour l\\'instant.</span></div>';

    var statutLabels = { attente:'Remboursement en attente', recu:'Remboursement reçu', refuse:'Remboursement refusé' };
    var statutActuel = o.refundStatus ? (statutLabels[o.refundStatus] || o.refundStatus) : 'Aucun remboursement en cours de suivi';

    return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
      + '<title>Dossier — ' + nom + '</title>'
      + '<style>'
      + '@page{margin:20mm}'
      + 'body{font-family:Georgia,serif;color:#111;max-width:680px;margin:0 auto;padding:24px;line-height:1.5;}'
      + 'h1{font-size:21px;font-weight:400;margin-bottom:4px;}'
      + '.sst{color:#888;font-size:12.5px;margin-bottom:26px;}'
      + 'h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:1px solid #ccc;padding-bottom:6px;margin:26px 0 14px;}'
      + '.ligne{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13.5px;}'
      + '.lbl{color:#666;}.val{font-weight:600;}'
      + '.evt{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:12.5px;}'
      + '.evt-d{color:#999;white-space:nowrap;min-width:110px;}'
      + '.evt-t{color:#222;}'
      + '.statut{padding:12px 16px;background:#f7f4ec;border-left:3px solid #b8944a;font-size:13.5px;margin-top:4px;}'
      + '.piece{margin-top:10px;padding:12px 16px;border:1px dashed #bbb;font-size:12.5px;color:#555;}'
      + '.pied{margin-top:34px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:14px;}'
      + '@media print{.noprint{display:none}}'
      + '</style></head><body>'
      + '<h1>Dossier de litige</h1>'
      + '<div class="sst">Constitué par CLERVIO le ' + aujourd + '</div>'

      + '<h2>Achat concerné</h2>'
      + '<div class="ligne"><span class="lbl">Article</span><span class="val">' + nom + (marque && marque!==nom ? ' — '+marque : '') + '</span></div>'
      + '<div class="ligne"><span class="lbl">Référence de commande</span><span class="val">' + numero + '</span></div>'
      + (achat ? '<div class="ligne"><span class="lbl">Date d\\'achat</span><span class="val">' + achat + '</span></div>' : '')
      + (montant ? '<div class="ligne"><span class="lbl">Montant</span><span class="val">' + Number(montant).toFixed(2).replace('.',',') + ' €</span></div>' : '')

      + '<h2>Chronologie des démarches</h2>'
      + journalHTML

      + '<h2>État actuel</h2>'
      + '<div class="statut">' + esc(statutActuel) + '</div>'

      + '<h2>Justificatif</h2>'
      + (o.facture
          ? '<div class="piece">Une facture ou un justificatif est conservé dans le coffre CLERVIO associé à cette commande. Joignez-le séparément à ce dossier : ouvrez la commande dans l\\'application, section « Facture », pour l\\'exporter.</div>'
          : '<div class="piece">Aucun justificatif n\\'est actuellement attaché à cette commande dans CLERVIO.</div>')

      + '<div class="pied">Document généré automatiquement à partir des informations saisies dans CLERVIO. Il constitue une aide à la constitution de votre dossier et ne remplace pas un conseil juridique.</div>'
      + '<div class="noprint" style="margin-top:22px;text-align:center;"><button onclick="window.print()" style="padding:12px 28px;font-size:14px;cursor:pointer;">Imprimer / Enregistrer en PDF</button></div>'
      + '</body></html>';
  }

  window.genererDossierLitige = function(orderId){
    try{
      var todo = (typeof ORDS !== 'undefined' ? ORDS : []);
      var o = todo.find(function(x){ return String(x.id)===String(orderId); });
      if (!o){ journal('err','dossier litige : commande introuvable'); return; }
      var html = genererDossierLitigeHTML(o);
      var w = window.open('', '_blank');
      if (!w){ if (typeof toast==='function') toast('Autorisez les fenêtres pop-up pour ouvrir le dossier.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      journal('log','dossier de litige généré : ' + (o.name||o.brand||'?'));
    }catch(e){ journal('err','dossier litige : ' + ((e&&e.message)||e)); }
  };

  window.trackDelivery = function(orderId, tracking){
    try{
      if (!tracking){ journal('err','suivi : numéro absent'); return; }
      var todo = (typeof ORDS !== 'undefined' ? ORDS : []);
      var o = todo.find(function(x){ return String(x.id)===String(orderId); });
      var transporteur = (o && o.carrier) ? String(o.carrier) : '';
      var requete = (transporteur ? transporteur + ' ' : '') + 'suivi colis ' + tracking;
      var url = 'https://www.google.com/search?q=' + encodeURIComponent(requete);
      window.open(url, '_blank', 'noopener');
      journal('log', 'suivi ouvert : ' + (transporteur || 'transporteur inconnu'));
    }catch(e){ journal('err','suivi : ' + ((e&&e.message)||e)); }
  };

  var origineScanre = 'p-orders';

  function surNavigationScan(){
    if (typeof window.go !== 'function' || window.go.__scanOrigine) return;
    var orig = window.go;
    var w = function(id){
      if (id === 'p-scan'){
        try{
          var actif = document.querySelector('.pg.on');
          if (actif && actif.id && actif.id !== 'p-scan') origineScanre = actif.id;
        }catch(e){}
      }
      return orig.apply(window, arguments);
    };
    w.__scanOrigine = true;
    window.go = w;
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigationScan);
  else surNavigationScan();
  window.addEventListener('load', surNavigationScan);
  setTimeout(surNavigationScan, 900);

  window.retourDepuisScan = function(){
    try{ go(origineScanre); }catch(e){ try{ go('p-orders'); }catch(e2){} }
  };
})();
