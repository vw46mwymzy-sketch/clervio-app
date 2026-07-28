

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

/* ══ PASSWORD ══════════════════════════════════════ */
function togglePw(){const i=document.getElementById('pwin'),eo=document.getElementById('eo'),ec=document.getElementById('ec');i.type=i.type==='password'?(eo.style.display='none',ec.style.display='block','text'):(eo.style.display='block',ec.style.display='none','password')}

/* ══ FACE ID ═══════════════════════════════════════ */
/* ══ PORTE BLINDÉE — Animation séquencée ══════════════ */
function animateDoor(onComplete){
  const ov  = document.getElementById('fov')
  const st  = document.getElementById('fst')
  const L   = document.getElementById('door-left')
  const R   = document.getElementById('door-right')
  const shk = document.getElementById('lock-shackle')
  const chk = document.getElementById('door-check')

  if(!ov) return
  ov.classList.add('on')

  // Reset état
  if(L) L.style.transform = 'none'
  if(R) R.style.transform = 'none'
  if(shk) shk.style.transform = 'none'
  if(chk) chk.style.opacity = '0'
  if(st) { st.textContent = 'Vérification…'; st.style.color = '' }

  // Étape 1 (0.6s) — anse se lève
  setTimeout(()=>{
    if(shk) shk.style.transform = 'translateY(-9px)'
    if(st) st.textContent = 'Déverrouillage…'
  }, 600)

  // Étape 2 (1.4s) — panneaux s'ouvrent
  setTimeout(()=>{
    if(L) L.style.transform = 'perspective(400px) rotateY(-55deg)'
    if(R) R.style.transform = 'perspective(400px) rotateY(55deg)'
    if(st) st.textContent = 'Accès accordé'
    if(st) st.style.color = 'var(--grn)'
  }, 1400)

  // Étape 3 (1.9s) — checkmark apparaît
  setTimeout(()=>{
    if(chk) chk.style.opacity = '1'
  }, 1900)

  // Étape 4 (2.8s) — fermeture
  setTimeout(()=>{
    ov.classList.remove('on')
    if(L) L.style.transform = 'none'
    if(R) R.style.transform = 'none'
    if(shk) shk.style.transform = 'none'
    if(chk) chk.style.opacity = '0'
    if(st){ st.textContent = 'Vérification en cours…'; st.style.color = '' }
    if(onComplete) onComplete()
  }, 2800)
}

function bytesToBase64Url(bytes){
  let binary = ''
  new Uint8Array(bytes).forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}

function base64UrlToBytes(value){
  const padded = value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function activateFaceID(){
  localStorage.setItem('clervio-faceid-seen','1')
  if(!window.PublicKeyCredential || !navigator.credentials || !currentUser){
    toast('Biométrie indisponible sur cet appareil')
    go('p-home')
    return
  }
  try{
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = new TextEncoder().encode(String(currentUser.id)).slice(0,64)
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'CLERVIO' },
        user: {
          id: userId,
          name: currentUser.email || 'utilisateur@clervio.app',
          displayName: currentProfile?.full_name || currentUser.email || 'Utilisateur CLERVIO'
        },
        pubKeyCredParams: [
          { type:'public-key', alg:-7 },
          { type:'public-key', alg:-257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })
    if(!credential) throw new Error('Aucun identifiant créé')
    localStorage.setItem('clervio-faceid', bytesToBase64Url(credential.rawId))
    toast('✓ Déverrouillage biométrique activé')
    animateDoor(()=>go('p-home'))
  }catch(error){
    console.warn('Biometric setup:', error)
    toast(error?.name === 'NotAllowedError' ? 'Activation annulée' : 'Biométrie non disponible')
    go('p-home')
  }
}

async function doFaceIDReconnect(){
  const credentialId = localStorage.getItem('clervio-faceid')
  if(!credentialId || !window.PublicKeyCredential || !navigator.credentials){
    openEmailAuth('login')
    return
  }
  try{
    // Une session Supabase valide reste obligatoire : la biométrie ne remplace pas le compte.
    if(!supa){ openEmailAuth('login'); return }
    const { data: { session } } = await supa.auth.getSession()
    if(!session){ openEmailAuth('login'); return }
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type:'public-key', id:base64UrlToBytes(credentialId) }],
        userVerification: 'required',
        timeout: 60000
      }
    })
    if(!assertion) throw new Error('Vérification impossible')
    animateDoor(()=>go('p-home'))
  }catch(error){
    console.warn('Biometric unlock:', error)
    toast(error?.name === 'NotAllowedError' ? 'Déverrouillage annulé' : 'Vérification impossible')
  }
}

/* Show Face ID reconnect screen if returning user */
function startFaceID(){
  if(localStorage.getItem('clervio-faceid')){
    go('p-faceid-reconnect')
  } else {
    // Not yet activated — go to onboarding
    go('p-ob2')
  }
}

/* ══ ANALYSE ════════════════════════════════════════ */
async function startAnalyse(){
  const el=document.getElementById('ansteps');if(!el)return;el.innerHTML=''
  const isReal=!!currentUser
  const steps=isReal?[
    'Connexion sécurisée','Chargement de votre profil','Récupération des commandes','Synchronisation du coffre-fort','Génération du tableau de bord'
  ]:[
    'Préparation de votre espace','Chargement des préférences','Initialisation du coffre-fort','Configuration des alertes','Création du tableau de bord'
  ]
  steps.forEach((s,i)=>{
    const d=document.createElement('div')
    d.style.cssText='display:flex;align-items:center;gap:12px;margin-bottom:14px;opacity:.18;transition:opacity .55s;'
    d.innerHTML=`<div id="ac${i}" style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><div style="width:14px;height:14px;border:1.5px solid rgba(237,224,200,.3);border-radius:50%;border-top-color:var(--g);animation:sp 1s linear infinite;"></div></div><span style="font-size:13px;color:var(--d1);">${escapeHTML(s)}</span>`
    el.appendChild(d)
  })

  let realStats=null
  if(isReal){
    try{
      const results=await Promise.allSettled([fetchOrders(),loadVaultData(),fetchDashboardStats()])
      if(results[0].status==='fulfilled') ORDS=results[0].value
      if(results[2].status==='fulfilled') realStats=results[2].value
    }catch(e){ console.warn('Analyse loading:',e) }
  }

  for(let i=0;i<steps.length;i++){
    await new Promise(r=>setTimeout(r,isReal?360:520))
    const d=el.children[i]
    if(d){
      d.style.opacity='1'
      const icon=document.getElementById(`ac${i}`)
      if(icon) icon.innerHTML='<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="rgba(50,215,75,.08)"/><polyline points="8,12 11,15 16,9"/></svg>'
    }
  }
  updateDashboardStats(realStats || buildLocalDashboardStats())
  if(isReal) subscribeToRealtime()
  await new Promise(r=>setTimeout(r,350))
  if(!localStorage.getItem('clervio-faceid-seen')) go('p-faceid-prompt')
  else go('p-home')
}

/* ══ BRAND LOGOS ════════════════════════════════════ */
const LOGOS={
  'Apple':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#1C1C1E"/><path d="M63 22c-2.5 3-6.7 5.3-10.7 5-0.5-4 1.5-8.2 4-10.8 2.5-3 6.8-5.3 10.4-5.3 0.5 4-1.3 8.1-3.7 11.1zM76 56c0-10.8 8.8-16 9.2-16.3-5.1-8.3-12.5-9-15.2-9.1-7-0.3-13.7 4.2-17.3 4.2s-9.4-4-15.5-3.9c-8.2 0.2-15.6 4.8-19.8 12-8.5 14.8-2.2 36.8 6.1 48.8 4 5.8 8.8 12.4 15.1 12.2 6.1-0.2 8.4-4 15.8-4 7.3 0 9.4 4 15.8 3.8 6.5-0.1 10.7-5.9 14.7-11.7 4.6-6.7 6.5-13.2 6.6-13.5-0.2-0.1-12.5-4.9-12.5-18.5z" fill="white" transform="scale(0.72) translate(8,5)"/></svg>`,
  'Sephora': `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#000"/><rect x="16" y="16" width="68" height="68" rx="5" fill="none" stroke="white" stroke-width="4.5"/><text x="50" y="64" text-anchor="middle" font-size="34" font-weight="700" fill="white" font-family="Georgia,serif">S</text></svg>`,
  'Zara':    `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#F5F0E8"/><text x="50" y="61" text-anchor="middle" font-size="24" font-weight="700" fill="#000" font-family="Arial,sans-serif" letter-spacing="-1">ZARA</text></svg>`,
  'Nike':    `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#111"/><path d="M14 64 C26 44 62 28 86 36 C66 41 34 56 14 64Z" fill="white"/></svg>`,
  'Netflix': `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#E50914"/><text x="28" y="76" font-size="70" font-weight="900" fill="white" font-family="Arial Black,sans-serif">N</text></svg>`,
  'Spotify': `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#1DB954"/><g transform="translate(50,50)"><circle r="30" fill="none" stroke="white" stroke-width="1"/><path d="M-24 -8 Q0 -18 24 -8" stroke="white" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M-20 4 Q0 -4 20 4" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M-16 16 Q0 10 16 16" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/></g></svg>`,
  'Canal+':  `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#E4002B"/><text x="50" y="58" text-anchor="middle" font-size="17" font-weight="700" fill="white" font-family="Arial,sans-serif">CANAL+</text></svg>`,
  'Disney+': `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#113CCF"/><text x="50" y="50" text-anchor="middle" font-size="20" font-weight="700" fill="white" font-family="Arial,sans-serif">Disney</text><text x="50" y="72" text-anchor="middle" font-size="24" font-weight="900" fill="#5DE0FF" font-family="Arial,sans-serif">+</text></svg>`,
  'Engie':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#00AAFF"/><polygon points="50,20 80,75 20,75" fill="white"/><rect x="28" y="62" width="44" height="11" rx="3" fill="#00AAFF"/></svg>`,
  'Oelie':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#1565C0"/><circle cx="50" cy="50" r="26" fill="none" stroke="white" stroke-width="5.5"/><ellipse cx="50" cy="50" rx="14" ry="22" fill="white" transform="rotate(-20,50,50)"/></svg>`,
  'Macif':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#E63324"/><text x="50" y="60" text-anchor="middle" font-size="20" font-weight="700" fill="white" font-family="Arial,sans-serif">MACIF</text></svg>`,
  'April':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#7B1FA2"/><text x="50" y="44" text-anchor="middle" font-size="18" fill="white" font-family="Arial,sans-serif" font-weight="600">April</text><text x="50" y="66" text-anchor="middle" font-size="16" fill="rgba(255,255,255,.8)" font-family="Arial,sans-serif">Santé</text></svg>`,
  'SFR':     `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#E2001A"/><text x="50" y="64" text-anchor="middle" font-size="36" font-weight="900" fill="white" font-family="Arial Black,sans-serif">SFR</text></svg>`,
  'Basic-Fit':`<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#FFE400"/><text x="50" y="50" text-anchor="middle" font-size="17" font-weight="800" fill="#000" font-family="Arial Black,sans-serif">Basic</text><text x="50" y="68" text-anchor="middle" font-size="17" font-weight="800" fill="#000" font-family="Arial Black,sans-serif">-Fit</text></svg>`,
  'Dyson':   `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#CC0000"/><text x="50" y="60" text-anchor="middle" font-size="20" font-weight="700" fill="white" font-family="Arial,sans-serif">DYSON</text></svg>`,
  'Cartier': `<svg aria-hidden="true" viewBox="0 0 100 100" width="30" height="30"><rect width="100" height="100" rx="24" fill="#111"/><rect x="14" y="14" width="72" height="72" rx="5" fill="none" stroke="#C9A84C" stroke-width="1.5"/><text x="50" y="58" text-anchor="middle" font-size="13" fill="#C9A84C" font-family="Georgia,serif" letter-spacing="1.5">CARTIER</text></svg>`,
}
function logo(b,sz=30){
  const brand = String(b || '?')
  if(LOGOS[brand]) return LOGOS[brand]
  const initial = escapeHTML((brand.trim()[0] || '?').toUpperCase())
  return `<svg aria-hidden="true" viewBox="0 0 100 100" width="${Number(sz)||30}" height="${Number(sz)||30}"><rect width="100" height="100" rx="24" fill="var(--s3)"/><text x="50" y="64" text-anchor="middle" font-size="44" font-weight="700" fill="var(--g)" font-family="sans-serif">${initial}</text></svg>`
}

/* ══ ORDERS ═════════════════════════════════════════ */
/* ══ STORAGE ═══════════════════════════════════════════ */
// Aucune donnée démo en production — données chargées depuis Supabase uniquement
function loadOrders(){
  try{
    const saved = localStorage.getItem('clervio-orders')
    return saved ? JSON.parse(saved) : []
  }catch(e){ return [] }
}

function saveOrders(orders){
  try{ localStorage.setItem('clervio-orders', JSON.stringify(orders)) }catch(e){}
}

function addOrder(order){
  const orders = loadOrders()
  order.id = Date.now()
  orders.unshift(order)
  saveOrders(orders)
  return orders
}

let ORDS = loadOrders()
async function renderOrds(f){
  const el=document.getElementById('olist');if(!el)return
  try{
  ORDS = await fetchOrders()
  const totalEl = document.getElementById('orders-total')
  if(totalEl) totalEl.textContent = ORDS.length + ' total'
  const filt=ORDS.filter(o => {
    const status = String(o.st || '').toLowerCase()
    if(f === 'all') return true
    if(f === 'd') return status === 'livré'
    if(f === 'r') return status.includes('retour') || status.includes('rembours')
    if(f === 't') return status !== 'livré' && !status.includes('retour') && !status.includes('rembours') && status !== 'annulée'
    return true
  })
  if(filt.length === 0){
    el.innerHTML=`<div class="empty-state"><div class="es-icon">📦</div><h3>Aucune commande</h3><p>${f==='all' ? 'Ajoutez votre première commande ou connectez votre email pour la détection automatique.' : 'Aucune commande dans cette catégorie.'}</p><button class="bgh" onclick="toggleFabMenu('orders')" style="font-size:13px;">+ Ajouter une commande</button></div>`
    return
  }
  el.innerHTML=filt.map((o,i)=>{
    const amount = Number(o.amt) || 0
    return `<div class="cd tp" data-order-id="${escapeHTML(o.id)}" onclick="showOrd(this.dataset.orderId)" style="margin-bottom:10px;display:flex;align-items:center;gap:14px;animation:sk .45s var(--e) ${i*.07}s both;">
      <div style="width:52px;height:52px;border-radius:15px;flex-shrink:0;background:var(--s2);display:flex;align-items:center;justify-content:center;border:1px solid var(--ln2);box-shadow:0 4px 12px rgba(0,0,0,.3);">${logo(o.brand)}</div>
      <div class="f1 mn0"><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:2px;font-weight:600;">${escapeHTML(o.brand)}</div><div style="font-size:13px;color:var(--cr);font-weight:400;" class="el">${escapeHTML(o.name)}</div><div style="font-size:11px;color:var(--d2);margin-top:2px;">${escapeHTML(o.dt)}</div></div>
      <div style="text-align:right;flex-shrink:0;"><div class="sr" style="font-size:1.15rem;color:var(--g);font-weight:300;margin-bottom:5px;">${amount.toFixed(2).replace('.00','')} €</div><span class="ba ba-${escapeHTML(o.sc || 'b')}">${escapeHTML(o.st)}</span></div>
    </div>`
  }).join('')
  }catch(err){
    console.error('renderOrds:', err)
    if(el) el.innerHTML='<div class="empty-state"><div class="es-icon">⚠️</div><h3>Impossible de charger</h3><p>Vérifiez votre connexion, puis réessayez.</p><button class="bgh" onclick="renderOrds(&#39;all&#39;)" style="font-size:13px;">Réessayer</button></div>'
  }
}
function fO(f,b){document.querySelectorAll('#p-orders .tab').forEach(t=>t.classList.remove('on'));b?.classList.add('on');renderOrds(f)}
function showOrd(id){
  const o=ORDS.find(x=>String(x.id)===String(id));if(!o)return
  const statuses=['En attente','Confirmée','Expédiée','En transit','Livré']
  const currentStatus=String(o.st||'En attente')
  const isReturn=/retour|rembours/i.test(currentStatus)
  let currentIndex=statuses.indexOf(currentStatus)
  if(currentIndex<0) currentIndex=isReturn?4:0
  const steps=statuses.map((label,index)=>({
    l:label==='Livré'?'Livrée':label,
    d:index===0 ? String(o.dt||'—') : index<currentIndex ? 'Terminé' : index===currentIndex ? 'Statut actuel' : 'À venir',
    ok:index<currentIndex || (index===currentIndex && currentStatus==='Livré'),
    cur:index===currentIndex && currentStatus!=='Livré'
  }))
  if(isReturn) steps.push({l:'Retour / remboursement',d:'Statut actuel',ok:false,cur:true})

  let stepsHtml=''
  steps.forEach((s,i)=>{
    const dotColor=s.ok?'var(--grn)':s.cur?'var(--g)':'rgba(255,255,255,.15)'
    const dotGlow=s.ok?'0 0 10px rgba(50,215,75,.55)':s.cur?'0 0 10px rgba(200,168,74,.55)':'none'
    const lineColor=s.ok?'rgba(50,215,75,.3)':'var(--ln2, rgba(255,255,255,.07))'
    const textColor=s.cur?'var(--g)':s.ok?'var(--d1)':'var(--d2)'
    const lineHtml=i<steps.length-1?'<div style="width:1px;flex:1;min-height:14px;background:'+lineColor+';margin:3px 0;"></div>':''
    stepsHtml+='<div style="display:flex;gap:14px;margin-bottom:10px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:'+dotColor+';box-shadow:'+dotGlow+';"></div>'+lineHtml+'</div><div style="padding-bottom:6px;"><div style="font-size:12px;color:'+textColor+';">'+escapeHTML(s.l)+'</div><div style="font-size:10px;color:var(--d2);margin-top:1px;">'+escapeHTML(s.d)+'</div></div></div>'
  })

  const amount=Number(o.amt)||0
  let html='<div style="padding:62px 22px 24px;">'
  html+='<div style="width:100%;height:165px;border-radius:22px;margin-bottom:22px;background:linear-gradient(145deg,#1A1A1C,#0E0E10);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05);position:relative;overflow:hidden;">'+logo(o.brand,72)+'</div>'
  html+='<div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--g);margin-bottom:4px;font-weight:600;">'+escapeHTML(o.brand)+'</div>'
  html+='<h2 style="font-family:Cormorant Garamond,serif;font-size:2rem;font-weight:300;color:var(--cr);margin-bottom:4px;">'+escapeHTML(o.name)+'</h2>'
  html+='<div style="font-family:Cormorant Garamond,serif;font-size:2.1rem;font-weight:400;margin-bottom:16px;background:linear-gradient(135deg,var(--gh),var(--g));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">'+amount.toFixed(2).replace('.00','')+' €</div>'
  html+='<span class="ba ba-'+escapeHTML(o.sc||'b')+'">'+escapeHTML(o.st)+'</span>'
  html+='<div style="margin:20px 0 22px;background:var(--s2);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px 12px;">'+stepsHtml+'</div>'

  if(o.invoiceUrl){
    html+='<div class="cd tp" data-url="'+escapeHTML(o.invoiceUrl)+'" onclick="openDocumentUrl(this.dataset.url)" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">📄 Facture</span><span style="font-size:11px;color:var(--g);">Ouvrir →</span></div>'
  }else{
    html+='<div class="cd" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;opacity:.65;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--d2)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">Facture non jointe</span></div>'
  }
  if(o.tracking){
    html+='<div class="cd tp" data-id="'+escapeHTML(o.id)+'" data-tracking="'+escapeHTML(o.tracking)+'" onclick="trackDelivery(this.dataset.id,this.dataset.tracking)" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">📦 Suivre · '+escapeHTML(o.tracking)+'</span><span style="font-size:11px;color:var(--g);">Actualiser →</span></div>'
  }
  if(o.warr){
    html+='<div class="cd tp" onclick="go(\'p-vault\')" style="display:flex;align-items:center;gap:12px;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">🛡 Garantie · '+escapeHTML(o.warr)+' mois</span><span style="font-size:11px;color:var(--g);">Voir dans le coffre →</span></div>'
  }
  html+='</div>'
  document.getElementById('od-c').innerHTML=html
  go('p-od')
}

// ── Variables globales du vault — vides par défaut, remplies depuis Supabase
let SUBS = []   // Abonnements
let WARR = []   // Garanties  
let CONTR = []  // Contrats & baux
let DOCS  = []  // Documents récents

// ── Charger les données vault depuis Supabase après auth
async function loadVaultData(){
  if(!currentUser || !supa) return

  // Réinitialiser les collections afin qu'aucune donnée locale ou d'un ancien compte ne persiste.
  SUBS = []
  WARR = []
  CONTR = []
  DOCS = []
  FOLDERS = []

  try{
    const [subsResult, warrResult, docsResult, foldersResult] = await Promise.all([
      supa.from('subscriptions').select('*').eq('user_id', currentUser.id).eq('status', 'active').order('created_at', { ascending: false }),
      supa.from('vault_documents').select('*').eq('user_id', currentUser.id).not('warranty_ends_at', 'is', null).gt('warranty_ends_at', new Date().toISOString().split('T')[0]).order('warranty_ends_at', { ascending: true }).limit(20),
      supa.from('vault_documents').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(10),
      supa.from('vault_folders').select('*').eq('user_id', currentUser.id).order('position', { ascending: true, nullsFirst: false })
    ])

    if(subsResult.error) console.warn('Subscriptions loading:', subsResult.error)
    const allSubs = (subsResult.data || []).map(s => ({
      id:s.id, type:s.type || 'subscription', name:s.name || 'Abonnement', sub:s.description || s.name || '',
      amt:Number(s.amount)||0,
      freq:s.frequency === 'monthly' ? 'mois' : s.frequency === 'yearly' ? 'an' : 'trim.',
      next:s.next_billing_at ? new Date(s.next_billing_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—',
      st:s.status, res:s.cancellable !== false,
      renew:s.renewal_date ? new Date(s.renewal_date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : null
    }))
    CONTR = allSubs.filter(s => s.type === 'contracts' || s.type === 'contract' || s.type === 'lease')
    SUBS = allSubs.filter(s => !CONTR.includes(s))

    if(warrResult.error) console.warn('Warranties loading:', warrResult.error)
    WARR = (warrResult.data || []).map(d => {
      const exp = new Date(d.warranty_ends_at)
      const days = Math.max(0, Math.ceil((exp - new Date()) / 86400000))
      return { id:d.id, brand:d.brand || '—', name:d.name || 'Garantie', exp:exp.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}), days, st:days <= 30 ? 'r' : 'g' }
    })

    if(docsResult.error) console.warn('Documents loading:', docsResult.error)
    DOCS = (docsResult.data || []).map(d => ({
      id:d.id, brand:d.brand || '—', name:d.name || 'Document', sub:d.type || 'document',
      date:d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—',
      url:d.file_url || d.public_url || null
    }))

    if(foldersResult.error){
      console.warn('Folders loading:', foldersResult.error)
      FOLDERS = loadFolders()
    }else{
      FOLDERS = (foldersResult.data || []).map(f => ({
        id:f.id, name:f.name || 'Dossier', icon:f.icon || '📁',
        color:{ val:f.color_val || FOLDER_COLORS[0].val, border:f.color_border || FOLDER_COLORS[0].border, icon:f.color_icon || FOLDER_COLORS[0].icon },
        docs:Array.isArray(f.docs) ? f.docs : [],
        createdAt:f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—'
      }))
      saveFolders(FOLDERS)
    }
  }catch(e){
    console.warn('loadVaultData error:', e)
    FOLDERS = loadFolders()
  }
}

function renderVault(filter){
  const el=document.getElementById('vc');if(!el)return
  let html=''

  // Dossiers toujours en premier
  html += renderFolderSection(filter)
  if(filter==='folders'){el.innerHTML=html;return}

  // ── Empty state global si rien du tout
  if(filter==='all' && SUBS.length===0 && WARR.length===0 && CONTR.length===0 && DOCS.length===0 && loadFolders().length===0){
    el.innerHTML=`<div class="empty-state" style="padding-top:32px;">
      <div class="es-icon">🔐</div>
      <h3>Coffre vide</h3>
      <p>Connectez votre email pour détecter automatiquement vos commandes et abonnements, ou ajoutez-les manuellement.</p>
      <button class="bgh" onclick="go('p-email-sources')" style="font-size:13px;margin-bottom:10px;">Connecter un email</button>
      <br/>
      <button class="bgh" onclick="go('p-add-sub')" style="font-size:13px;background:none;border:1px solid rgba(255,255,255,.1);color:var(--d1);">Ajouter manuellement</button>
    </div>`
    return
  }

  const allSubs=[...SUBS,...CONTR]

  // Banner total (subs/contracts/all)
  if(filter==='all'||filter==='subs'||filter==='contracts'){
    const selectedItems=allSubs.filter(s=>filter==='all'||s.type===filter)
    const tot=selectedItems.reduce((a,s)=>a+monthlyEquivalent(s),0)
    const annual=selectedItems.reduce((a,s)=>a+annualEquivalent(s),0)
    if(tot>0) html+=`
    <div class="glcd" style="margin-bottom:20px;">
      <p class="sl" style="margin-bottom:8px;">${filter==='all'?'Total mensuel':'Total'}</p>
      <div style="font-family:'DM Sans',sans-serif;font-size:2.8rem;font-weight:200;letter-spacing:-.06em;font-feature-settings:'tnum' 1;background:linear-gradient(135deg,var(--gh),var(--g));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:.9;margin-bottom:12px;">${tot.toFixed(0)}<span style="font-size:.36em;vertical-align:.3em;letter-spacing:0;">€</span><span style="font-size:.3em;-webkit-text-fill-color:rgba(237,224,200,.3);letter-spacing:0;">/mois</span></div>
      <p style="font-size:12px;color:var(--d1);line-height:1.55;">Coût annuel estimé : <span style="color:var(--g);font-weight:600;">${annual.toFixed(0)} €</span></p>
    </div>`
  }

  // ── DOCUMENTS RÉCENTS — toujours visibles, pas en accordéon
  if(filter==='all'||filter==='docs'){
    if(filter==='all') html+=`<p class="sl" style="margin-bottom:11px;">Documents récents</p>`
    html+=DOCS.map((d,i)=>`
      <div class="cd tp" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="vic">${logo(d.brand)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${d.name}</div>
          <div style="font-size:11px;color:var(--d2);">${d.sub}</div>
        </div>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--d2)" stroke-width="1.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>`).join('')
    if(filter==='all') html+=`<div style="height:6px;"></div>`
  }

  // ── SECTIONS EN ACCORDÉON pour le mode "all"
  if(filter==='all'){
    // Garanties accordéon
    html += makeAccordion('garanties','Garanties',
      `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      WARR.map(w=>`
        <div class="cd tp" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;">
          <div class="vic">${logo(w.brand)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:2px;font-weight:700;">${w.brand}</div>
            <div style="font-size:13px;color:var(--cr);font-weight:400;">${w.name}</div>
            <div style="font-size:11px;color:var(--d2);margin-top:1px;">Expire le ${w.exp}</div>
          </div>
          <span class="ba ba-${w.st==='r'?'r':'g'}">${w.days}j</span>
        </div>`).join('')
    )

    // Abonnements accordéon
    html += makeAccordion('abonnements','Abonnements',
      `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
      SUBS.map(s=>`
        <div class="cd tp" onclick="showSub('${s.id}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;${s.st==='paused'?'opacity:.5':''}">
          <div class="vic">${logo(s.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${s.name}</div>
            <div style="font-size:11px;color:var(--d2);">${s.sub}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);letter-spacing:-.02em;">${s.amt.toFixed(2)} €</div>
            <div style="font-size:10px;color:var(--d2);">/${s.freq}</div>
          </div>
        </div>`).join('')
    )

    // Contrats accordéon
    html += makeAccordion('contrats','Contrats & Baux',
      `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
      CONTR.map(s=>`
        <div class="cd tp" onclick="showSub('${s.id}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;">
          <div class="sic">${s.name==='Bail appartement'?'🔑':'📱'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${s.name}</div>
            <div style="font-size:11px;color:var(--d2);">${s.sub}</div>
            ${s.renew?`<div style="font-size:10px;color:var(--d2);margin-top:1px;">Renouvelle le ${s.renew}</div>`:''}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);">${s.amt.toFixed(0)} €</div>
            <div style="font-size:10px;color:var(--d2);">/${s.freq}</div>
          </div>
        </div>`).join('')
    )
  }

  // Mode filtré (pas all) — affichage direct sans accordéon
  if(filter==='warr'){
    html+=WARR.map((w,i)=>`
      <div class="cd tp" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="vic">${logo(w.brand)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:2px;font-weight:700;">${w.brand}</div>
          <div style="font-size:13px;color:var(--cr);font-weight:400;">${w.name}</div>
          <div style="font-size:11px;color:var(--d2);margin-top:1px;">Expire le ${w.exp}</div>
        </div>
        <span class="ba ba-${w.st==='r'?'r':'g'}">${w.days}j</span>
      </div>`).join('')
  }
  if(filter==='subs'){
    html+=SUBS.map((s,i)=>`
      <div class="cd tp" onclick="showSub('${s.id}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;${s.st==='paused'?'opacity:.5':''}animation:sk .4s var(--e2) ${(i%4)*.07}s both;">
        <div class="vic">${logo(s.name)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${s.name}</div>
          <div style="font-size:11px;color:var(--d2);">${s.sub}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);letter-spacing:-.02em;">${s.amt.toFixed(2)} €</div>
          <div style="font-size:10px;color:var(--d2);">/${s.freq}</div>
        </div>
      </div>`).join('')
  }
  if(filter==='contracts'){
    html+=CONTR.map((s,i)=>`
      <div class="cd tp" onclick="showSub('${s.id}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="sic">${s.name==='Bail appartement'?'🔑':'📱'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${s.name}</div>
          <div style="font-size:11px;color:var(--d2);">${s.sub}</div>
          ${s.renew?`<div style="font-size:10px;color:var(--d2);margin-top:1px;">Renouvelle le ${s.renew}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);">${s.amt.toFixed(0)} €</div>
          <div style="font-size:10px;color:var(--d2);">/${s.freq}</div>
        </div>
      </div>`).join('')
  }

  el.innerHTML=html

  // Restaurer état des accordéons
  document.querySelectorAll('.accordion-body').forEach(body=>{
    const id = body.dataset.id
    const isOpen = localStorage.getItem('vault-acc-'+id) !== 'closed'
    if(!isOpen){ body.style.display='none'; const btn=document.querySelector('[data-acc="'+id+'"]'); if(btn)btn.style.transform='rotate(0deg)' }
  })
}

/* Accordion helper */
function makeAccordion(id, label, icon, content){
  const count = id==='garanties'?WARR.length:id==='abonnements'?SUBS.length:CONTR.length
  return `
  <div style="margin-bottom:10px;">
    <button onclick="toggleAccordion('${id}')" style="
      width:100%;display:flex;align-items:center;justify-content:space-between;
      background:linear-gradient(160deg,#161618,#0F0F11);
      border:none;
      box-shadow:0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.07),0 4px 14px rgba(0,0,0,.4);
      border-radius:18px;padding:16px 18px;cursor:pointer;
      transition:all .25s var(--e1);
    " data-acc="${id}">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;border-radius:10px;background:var(--gg);box-shadow:0 0 0 1px var(--bg);display:flex;align-items:center;justify-content:center;color:var(--g);">${icon}</div>
        <div style="text-align:left;">
          <div style="font-size:13px;color:var(--cr);font-weight:500;">${label}</div>
          <div style="font-size:11px;color:var(--d2);margin-top:1px;">${count} élément${count!==1?'s':''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <svg aria-hidden="true" data-acc="${id}" style="width:16px;height:16px;color:var(--d2);transition:transform .3s var(--e1);transform:rotate(180deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </button>
    <div class="accordion-body" data-id="${id}" style="overflow:visible;transition:all .35s var(--e1);padding-top:4px;">
      ${content}
    </div>
  </div>`
}

function toggleAccordion(id){
  const body = document.querySelector('.accordion-body[data-id="'+id+'"]')
  const chevrons = document.querySelectorAll('[data-acc="'+id+'"]')
  if(!body) return
  const isOpen = body.style.display !== 'none'
  if(isOpen){
    body.style.display='none'
    chevrons.forEach(c=>{if(c.tagName==='svg')c.style.transform='rotate(0deg)'})
    localStorage.setItem('vault-acc-'+id,'closed')
  } else {
    body.style.display='block'
    chevrons.forEach(c=>{if(c.tagName==='svg')c.style.transform='rotate(180deg)'})
    localStorage.removeItem('vault-acc-'+id)
  }
}


function fV(f,b){document.querySelectorAll('#p-vault .tab').forEach(t=>t.classList.remove('on'));b?.classList.add('on');renderVault(f)}

function showSub(id){
  const all=[...SUBS,...CONTR];const s=all.find(x=>String(x.id)===String(id));if(!s)return
  document.getElementById('sd-c').innerHTML=`
    <div style="padding:62px 22px 32px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
        <div style="width:62px;height:62px;border-radius:18px;background:var(--s2);border:1px solid var(--ln2);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.35);">${logo(s.name,40)}</div>
        <div>
          <h2 class="sr" style="font-size:1.9rem;font-weight:300;color:var(--cr);line-height:1.08;">${s.name}</h2>
          <p style="font-size:12px;color:var(--d2);margin-top:5px;">${s.sub}</p>
        </div>
      </div>
      <div class="glcd" style="margin-bottom:18px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div><p class="sl" style="margin-bottom:8px;">Montant</p><div class="sr" style="font-family:'DM Sans',sans-serif;font-size:1.9rem;font-weight:200;letter-spacing:-.05em;font-feature-settings:'tnum' 1;color:var(--g);">${s.amt.toFixed(2)} €<span style="font-size:.42em;color:var(--d2);letter-spacing:0;">/${s.freq}</span></div></div>
          <div><p class="sl" style="margin-bottom:8px;">Prochain prélèv.</p><div style="font-size:14px;color:var(--cr);margin-top:9px;font-weight:400;">${s.next}</div></div>
          ${s.renew?`<div><p class="sl" style="margin-bottom:8px;">Renouvellement</p><div style="font-size:13px;color:var(--cr);margin-top:9px;">${s.renew}</div></div>`:''}
          <div><p class="sl" style="margin-bottom:8px;">Coût annuel</p><div class="sr" style="font-family:'DM Sans',sans-serif;font-size:1.2rem;font-weight:200;letter-spacing:-.04em;font-feature-settings:'tnum' 1;color:var(--cr);margin-top:7px;">${annualEquivalent(s).toFixed(0)} €</div></div>
        </div>
        ${s.notice?`<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--ln2);"><p style="font-size:12px;color:var(--g);">⚠ ${s.notice}</p></div>`:''}
      </div>
      <div class="cd tp" onclick="go(\'p-vault\')" style="margin-bottom:18px;display:flex;align-items:center;gap:13px;"><div class="vic"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div><span style="font-size:13px;color:var(--d1);flex:1;">Contrat dans le Coffre-Fort</span><span style="font-size:11px;color:var(--g);">Voir →</span></div>
      <p class="sl" style="margin-bottom:13px;">Actions</p>
      ${s.res?`<button class="bg fw" style="margin-bottom:10px;" onclick="toast('Disponible dans la version complète CLERVIO')">Résilier cet abonnement</button><button class="bgh fw" style="margin-bottom:10px;" onclick="toast('Disponible dans la version complète CLERVIO')">Modifier le forfait</button>`:`<div class="cd" style="margin-bottom:10px;"><p style="font-size:13px;color:var(--d1);line-height:1.65;">Ce contrat ne peut pas être résilié en ligne. Consultez votre contrat dans le Coffre-Fort ou contactez directement le prestataire.</p></div>`}
      <button class="bgh fw" onclick="toast('🔔 Rappel ajouté — 30 jours avant le renouvellement')">Rappel avant le renouvellement</button>
    </div>`
  go('p-sd')
}

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

/* ══ SCAN ═══════════════════════════════════════════ */
/* ══ PHOTO HANDLER & ANALYSE DOCUMENT ═══════════════ */
let lastScanResult = null

function handlePhoto(input){
  if(!input.files || !input.files[0]) return
  const file = input.files[0]
  input.value = ''
  analyzeDocument(file)
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

function updateScanProgress(percent, label){
  const bar = document.getElementById('spb')
  const count = document.getElementById('spct')
  const status = document.getElementById('scan-status')
  if(bar) bar.style.width = Math.max(0,Math.min(100,percent)) + '%'
  if(count) count.textContent = Math.round(percent) + ' %'
  if(status && label) status.textContent = label
}

function normalizeScanResult(payload){
  const data = payload?.result || payload?.data || payload || {}
  return {
    brand: String(data.brand || data.merchant || data.vendor || '').trim(),
    name: String(data.product || data.name || data.item || '').trim(),
    amount: Number(data.amount ?? data.total ?? 0) || 0,
    orderDate: String(data.order_date || data.orderDate || data.date || '').slice(0,10),
    orderNumber: String(data.order_number || data.orderNumber || data.invoice_number || data.reference || '').trim(),
    status: String(data.status || 'Livré'),
    warrantyMonths: Number(data.warranty_months ?? data.warrantyMonths ?? data.warranty ?? 0) || 0,
    confidence: Math.round(Number(data.confidence ?? 0) * (Number(data.confidence ?? 0) <= 1 ? 100 : 1)) || null
  }
}

async function analyzeDocument(file){
  const allowed = file.type.startsWith('image/') || file.type === 'application/pdf'
  if(!allowed){ toast('Format non pris en charge'); return }
  if(file.size > 10 * 1024 * 1024){ toast('Fichier trop volumineux — 10 Mo maximum'); return }

  renderScan('loading', file)
  updateScanProgress(8, 'Préparation du document…')

  let isDemo = false
  try{ isDemo = sessionStorage.getItem('clervio-demo-mode') === '1' }catch(e){}
  if(isDemo){
    const demo = {
      brand:'Apple', name:'AirPods Pro', amount:289,
      orderDate:new Date().toISOString().slice(0,10),
      orderNumber:'DEMO-2026-0098712', status:'Livré', warrantyMonths:12, confidence:98
    }
    let progress = 8
    const timer = setInterval(()=>{
      progress += 12
      updateScanProgress(Math.min(progress,92), progress < 45 ? 'Lecture de la facture…' : 'Extraction des informations…')
      if(progress >= 92){
        clearInterval(timer)
        setTimeout(()=>renderScan('result', demo),250)
      }
    },140)
    return
  }

  if(!currentUser || !supa){
    setTimeout(()=>renderScan('error',{message:'Connectez-vous pour analyser une facture, ou utilisez la saisie manuelle.'}),450)
    return
  }

  try{
    const { data: { session } } = await supa.auth.getSession()
    if(!session) throw new Error('Session expirée — reconnectez-vous')
    updateScanProgress(20, 'Chiffrement du document…')
    const dataBase64 = await fileToBase64(file)
    updateScanProgress(38, 'Envoi sécurisé…')

    const response = await fetch(EDGE.scanDocument, {
      method:'POST',
      headers:{
        'Authorization':'Bearer ' + session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        filename:file.name,
        mime_type:file.type,
        data_base64:dataBase64
      })
    })
    updateScanProgress(72, 'Extraction des informations…')
    const payload = await response.json().catch(()=>({}))
    if(!response.ok) throw new Error(payload.error || 'Service d’analyse indisponible')
    const result = normalizeScanResult(payload)
    if(!result.brand && !result.name) throw new Error('Aucune information exploitable détectée')
    updateScanProgress(100, 'Analyse terminée')
    setTimeout(()=>renderScan('result', result),250)
  }catch(error){
    console.error('Document scan:', error)
    renderScan('error',{message:error.message || 'Analyse impossible pour le moment.'})
  }
}
async function confirmScannedOrder(){
  const brand = document.getElementById('scan-brand')?.value?.trim()
  const name = document.getElementById('scan-name')?.value?.trim()
  const amount = parseFloat(document.getElementById('scan-amount')?.value) || 0
  const orderDate = document.getElementById('scan-date')?.value || new Date().toISOString().slice(0,10)
  const orderNumber = document.getElementById('scan-number')?.value?.trim()
  const status = document.getElementById('scan-status-value')?.value || 'Livré'
  const warrantyMonths = parseInt(document.getElementById('scan-warranty')?.value) || null
  if(!brand){ highlight('scan-brand'); return }
  if(!name){ highlight('scan-name'); return }

  const scMap = {'Livré':'g','En transit':'o','Expédiée':'o','Confirmée':'b','En attente':'b','Retour':'r'}
  const order = {
    id:Date.now(), brand, name, amt:amount, st:status, sc:scMap[status]||'b',
    dt:formatDateFR(orderDate), orderDate,
    warr:warrantyMonths, tracking:orderNumber || null, manual:false
  }
  const saved = await saveOrderToSupabase(order)
  if(!saved) return
  ORDS = await fetchOrders()
  lastScanResult = null
  renderScan('done')
  toast('✓ Commande sauvegardée')
}

function renderScan(phase, payload){
  const c=document.getElementById('sc-c');if(!c)return
  if(phase==='choice'){
    c.innerHTML=`<div style="padding:92px 24px 40px;position:relative;">
      <div style="position:absolute;top:0;right:0;width:200px;height:200px;background:radial-gradient(circle,rgba(200,168,74,.06) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>
      <p class="sl" style="margin-bottom:14px;position:relative;z-index:1;">Ajouter un achat</p>
      <h1 class="sr" style="font-size:2.2rem;font-weight:300;color:var(--cr);margin-bottom:10px;position:relative;z-index:1;">Scanner<br/>une facture</h1>
      <p style="font-size:13px;color:var(--d1);margin-bottom:34px;line-height:1.65;position:relative;z-index:1;">L’IA analyse l’image et extrait automatiquement les informations à vérifier.</p>
      <div onclick="document.getElementById('scan-camera-input').click()" style="display:flex;align-items:center;gap:16px;background:var(--s1);border:1px solid var(--ln2);border-top:1px solid rgba(255,255,255,.06);border-radius:20px;padding:18px 20px;margin-bottom:10px;cursor:pointer;transition:all .25s var(--e);box-shadow:0 4px 16px rgba(0,0,0,.3);">
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <div><div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:2px;">Prendre une photo</div><div style="font-size:11px;color:var(--d2);">Facture, ticket, bon de livraison</div></div>
      </div>
      <div onclick="document.getElementById('scan-gallery-input').click()" style="display:flex;align-items:center;gap:16px;background:var(--s1);border:1px solid var(--ln2);border-top:1px solid rgba(255,255,255,.06);border-radius:20px;padding:18px 20px;cursor:pointer;transition:all .25s var(--e);box-shadow:0 4px 16px rgba(0,0,0,.3);">
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        <div><div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:2px;">Choisir depuis la galerie</div><div style="font-size:11px;color:var(--d2);">Photo existante ou PDF</div></div>
      </div>
      <input id="scan-camera-input" type="file" accept="image/*" capture="environment" hidden onchange="handlePhoto(this)">
      <input id="scan-gallery-input" type="file" accept="image/*,application/pdf" hidden onchange="handlePhoto(this)">
      <p style="font-size:11px;color:var(--d2);text-align:center;margin-top:28px;line-height:1.75;">Document transmis uniquement pour l’analyse<br/>Validation obligatoire avant enregistrement</p>
    </div>`
    return
  }

  if(phase==='loading'){
    const file = payload
    const isImage = file?.type?.startsWith('image/')
    const previewHtml = isImage
      ? `<div style="width:160px;height:120px;border-radius:16px;overflow:visible;margin-bottom:28px;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 8px 24px rgba(0,0,0,.5);position:relative;z-index:1;"><img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover;"></div>`
      : `<div style="width:92px;height:112px;border-radius:16px;background:rgba(255,255,255,.05);box-shadow:0 0 0 1px rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;margin-bottom:28px;font-size:34px;position:relative;z-index:1;">📄</div>`
    c.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;position:relative;">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(100,60,5,.12) 0%,transparent 70%);pointer-events:none;"></div>
      ${previewHtml}
      <p class="sl" style="margin-bottom:10px;text-align:center;position:relative;z-index:1;">Analyse IA en cours</p>
      <h2 id="scan-status" style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:300;color:var(--cr);text-align:center;margin-bottom:8px;position:relative;z-index:1;">Préparation du document…</h2>
      <p style="font-size:12px;color:var(--d2);margin-bottom:32px;position:relative;z-index:1;">Les informations devront être validées avant l’ajout</p>
      <div class="pt" style="width:100%;max-width:240px;margin-bottom:10px;position:relative;z-index:1;"><div class="pf" id="spb" style="width:0%;"></div></div>
      <p id="spct" style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:200;color:var(--g);position:relative;z-index:1;letter-spacing:.06em;">0 %</p>
    </div>`
    return
  }

  if(phase==='result'){
    const result = normalizeScanResult(payload)
    lastScanResult = result
    const confidence = result.confidence ? ` · Confiance ${result.confidence} %` : ''
    const statuses = ['En attente','Confirmée','Expédiée','En transit','Livré','Retour']
    c.innerHTML=`<div style="padding:80px 22px 24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="rgba(50,215,75,.08)"/><polyline points="8,12 11,15 16,9"/></svg>
        <span class="ba ba-g">Analyse terminée${confidence}</span>
      </div>
      <h2 class="sr" style="font-size:1.8rem;font-weight:300;color:var(--cr);margin-bottom:24px;">Vérifiez les informations</h2>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">Marque</label><input id="scan-brand" class="inp" value="${escapeHTML(result.brand)}"></div>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">Produit</label><input id="scan-name" class="inp" value="${escapeHTML(result.name)}"></div>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">Montant (€)</label><input id="scan-amount" class="inp" type="number" min="0" step="0.01" value="${result.amount || ''}"></div>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">Date</label><input id="scan-date" class="inp" type="date" value="${escapeHTML(result.orderDate)}"></div>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">N° commande</label><input id="scan-number" class="inp" value="${escapeHTML(result.orderNumber)}"></div>
      <div style="margin-bottom:15px;"><label class="sl" style="display:block;margin-bottom:7px;">Statut</label><select id="scan-status-value" class="inp">${statuses.map(status=>`<option ${status===result.status?'selected':''}>${status}</option>`).join('')}</select></div>
      <div style="margin-bottom:22px;"><label class="sl" style="display:block;margin-bottom:7px;">Garantie</label><select id="scan-warranty" class="inp"><option value="0">Non détectée</option>${[6,12,24,36,60].map(months=>`<option value="${months}" ${months===result.warrantyMonths?'selected':''}>${months} mois</option>`).join('')}</select></div>
      <button class="bg fw lg" onclick="confirmScannedOrder()">Confirmer et ajouter</button>
      <button class="bt" onclick="renderScan('choice')" style="margin-top:10px;">Annuler</button>
    </div>`
    return
  }

  if(phase==='error'){
    const message = payload?.message || 'Analyse impossible pour le moment.'
    c.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;">
      <div style="width:64px;height:64px;border-radius:20px;background:rgba(255,59,48,.08);box-shadow:0 0 0 1px rgba(255,59,48,.18);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:24px;">!</div>
      <h2 class="sr" style="font-size:1.9rem;color:var(--cr);font-weight:300;margin-bottom:10px;">Analyse interrompue</h2>
      <p style="font-size:13px;color:var(--d2);margin-bottom:30px;line-height:1.65;">${escapeHTML(message)}</p>
      <button class="bg fw" onclick="renderScan('choice')" style="margin-bottom:10px;">Réessayer</button>
      <button class="bgh fw" onclick="go('p-add-order')">Saisie manuelle</button>
    </div>`
    return
  }

  c.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;"><div class="ob ob-m" style="margin-bottom:28px;"></div><h2 class="sr" style="font-size:1.9rem;color:var(--cr);font-weight:300;margin-bottom:10px;">Commande ajoutée</h2><p style="font-size:13px;color:var(--d2);margin-bottom:36px;line-height:1.65;">Visible dans vos achats<br/>et votre Coffre-Fort</p><button class="bg" onclick="go('p-orders')">Retour aux commandes</button></div>`
}

/* ══ FOLDERS SYSTEM ════════════════════════════════════ */

/* Icônes disponibles pour les dossiers */
const FOLDER_ICONS = [
  {em:'📁',label:'Dossier'},
  {em:'🏠',label:'Maison'},
  {em:'🚗',label:'Voiture'},
  {em:'💼',label:'Pro'},
  {em:'❤️',label:'Santé'},
  {em:'📱',label:'Tech'},
  {em:'✈️',label:'Voyage'},
  {em:'🎓',label:'Études'},
  {em:'💰',label:'Finance'},
  {em:'🏋️',label:'Sport'},
  {em:'🐾',label:'Animaux'},
  {em:'🌿',label:'Divers'},
]

/* Couleurs accent disponibles */
const FOLDER_COLORS = [
  {name:'Or',     val:'rgba(201,168,76,.15)',  border:'rgba(201,168,76,.3)',  icon:'rgba(201,168,76,.9)'},
  {name:'Blanc',  val:'rgba(255,255,255,.08)', border:'rgba(255,255,255,.18)',icon:'rgba(255,255,255,.7)'},
  {name:'Vert',   val:'rgba(52,208,88,.1)',    border:'rgba(52,208,88,.25)',  icon:'rgba(52,208,88,.9)'},
  {name:'Rouge',  val:'rgba(255,59,48,.1)',    border:'rgba(255,59,48,.25)',  icon:'rgba(255,59,48,.9)'},
  {name:'Bleu',   val:'rgba(10,132,255,.1)',   border:'rgba(10,132,255,.25)', icon:'rgba(10,132,255,.9)'},
  {name:'Violet', val:'rgba(191,90,242,.1)',   border:'rgba(191,90,242,.25)',icon:'rgba(191,90,242,.9)'},
]

let selectedIcon = '📁'
let selectedColor = FOLDER_COLORS[0]
let currentFolderId = null
let FOLDERS = []

function folderStorageKey(){
  return currentUser?.id ? 'clervio-folders:' + currentUser.id : 'clervio-folders'
}

/* Cache local séparé pour chaque compte. */
function loadFolders(){
  if(FOLDERS.length) return FOLDERS
  try{
    const cached = JSON.parse(localStorage.getItem(folderStorageKey()) || '[]')
    FOLDERS = Array.isArray(cached) ? cached : []
  }catch(e){ FOLDERS = [] }
  return FOLDERS
}

function saveFolders(folders){
  FOLDERS = Array.isArray(folders) ? folders : []
  try{ localStorage.setItem(folderStorageKey(), JSON.stringify(FOLDERS)) }catch(e){}
}

function createFolderObj(name,icon,color){
  return {
    id: 'f_'+Date.now(),
    name: name||'Sans nom',
    icon, color,
    docs:[],
    createdAt: new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  }
}

/* ── MODAL NOUVEAU DOSSIER ── */
function showNewFolder(){
  selectedIcon = '📁'
  selectedColor = FOLDER_COLORS[0]
  document.getElementById('folder-name-inp').value = ''
  document.getElementById('folder-preview-name').textContent = 'Nouveau dossier'
  document.getElementById('folder-preview-icon').textContent = '📁'
  document.getElementById('folder-preview-icon').style.background = FOLDER_COLORS[0].val
  document.getElementById('folder-preview-icon').style.boxShadow = '0 0 0 1px '+FOLDER_COLORS[0].border

  /* Remplir icon picker */
  const picker = document.getElementById('icon-picker')
  picker.innerHTML = FOLDER_ICONS.map(ic=>`
    <button onclick="selectIcon('${ic.em}',this)" style="
      width:46px;height:46px;border-radius:12px;
      background:rgba(255,255,255,.05);
      box-shadow:0 0 0 1px rgba(255,255,255,.08);
      border:none;cursor:pointer;font-size:22px;
      display:flex;align-items:center;justify-content:center;
      transition:all .2s;
    " title="${ic.label}">${ic.em}</button>
  `).join('')

  /* Remplir color picker */
  const cpicker = document.getElementById('color-picker')
  cpicker.innerHTML = FOLDER_COLORS.map((col,i)=>`
    <button onclick="selectColor(${i},this)" style="
      width:32px;height:32px;border-radius:50%;
      background:${col.val};
      box-shadow:0 0 0 ${i===0?'2px':'1px'} ${i===0?col.border:'rgba(255,255,255,.1)'};
      border:none;cursor:pointer;
      transition:all .2s;
    "></button>
  `).join('')

  const modal = document.getElementById('modal-folder')
  modal.style.display = 'flex'
}

function hideNewFolder(){
  document.getElementById('modal-folder').style.display = 'none'
}

function selectIcon(em, btn){
  selectedIcon = em
  document.getElementById('folder-preview-icon').textContent = em
  document.querySelectorAll('#icon-picker button').forEach(b=>{
    b.style.background='rgba(255,255,255,.05)'
    b.style.boxShadow='0 0 0 1px rgba(255,255,255,.08)'
    b.style.transform='none'
  })
  btn.style.background='rgba(201,168,76,.15)'
  btn.style.boxShadow='0 0 0 2px rgba(201,168,76,.4)'
  btn.style.transform='scale(1.1)'
}

function selectColor(idx, btn){
  selectedColor = FOLDER_COLORS[idx]
  document.getElementById('folder-preview-icon').style.background = selectedColor.val
  document.getElementById('folder-preview-icon').style.boxShadow = '0 0 0 1.5px '+selectedColor.border
  document.querySelectorAll('#color-picker button').forEach((b,i)=>{
    b.style.boxShadow = '0 0 0 1px rgba(255,255,255,.1)'
    b.style.transform = 'none'
  })
  btn.style.boxShadow = '0 0 0 2px '+selectedColor.border
  btn.style.transform = 'scale(1.12)'
}

function updateFolderPreview(val){
  document.getElementById('folder-preview-name').textContent = val||'Nouveau dossier'
}
async function createFolder(){
  const name = document.getElementById('folder-name-inp').value.trim()
  if(!name){
    document.getElementById('folder-name-inp').style.boxShadow='0 0 0 2px rgba(255,59,48,.5)'
    setTimeout(()=>{document.getElementById('folder-name-inp').style.boxShadow=''},1500)
    return
  }
  const folder = createFolderObj(name, selectedIcon, selectedColor)
  const created = await saveFolderToSupabase(folder)
  if(!created) return
  hideNewFolder()
  renderVault('folders')
  document.querySelectorAll('#p-vault .tab').forEach(t=>t.classList.remove('on'))
  const foldersTab = document.querySelector('#p-vault .tabs .tab:nth-child(2)')
  if(foldersTab) foldersTab.classList.add('on')
}

/* ── AFFICHER DOSSIER ── */
function openFolder(folderId){
  const folders = loadFolders()
  const folder = folders.find(f=>String(f.id)===String(folderId))
  if(!folder) return
  currentFolderId = folderId

  const content = document.getElementById('folder-content')
  const docs = folder.docs||[]

  content.innerHTML = `
    <div style="padding:64px 24px 24px;">

      <!-- Header dossier -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px;">
        <div style="width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;background:${folder.color.val};box-shadow:0 0 0 1.5px ${folder.color.border},0 4px 16px rgba(0,0,0,.35);">
          ${folder.icon}
        </div>
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:300;color:var(--cr);">${folder.name}</h1>
          <p style="font-size:12px;color:var(--d2);margin-top:3px;">${docs.length} document${docs.length!==1?'s':''} · Créé le ${folder.createdAt}</p>
        </div>
      </div>

      ${docs.length===0 ? `
        <!-- Empty state -->
        <div style="text-align:center;padding:60px 20px;">
          <div style="width:72px;height:72px;border-radius:20px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;">${folder.icon}</div>
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:300;color:var(--cr);margin-bottom:8px;">Dossier vide</h3>
          <p style="font-size:13px;color:var(--d2);margin-bottom:28px;line-height:1.6;">Ajoutez des documents depuis le scanner ou depuis vos autres documents.</p>
          <button class="bgh" onclick="addDocToFolder()" style="font-size:13px;">+ Ajouter un document</button>
        </div>
      ` : docs.map((doc,i) => `
        <div class="cd" style="margin-bottom:9px;display:flex;align-items:center;gap:16px;padding:16px 18px;animation:sk .4s var(--e2) ${i*.06}s both;">
          <div class="vic" style="background:${folder.color.val};box-shadow:0 0 0 1px ${folder.color.border};">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${folder.color.icon}" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${doc.name}</div>
            <div style="font-size:11px;color:var(--d2);">${doc.date}</div>
          </div>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--d2)" stroke-width="1.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      `).join('')}
    </div>
  `
  go('p-folder')
}

/* ── MENU DOSSIER ── */
function showFolderMenu(){
  document.getElementById('folder-menu').style.display='flex'
}
function hideFolderMenu(){
  document.getElementById('folder-menu').style.display='none'
}
async function renameCurrentFolder(){
  hideFolderMenu()
  const folders = loadFolders()
  const folder = folders.find(f=>String(f.id)===String(currentFolderId))
  if(!folder) return
  const name = prompt('Renommer le dossier', folder.name)
  if(!name || !name.trim()) return
  const cleanName = name.trim()

  if(currentUser && supa){
    const { error } = await supa.from('vault_folders').update({ name: cleanName }).eq('id', folder.id).eq('user_id', currentUser.id)
    if(error){ toast('❌ Renommage impossible'); return }
  }
  folder.name = cleanName
  saveFolders(folders)
  openFolder(currentFolderId)
  toast('✓ Dossier renommé')
}

function addDocToFolder(){
  hideFolderMenu()
  toast('Suivi en temps réel — Bientôt disponible')
}
async function deleteCurrentFolder(){
  hideFolderMenu()
  const folders = loadFolders()
  const folder = folders.find(f=>String(f.id)===String(currentFolderId))
  if(!folder) return
  if(!confirm(`Supprimer le dossier "${folder.name}" ?`)) return

  if(currentUser && supa){
    const { error } = await supa.from('vault_folders').delete().eq('id', folder.id).eq('user_id', currentUser.id)
    if(error){ toast('❌ Suppression impossible'); return }
  }
  saveFolders(folders.filter(f=>String(f.id)!==String(currentFolderId)))
  toast('Dossier supprimé')
  go('p-vault')
  renderVault('folders')
}

/* ── RENDER VAULT avec dossiers ── */
function renderFolderSection(filter){
  const folders = loadFolders()
  if(filter==='folders' || (filter==='all' && folders.length>0)){
    let html = ''
    if(filter==='all') html += `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <p class="sl">Mes dossiers</p>
        <button onclick="showNewFolder()" style="background:none;border:none;color:var(--g);font-size:12px;cursor:pointer;font-weight:500;">+ Nouveau</button>
      </div>`

    if(folders.length===0){
      html += `
        <div style="text-align:center;padding:32px 20px;background:linear-gradient(160deg,#1C1810,#0F0F11);border-radius:20px;box-shadow:0 0 0 1px rgba(255,255,255,.07);margin-bottom:16px;">
          <div style="font-size:32px;margin-bottom:12px;">📁</div>
          <p style="font-size:14px;color:var(--cr);font-weight:300;margin-bottom:6px;">Aucun dossier</p>
          <p style="font-size:12px;color:var(--d2);margin-bottom:18px;line-height:1.6;">Créez des dossiers pour organiser<br/>vos documents comme vous le souhaitez.</p>
          <button class="bgh" onclick="showNewFolder()" style="font-size:13px;padding:12px 20px;">+ Créer mon premier dossier</button>
        </div>`
    } else {
      // Grid 2 colonnes pour les dossiers
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${filter==='all'?'16px':'0'};">`
      html += folders.map((folder,i)=>`
        <div onclick="openFolder('${folder.id}')" style="
          background:linear-gradient(160deg,#161618,#0F0F11);
          border-radius:18px;padding:16px 14px;cursor:pointer;
          box-shadow:0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.07),0 4px 14px rgba(0,0,0,.4);
          transition:all .25s var(--e1);
          animation:sk .4s var(--e2) ${i*.08}s both;
          position:relative;overflow:visible;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 0 0 1px '+${JSON.stringify(folder.color.border)}+',0 8px 24px rgba(0,0,0,.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.07),0 4px 14px rgba(0,0,0,.4)'">
          <!-- Accent top -->
          <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${folder.color.border},transparent);border-radius:18px 18px 0 0;"></div>
          <!-- Icône -->
          <div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:${folder.color.val};box-shadow:0 0 0 1px ${folder.color.border};margin-bottom:12px;">${folder.icon}</div>
          <!-- Nom -->
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${folder.name}</div>
          <div style="font-size:11px;color:var(--d2);">${(folder.docs||[]).length} doc${(folder.docs||[]).length!==1?'s':''}</div>
        </div>
      `).join('')
      html += '</div>'
    }
    return html
  }
  return ''
}

/* ══ VAULT TAB NAVIGATION ══════════════════════════════ */
function goVaultTab(tab){
  go('p-vault')
  setTimeout(()=>{
    // Activer le bon tab
    document.querySelectorAll('#p-vault .tab').forEach(t=>t.classList.remove('on'))
    const tabs = document.querySelectorAll('#p-vault .tabs .tab')
    const tabMap = {'all':0,'folders':1,'docs':2,'warr':3,'subs':4,'contracts':5}
    const idx = tabMap[tab]||0
    if(tabs[idx]) tabs[idx].classList.add('on')
    renderVault(tab)
  },100)
}


/* ══ AJOUT MANUEL — COMMANDES ══════════════════════════ */
let selectedSubType = 'subs'

function selectSubType(type, btn){
  selectedSubType = type
  document.querySelectorAll('#sub-type-picker button').forEach(b=>{
    b.style.background = 'rgba(255,255,255,.05)'
    b.style.color = 'var(--d1)'
    b.style.boxShadow = '0 0 0 1px rgba(255,255,255,.09)'
  })
  btn.style.background = 'linear-gradient(160deg,var(--g),var(--gd))'
  btn.style.color = '#07060C'
  btn.style.boxShadow = '0 2px 0 rgba(0,0,0,.3),0 4px 14px rgba(201,168,76,.4)'
}

function formatDateFR(dateStr){
  if(!dateStr) return new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})
}
async function submitOrder(){
  const brand    = document.getElementById('ao-brand')?.value?.trim()
  const name     = document.getElementById('ao-name')?.value?.trim()
  const amt      = parseFloat(document.getElementById('ao-amt')?.value)||0
  const status   = document.getElementById('ao-status')?.value||'En attente'
  const tracking = document.getElementById('ao-tracking')?.value?.trim()
  const dateVal  = document.getElementById('ao-date')?.value || new Date().toISOString().slice(0,10)
  const warrVal  = document.getElementById('ao-warr')?.value

  if(!brand || !name){
    if(!brand) highlight('ao-brand')
    if(!name) highlight('ao-name')
    return
  }

  const scMap = {'Livré':'g','En transit':'o','Expédiée':'o','Confirmée':'b','En attente':'b','Retour':'r'}
  const order = {
    id:Date.now(), brand, name, amt, st:status, sc:scMap[status]||'b',
    dt:formatDateFR(dateVal), orderDate:dateVal,
    warr:(warrVal && !isNaN(parseInt(warrVal))) ? parseInt(warrVal) : null,
    tracking:tracking||null, manual:true
  }

  const saved = await saveOrderToSupabase(order)
  if(!saved) return
  ORDS = await fetchOrders()
  toast('✓ Commande "'+name+'" ajoutée')
  clearOrderForm()
  go('p-orders')
}

function clearOrderForm(){
  ['ao-brand','ao-name','ao-amt','ao-tracking'].forEach(id=>{
    const el = document.getElementById(id)
    if(el) el.value = ''
  })
  const sel = document.getElementById('ao-status')
  if(sel) sel.value = 'Livré'
  const warr = document.getElementById('ao-warr')
  if(warr) warr.value = ''
  const date = document.getElementById('ao-date')
  if(date) date.value = ''
}

/* ══ AJOUT MANUEL — ABONNEMENTS ════════════════════════ */
async function submitSub(){
  const name  = document.getElementById('as-name')?.value?.trim()
  const sub   = document.getElementById('as-sub')?.value?.trim()||''
  const amt   = parseFloat(document.getElementById('as-amt')?.value)||0
  const freq  = document.getElementById('as-freq')?.value||'mois'
  const next  = document.getElementById('as-next')?.value
  const renew = document.getElementById('as-renew')?.value

  if(!name){ highlight('as-name'); return }
  if(!amt){ highlight('as-amt'); return }

  const newSub = {
    id:'s_'+Date.now(), type:selectedSubType, name, sub:sub||name, amt, freq,
    next:next ? formatDateFR(next) : '—', st:'active',
    res:selectedSubType === 'subs', renew:renew ? formatDateFR(renew) : null, manual:true
  }

  const saved = await saveSubToSupabase(newSub)
  if(!saved) return
  if(currentUser && supa){
    await loadVaultData()
  }else{
    SUBS.unshift(newSub)
  }
  toast('✓ "'+name+'" ajouté au Coffre-Fort')
  clearSubForm()
  goVaultTab(selectedSubType === 'subs' ? 'subs' : 'contracts')
}

function clearSubForm(){
  ['as-name','as-sub','as-amt'].forEach(id=>{
    const el = document.getElementById(id)
    if(el) el.value = ''
  })
  const freq = document.getElementById('as-freq')
  if(freq) freq.value = 'mois'
  const next = document.getElementById('as-next')
  if(next) next.value = ''
  const renew = document.getElementById('as-renew')
  if(renew) renew.value = ''
  selectedSubType = 'subs'
  document.querySelectorAll('#sub-type-picker button').forEach((b,i)=>{
    if(i===0){
      b.style.background = 'linear-gradient(160deg,var(--g),var(--gd))'
      b.style.color = '#07060C'
      b.style.boxShadow = '0 2px 0 rgba(0,0,0,.3),0 4px 14px rgba(201,168,76,.4)'
    } else {
      b.style.background = 'rgba(255,255,255,.05)'
      b.style.color = 'var(--d1)'
      b.style.boxShadow = '0 0 0 1px rgba(255,255,255,.09)'
    }
  })
}

/* Champ en erreur — flash rouge */
function highlight(id){
  const el = document.getElementById(id)
  if(!el) return
  el.style.boxShadow = '0 0 0 2px rgba(255,59,48,.6),inset 0 0 0 1px rgba(255,59,48,.3)'
  el.focus()
  setTimeout(()=>{ el.style.boxShadow = '' }, 1800)
}

/* Charger les abonnements sauvegardés */
function loadSavedSubs(){
  // Ne charger localStorage que si pas d'utilisateur connecté
  if(currentUser) return // Données viennent de Supabase
  try{
    const saved = JSON.parse(localStorage.getItem('clervio-subs')||'[]')
    saved.forEach(s=>{ if(!SUBS.find(x=>x.id===s.id)) SUBS.unshift(s) })
  } catch(e){}
}

/* ══ SUPABASE DATA LAYER ════════════════════════════════ */

// ── Authentification email : connexion et création de compte sur le même écran
let emailAuthMode = 'login'
let socialAuthMode = 'signup'

function openSocialAuth(mode = 'signup'){
  socialAuthMode = mode === 'login' ? 'login' : 'signup'
  const isLogin = socialAuthMode === 'login'
  const kicker = document.getElementById('ob2-kicker')
  const title = document.getElementById('ob2-title')
  const subtitle = document.getElementById('ob2-subtitle')
  const appleLbl = document.getElementById('ob2-apple-lbl')
  const googleLbl = document.getElementById('ob2-google-lbl')
  const noteText = document.getElementById('ob2-note-text')
  if(kicker) kicker.textContent = isLogin ? 'Se connecter' : 'Créer votre compte'
  if(title) title.innerHTML = isLogin ? 'Bon retour.' : 'Votre espace<br/><em style="color:var(--g);display:block;padding-bottom:6px;">sécurisé</em>'
  if(subtitle) subtitle.textContent = isLogin ? 'Retrouvez votre coffre CLERVIO.' : 'Créez votre compte CLERVIO. Vous connecterez vos emails à l’étape suivante, ou plus tard.'
  if(appleLbl) appleLbl.textContent = isLogin ? 'Continuer avec Apple' : 'Se connecter avec Apple'
  if(googleLbl) googleLbl.textContent = isLogin ? 'Continuer avec Google' : 'Se connecter avec Google'
  if(noteText) noteText.innerHTML = isLogin ? '🔐 <strong style="color:var(--cr);">Vous vous reconnectez à votre compte existant.</strong><br/>Vos données et vos boîtes email connectées seront retrouvées automatiquement.' : '🔐 <strong style="color:var(--cr);">Cette étape crée uniquement votre compte CLERVIO.</strong><br/>La connexion à vos boîtes email (Gmail, Outlook) est optionnelle et se configure à l’étape suivante.'
  go('p-ob2')
}

function openEmailAuth(mode = 'login'){
  emailAuthMode = mode === 'signup' ? 'signup' : 'login'
  const isSignup = emailAuthMode === 'signup'
  const kicker = document.getElementById('email-auth-kicker')
  const title = document.getElementById('email-auth-title')
  const submit = document.getElementById('email-auth-submit')
  const forgot = document.getElementById('email-auth-forgot')
  const password = document.getElementById('pwin')
  if(kicker) kicker.textContent = isSignup ? 'Créer votre compte' : 'Connexion'
  if(title) title.textContent = isSignup ? 'Bienvenue.' : 'Bon retour.'
  if(submit) submit.textContent = isSignup ? 'Créer mon compte' : 'Se connecter'
  if(forgot) forgot.style.display = isSignup ? 'none' : 'block'
  if(password) password.autocomplete = isSignup ? 'new-password' : 'current-password'
  go('p-login')
}

async function handleEmailAuth(){
  const email = document.getElementById('email-auth-email')?.value?.trim()
  const pass = document.getElementById('pwin')?.value || ''
  if(!email){ highlight('email-auth-email'); toast('Entrez votre email'); return }
  if(!/^\S+@\S+\.\S+$/.test(email)){ highlight('email-auth-email'); toast('Adresse email invalide'); return }
  if(!pass){ highlight('pwin'); toast('Entrez votre mot de passe'); return }
  if(emailAuthMode === 'signup' && pass.length < 8){ highlight('pwin'); toast('Le mot de passe doit contenir au moins 8 caractères'); return }

  const submit = document.getElementById('email-auth-submit')
  if(submit){ submit.disabled = true; submit.textContent = 'Veuillez patienter…' }
  try{
    if(emailAuthMode === 'signup'){
      const ok = await signUpWithEmail(email, pass)
      if(ok){
        const sessionResult = supa ? await supa.auth.getSession() : { data: { session: null } }
        if(!sessionResult.data.session){
          openEmailAuth('login')
          toast('✓ Compte créé — vérifiez votre email puis connectez-vous')
        }
      }
    } else {
      await signInWithEmail(email, pass)
    }
  } finally {
    if(submit){ submit.disabled = false; submit.textContent = emailAuthMode === 'signup' ? 'Créer mon compte' : 'Se connecter' }
  }
}

// ── Charger les commandes depuis Supabase (+ fallback localStorage)
async function fetchOrders(){
  if(!currentUser || !supa) return loadOrders()

  const { data, error } = await supa
    .from('orders')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })

  if(error){
    console.warn('Orders loading:', error)
    return []
  }

  return (data || []).map(o => ({
    id:       o.id,
    brand:    o.brand || '—',
    name:     o.name || 'Commande',
    amt:      Number(o.amount) || 0,
    st:       mapStatus(o.status),
    sc:       mapStatusColor(o.status),
    dt:       o.order_date ? new Date(o.order_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—',
    orderDate:o.order_date || null,
    warr:     o.warranty_months,
    tracking: o.tracking_number,
    invoiceUrl:o.invoice_url || null
  }))
}

// ── Sauvegarder commande dans Supabase
async function saveOrderToSupabase(order){
  if(!currentUser || !supa){
    const cached = loadOrders()
    cached.unshift(order)
    saveOrders(cached)
    return true
  }

  const { error } = await supa.from('orders').insert({
    user_id:         currentUser.id,
    brand:           order.brand,
    name:            order.name,
    amount:          order.amt || 0,
    status:          reverseMapStatus(order.st),
    order_date:      order.orderDate || new Date().toISOString().split('T')[0],
    warranty_months: order.warr || null,
    tracking_number: order.tracking || null,
    source:          order.manual ? 'manual' : 'scan'
  })
  if(error){ toast('❌ ' + (error.message || 'Erreur sauvegarde')); console.error(error); return false }
  toast('✓ Commande sauvegardée dans le cloud')
  return true
}

// ── Charger abonnements depuis Supabase
async function fetchSubscriptions(){
  if(!currentUser || !supa) return SUBS
  const { data, error } = await supa
    .from('subscriptions')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if(error){ console.warn('Subscriptions loading:', error); return [] }
  return (data || []).map(s => ({
    id:    s.id,
    type:  s.type || 'subscription',
    name:  s.name || 'Abonnement',
    sub:   s.description || s.name || '',
    amt:   Number(s.amount) || 0,
    freq:  s.frequency === 'monthly' ? 'mois' : s.frequency === 'yearly' ? 'an' : 'trim.',
    next:  s.next_billing_at ? new Date(s.next_billing_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—',
    st:    s.status,
    res:   s.cancellable !== false,
    renew: s.renewal_date ? new Date(s.renewal_date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : null
  }))
}

// ── Sauvegarder abonnement dans Supabase
async function saveSubToSupabase(sub){
  if(!currentUser || !supa){
    const saved = JSON.parse(localStorage.getItem('clervio-subs')||'[]')
    saved.unshift(sub)
    localStorage.setItem('clervio-subs',JSON.stringify(saved))
    return true
  }
  const freqMap = {'mois':'monthly','an':'yearly','trim.':'quarterly'}
  const { error } = await supa.from('subscriptions').insert({
    user_id:currentUser.id, name:sub.name, description:sub.sub,
    type:sub.type || 'subscription', amount:sub.amt,
    frequency:freqMap[sub.freq] || 'monthly', status:'active', source:'manual'
  })
  if(error){ toast('❌ Erreur sauvegarde'); console.error(error); return false }
  toast('✓ Abonnement sauvegardé dans le cloud')
  return true
}

// ── Charger dossiers depuis Supabase
async function fetchFolders(){
  if(!currentUser || !supa) return loadFolders()
  const { data, error } = await supa
    .from('vault_folders')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('position', { ascending: true, nullsFirst: false })

  if(error){
    console.warn('Folders loading:', error)
    return loadFolders()
  }
  return (data || []).map(f => ({
    id:    f.id,
    name:  f.name || 'Dossier',
    icon:  f.icon || '📁',
    color: {
      val: f.color_val || FOLDER_COLORS[0].val,
      border: f.color_border || FOLDER_COLORS[0].border,
      icon: f.color_icon || FOLDER_COLORS[0].icon
    },
    docs:  Array.isArray(f.docs) ? f.docs : [],
    createdAt: f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—'
  }))
}

// ── Sauvegarder dossier dans Supabase
async function saveFolderToSupabase(folder){
  if(!currentUser || !supa){
    const folders = loadFolders()
    folders.unshift(folder)
    saveFolders(folders)
    return folder
  }

  const { data, error } = await supa.from('vault_folders').insert({
    user_id:      currentUser.id,
    name:         folder.name,
    icon:         folder.icon,
    color_val:    folder.color.val,
    color_border: folder.color.border,
    color_icon:   folder.color.icon
  }).select('*').single()

  if(error){ toast('❌ Création impossible'); console.error(error); return null }
  const created = {
    ...folder,
    id: data.id,
    createdAt: data.created_at ? new Date(data.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : folder.createdAt
  }
  FOLDERS.unshift(created)
  saveFolders(FOLDERS)
  toast('📁 Dossier "'+folder.name+'" créé')
  return created
}

// ── Stats dashboard temps réel
async function fetchDashboardStats(){
  if(!currentUser || !supa) return null
  const { data, error } = await supa.rpc('get_dashboard_stats', { p_user_id: currentUser.id })
  if(error){ console.warn('Dashboard RPC:', error); return null }
  return Array.isArray(data) ? data[0] : data
}

// ── Helpers statut
function mapStatus(s){
  const m={pending:'En attente',confirmed:'Confirmée',shipped:'Expédiée',in_transit:'En transit',delivered:'Livré',returned:'Retour',cancelled:'Annulée'}
  return m[s]||s
}
function mapStatusColor(s){
  const m={pending:'b',confirmed:'b',shipped:'o',in_transit:'o',delivered:'g',returned:'r',cancelled:'r'}
  return m[s]||'b'
}
function reverseMapStatus(s){
  const m={'En attente':'pending','Confirmée':'confirmed','Expédiée':'shipped','En transit':'in_transit','Livré':'delivered','Retour':'returned','Remboursée':'returned','Annulée':'cancelled'}
  return m[s]||'pending'
}

// ── Realtime — écouter les updates de commandes
let activeRealtimeChannel = null
function subscribeToRealtime(){
  if(!currentUser || !supa) return
  if(activeRealtimeChannel){
    supa.removeChannel(activeRealtimeChannel).catch(()=>{})
    activeRealtimeChannel = null
  }
  activeRealtimeChannel = supa
    .channel('clervio-orders-' + currentUser.id)
    .on('postgres_changes',
      { event:'*', schema:'public', table:'orders', filter:'user_id=eq.'+currentUser.id },
      async payload => {
        ORDS = await fetchOrders()
        updateDashboardStats(buildLocalDashboardStats())
        if(document.getElementById('p-orders')?.classList.contains('on')) renderOrds('all')
        if(payload.new?.status === 'delivered') toast('📦 Livré : ' + (payload.new.name || 'commande'))
      }
    )
    .subscribe()
}

/* ══ LOAD EMAIL SOURCES IN PROFILE ══════════════════════ */
async function loadEmailSourcesCount(){
  if(!currentUser || !supa) return
  try{
    const resp = await supa
      .from('email_sources')
      .select('id, email, provider, display_name, sync_status, last_sync_at')
      .eq('user_id', currentUser.id)

    const data = resp.data || []
    const count = data.length

    const el = document.getElementById('email-sources-count')
    if(el){
      el.textContent = count === 0
        ? 'Aucun email connecté'
        : count + ' email' + (count > 1 ? 's' : '') + ' connecté' + (count > 1 ? 's' : '')
    }

    const listEl = document.getElementById('email-sources-list')
    if(listEl && count === 0){
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--d2);font-size:13px;">Aucun email connecté</div>'
    }
    if(listEl && count > 0){
      const statusLabel = {ok:'Synchronisé',syncing:'En cours…',error:'Erreur',pending:'En attente'}
      const statusColor = {ok:'var(--grn)',syncing:'var(--g)',error:'var(--red)',pending:'var(--d2)'}
      let html = ''
      data.forEach(function(src){
        const icon = src.provider === 'gmail'
          ? '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.7 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 3l5.7-5.7C34.4 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-8 20-21 0-1.3-.2-2.7-.4-4z"/></svg>'
          : src.provider === 'outlook'
          ? '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="12" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>'
          : '📧'
        const color = statusColor[src.sync_status] || 'var(--d2)'
        const label = statusLabel[src.sync_status] || 'Inconnu'
        html += '<div class="cd" style="margin-bottom:9px;display:flex;align-items:center;gap:14px;padding:16px 18px;">'
        html += '<div style="width:38px;height:38px;border-radius:12px;background:rgba(201,168,76,.1);display:flex;align-items:center;justify-content:center;">' + icon + '</div>'
        html += '<div style="flex:1;min-width:0;">'
        html += '<div style="font-size:13px;color:var(--cr);">' + escapeHTML(src.email) + '</div>'
        html += '<div style="font-size:11px;color:' + color + ';">' + label + (src.last_sync_at ? ' · ' + new Date(src.last_sync_at).toLocaleDateString('fr-FR') : '') + '</div>'
        html += '</div>'
        html += '<button onclick="event.stopPropagation();disconnectMailSource(\'' + src.id + '\')" style="border:0;background:transparent;color:var(--d2);font-size:11px;padding:8px;cursor:pointer;">Déconnecter</button>'
        html += '</div>'
      })
      listEl.innerHTML = html
    }
  }catch(e){ console.warn('Email sources:', e) }
}


/* ══ MOT DE PASSE OUBLIÉ ════════════════════════════════ */

function showForgotPassword(){
  // Pré-remplir l'email si déjà saisi
  const loginEmail = document.querySelector('#p-login input[type="email"]')?.value
  if(loginEmail){
    const forgotInput = document.getElementById('forgot-email')
    if(forgotInput) forgotInput.value = loginEmail
  }
  go('p-forgot')
}

async function sendResetEmail(){
  const email = document.getElementById('forgot-email')?.value?.trim()
  if(!email){
    highlight('forgot-email')
    toast('Entrez votre adresse email')
    return
  }

  const btn = document.querySelector('#p-forgot .bg')
  if(btn){ btn.textContent = 'Envoi en cours…'; btn.disabled = true }

  try{
    if(supa){
      const { error } = await supa.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '?reset=true'
      })
      if(error){
        toast('❌ ' + (error.message || "Erreur lors de l'envoi"))
        if(btn){ btn.textContent = 'Envoyer le lien'; btn.disabled = false }
        return
      }
    }
    // Afficher la confirmation
    const confirm = document.getElementById('forgot-confirm')
    if(confirm) confirm.style.display = 'block'
    const form = document.querySelector('#p-forgot .inp')
    if(form) form.style.display = 'none'
    if(btn) btn.style.display = 'none'
    document.querySelector('#p-forgot .bt').textContent = 'Retour à la connexion'

  }catch(e){
    toast('❌ Erreur réseau')
    if(btn){ btn.textContent = 'Envoyer le lien'; btn.disabled = false }
  }
}

async function updatePassword(){
  const newPwd = document.getElementById('new-password')?.value
  const confirmPwd = document.getElementById('confirm-password')?.value

  if(!newPwd || newPwd.length < 8){
    highlight('new-password')
    toast('Le mot de passe doit faire au moins 8 caractères')
    return
  }
  if(newPwd !== confirmPwd){
    highlight('confirm-password')
    toast('Les mots de passe ne correspondent pas')
    return
  }

  const btn = document.querySelector('#p-reset-password .bg')
  if(btn){ btn.textContent = 'Mise à jour…'; btn.disabled = true }

  try{
    if(supa){
      const { error } = await supa.auth.updateUser({ password: newPwd })
      if(error){
        toast('❌ ' + error.message)
        if(btn){ btn.textContent = 'Mettre à jour'; btn.disabled = false }
        return
      }
    }
    toast('✓ Mot de passe mis à jour avec succès')
    setTimeout(()=>go('p-home'), 1500)
  }catch(e){
    toast('❌ Erreur réseau')
    if(btn){ btn.textContent = 'Mettre à jour'; btn.disabled = false }
  }
}

// Indicateur de force du mot de passe
document.addEventListener('input', function(e){
  if(e.target.id !== 'new-password') return
  const val = e.target.value
  const bar = document.getElementById('pwd-strength-bar')
  if(!bar) return
  let strength = 0
  if(val.length >= 8) strength++
  if(val.length >= 12) strength++
  if(/[A-Z]/.test(val)) strength++
  if(/[0-9]/.test(val)) strength++
  if(/[^A-Za-z0-9]/.test(val)) strength++
  const colors = ['','#FF3B30','#FF9500','#FFD60A','#34C759','#34C759']
  const widths = ['0%','20%','40%','60%','80%','100%']
  bar.style.width = widths[strength]
  bar.style.background = colors[strength]
})

// Détecter le lien de reset dans l'URL au chargement
window.addEventListener('load', function(){
  const params = new URLSearchParams(window.location.search)
  if(params.get('reset') === 'true' || window.location.hash.includes('type=recovery')){
    setTimeout(()=>go('p-reset-password'), 500)
  }
})


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

/* ══ DASHBOARD STATS — depuis Supabase ═════════════════ */
function monthlyEquivalent(item){
  const amount = Number(item?.amt) || 0
  if(item?.freq === 'an') return amount / 12
  if(item?.freq === 'trim.') return amount / 3
  return amount
}

function annualEquivalent(item){
  const amount = Number(item?.amt) || 0
  if(item?.freq === 'an') return amount
  if(item?.freq === 'trim.') return amount * 4
  return amount * 12
}

function buildLocalDashboardStats(){
  return {
    active_orders: ORDS.filter(o => !/livré|retour|rembours|annul/i.test(String(o.st||''))).length,
    orders_count: ORDS.length,
    warranties_count: WARR.length,
    subscriptions_count: SUBS.length + CONTR.length,
    pending_refunds: ORDS.filter(o => /retour|rembours/i.test(String(o.st||''))).length,
    unread_alerts: 0,
    savings_amount: 0
  }
}

async function updateDashboardStats(stats){
  if(!stats) return
  const values = {
    '.stat-orders': stats.active_orders ?? stats.orders_count ?? 0,
    '.stat-warr': stats.warranties_count ?? 0,
    '.stat-subs': stats.subscriptions_count ?? 0,
    '.stat-refunds': stats.pending_refunds ?? stats.refunds_count ?? 0
  }
  Object.entries(values).forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value })
  })

  // Ne jamais présenter les dépenses mensuelles comme des économies.
  const savings = parseFloat(stats.savings_amount ?? stats.total_savings ?? 0) || 0
  document.querySelectorAll('#savings-amount-home,#savings-amount-profile').forEach(el => {
    el.textContent = savings > 0 ? savings.toFixed(0) + '€' : '0€'
  })

  const alertsCount = stats.unread_alerts || 0
  const alertsBadge = document.getElementById('alerts-count')
  if(alertsBadge) alertsBadge.textContent = alertsCount > 0 ? alertsCount + ' alerte' + (alertsCount>1?'s':'') : ''
}


/* ══ CONNEXION COMPTE DÉMO ══════════════════════════════ */
async function loginDemo(){
  // Feedback visuel
  document.querySelectorAll('button').forEach(b=>{
    if(b.textContent.includes('démonstration')) { b.textContent='⏳ Connexion...'; b.disabled=true }
  })
  const resetBtns=()=>{
    document.querySelectorAll('button').forEach(b=>{
      if(b.textContent.includes('Connexion...')){ b.textContent='✨ Explorer la démonstration'; b.disabled=false }
    })
  }

  // Attendre Supabase
  let w=0; while(!supa && w<20){ await new Promise(r=>setTimeout(r,400)); w++ }
  if(!supa){ toast('❌ Réseau indisponible'); resetBtns(); return }

  try{
    // Étape 1 : Setup si nécessaire + récupérer session via Edge Function
    const res = await fetch('https://jwvhqtrofwmozhiajwip.supabase.co/functions/v1/demo-login', {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':'sb_publishable_f_bLtSey70f5OONOPkRYbg_RQOnPFe6'}
    })
    const d = await res.json()

    if(d.access_token){
      // Session directe
      const {error} = await supa.auth.setSession({
        access_token: d.access_token,
        refresh_token: d.refresh_token
      })
      if(error){ toast('❌ '+error.message); resetBtns(); return }
      sessionStorage.setItem('clervio-demo-mode','1')
      toast('✨ Mode démonstration activé !')
      setTimeout(()=>showDemoBanner(), 800)

    } else if(d.action_link){
      // Magic link — ouvrir dans une popup invisible pour capter la session
      toast('⏳ Finalisation de la connexion...')
      // Rediriger vers le lien magique
      window.location.href = d.action_link

    } else {
      // Dernier recours : essayer connexion directe (si confirm email désactivé)
      let {data:sd, error:se} = await supa.auth.signInWithPassword({
        email:'demo@clervio.app', password:'Demo2025!'
      })
      if(se){
        const legacy = await supa.auth.signInWithPassword({ email:'demo@vaulto.app', password:'Demo2025!' })
        sd = legacy.data; se = legacy.error
      }
      if(se){ toast('❌ '+se.message); resetBtns(); return }
      sessionStorage.setItem('clervio-demo-mode','1')
      toast('✨ Mode démonstration activé !')
      setTimeout(()=>showDemoBanner(), 800)
    }

  }catch(e){
    console.error(e)
    toast('❌ Erreur réseau — réessayez')
    resetBtns()
  }
}


/* ══ PUSH NOTIFICATIONS ═════════════════════════════════ */
async function requestPushPermission(){
  if(!('Notification' in window)){ toast('Notifications non supportées sur ce navigateur'); return }
  if(Notification.permission === 'granted'){ toast('✓ Notifications déjà activées'); return }
  if(Notification.permission === 'denied'){ toast('Notifications bloquées — activez-les dans les réglages Safari'); return }

  const perm = await Notification.requestPermission()
  if(perm === 'granted'){
    toast('✓ Notifications activées')
    // Enregistrer le SW pour les push
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.ready
      // VAPID key à configurer
      const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDkBWine6tBeOTJTQRJA87fKiAICEFMeCn-S_3WQ0u8'
      try{
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        })
        // Sauvegarder la subscription dans Supabase
        if(supa && currentUser){
          await supa.from('profiles').update({
            push_subscription: JSON.stringify(sub)
          }).eq('id', currentUser.id)
        }
      }catch(e){ console.warn('Push subscribe:', e) }
    }
  } else {
    toast('Notifications refusées')
  }
}

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

/* ══ PRICING PAGE LINK ══════════════════════════════════ */
function showPricing(){ go('p-pricing') }


/* ══ CONNEXION & IMPORT DES BOÎTES MAIL ═══════════════ */

let selectedPeriod = '3months'
let activeMailProvider = sessionStorage.getItem('clervio_active_mail_provider') || 'gmail'

const MAIL_KEYWORDS = ['commande','order','facture','invoice','reçu','receipt','livraison','tracking','shipped','garantie','warranty','abonnement','subscription','renouvellement','renewal','remboursement','refund','payment','delivered']
const MAIL_KNOWN_SENDERS = ['amazon','fnac','darty','cdiscount','vinted','zalando','zara','sephora','apple','samsung','netflix','spotify','orange','sfr','free','edf','engie','paypal','stripe','shopify','etsy','aliexpress','shein','rakuten','boulanger','laposte','chronopost','dpd','gls','fedex','ups','dhl']

function mailConfidence(subject, from, snippet){
  const s=(subject||'').toLowerCase(), f=(from||'').toLowerCase(), x=(snippet||'').toLowerCase()
  if(MAIL_KNOWN_SENDERS.some(d=>f.includes(d))) return .95
  const sh=MAIL_KEYWORDS.filter(k=>s.includes(k)).length
  if(sh>=2) return .9
  if(sh===1) return .75
  const bh=MAIL_KEYWORDS.filter(k=>x.includes(k)).length
  if(bh>=2) return .6
  if(bh===1) return .45
  return .1
}

function selectPeriod(period){
  selectedPeriod = period
  const is3m = period === '3months'
  const p3=document.getElementById('period-3m'), p12=document.getElementById('period-12m')
  if(p3){
    p3.style.border=is3m?'1.5px solid rgba(201,168,76,.4)':'1.5px solid rgba(255,255,255,.08)'
    p3.style.background=is3m?'rgba(201,168,76,.06)':''
    const dot=p3.querySelector('#dot-3m'); if(dot) dot.style.background=is3m?'var(--g)':'transparent'
    if(dot?.parentElement) dot.parentElement.style.border=is3m?'2px solid var(--g)':'2px solid rgba(255,255,255,.2)'
  }
  if(p12){
    p12.style.border=!is3m?'1.5px solid rgba(201,168,76,.4)':'1.5px solid rgba(255,255,255,.08)'
    p12.style.background=!is3m?'rgba(201,168,76,.06)':''
    const dot=p12.querySelector('#dot-12m'); if(dot) dot.style.background=!is3m?'var(--g)':'transparent'
    if(dot?.parentElement) dot.parentElement.style.border=!is3m?'2px solid var(--g)':'2px solid rgba(255,255,255,.2)'
  }
  const btn=document.getElementById('start-import-btn')
  if(btn) btn.textContent=is3m?'Analyser mes emails (3 mois)':'Analyser mes emails (12 mois)'
}

let _mailIntroPendingProvider=null

function showMailIntroModal(provider){
  _mailIntroPendingProvider=provider
  const overlay=document.getElementById('mail-intro-overlay')
  const card=document.getElementById('mail-intro-card')
  const btn=document.getElementById('mail-intro-confirm-btn')
  const icon=document.getElementById('mail-intro-icon')
  if(!overlay||!card||!btn) return
  const isGmail=provider==='gmail'
  btn.textContent=isGmail?'Connecter Gmail':'Connecter Outlook'
  icon.style.background=isGmail?'rgba(201,168,76,.1)':'rgba(0,164,239,.12)'
  overlay.style.display='flex'
  requestAnimationFrame(()=>{ card.style.transform='translateY(0)' })
}

function closeMailIntroModal(){
  const overlay=document.getElementById('mail-intro-overlay')
  const card=document.getElementById('mail-intro-card')
  if(!overlay||!card) return
  card.style.transform='translateY(100%)'
  setTimeout(()=>{ overlay.style.display='none' },320)
  _mailIntroPendingProvider=null
}

function confirmMailIntro(){
  const provider=_mailIntroPendingProvider
  closeMailIntroModal()
  if(provider) beginMailOAuth(provider)
}

async function beginMailOAuth(provider){
  if(!supa || !currentUser){ toast('Connectez-vous avant de relier une boîte mail'); return }
  const isGmail=provider==='gmail'
  activeMailProvider=provider
  sessionStorage.setItem('clervio_active_mail_provider',provider)
  const options={
    scopes:isGmail
      ? 'openid email profile https://www.googleapis.com/auth/gmail.readonly'
      : 'openid profile email offline_access User.Read Mail.Read',
    redirectTo:window.location.origin + '?mail=connected&provider=' + provider,
    queryParams:isGmail
      ? {access_type:'offline',prompt:'consent select_account',include_granted_scopes:'true'}
      : {prompt:'select_account'}
  }
  try{
    const oauthProvider=isGmail?'google':'azure'
    let result=typeof supa.auth.linkIdentity==='function'
      ? await supa.auth.linkIdentity({provider:oauthProvider,options})
      : await supa.auth.signInWithOAuth({provider:oauthProvider,options})
    if(result.error){
      // Le même compte peut déjà servir à la connexion CLERVIO (ou linkIdentity peut
      // échouer pour d'autres raisons : 404, session expirée, etc). Dans tous les cas,
      // on retente via signInWithOAuth qui redemande le consentement avec les scopes mail
      // sans jamais créer de second utilisateur.
      console.warn('linkIdentity a échoué, repli sur signInWithOAuth:', result.error)
      result=await supa.auth.signInWithOAuth({provider:oauthProvider,options})
    }
    if(result.error) throw result.error
  }catch(e){
    console.error(e)
    toast('❌ ' + (e.message || 'Connexion impossible'))
  }
}

function connectGmail(){ return beginMailOAuth('gmail') }
function connectOutlook(){ return beginMailOAuth('outlook') }

function importProgress(text,detail,pct){
  const t=document.getElementById('import-status-text'), d=document.getElementById('import-progress-detail'), b=document.getElementById('import-progress-bar')
  if(t) t.textContent=text
  if(d) d.textContent=detail
  if(b) b.style.width=pct+'%'
}

async function parseOutlookMessage(session,message){
  const res=await fetch(EDGE.parseEmail,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
    body:JSON.stringify({
      email_id:'outlook:'+message.id,
      email_subject:message.subject||'',
      email_from:message.from?.emailAddress?.address||message.from?.emailAddress?.name||'',
      email_date:message.receivedDateTime||'',
      email_body:String(message.body?.content||message.bodyPreview||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,5000)
    })
  })
  const payload=await res.json().catch(()=>({}))
  return res.ok && payload?.data && Object.keys(payload.data).length>0
}

async function importOutlookClient(session,token){
  const meRes=await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',{headers:{Authorization:'Bearer '+token}})
  const me=await meRes.json().catch(()=>({}))
  if(!meRes.ok) throw new Error(me.error?.message || 'Connexion Outlook refusée')
  const email=String(me.mail||me.userPrincipalName||'').toLowerCase()
  if(!email) throw new Error('Adresse Outlook introuvable')

  const {data:sourceId,error:sourceError}=await supa.rpc('register_email_source',{
    p_provider:'outlook',p_email:email,p_provider_account_id:String(me.id||email),p_display_name:String(me.displayName||email)
  })
  if(sourceError) throw sourceError
  await supa.rpc('update_email_source_status',{p_source_id:sourceId,p_sync_status:'syncing',p_sync_error:null,p_emails_parsed:null})

  const since=new Date(); since.setMonth(since.getMonth()-(selectedPeriod==='12months'?12:3))
  const endpoint=new URL('https://graph.microsoft.com/v1.0/me/messages')
  endpoint.search=new URLSearchParams({
    '$top':'100',
    '$select':'id,subject,from,receivedDateTime,bodyPreview,body',
    '$filter':'receivedDateTime ge '+since.toISOString(),
    '$orderby':'receivedDateTime desc'
  }).toString()
  const listRes=await fetch(endpoint,{headers:{Authorization:'Bearer '+token,Prefer:'outlook.body-content-type="text"'}})
  const list=await listRes.json().catch(()=>({}))
  if(!listRes.ok) throw new Error(list.error?.message || 'Lecture Outlook impossible')
  const messages=Array.isArray(list.value)?list.value:[]
  const stats={total_found:messages.length,rejected:0,pending:0,auto_processed:0,errors:0}

  for(let i=0;i<messages.length;i++){
    const m=messages[i]
    try{
      const id='outlook:'+m.id
      const subject=String(m.subject||'')
      const from=String(m.from?.emailAddress?.address||m.from?.emailAddress?.name||'')
      const snippet=String(m.bodyPreview||'')
      const confidence=mailConfidence(subject,from,snippet)
      if(confidence<.3){ stats.rejected++; continue }
      if(confidence<.7){
        const {error:pErr}=await supa.from('pending_emails').upsert({
          user_id:currentUser.id,source_id:sourceId,email_id:id,subject,from_address:from,
          date:String(m.receivedDateTime||''),snippet:snippet.slice(0,300),ai_confidence:confidence,
          ai_reason:'Validation utilisateur requise',status:'pending'
        },{onConflict:'user_id,email_id'})
        if(pErr) throw pErr
        await supa.from('alerts').upsert({
          user_id:currentUser.id,type:'email_review',priority:'normal',title:'Email à valider : '+subject.slice(0,50),
          message:'De : '+from+'. Cet email pourrait contenir une commande ou un abonnement.',source_email_id:id,
          requires_action:true,action_type:'review_email',send_at:new Date().toISOString(),
          dedupe_key:'email_review:'+currentUser.id+':'+id
        },{onConflict:'dedupe_key',ignoreDuplicates:true})
        stats.pending++; continue
      }
      const parsed=await parseOutlookMessage(session,m)
      if(parsed) stats.auto_processed++
      else stats.errors++
    }catch(e){ console.warn('Outlook message',e); stats.errors++ }
    if(i%10===0) importProgress('Analyse Outlook…',(i+1)+' / '+messages.length+' emails vérifiés',40+Math.round((i+1)/Math.max(messages.length,1)*45))
  }

  await supa.rpc('update_email_source_status',{
    p_source_id:sourceId,p_sync_status:stats.errors?'error':'ok',
    p_sync_error:stats.errors?stats.errors+' email(s) en erreur':null,p_emails_parsed:stats.auto_processed
  })
  return stats
}

async function startMailImport(){
  if(!currentUser || !supa){ toast("Connectez-vous d'abord"); return }
  const {data:{session}}=await supa.auth.getSession()
  const providerToken=session?.provider_token
  if(!session || !providerToken){
    toast('❌ Reconnectez '+(activeMailProvider==='outlook'?'Outlook':'Gmail')+' pour lancer la synchronisation')
    return
  }

  const progressEl=document.getElementById('import-progress'), periodSection=document.getElementById('import-period-section')
  if(progressEl) progressEl.style.display='block'
  if(periodSection) periodSection.style.display='none'

  try{
    importProgress('Connexion…','Vérification de l’autorisation en lecture seule',10)
    let stats
    if(activeMailProvider==='outlook'){
      importProgress('Connexion à Outlook…','Lecture des messages pertinents',25)
      stats=await importOutlookClient(session,providerToken)
    }else{
      const res=await fetch(EDGE.ingestGmail,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
        body:JSON.stringify({access_token:providerToken,period:selectedPeriod})
      })
      const data=await res.json().catch(()=>({}))
      if(!res.ok) throw new Error(data.error||'Erreur Gmail')
      stats=data.stats||{}
    }
    importProgress('Terminé !',(stats.auto_processed||0)+' éléments ajoutés · '+(stats.pending||0)+' à valider',100)
    await loadEmailSourcesCount()
    await loadVaultData()
    ORDS=await fetchOrders()
    renderOrds('all'); renderVault('all'); renderHomePriorities(); updatePendingBadge()
    toast('✓ Import terminé — '+(stats.auto_processed||0)+' éléments ajoutés')
    setTimeout(()=>{if(progressEl) progressEl.style.display='none'},1800)
  }catch(e){
    console.error(e)
    importProgress('Erreur',e.message||'Import impossible',0)
    toast('❌ '+(e.message||'Import impossible'))
    setTimeout(()=>{if(progressEl) progressEl.style.display='none';if(periodSection) periodSection.style.display='block'},2600)
  }
}

window.addEventListener('load',function(){
  const params=new URLSearchParams(window.location.search)
  if(params.get('mail')==='connected'){
    activeMailProvider=params.get('provider')==='outlook'?'outlook':'gmail'
    sessionStorage.setItem('clervio_active_mail_provider',activeMailProvider)
    sessionStorage.setItem('clervio_pending_import','1')
    history.replaceState({},'',window.location.pathname)
  }
})

async function disconnectMailSource(sourceId){
  if(!supa||!currentUser) return
  if(!confirm('Déconnecter cette boîte de CLERVIO ? Les commandes déjà importées seront conservées.')) return
  const {data,error}=await supa.rpc('disconnect_email_source',{p_source_id:sourceId})
  if(error||!data){ toast('❌ Déconnexion impossible'); return }
  await loadEmailSourcesCount()
  toast('✓ Boîte déconnectée')
}


/* ══ EMAILS EN ATTENTE DE VALIDATION ════════════════════ */

function handlePendingAction(btn){
  const emailId = btn.dataset.eid
  const alertId = btn.dataset.aid
  const action = btn.dataset.act
  if(action === 'confirm') confirmPendingEmail(emailId, alertId)
  else rejectPendingEmail(emailId, alertId)
}

async function confirmPendingEmail(emailId, alertId){
  if(!supa || !currentUser) return
  toast("⏳ Analyse de l'email…")
  try{
    const { data: { session } } = await supa.auth.getSession()
    const isOutlook = String(emailId || '').startsWith('outlook:')
    if(!session?.provider_token){
      throw new Error('Reconnectez ' + (isOutlook ? 'Outlook' : 'Gmail') + ' pour analyser cet email')
    }

    if(isOutlook){
      const rawId = String(emailId).replace(/^outlook:/, '')
      const msgRes = await fetch(
        'https://graph.microsoft.com/v1.0/me/messages/' + encodeURIComponent(rawId) +
        '?$select=id,subject,from,receivedDateTime,bodyPreview,body',
        { headers: { Authorization:'Bearer ' + session.provider_token, Prefer:'outlook.body-content-type="text"' } }
      )
      const message = await msgRes.json().catch(()=>({}))
      if(!msgRes.ok) throw new Error(message.error?.message || 'Email Outlook introuvable')
      const parsed = await parseOutlookMessage(session, message)
      if(!parsed) throw new Error("L’analyse IA n’est pas encore configurée ou n’a pas reconnu cet email")

      const resolvedAt = new Date().toISOString()
      await supa.from('pending_emails')
        .update({ status:'confirmed', resolved_at:resolvedAt })
        .eq('email_id', emailId).eq('user_id', currentUser.id)
      if(alertId) await supa.from('alerts')
        .update({ is_read:true, read_at:resolvedAt, requires_action:false })
        .eq('id', alertId).eq('user_id', currentUser.id)
    }else{
      const res = await fetch(EDGE.ingestGmail, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          action: 'parse_one',
          email_id: emailId,
          alert_id: alertId,
          access_token: session.provider_token
        })
      })
      const payload = await res.json().catch(()=>({}))
      if(!res.ok) throw new Error(payload.error || 'Analyse Gmail impossible')
    }

    toast('✓ Email ajouté à vos données')
    ORDS = await fetchOrders()
    await loadVaultData()
    renderOrds('all')
    renderVault('all')
    renderHomePriorities()
    updatePendingBadge()
  }catch(e){
    console.error(e)
    toast('❌ ' + (e.message || 'Erreur — réessayez'))
  }
}

async function rejectPendingEmail(emailId, alertId){
  if(!supa || !currentUser) return
  try{
    // Marquer comme rejeté
    await supa.from('pending_emails')
      .update({ status: 'rejected', resolved_at: new Date().toISOString() })
      .eq('email_id', emailId).eq('user_id', currentUser.id)

    // Fermer l'alerte
    await markAlertRead(alertId)
    toast('Email ignoré')
    renderHomePriorities()
    updatePendingBadge()
  }catch(e){
    toast('❌ Erreur')
  }
}

// Compter les emails en attente dans la nav
async function updatePendingBadge(){
  if(!supa || !currentUser) return
  try{
    const { count } = await supa
      .from('pending_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
    
    const badge = document.getElementById('pending-badge')
    if(badge){
      badge.textContent = count > 0 ? count : ''
      badge.style.display = count > 0 ? 'flex' : 'none'
    }
  }catch(e){}
}


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

/* ══ HAPTIC FEEDBACK iOS ═══════════════════════════ */
window.haptic = function(type){
  try{
    if(navigator.vibrate){
      const patterns = { light:[8], medium:[15], success:[10,40,10], warning:[20,60,20], error:[30,80,30,80,30] }
      navigator.vibrate(patterns[type] || patterns.light)
    }
  }catch(e){}
}

/* ══ SPRING ANIMATION helper ═══════════════════════ */
window.springTo = function(el, props, done){
  if(!el) return
  el.style.transition = "all 0.5s cubic-bezier(0.34,1.56,0.64,1)"
  requestAnimationFrame(() => {
    Object.keys(props).forEach(k => { el.style[k] = props[k] })
    if(done) setTimeout(done, 500)
  })
}

/* ══ PULL TO REFRESH ═══════════════════════════════ */
;(function initPullRefresh(){
  let startY = 0, pulling = false, threshold = 80
  let indicator = null

  function createIndicator(){
    if(indicator) return indicator
    indicator = document.createElement("div")
    indicator.id = "ptr-indicator"
    indicator.style.cssText = "position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-60px);width:36px;height:36px;border-radius:50%;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .2s;pointer-events:none;"
    indicator.innerHTML = "<div style=\"width:16px;height:16px;border:2px solid var(--g);border-top-color:transparent;border-radius:50%;\"></div>"
    document.body.appendChild(indicator)
    return indicator
  }

  document.addEventListener("touchstart", (e) => {
    const sc = e.target.closest(".sc")
    if(sc && sc.scrollTop <= 0){ startY = e.touches[0].clientY; pulling = true }
  }, { passive: true })

  document.addEventListener("touchmove", (e) => {
    if(!pulling) return
    const delta = e.touches[0].clientY - startY
    if(delta > 0 && delta < 150){
      const ind = createIndicator()
      ind.style.transform = "translateX(-50%) translateY(" + Math.min(delta - 60, 20) + "px)"
      if(delta > threshold) ind.querySelector("div").style.animation = "spin 0.8s linear infinite"
    }
  }, { passive: true })

  document.addEventListener("touchend", (e) => {
    if(!pulling) return
    const delta = e.changedTouches[0].clientY - startY
    if(delta > threshold){
      if(window.haptic) window.haptic("medium")
      const cur = document.querySelector(".pg.on")
      if(cur){
        if(cur.id === "p-orders" && typeof renderOrds === "function") renderOrds("all")
        else if(cur.id === "p-vault" && typeof renderVault === "function") renderVault()
        else if(cur.id === "p-home" && typeof renderHomePriorities === "function") renderHomePriorities()
      }
    }
    if(indicator) indicator.style.transform = "translateX(-50%) translateY(-60px)"
    pulling = false
  }, { passive: true })
})()

/* ══ SESSION TIMEOUT — 30 min inactivité ═══════════ */
;(function initSessionTimeout(){
  const TIMEOUT_MS = 30 * 60 * 1000
  const WARN_MS = 2 * 60 * 1000
  let timer = null, warnTimer = null, warned = false

  function resetTimer(){
    clearTimeout(timer); clearTimeout(warnTimer); warned = false
    if(typeof currentUser === "undefined" || !currentUser) return
    warnTimer = setTimeout(() => {
      warned = true
      if(typeof toast === "function") toast("⏱️ Déconnexion dans 2 minutes par inactivité")
    }, TIMEOUT_MS - WARN_MS)
    timer = setTimeout(async () => {
      try{
        if(typeof supa !== "undefined" && supa) await supa.auth.signOut()
        if(typeof toast === "function") toast("Session expirée — reconnectez-vous")
        if(typeof go === "function") go("p-login")
      }catch(e){}
    }, TIMEOUT_MS)
  }

  const events = ["mousedown","keydown","touchstart","scroll","click"]
  events.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }))
  document.addEventListener("visibilitychange", () => { if(!document.hidden) resetTimer() })
  window.addEventListener("load", resetTimer)
  resetTimer()
})()

/* ══ SÉCURITÉ XSS ════════════════════════════════════ */
function escapeHtml(str){
  if(typeof str !== 'string') return str ?? ''
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}

/* ══ FAB MENU ════════════════════════════════════════════ */
function toggleFabMenu(id){
  const menu = document.getElementById('fab-menu-'+id)
  const overlay = document.getElementById('fab-overlay-'+id)
  const icon = document.getElementById('fab-'+id+'-icon')
  const isOpen = menu && menu.style.display === 'flex'
  if(isOpen){
    if(menu) menu.style.display = 'none'
    if(overlay) overlay.style.display = 'none'
    if(icon) icon.style.transform = 'rotate(0deg)'
  } else {
    if(menu) menu.style.display = 'flex'
    if(overlay) overlay.style.display = 'block'
    if(icon) icon.style.transform = 'rotate(45deg)'
  }
}
function hideFabMenu(id){
  const menu = document.getElementById('fab-menu-'+id)
  const overlay = document.getElementById('fab-overlay-'+id)
  const icon = document.getElementById('fab-'+id+'-icon')
  if(menu) menu.style.display = 'none'
  if(overlay) overlay.style.display = 'none'
  if(icon) icon.style.transform = 'rotate(0deg)'
}

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

