

/* ══ WEBGL AURORA ══════════════════════════════════ */
/* WebGL désactivé */

/* ══ NAV ══════════════════════════════════════════ */
const NH=`<div class="nav">
  <button class="ni" id="ni-orders" onclick="go('p-orders')" aria-label="Achats" role="tab"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><span>Achats</span></button>
  <button class="ni" id="ni-vault" onclick="go(\'p-vault\')"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><span>Coffre</span></button>
  <button class="nc" id="ni-home" onclick="go('p-home')" aria-label="Accueil" role="tab"><svg aria-hidden="true" viewBox="0 0 24 24" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></button>
  <button class="ni" id="ni-ai" onclick="go('p-ai')" aria-label="Concierge IA" role="tab"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><span>IA</span></button>
  <button class="ni" id="ni-profile" onclick="go('p-profile')" aria-label="Profil" role="tab"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Profil</span></button>
</div>`
document.querySelectorAll('.navslot').forEach(s=>s.innerHTML=NH)
const NM={'p-home':'ni-home','p-orders':'ni-orders','p-vault':'ni-vault','p-ai':'ni-ai','p-profile':'ni-profile'}

function go(id){
  // Mettre à jour le profil si nécessaire
  try{
    if(id === 'p-profile' && currentUser){
      loadEmailSourcesCount()
      const name = (currentProfile?.full_name||'').split(' ')[0] || (currentUser.email||'').split('@')[0] || 'Utilisateur'
      const nameEl = document.getElementById('profile-name')
      if(nameEl) nameEl.textContent = name
      const avatarEl = document.querySelector('#p-profile .sr')
      if(avatarEl) avatarEl.textContent = (name[0]||'Q').toUpperCase()
      const badgeEl = document.getElementById('profile-badge')
      if(badgeEl) badgeEl.textContent = (currentProfile?.plan === 'premium' ? 'Premium' : 'Essai gratuit') + ' · 4,99 €/mois'
    }
  }catch(e){ console.warn('Profile update error:', e) }
  document.querySelectorAll('.pg').forEach(p=>{p.classList.remove('on');p.style.display='';})
  const el=document.getElementById(id);if(!el)return;
  el.classList.add('on');
  el.querySelector('.sc')?.scrollTo(0,0)
  document.querySelectorAll('.ni,.nc').forEach(b=>b.classList.remove('on'))
  const nk=NM[id]
  if(nk){document.querySelectorAll('#'+nk).forEach(b=>b.classList.add('on'));if(nk==='ni-home')document.querySelectorAll('.nc').forEach(b=>b.classList.add('on'))}
  if(id==='p-home')   { initHome(); renderHomePriorities() }
  if(id==='p-orders') renderOrds('all')
  if(id==='p-vault')  renderVault('all')
  if(id==='p-analyse')startAnalyse()
  if(id==='p-scan')   renderScan('choice')
  if(id==='p-ai')     {document.getElementById('aimsgs').innerHTML='';document.getElementById('aisugg').style.display='block';}
}
function initHome(){
  const h=new Date().getHours()
  const name=currentProfile?.full_name?.split(' ')[0] || currentUser?.email?.split('@')[0] || ''
  const greeting=h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir'
  document.querySelectorAll('#greet').forEach(el=>el.textContent=name?`${greeting}, ${name}.`:`${greeting}.`)
}

