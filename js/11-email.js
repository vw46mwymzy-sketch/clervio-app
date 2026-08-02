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

/* Le jeton de session Google expire au bout d'une heure. On le
   conserve chiffré côté serveur dès qu'on l'a, puis on demande
   un jeton valide — renouvelé si nécessaire. Sans cela, la
   détection s'arrête une heure après la connexion. */
async function jetonGmailValide(){
  if(!currentUser || !supa) return null
  try{
    const { data:{ session } } = await supa.auth.getSession()

    /* Une session fraîche porte les jetons : on les met à l'abri. */
    if(session?.provider_token){
      try{
        await supa.functions.invoke('gmail-token', { body:{
          action:'conserver',
          email: (currentUser.email || '').toLowerCase(),
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token || '',
          expires_in: 3600
        }})
      }catch(e){ /* la conservation ne doit pas bloquer l'import */ }
      return session.provider_token
    }

    const { data, error } = await supa.functions.invoke('gmail-token', { body:{ action:'obtenir' } })
    if(error || !data?.access_token) return null
    return data.access_token
  }catch(e){ return null }
}

async function startMailImport(){
  if(!currentUser || !supa){ toast("Connectez-vous d'abord"); return }
  const providerToken = await jetonGmailValide()
  if(!providerToken){
    toast('Reconnectez '+(activeMailProvider==='outlook'?'Outlook':'Gmail')+' depuis votre profil')
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


