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

/* displayAIResponse() et sendAI() vivaient ici, jamais appelées —
   un second chat entier, cherchant #ai-inp qui n'existe sur aucun
   écran. Le vrai chemin passe par sAI()/sAIi() dans 05-ai.js, qui
   utilisent bien buildUserContext() et callAIEdge() ci-dessus.
   Retiré le 04/08 après lecture complète de chaque écran. */

// Détecter le retour après connexion Gmail
window.addEventListener('load',function(){/* doublon gmail=connected retiré : géré par mail=connected */})

