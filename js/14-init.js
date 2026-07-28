/* ══ RETURNING USER CHECK ═════════════════════════════ */
async function returningUser(){
  if(localStorage.getItem('clervio-faceid') && supa){
    try{
      const { data: { session } } = await supa.auth.getSession()
      if(session){ go('p-faceid-reconnect'); return }
    }catch(e){}
  }
  openEmailAuth('login')
}

/* ══ INIT ═══════════════════════════════════════════ */
// Transition splash → onboarding
setTimeout(()=>{ if(document.querySelector('.pg.on')?.id==='p-splash') go('p-ob1') },3500)

// Fallbacks de sécurité multiples
setTimeout(()=>{ if(document.querySelector('.pg.on')?.id==='p-splash') go('p-ob1') },7000)
setTimeout(()=>{ if(document.querySelector('.pg.on')?.id==='p-splash') go('p-ob1') },10000)

initHome()
loadSavedSubs()
window.clervioAppReady = true
window.dispatchEvent(new Event('clervio-app-ready'))
// Realtime subscription si user connecté
if(currentUser) subscribeToRealtime()

