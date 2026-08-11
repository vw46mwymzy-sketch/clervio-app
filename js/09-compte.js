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
    const deletedUserId = currentUser?.id || null
    if(typeof revoquerNotifications === 'function'){
      try{ await revoquerNotifications() }catch(e){}
    }
    try{ await supa.auth.signOut({ scope:'global' }) }catch(e){ try{ await supa.auth.signOut() }catch(x){} }
    if(typeof clearLocalUserData === 'function') clearLocalUserData(deletedUserId)
    ORDS = []; SUBS = []; WARR = []; CONTR = []; DOCS = []; FOLDERS = []
    toast('✓ Compte supprimé. Au revoir.')
    setTimeout(()=>{ currentUser=null; currentProfile=null; go('p-ob1') }, 1200)
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
  const app = document.getElementById('app')
  if(!b || !app) return
  const syncOffset = () => app.style.setProperty('--demo-banner-height', b.offsetHeight + 'px')
  b.classList.add('visible')
  app.classList.add('demo-active')
  requestAnimationFrame(syncOffset)
  if(window.ResizeObserver && !b._clervioResizeObserver){
    b._clervioResizeObserver = new ResizeObserver(syncOffset)
    b._clervioResizeObserver.observe(b)
  }
}
function hideDemoBanner(){
  const b = document.getElementById('demo-banner')
  if(b) b.classList.remove('visible')
  const app = document.getElementById('app')
  if(app){ app.classList.remove('demo-active'); app.style.removeProperty('--demo-banner-height') }
}

/* ══ HOME PRIORITIES — dynamique post-auth ═════════════ */
async function renderHomePriorities(){
  const container = document.getElementById('home-priorities')
  const countEl = document.getElementById('alerts-count')
  if(!container) return
  const engine = window.ClervioIntelligence
  const localState = engine ? engine.renderHome() : { snapshot:{ tracked:0 }, insights:[] }
  const tracked = localState.snapshot?.tracked || 0
  const emptyActivation = document.getElementById('hm-empty')
  if(emptyActivation) emptyActivation.style.display = tracked ? 'none' : 'block'

  const actionForType = type => ({
    warranty_expiry:'warranties',subscription_renewal:'subscriptions',contract_renewal:'subscriptions',
    delivery_update:'orders',refund_update:'orders'
  })[type] || 'orders'
  const kindForType = type => ({
    warranty_expiry:'warranty',subscription_renewal:'subscription',contract_renewal:'subscription',
    delivery_update:'delivery',refund_update:'refund'
  })[type] || 'alert'

  function appendIcon(parent,kind){
    const icon = document.createElement('span')
    icon.className = 'priority-card__icon'
    icon.innerHTML = engine ? engine.icon(kind) : ''
    parent.appendChild(icon)
  }

  function appendCard(item){
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'priority-card'
    appendIcon(button,item.kind)
    const body = document.createElement('span')
    body.className = 'priority-card__body'
    const title = document.createElement('span')
    title.className = 'priority-card__title'
    title.textContent = item.title
    const detail = document.createElement('span')
    detail.className = 'priority-card__detail'
    detail.textContent = item.detail || ''
    body.append(title,detail)
    const metric = document.createElement('span')
    metric.className = 'priority-card__metric'
    metric.textContent = item.metric || 'Ouvrir'
    button.append(body,metric)
    button.addEventListener('click',async()=>{
      if(item.alertId) await markAlertRead(item.alertId,false)
      if(engine) engine.action(item.action)
    })
    container.appendChild(button)
  }

  function appendEmailReview(alert){
    const card = document.createElement('div')
    card.className = 'calm-empty'
    const title = document.createElement('p')
    title.className = 'calm-empty__title'
    title.textContent = String(alert.title||'Email à valider').replace('Email à valider : ','')
    const detail = document.createElement('p')
    detail.className = 'calm-empty__detail'
    detail.textContent = alert.message || 'Vérifiez cet élément avant de l’ajouter à votre coffre.'
    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:8px;margin-top:14px;'
    ;[['confirm','Ajouter'],['reject','Ignorer']].forEach(([act,label])=>{
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'calm-empty__action'
      button.style.marginTop = '0'
      button.dataset.eid = alert.source_email_id
      button.dataset.aid = alert.id
      button.dataset.act = act
      button.textContent = label
      button.addEventListener('click',()=>handlePendingAction(button))
      actions.appendChild(button)
    })
    card.append(title,detail,actions)
    container.appendChild(card)
  }

  let remoteAlerts = []
  try{
    if(currentUser && supa){
      const { data: alerts,error } = await supa
        .from('alerts')
        .select('id,type,title,message,priority,source_email_id,created_at')
        .eq('user_id',currentUser.id)
        .eq('is_read',false)
        .order('created_at',{ascending:false})
        .limit(8)
      if(error) throw error
      remoteAlerts = alerts || []
    }
  }catch(e){
    console.warn('renderHomePriorities error:',e)
    container.innerHTML = '<div class="state-error"><p class="state-error__title">Actualisation impossible</p><p class="state-error__detail">Vos données restent intactes. Vérifiez votre connexion puis réessayez.</p><button type="button" class="state-error__retry" onclick="renderHomePriorities()">Réessayer</button></div>'
    if(countEl) countEl.textContent = 'Hors ligne'
    return
  }

  container.innerHTML = ''
  const remoteKinds = new Set(remoteAlerts.map(a=>kindForType(a.type)))
  const derived = (localState.insights || []).slice(1).filter(item=>item.kind!=='ready' && !remoteKinds.has(item.kind)).slice(0,3)
  remoteAlerts.sort((a,b)=>({urgent:4,high:3,normal:2,low:1}[b.priority]||0)-({urgent:4,high:3,normal:2,low:1}[a.priority]||0))

  remoteAlerts.slice(0,4).forEach(alert=>{
    if(alert.type==='email_review' && alert.source_email_id) appendEmailReview(alert)
    else appendCard({
      title:alert.title||'Élément à vérifier',detail:alert.message||'',metric:alert.priority==='urgent'?'Urgent':'Ouvrir',
      kind:kindForType(alert.type),action:actionForType(alert.type),alertId:alert.id
    })
  })
  derived.forEach(appendCard)

  const total = remoteAlerts.slice(0,4).length + derived.length
  if(countEl) countEl.textContent = total ? total + ' action' + (total>1?'s':'') : ''
  if(!total){
    const empty = document.createElement('div')
    empty.className = 'calm-empty'
    empty.innerHTML = '<p class="calm-empty__title">Aucune échéance prioritaire détectée</p><p class="calm-empty__detail">Ce constat porte uniquement sur les données actuellement chargées dans votre coffre.</p>'
    container.appendChild(empty)
  }
}

async function markAlertRead(alertId,rerender=true){
  if(!supa || !currentUser) return
  await supa.from('alerts').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', alertId).eq('user_id',currentUser.id)
  if(rerender) renderHomePriorities()
}
