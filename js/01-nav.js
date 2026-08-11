/* ══ NAVIGATION CENTRALE ═════════════════════════════════
   Une seule source de vérité pour l’écran actif, le retour,
   l’accessibilité et les événements de cycle de vie.
   ════════════════════════════════════════════════════════ */
const NH=`<nav class="nav" aria-label="Navigation principale">
  <button type="button" class="ni" data-nav-page="p-orders" onclick="go('p-orders')" aria-label="Achats"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3L3 7v13a1 1 0 001 1h16a1 1 0 001-1V7l-3-4z"/><path d="M3 7h18M16 11a4 4 0 01-8 0"/></svg><span>Achats</span></button>
  <button type="button" class="ni" data-nav-page="p-vault" onclick="go('p-vault')" aria-label="Coffre"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V7a5 5 0 0110 0v3"/></svg><span>Coffre</span></button>
  <button type="button" class="ni" data-nav-page="p-home" onclick="go('p-home')" aria-label="Accueil"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z"/></svg><span>Accueil</span></button>
  <button type="button" class="ni" data-nav-page="p-ai" onclick="go('p-ai')" aria-label="Concierge"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z"/></svg><span>Concierge</span></button>
  <button type="button" class="ni" data-nav-page="p-profile" onclick="go('p-profile')" aria-label="Profil"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Profil</span></button>
</nav>`

document.querySelectorAll('.navslot').forEach(slot=>{ slot.innerHTML=NH })

const NAV_TITLES={
  'p-home':'Accueil','p-orders':'Achats','p-vault':'Coffre','p-ai':'Concierge','p-profile':'Profil',
  'p-scan':'Scanner','p-add-order':'Ajouter un achat','p-add-sub':'Ajouter un abonnement',
  'p-email-sources':'Sources connectées','p-pricing':'Tarifs','p-login':'Connexion'
}
const navigationStack=[]

function activePageId(){ return document.querySelector('.pg.on')?.id || null }

function emitNavigation(name,detail){
  try{ window.dispatchEvent(new CustomEvent(name,{detail})) }catch(e){}
}

function updateNavigationState(id){
  document.querySelectorAll('[data-nav-page]').forEach(button=>{
    const active=button.dataset.navPage===id
    button.classList.toggle('on',active)
    if(active) button.setAttribute('aria-current','page')
    else button.removeAttribute('aria-current')
  })
}

function focusPageTitle(page){
  const title=page?.querySelector('[data-page-title],h1,h2')
  if(!title) return
  if(!title.hasAttribute('tabindex')) title.setAttribute('tabindex','-1')
  requestAnimationFrame(()=>{
    try{ title.focus({preventScroll:true}) }catch(e){ try{ title.focus() }catch(x){} }
  })
}

function go(id,options={}){
  const target=document.getElementById(id)
  if(!target || !target.classList.contains('pg')) return false
  const from=activePageId()
  const detail={from,to:id,source:options.source||'app'}
  emitNavigation('clervio:before-navigate',detail)

  if(from && from!==id && !options.replace){
    navigationStack.push(from)
    if(navigationStack.length>40) navigationStack.shift()
  }

  document.querySelectorAll('.pg').forEach(page=>{
    const active=page===target
    page.classList.toggle('on',active)
    page.style.display=''
    page.setAttribute('aria-hidden',active?'false':'true')
    try{ page.inert=!active }catch(e){}
  })
  target.querySelector('.sc')?.scrollTo(0,0)
  updateNavigationState(id)

  try{
    if(id==='p-profile' && currentUser){
      if(typeof loadEmailSourcesCount==='function') loadEmailSourcesCount()
      const name=(currentProfile?.full_name||'').split(' ')[0]||(currentUser.email||'').split('@')[0]||'Utilisateur'
      const nameEl=document.getElementById('profile-name')
      if(nameEl) nameEl.textContent=name
      const avatarEl=document.querySelector('#p-profile .sr')
      if(avatarEl) avatarEl.textContent=(name[0]||'Q').toUpperCase()
      const badgeEl=document.getElementById('profile-badge')
      if(badgeEl) badgeEl.textContent=currentProfile?.plan==='premium'?'Premium':'Découverte'
    }
  }catch(e){ console.warn('Profile update error:',e) }

  try{
    if(id==='p-home'){
      initHome()
      if(window.ClervioIntelligence) window.ClervioIntelligence.renderHome()
      if(typeof renderHomePriorities==='function') renderHomePriorities()
    }
    if(id==='p-orders' && typeof renderOrds==='function') renderOrds('all')
    if(id==='p-vault' && typeof renderVault==='function') renderVault('all')
    if(id==='p-analyse' && typeof startAnalyse==='function') startAnalyse()
    if(id==='p-scan' && typeof renderScan==='function') renderScan('choice')
    if(id==='p-ai'){
      if(typeof prepareAI==='function') prepareAI()
      if(typeof rafraichirConcierge==='function') rafraichirConcierge()
    }
  }catch(e){ console.warn('Navigation render error:',e) }

  document.title=(NAV_TITLES[id]?NAV_TITLES[id]+' — ':'')+'CLERVIO'
  emitNavigation('clervio:navigated',detail)
  if(options.focus!==false && !['p-splash','p-analyse'].includes(id)) setTimeout(()=>focusPageTitle(target),30)
  return true
}

function clervioBack(fallback='p-home'){
  const current=activePageId()
  let destination=null
  while(navigationStack.length && !destination){
    const candidate=navigationStack.pop()
    if(candidate && candidate!==current && document.getElementById(candidate)) destination=candidate
  }
  return go(destination||fallback,{replace:true,source:'back'})
}

function initHome(){
  const hour=new Date().getHours()
  const name=currentProfile?.full_name?.split(' ')[0]||currentUser?.email?.split('@')[0]||''
  const greeting=hour<12?'Bonjour':hour<18?'Bon après-midi':'Bonsoir'
  document.querySelectorAll('#greet').forEach(el=>{ el.textContent=name?`${greeting}, ${name}.`:`${greeting}.` })
  const line=document.getElementById('greet-line')
  if(line){
    let tracked=0
    try{ tracked=window.ClervioIntelligence?.snapshot()?.tracked||0 }catch(e){}
    line.textContent=tracked?'Voici ce qui mérite votre attention.':'Ajoutez un premier achat pour activer votre suivi.'
  }
}

window.clervioBack=clervioBack
