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


