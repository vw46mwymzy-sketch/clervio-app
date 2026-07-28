/* ══ CONCIERGE IA ══════════════════════════════════════ */

function buildUserContext(){
  try{
  const lines = []
  if(ORDS?.length){
    lines.push('COMMANDES (' + ORDS.length + ') :')
    ORDS.slice(0,10).forEach(o => {
      lines.push('- ' + o.brand + ' "' + o.name + '" : ' + o.amt + '€, ' + o.st + ', ' + o.dt + (o.warr?' garantie '+o.warr+'mois':''))
    })
  } else lines.push('COMMANDES : Aucune.')
  if(SUBS?.length){
    lines.push('\nABONNEMENTS :')
    SUBS.forEach(s => lines.push('- ' + s.name + ' : ' + s.amt + '€/' + s.freq))
  }
  if(WARR?.length){
    lines.push('\nGARANTIES :')
    WARR.forEach(w => lines.push('- ' + w.brand + ' ' + w.name + ' expire ' + w.exp))
  }
  return lines.join('\n') || 'Aucune donnée.'
  }catch(err){
    console.error('buildUserContext:', err)
    return 'Aucune donnée exploitable pour le moment.'
  }
}

async function callAIEdge(msg, context){
  if(!supa || !currentUser) return null
  try{
    const { data: { session } } = await supa.auth.getSession()
    if(!session) return null
    const res = await fetch('https://jwvhqtrofwmozhiajwip.supabase.co/functions/v1/ai-concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ message: msg, context })
    })
    if(!res.ok) return null
    const data = await res.json()
    return data.reply || null
  }catch(e){ return null }
}

/* ══ CONCIERGE IA ══════════════════════════════════════ */

function displayAIResponse(msgs, text){
  const formatted = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').split('\n').join('<br/>')
  msgs.innerHTML += '<div style="margin-bottom:14px;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<div style="width:24px;height:24px;border-radius:8px;background:rgba(201,168,76,.15);display:flex;align-items:center;justify-content:center;font-size:12px;">V</div>' +
      '<span style="font-size:11px;color:var(--d2);">CLERVIO</span>' +
    '</div>' +
    '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px 16px 16px 4px;padding:14px 16px;font-size:13px;color:var(--d1);line-height:1.7;">' + formatted + '</div>' +
  '</div>'
  msgs.scrollTop = msgs.scrollHeight
}

async function sendAI(){
  const inp = document.getElementById('ai-inp')
  const msg = inp?.value?.trim()
  if(!msg) return
  inp.value = ''
  const sugg = document.getElementById('aisugg')
  if(sugg) sugg.style.display = 'none'
  const msgs = document.getElementById('aimsgs')
  msgs.innerHTML += '<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">' +
    '<div style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.2);border-radius:16px 16px 4px 16px;padding:12px 16px;max-width:80%;font-size:13px;color:var(--cr);line-height:1.6;">' + msg + '</div>' +
  '</div>'
  const loaderId = 'ai-loader-' + Date.now()
  msgs.innerHTML += '<div id="' + loaderId + '" style="display:flex;gap:6px;margin-bottom:14px;padding:4px 0;">' +
    '<div style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s .0s infinite;"></div>' +
    '<div style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s .2s infinite;"></div>' +
    '<div style="width:6px;height:6px;border-radius:50%;background:var(--g);animation:sk 1.2s .4s infinite;"></div>' +
  '</div>'
  msgs.scrollTop = msgs.scrollHeight
  try{
    const userContext = buildUserContext()
    const loader = document.getElementById(loaderId)
    const edgeRes = await callAIEdge(msg, userContext)
    if(loader) loader.remove()
    if(edgeRes){ displayAIResponse(msgs, edgeRes); return }
    msgs.innerHTML += '<div style="margin-bottom:14px;padding:12px 16px;background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.15);border-radius:16px;font-size:13px;color:rgba(255,59,48,.9);">Concierge IA indisponible — configurez CLAUDE_API_KEY dans Supabase.</div>'
    msgs.scrollTop = msgs.scrollHeight
  }catch(e){
    const loader = document.getElementById(loaderId)
    if(loader) loader.remove()
    displayAIResponse(msgs, "Désolé, une erreur s'est produite. Réessayez.")
  }
}

// Détecter le retour après connexion Gmail
window.addEventListener('load',function(){/* doublon gmail=connected retiré : géré par mail=connected */})

