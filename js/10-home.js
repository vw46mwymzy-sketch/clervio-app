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


/* ══ MODE DÉMO LOCAL — aucune session ni donnée partagée ═ */
const CLERVIO_DEMO_DATA = Object.freeze({
  orders: [
    { id:'demo-o1', brand:'Apple', name:'iPhone 16 Pro', amt:1299, st:'Livré', sc:'g', dt:'14 juin 2026', orderDate:'2026-06-14', warr:24, warrantyEndsAt:'2028-06-14' },
    { id:'demo-o2', brand:'Amazon', name:'Machine à café', amt:189.90, st:'En transit', sc:'o', dt:'16 juil. 2026', orderDate:'2026-07-16', carrier:'Colissimo' },
    { id:'demo-o3', brand:'Nike', name:'Air Max', amt:149.99, st:'Livré', sc:'g', dt:'8 mai 2026', orderDate:'2026-05-08' }
  ],
  subscriptions: [
    { id:'demo-s1', type:'subs', name:'Netflix', sub:'Premium', amt:19.99, freq:'mois', next:'3 sept.', st:'active', res:true },
    { id:'demo-s2', type:'subs', name:'iCloud+', sub:'2 To', amt:9.99, freq:'mois', next:'10 sept.', st:'active', res:true }
  ],
  warranties: [
    { id:'demo-w1', brand:'Apple', name:'iPhone 16 Pro', exp:'14 juin 2028', days:673, st:'g' },
    { id:'demo-w2', brand:"De'Longhi", name:'Machine à café', exp:'1 juil. 2027', days:324, st:'g' }
  ],
  contracts: [
    { id:'demo-c1', type:'contracts', name:'Assurance habitation', sub:'MAIF', amt:28.50, freq:'mois', next:'1 sept.', renew:'1 janv. 2027', st:'active', res:true }
  ],
  documents: [
    { id:'demo-d1', brand:'Apple', name:'Facture iPhone 16 Pro', sub:'facture', date:'14 juin 2026', chemin:null, poids:0 }
  ],
  folders: []
})

function cloneDemoData(items){
  return items.map(item => ({ ...item }))
}

async function enterLocalDemo(){
  await waitForAppReady()
  try{ sessionStorage.setItem('clervio-demo-mode','1') }catch(e){}
  sessionState = 'demo'
  clearTimeout(sessionTimeout)
  currentUser = null
  currentProfile = { full_name:'Lou', plan:'gratuit' }
  ORDS = cloneDemoData(CLERVIO_DEMO_DATA.orders)
  SUBS = cloneDemoData(CLERVIO_DEMO_DATA.subscriptions)
  WARR = cloneDemoData(CLERVIO_DEMO_DATA.warranties)
  CONTR = cloneDemoData(CLERVIO_DEMO_DATA.contracts)
  DOCS = cloneDemoData(CLERVIO_DEMO_DATA.documents)
  FOLDERS = cloneDemoData(CLERVIO_DEMO_DATA.folders)
  const loading = document.getElementById('loading-screen')
  if(loading){ loading.classList.add('hidden'); setTimeout(()=>loading.remove(), 400) }
  showDemoBanner()
  updateDashboardStats(buildLocalDashboardStats())
  go('p-home')
}

function exitLocalDemo(){
  try{ sessionStorage.removeItem('clervio-demo-mode') }catch(e){}
  sessionState = 'unauthenticated'
  currentUser = null
  currentProfile = null
  ORDS = []; SUBS = []; WARR = []; CONTR = []; DOCS = []; FOLDERS = []
  hideDemoBanner()
  if(typeof openSocialAuth === 'function') openSocialAuth('signup')
  else go('p-ob2')
}

async function loginDemo(){
  const buttons = Array.from(document.querySelectorAll('button')).filter(button => button.textContent.includes('démonstration'))
  buttons.forEach(button => { button.textContent='⏳ Préparation...'; button.disabled=true })
  try{
    await enterLocalDemo()
    toast('✨ Mode démonstration local activé !')
  } finally {
    buttons.forEach(button => { button.textContent='✨ Explorer la démonstration'; button.disabled=false })
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

