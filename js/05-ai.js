/* ══ AI ═════════════════════════════════════════════ */
function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char])
}

function localAIReply(message){
  const q = message.toLowerCase()
  if(q.includes('garantie')){
    const warranty = WARR.find(w => q.includes(String(w.brand||'').toLowerCase()) || q.includes(String(w.name||'').toLowerCase())) || WARR[0]
    return warranty ? `La garantie ${warranty.brand || ''} ${warranty.name || ''} expire le ${warranty.exp || 'date non renseignée'}.` : "Je ne trouve aucune garantie correspondante dans votre coffre."
  }
  if(q.includes('abonnement') || q.includes('renouvelle')){
    const sub = SUBS.find(s => q.includes(String(s.name||'').toLowerCase())) || SUBS[0]
    return sub ? `${sub.name} coûte ${Number(sub.amt||0).toFixed(2)} €/${sub.freq || 'mois'}${sub.renew ? ` et se renouvelle le ${sub.renew}` : ''}.` : "Je ne trouve aucun abonnement correspondant."
  }
  if(q.includes('rembours')){
    const refund = ORDS.find(o => /retour|rembours/i.test(String(o.st||'')) && (q.includes(String(o.brand||'').toLowerCase()) || q.includes(String(o.name||'').toLowerCase())))
    return refund ? `Le dossier ${refund.brand} — ${refund.name} est actuellement indiqué « ${refund.st} ».` : "Aucun remboursement correspondant n'est enregistré pour le moment."
  }
  if(ORDS.length || SUBS.length || WARR.length){
    return `Votre espace contient ${ORDS.length} commande${ORDS.length>1?'s':''}, ${WARR.length} garantie${WARR.length>1?'s':''} et ${SUBS.length} abonnement${SUBS.length>1?'s':''}. Précisez le marchand ou le produit à vérifier.`
  }
  return "Je n'ai pas encore assez de données. Ajoutez une commande ou connectez Gmail pour que je puisse vous répondre précisément."
}

function addMsg(role, text){
  const container = document.getElementById('aimsgs')
  if(!container) return
  const row = document.createElement('div')
  row.style.cssText = `display:flex;gap:10px;flex-direction:${role==='ai'?'row':'row-reverse'};`
  if(role === 'ai'){
    row.innerHTML = `<div class="ob ob-xs" style="margin-top:3px;flex-shrink:0;"></div><div class="bai">${escapeHTML(text).replace(/\n/g,'<br/>')}</div>`
  } else {
    const bubble = document.createElement('div')
    bubble.className = 'bme'
    bubble.textContent = text
    row.appendChild(bubble)
  }
  container.appendChild(row)
  container.scrollTop = container.scrollHeight
}

async function sAI(text){
  const message = String(text || '').trim()
  if(!message) return
  const suggestions = document.getElementById('aisugg')
  if(suggestions) suggestions.style.display = 'none'
  addMsg('me', message)

  const container = document.getElementById('aimsgs')
  const loader = document.createElement('div')
  loader.style.cssText = 'display:flex;gap:6px;margin:2px 0 14px 10px;'
  loader.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s infinite;"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s .2s infinite;"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s .4s infinite;"></span>'
  if(container) container.appendChild(loader)

  const context = buildUserContext()
  const response = await callAIEdge(message, context)
  loader.remove()
  addMsg('ai', response || localAIReply(message))
}

function sAIi(){
  const input = document.getElementById('aiinp')
  const message = input?.value?.trim()
  if(!message) return
  input.value = ''
  sAI(message)
}

/* ══ TOAST ══════════════════════════════════════════ */
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2900)}

function openDocumentUrl(url){
  try{
    const target = new URL(url, window.location.origin)
    if(!['http:','https:'].includes(target.protocol)) throw new Error('URL refusée')
    window.open(target.href, '_blank', 'noopener,noreferrer')
  }catch(e){ toast('Document indisponible') }
}


async function editPersonalInfo(){
  if(!currentUser || !supa){ toast('Connectez-vous pour modifier votre profil'); return }
  const currentName = currentProfile?.full_name || ''
  const fullName = prompt('Votre prénom et votre nom', currentName)
  if(fullName === null) return
  const cleanName = fullName.trim()
  if(!cleanName){ toast('Le nom ne peut pas être vide'); return }
  const { error } = await supa.from('profiles').update({ full_name: cleanName }).eq('id', currentUser.id)
  if(error){ toast('❌ Modification impossible'); return }
  currentProfile = { ...(currentProfile || {}), full_name: cleanName }
  const firstName = cleanName.split(' ')[0]
  const nameEl = document.getElementById('profile-name')
  if(nameEl) nameEl.textContent = firstName
  toast('✓ Informations mises à jour')
}

function openSupport(){
  window.location.href = 'mailto:contact@clervio.app?subject=Aide%20CLERVIO'
}

