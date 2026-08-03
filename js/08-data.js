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
    facture:      o.invoice_path || null,
    factureMime:  o.invoice_mime || null,
    carrier:  o.carrier || null,
    livr:     o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : null,
    retour:   o.return_deadline ? new Date(o.return_deadline).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) : null,
    returnDeadline: o.return_deadline || null,
    warrantyEndsAt: o.warranty_ends_at || null,
    ref:      o.order_number || null,
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
    invoice_path:    order.invoicePath || null,
    invoice_size:    order.invoiceSize || null,
    invoice_mime:    order.invoiceMime || null,
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


