/* ══ CONCIERGE — réponses vérifiables ═══════════════════ */
function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char])
}

let aiConversationStarted = false
let aiRequestInFlight = false

function aiEngine(){ return window.ClervioIntelligence || null }

function localAIAnswer(message){
  const engine = aiEngine()
  if(engine) return engine.localAnswer(message)
  return {
    text:"Je n'ai pas encore assez de données vérifiables pour répondre.",
    evidence:'Aucune donnée',evidenceCount:0,action:'add-order',actionLabel:'Ajouter un achat'
  }
}

/* Compatibilité avec les anciens appels console. */
function localAIReply(message){ return localAIAnswer(message).text }

function assistantAvatar(){
  const avatar = document.createElement('div')
  avatar.className = 'ai-avatar'
  avatar.setAttribute('aria-hidden','true')
  avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/></svg>'
  return avatar
}

function addMsg(role, payload){
  const container = document.getElementById('aimsgs')
  if(!container) return
  const answer = typeof payload === 'string' ? { text:payload } : (payload || {})
  const row = document.createElement('article')
  row.className = 'ai-message ' + (role === 'ai' ? 'ai-message--assistant' : 'ai-message--user')

  if(role === 'ai'){
    row.appendChild(assistantAvatar())
    const content = document.createElement('div')
    content.className = 'ai-answer'
    const bubble = document.createElement('div')
    bubble.className = 'ai-bubble'
    bubble.textContent = answer.text || "Je ne peux pas répondre pour le moment."
    content.appendChild(bubble)

    if(answer.evidence){
      const evidence = document.createElement('div')
      evidence.className = 'ai-evidence'
      const pill = document.createElement('span')
      pill.className = 'ai-evidence__pill'
      pill.textContent = 'Source : ' + answer.evidence
      evidence.appendChild(pill)
      content.appendChild(evidence)
    }

    if(answer.action && answer.actionLabel){
      const followups = document.createElement('div')
      followups.className = 'ai-followups'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ai-followup'
      button.dataset.clervioAction = answer.action
      button.textContent = answer.actionLabel
      followups.appendChild(button)
      content.appendChild(followups)
    }
    row.appendChild(content)
  } else {
    const bubble = document.createElement('div')
    bubble.className = 'ai-bubble'
    bubble.textContent = answer.text || String(payload || '')
    row.appendChild(bubble)
  }

  container.appendChild(row)
  requestAnimationFrame(() => { container.scrollTop = container.scrollHeight })
}

function createAILoader(){
  const loader = document.createElement('div')
  loader.className = 'ai-loader'
  loader.setAttribute('role','status')
  loader.innerHTML = '<span class="sr-only">CLERVIO vérifie votre coffre</span><span class="ai-loader__dot"></span><span class="ai-loader__dot"></span><span class="ai-loader__dot"></span><span aria-hidden="true">Vérification…</span>'
  return loader
}

function isDeterministicQuestion(message){
  return /garanti|abonn|renouvel|rembours|commande|livr|transit|dépens|depens|coût|cout|faire pour moi/i.test(message)
}

function prepareAI(){
  const engine = aiEngine()
  const list = document.getElementById('ai-suggestion-list')
  const suggestions = document.getElementById('aisugg')
  const messages = document.getElementById('aimsgs')
  if(suggestions) suggestions.style.display = aiConversationStarted ? 'none' : ''
  if(messages) messages.style.display = aiConversationStarted ? 'flex' : 'none'
  if(list && engine){
    list.innerHTML = ''
    engine.suggestions().forEach(item => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ai-suggestion'
      button.dataset.aiSuggestion = ''
      button.innerHTML = '<span class="ai-suggestion__icon">' + engine.icon(item.icon) + '</span><span class="ai-suggestion__copy"></span>'
      button.querySelector('.ai-suggestion__copy').textContent = item.text
      button.addEventListener('click',() => sAI(item.text))
      list.appendChild(button)
    })
  }
  updateAIComposer()
}

function resetAIConversation(){
  if(aiRequestInFlight) return
  aiConversationStarted = false
  const messages = document.getElementById('aimsgs')
  if(messages) messages.innerHTML = ''
  prepareAI()
  const input = document.getElementById('aiinp')
  if(input){ input.value = ''; input.style.height = ''; input.focus({preventScroll:true}) }
}

function updateAIComposer(){
  const input = document.getElementById('aiinp')
  const send = document.getElementById('ai-send')
  if(input){ input.style.height = 'auto'; input.style.height = Math.min(120,input.scrollHeight) + 'px' }
  if(send) send.disabled = aiRequestInFlight || !input?.value?.trim()
}

async function sAI(text){
  const message = String(text || '').trim()
  if(!message || aiRequestInFlight) return
  if(message.length > 800){ toast('Votre question ne peut pas dépasser 800 caractères'); return }

  aiConversationStarted = true
  aiRequestInFlight = true
  prepareAI()
  addMsg('me',{text:message})

  const container = document.getElementById('aimsgs')
  const loader = createAILoader()
  if(container){ container.setAttribute('aria-busy','true'); container.appendChild(loader) }
  updateAIComposer()

  const local = localAIAnswer(message)
  let answer = local
  try{
    if(!isDeterministicQuestion(message)){
      const edge = await callAIEdge(message,buildUserContext())
      if(edge?.reply){
        const ev = aiEngine()?.evidence(message)
        answer = {
          text:edge.reply,
          evidence:ev?.label || 'Votre coffre',
          evidenceCount:ev?.count || 0,
          action:ev?.action || '',
          actionLabel:ev?.actionLabel || ''
        }
      }
    } else {
      await new Promise(resolve => setTimeout(resolve,180))
    }
  }catch(e){ answer = local }
  finally{
    loader.remove()
    if(container) container.removeAttribute('aria-busy')
    aiRequestInFlight = false
    updateAIComposer()
  }
  addMsg('ai',answer)
}

function sAIi(){
  const input = document.getElementById('aiinp')
  const message = input?.value?.trim()
  if(!message || aiRequestInFlight) return
  if(message.length > 800){ toast('Votre question ne peut pas dépasser 800 caractères'); return }
  input.value = ''
  updateAIComposer()
  sAI(message)
}

/* ══ TOAST ══════════════════════════════════════════ */
function toast(msg){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2900)}

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
