/* ══ COFFRE — FICHIERS ═══════════════════════════════════
   Dépôt, ouverture et suppression des pièces justificatives.
   Le compartiment est privé : toute lecture passe par un lien
   signé, valable cinq minutes.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_COFFRE) return;
  window.CLERVIO_COFFRE = true;

  var BUCKET = 'coffre';
  var TYPES = {
    'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png',
    'image/webp':'webp', 'image/heic':'heic', 'image/heif':'heif'
  };
  var MAX_OCTETS = 10 * 1024 * 1024;

  function journal(type, msg){
    try{ var D = window.CLERVIO_DIAG; if (D && D[type]) D[type]('coffre', msg); }catch(e){}
  }
  function dire(msg){
    try{ if (typeof window.toast === 'function') window.toast(msg); }catch(e){}
  }
  function pret(){
    try{ return (typeof supa !== 'undefined' && supa)
              && (typeof currentUser !== 'undefined' && currentUser && currentUser.id); }
    catch(e){ return false; }
  }

  /* ── État du coffre ──────────────────────────────────── */
  async function etat(){
    if (!pret()) return null;
    try{
      var r = await supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id });
      return (r && r.data) ? r.data : null;
    }catch(e){ journal('err', 'état : ' + (e && e.message || e)); return null; }
  }

  /* ── Dépôt d'un fichier, sans analyse ────────────────── */
  async function deposer(fichier, meta){
    if (!pret()){ dire('Connectez-vous pour ajouter un document.'); return null; }
    if (!fichier){ return null; }

    var mime = String(fichier.type || '').toLowerCase();
    if (!TYPES[mime]){
      dire('Format non accepté. Utilisez un PDF ou une photo.');
      return null;
    }
    if (fichier.size > MAX_OCTETS){
      dire('Fichier trop volumineux — 10 Mo maximum.');
      return null;
    }

    var e = await etat();
    if (e && (Number(e.documents) >= Number(e.documents_max) || Number(e.mo) >= Number(e.mo_max))){
      dire('Coffre plein : ' + e.documents + ' documents sur ' + e.documents_max + '. Supprimez-en un pour continuer.');
      return null;
    }

    try{
      var chemin = currentUser.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.' + TYPES[mime];
      var up = await supa.storage.from(BUCKET).upload(chemin, fichier, { contentType: mime, upsert: false });
      if (up && up.error){ journal('err', 'dépôt : ' + up.error.message); dire("Le dépôt a échoué."); return null; }

      meta = meta || {};
      var ligne = {
        user_id: currentUser.id,
        name: meta.nom || fichier.name || 'Document',
        type: meta.type || 'facture',
        brand: meta.marque || null,
        amount: meta.montant != null ? meta.montant : null,
        currency: meta.devise || 'EUR',
        doc_date: meta.date || null,
        warranty_months: meta.garantie_mois != null ? meta.garantie_mois : null,
        folder_id: meta.dossier || null,
        source: meta.source || 'manuel',
        file_path: chemin,
        file_size: fichier.size,
        file_mime: mime,
        file_added_at: new Date().toISOString()
      };

      var ins = await supa.from('vault_documents').insert(ligne).select('id').maybeSingle();
      if (ins && ins.error){
        /* La fiche a échoué : on ne laisse pas le fichier orphelin */
        try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){}
        journal('err', 'fiche : ' + ins.error.message);
        dire("L'enregistrement a échoué.");
        return null;
      }

      journal('log', 'document déposé (' + Math.round(fichier.size/1024) + ' Ko)');
      dire('Document ajouté à votre coffre.');
      return { id: ins && ins.data ? ins.data.id : null, chemin: chemin };
    }catch(err){
      journal('err', 'dépôt : ' + (err && err.message || err));
      dire("Le dépôt a échoué.");
      return null;
    }
  }

  /* ── Ouverture : lien signé, cinq minutes ────────────── */
  async function ouvrir(chemin){
    if (!pret() || !chemin) return;
    try{
      var r = await supa.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (r && r.data && r.data.signedUrl){
        window.open(r.data.signedUrl, '_blank', 'noopener');
      } else {
        journal('err', 'lien signé indisponible');
        dire("Impossible d'ouvrir ce document.");
      }
    }catch(e){
      journal('err', 'ouverture : ' + (e && e.message || e));
      dire("Impossible d'ouvrir ce document.");
    }
  }

  /* ── Suppression : la fiche part, le fichier suit ───── */
  async function supprimer(id){
    if (!pret() || !id) return false;
    try{
      var r = await supa.from('vault_documents').delete().eq('id', id);
      if (r && r.error){ journal('err', 'suppression : ' + r.error.message); return false; }
      journal('log', 'document supprimé');
      dire('Document supprimé.');
      return true;
    }catch(e){ journal('err', 'suppression : ' + (e && e.message || e)); return false; }
  }

  /* ── Sélecteur de fichier, sans passer par le scan ──── */
  function choisir(meta){
    try{
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
      input.style.display = 'none';
      input.onchange = async function(){
        var f = input.files && input.files[0];
        input.remove();
        if (!f) return;
        var res = await deposer(f, meta);
        if (res && typeof window.renderVault === 'function'){
          try{ window.renderVault(); }catch(e){}
        }
      };
      document.body.appendChild(input);
      input.click();
    }catch(e){ journal('err', 'sélecteur : ' + (e && e.message || e)); }
  }

  /* ── Rafraîchissement de la vue coffre ─────────────── */
  function rafraichirCoffre(){
    try{
      if (typeof rechargerDonnees === 'function') { rechargerDonnees(); return; }
      if (typeof renderVault === 'function') { renderVault(); return; }
      if (typeof window.go === 'function') window.go('p-vault');
    }catch(e){ journal('err', 'rafraîchissement : ' + (e && e.message || e)); }
  }

  /* ── Suppression depuis l'interface, avec confirmation ── */
  async function supprimerDepuisVue(id){
    if (!id) return;
    var ok = true;
    try{ ok = window.confirm('Supprimer ce document ? Le fichier sera effacé définitivement.'); }catch(e){}
    if (!ok) return;
    var fait = await supprimer(id);
    if (fait) setTimeout(rafraichirCoffre, 250);
  }

  window.supprimerDocument = supprimerDepuisVue;
  window.rafraichirCoffre  = rafraichirCoffre;
  window.coffreEtat       = etat;
  window.coffreDeposer    = deposer;
  window.coffreOuvrir     = ouvrir;
  window.coffreSupprimer  = supprimer;
  window.ajouterDocument  = choisir;
})();
