/* ══ RGPD — EXPORT + SUPPRESSION ══════════════════════ */

async function exportMyData(){
  if(!supa || !currentUser){ toast('Connectez-vous pour exporter vos données'); return }
  toast('⏳ Préparation de votre export…')
  try{
    const { data: { session } } = await supa.auth.getSession()
    if(!session) return
    const res = await fetch(EDGE.userAccount + '?action=export', {
      headers: { 'Authorization': 'Bearer ' + session.access_token }
    })
    if(!res.ok) throw new Error('Export échoué')
    const data = await res.json()
    // Télécharger le JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clervio-mes-donnees.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('✓ Export téléchargé')
  }catch(e){
    toast('❌ Erreur export')
    console.error(e)
  }
}

async function deleteMyAccount(){
  if(!supa || !currentUser){ return }
  // Double confirmation
  const confirm1 = confirm('Supprimer définitivement votre compte CLERVIO ?\n\nToutes vos données seront effacées.')
  if(!confirm1) return
  const confirm2 = confirm('⚠️ Cette action est irréversible.\n\nAppuyez OK pour confirmer la suppression.')
  if(!confirm2) return

  toast('⏳ Suppression en cours…')
  try{
    const { data: { session } } = await supa.auth.getSession()
    if(!session) return
    const res = await fetch(EDGE.userAccount + '?action=delete', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'DELETE' })
    })
    if(!res.ok) throw new Error('Suppression échouée')
    toast('✓ Compte supprimé. Au revoir.')
    setTimeout(()=>{ currentUser=null; currentProfile=null; go('p-ob1') }, 2000)
  }catch(e){
    toast('❌ Erreur suppression')
    console.error(e)
  }
}

/* ══ EMAIL DE BIENVENUE après inscription ═══════════════ */
async function sendWelcomeEmail(email, name){
  try{
    const { data: { session } } = await supa.auth.getSession()
    if(!session) return
    const response = await fetch(EDGE.sendEmail, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'welcome', to: email, name })
    })
    if(!response.ok) console.warn('Welcome email:', await response.text())
  }catch(e){ console.warn('Welcome email:', e) }
}


/* ══ DEMO MODE ══════════════════════════════════════════ */
function showDemoBanner(){
  const b = document.getElementById('demo-banner')
  if(b) b.classList.add('visible')
}
function hideDemoBanner(){
  const b = document.getElementById('demo-banner')
  if(b) b.classList.remove('visible')
}

/* ══ HOME PRIORITIES — dynamique post-auth ═════════════ */
async function renderHomePriorities(){
  const container = document.getElementById('home-priorities')
  const countEl = document.getElementById('alerts-count')
  if(!container) return

  if(!currentUser || !supa){
    // Pas connecté — vide
    container.innerHTML = ''
    if(countEl) countEl.textContent = ''
    return
  }

  try{
    // Charger les alertes non lues depuis Supabase
    const { data: alerts } = await supa
      .from('alerts')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if(!alerts?.length){
      container.innerHTML = `<div class="empty-state" style="padding:32px 0;">
        <div class="es-icon">✨</div>
        <h3>Tout est en ordre</h3>
        <p>Aucune action urgente pour le moment.</p>
      </div>`
      if(countEl) countEl.textContent = ''
      return
    }

    if(countEl) countEl.textContent = alerts.length + ' alerte' + (alerts.length>1?'s':'')

    const typeConfig = {
      email_review:         { icon: '❓', color: 'var(--amb)', label: 'Email à valider' },
        warranty_expiry:      { icon: '🛡️', color: 'var(--red)',  label: 'Garantie' },
      subscription_renewal: { icon: '🔄', color: 'var(--amb)', label: 'Renouvellement' },
      delivery_update:      { icon: '📦', color: 'var(--blu)', label: 'Livraison' },
      refund_update:        { icon: '💳', color: 'var(--g)',   label: 'Remboursement' },
      contract_renewal:     { icon: '📄', color: 'var(--amb)', label: 'Contrat' },
    }

    container.innerHTML = alerts.map(a => {
      const cfg = typeConfig[a.type] || { icon: '⚡', color: 'var(--g)', label: 'Alerte' }
      // Carte spéciale email à valider
      if(a.type === 'email_review' && a.source_email_id){
        return '<div class="cd" style="margin-bottom:12px;padding:14px 16px;">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
            '<div style="width:36px;height:36px;border-radius:10px;background:rgba(255,149,0,.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">❓</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:12px;color:var(--amb);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px;">Email à valider</div>' +
              '<div style="font-size:13px;color:var(--cr);white-space:nowrap;overflow:visible;text-overflow:ellipsis;">' + escapeHTML(String(a.title||'').replace('Email à valider : ','')) + '</div>' +
            '</div>' +
          '</div>' +
          '<p style="font-size:12px;color:var(--d2);line-height:1.6;margin-bottom:12px;">' + escapeHTML(a.message||'') + '</p>' +
          '<div style="display:flex;gap:8px;">' +
            '<button data-eid="' + a.source_email_id + '" data-aid="' + a.id + '" data-act="confirm" onclick="handlePendingAction(this)" style="flex:1;padding:9px;background:rgba(52,208,88,.12);border:1px solid rgba(52,208,88,.25);border-radius:10px;color:rgba(52,208,88,.9);font-size:12px;font-weight:600;cursor:pointer;">✓ Ajouter</button>' +
            '<button data-eid="' + a.source_email_id + '" data-aid="' + a.id + '" data-act="reject" onclick="handlePendingAction(this)" style="flex:1;padding:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:var(--d2);font-size:12px;font-weight:500;cursor:pointer;">✗ Ignorer</button>' +
          '</div>' +
        '</div>'
      }

      return `<div class="cd tp" style="margin-bottom:9px;display:flex;align-items:center;gap:14px;padding:14px 16px;" onclick="markAlertRead('${a.id}')">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${cfg.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${escapeHTML(a.title)}</div>
          <div style="font-size:11px;color:var(--d2);">${escapeHTML(a.message||'')}</div>
        </div>
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--d2)" stroke-width="1.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>`
    }).join('')

  }catch(e){
    console.warn('renderHomePriorities error:', e)
    container.innerHTML = ''
  }
}

async function markAlertRead(alertId){
  if(!supa || !currentUser) return
  await supa.from('alerts').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', alertId)
  renderHomePriorities()
}

