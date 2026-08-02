/* ══ FACTURE D'UNE COMMANDE ══════════════════════════════
   Attacher, ouvrir et retirer la pièce justificative d'un achat.
   Une facture qu'on ne retrouve pas depuis sa commande ne sert
   à rien le jour d'un litige.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_FACTURE) return;
  window.CLERVIO_FACTURE = true;

  var BUCKET = 'coffre';
  var TYPES = {
    'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png',
    'image/webp':'webp', 'image/heic':'heic', 'image/heif':'heif'
  };
  var MAX = 10 * 1024 * 1024;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('facture',m); }catch(e){} }
  function dire(m){ try{ if (typeof window.toast === 'function') window.toast(m); }catch(e){} }
  function pret(){
    try{ return (typeof supa!=='undefined'&&supa)&&(typeof currentUser!=='undefined'&&currentUser&&currentUser.id); }
    catch(e){ return false; }
  }

  /* ── Attacher ── */
  function attacher(orderId){
    if (!pret()){ dire('Connectez-vous pour ajouter une facture.'); return; }
    try{
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
      input.style.display = 'none';

      input.onchange = async function(){
        var f = input.files && input.files[0];
        input.remove();
        if (!f) return;

        var mime = String(f.type || '').toLowerCase();
        if (!TYPES[mime]){ dire('Format non accepté. Utilisez un PDF ou une photo.'); return; }
        if (f.size > MAX){ dire('Fichier trop volumineux — 10 Mo maximum.'); return; }

        try{
          var e = await supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id });
          var st = e && e.data;
          if (st && (Number(st.documents) >= Number(st.documents_max) || Number(st.mo) >= Number(st.mo_max))){
            dire('Coffre plein : ' + st.documents + ' documents sur ' + st.documents_max + '.');
            return;
          }
        }catch(err){ /* le quota ne doit pas bloquer si indisponible */ }

        dire('Envoi de la facture…');
        try{
          var chemin = currentUser.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.' + TYPES[mime];
          var up = await supa.storage.from(BUCKET).upload(chemin, f, { contentType: mime, upsert: false });
          if (up && up.error){ journal('err','dépôt : '+up.error.message); dire("L'envoi a échoué."); return; }

          var maj = await supa.from('orders')
            .update({ invoice_path: chemin, invoice_size: f.size, invoice_mime: mime })
            .eq('id', orderId).eq('user_id', currentUser.id);

          if (maj && maj.error){
            try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){}
            journal('err','liaison : '+maj.error.message);
            dire("L'enregistrement a échoué.");
            return;
          }

          journal('log','facture attachée (' + Math.round(f.size/1024) + ' Ko)');
          dire('Facture ajoutée à la commande.');
          if (typeof rechargerDonnees === 'function') { try{ await rechargerDonnees(); }catch(x){} }
          if (typeof showOrd === 'function') { try{ showOrd(orderId); }catch(x){} }
        }catch(err){
          journal('err','attache : ' + ((err && err.message) || err));
          dire("L'envoi a échoué.");
        }
      };

      document.body.appendChild(input);
      input.click();
    }catch(e){ journal('err','sélecteur : ' + ((e && e.message) || e)); }
  }

  /* ── Ouvrir : lien signé, cinq minutes ── */
  async function ouvrir(chemin){
    if (!pret() || !chemin) return;
    try{
      var r = await supa.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (r && r.data && r.data.signedUrl) window.open(r.data.signedUrl, '_blank', 'noopener');
      else dire("Impossible d'ouvrir cette facture.");
    }catch(e){
      journal('err','ouverture : ' + ((e && e.message) || e));
      dire("Impossible d'ouvrir cette facture.");
    }
  }

  /* ── Retirer ── */
  async function retirer(orderId, chemin){
    if (!pret() || !orderId) return;
    var ok = true;
    try{ ok = window.confirm('Retirer cette facture ? Le fichier sera effacé définitivement.'); }catch(e){}
    if (!ok) return;
    try{
      var maj = await supa.from('orders')
        .update({ invoice_path: null, invoice_size: null, invoice_mime: null })
        .eq('id', orderId).eq('user_id', currentUser.id);
      if (maj && maj.error){ journal('err','retrait : '+maj.error.message); return; }
      if (chemin){ try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){} }
      dire('Facture retirée.');
      if (typeof rechargerDonnees === 'function') { try{ await rechargerDonnees(); }catch(x){} }
      if (typeof showOrd === 'function') { try{ showOrd(orderId); }catch(x){} }
    }catch(e){ journal('err','retrait : ' + ((e && e.message) || e)); }
  }

  /* ── Déplacer une commande vers le coffre ──────────────
     Une facture déjà réglée classée en « commande » n'a pas
     de sens : on la déplace sans perdre la pièce jointe. */
  async function versLeCoffre(orderId){
    if (!pret() || !orderId) return;
    var ok = true;
    try{ ok = window.confirm('Ranger cet achat dans votre coffre ? Il ne sera plus suivi comme une commande en cours.'); }catch(e){}
    if (!ok) return;

    try{
      var r = await supa.from('orders')
        .select('brand,name,amount,currency,order_date,warranty_months,invoice_path,invoice_size,invoice_mime')
        .eq('id', orderId).eq('user_id', currentUser.id).maybeSingle();
      if (!r || r.error || !r.data){ dire("Commande introuvable."); return; }
      var o = r.data;

      var ins = await supa.from('vault_documents').insert({
        user_id: currentUser.id,
        name: o.name || o.brand || 'Document',
        type: 'facture',
        brand: o.brand || null,
        amount: o.amount || null,
        currency: o.currency || 'EUR',
        doc_date: o.order_date || null,
        warranty_months: o.warranty_months || null,
        source: 'deplace',
        file_path: o.invoice_path || null,
        file_size: o.invoice_size || null,
        file_mime: o.invoice_mime || null,
        file_added_at: new Date().toISOString()
      });
      if (ins && ins.error){ journal('err','copie : '+ins.error.message); dire("Le déplacement a échoué."); return; }

      /* On détache la pièce avant de supprimer : le déclencheur de
         suppression effacerait sinon le fichier qu'on vient de reprendre. */
      await supa.from('orders')
        .update({ invoice_path: null, invoice_size: null, invoice_mime: null })
        .eq('id', orderId).eq('user_id', currentUser.id);

      var del = await supa.from('orders').delete().eq('id', orderId).eq('user_id', currentUser.id);
      if (del && del.error){ journal('err','suppression : '+del.error.message); }

      journal('log','achat déplacé vers le coffre');
      dire('Rangé dans votre coffre.');
      if (typeof rechargerDonnees === 'function'){ try{ await rechargerDonnees(); }catch(x){} }
      if (typeof window.go === 'function') window.go('p-vault');
    }catch(e){
      journal('err','déplacement : ' + ((e && e.message) || e));
      dire("Le déplacement a échoué.");
    }
  }

  window.rangerDansCoffre = versLeCoffre;
  window.attacherFacture = attacher;
  window.ouvrirFacture   = ouvrir;
  window.retirerFacture  = retirer;
})();
