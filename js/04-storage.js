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
    d:index===0 ? String(o.dt||'') : (index===statuses.length-1 ? (o.livr || 'Date non communiquée') : ''),
    ok:index<currentIndex || (index===currentIndex && currentStatus==='Livré'),
    cur:index===currentIndex && currentStatus!=='Livré'
  }))
  if(isReturn) steps.push({l:'Retour / remboursement',d:'',ok:false,cur:true})

  let stepsHtml=''
  steps.forEach((s,i)=>{
    const dotColor=s.ok?'linear-gradient(150deg,var(--gh),var(--gd))':s.cur?'var(--g)':'rgba(255,255,255,.15)'
    const dotGlow=s.ok?'0 0 10px rgba(201,168,76,.45)':s.cur?'0 0 0 4px rgba(201,168,76,.14),0 0 18px rgba(201,168,76,.5)':'none'
    const lineColor=s.ok?'linear-gradient(180deg,var(--g),rgba(201,168,76,.35))':'var(--ln2, rgba(255,255,255,.07))'
    const textColor=s.cur?'var(--g)':s.ok?'var(--d1)':'var(--d2)'
    const lineHtml=i<steps.length-1?'<div style="width:1px;flex:1;min-height:14px;background:'+lineColor+';margin:3px 0;"></div>':''
    stepsHtml+='<div style="display:flex;gap:14px;margin-bottom:10px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:'+dotColor+';box-shadow:'+dotGlow+';"></div>'+lineHtml+'</div><div style="padding-bottom:6px;"><div style="font-size:12px;color:'+textColor+';">'+escapeHTML(s.l)+'</div>'+(s.d?'<div style="font-size:10px;color:var(--d2);margin-top:3px;">'+escapeHTML(s.d)+'</div>':'')+'</div></div>'
  })

  const amount=Number(o.amt)||0
  let html='<div style="padding:62px 22px 24px;">'
  html+='<div style="display:flex;align-items:center;gap:15px;margin-bottom:26px;"><div style="width:50px;height:50px;border-radius:15px;flex-shrink:0;display:grid;place-items:center;font-family:Cormorant Garamond,serif;font-size:1.45rem;color:#0D0B08;background:linear-gradient(145deg,var(--gh) 0%,var(--g) 52%,var(--gd) 100%);box-shadow:0 6px 22px rgba(201,168,76,.24),inset 0 1px 0 rgba(255,255,255,.35);">'+escapeHTML(String(o.brand||'?').charAt(0).toUpperCase())+'</div><div style="min-width:0;"><div style="font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--d2);margin-bottom:4px;">'+escapeHTML(o.brand)+'</div><div style="font-size:12.5px;color:var(--d1);">'+(o.ref?'Commande '+escapeHTML(o.ref):'Référence non communiquée')+'</div></div></div>'
  
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
  html+='<div style="margin-top:26px;padding-top:17px;border-top:1px solid rgba(237,224,200,.08);display:flex;justify-content:space-between;gap:12px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--d2);">'
    +(o.warr?'<span>Garantie '+escapeHTML(o.warr)+' mois</span>':'')
    +(o.retour?'<span>Retour avant le '+escapeHTML(o.retour)+'</span>':'')
    +((!o.warr&&!o.retour)?'<span style="margin:0 auto;">Aucune garantie enregistrée</span>':'')
    +'</div>'
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
          <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${escapeHTML(d.name)}</div>
          <div style="font-size:11px;color:var(--d2);">${escapeHTML(d.sub)}</div>
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
          <div class="wg"><svg viewBox="0 0 58 58" aria-hidden="true"><circle class="wg-p" cx="29" cy="29" r="26"/><circle class="wg-a" cx="29" cy="29" r="26" stroke="${(w.days||0)<=90?'#E0A05A':'var(--g)'}" style="stroke-dashoffset:${(163.4*(1-Math.max(0,Math.min(1,(w.days||0)/730)))).toFixed(1)}"/></svg><div class="wg-s">${escapeHTML(String(w.brand||'?').charAt(0).toUpperCase())}</div></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:2px;font-weight:700;">${escapeHTML(w.brand)}</div>
            <div style="font-size:13px;color:var(--cr);font-weight:400;">${escapeHTML(w.name)}</div>
            <div style="font-size:11px;color:var(--d2);margin-top:1px;">Expire le ${escapeHTML(w.exp)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;"><div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;line-height:1;color:${(w.days||0)<=90?'#E0A05A':'var(--cr)'};">${(w.days||0)>=60?Math.round((w.days||0)/30):(w.days||0)}</div><div style="font-size:9.5px;letter-spacing:.08em;margin-top:3px;color:${(w.days||0)<=90?'rgba(224,160,90,.75)':'var(--d2)'};">${(w.days||0)>=60?'MOIS':'JOURS'}</div></div>
        </div>`).join('')
    )

    // Abonnements accordéon
    html += makeAccordion('abonnements','Abonnements',
      `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
      `<div style="margin:2px 0 16px;padding:20px 18px;border-radius:18px;text-align:center;background:linear-gradient(160deg,rgba(201,168,76,.11),rgba(201,168,76,.025));box-shadow:0 0 0 1px rgba(201,168,76,.24),inset 0 1px 0 rgba(255,255,255,.05),0 8px 26px rgba(0,0,0,.38);"><div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--d2);">${SUBS.reduce((a,x)=>a+(Number(x.amt)||0),0).toFixed(2).replace(".",",")} € par mois</div><div style="font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:300;line-height:1;margin:8px 0 5px;background:linear-gradient(120deg,var(--gh),var(--g) 55%,var(--gd));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">${Math.round(SUBS.reduce((a,x)=>a+(Number(x.amt)||0),0)*12).toLocaleString("fr-FR")} €</div><div style="font-size:12px;color:var(--d1);line-height:1.5;">sur douze mois, répartis sur <b style="color:var(--cr);font-weight:400;">${SUBS.length} abonnement${SUBS.length>1?"s":""}</b></div></div>` + SUBS.map(s=>`
        <div class="cd tp" onclick="showSub('${escapeHTML(s.id)}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;${s.st==='paused'?'opacity:.5':''}">
          <div class="vic">${logo(s.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${escapeHTML(s.name)}</div>
            <div style="font-size:11px;color:var(--d2);">${escapeHTML(s.sub)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);letter-spacing:-.02em;">${s.amt.toFixed(2)} €</div>
            <div style="font-size:10px;color:var(--d2);">/${escapeHTML(s.freq)}</div><div style="font-size:9.5px;color:rgba(201,168,76,.72);margin-top:4px;white-space:nowrap;">${Math.round((Number(s.amt)||0)*12)} € / an</div>
          </div>
        </div>`).join('')
    )

    // Contrats accordéon
    html += makeAccordion('contrats','Contrats & Baux',
      `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
      CONTR.map(s=>`
        <div class="cd tp" onclick="showSub('${escapeHTML(s.id)}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;">
          <div class="sic">${s.name==='Bail appartement'?'🔑':'📱'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${escapeHTML(s.name)}</div>
            <div style="font-size:11px;color:var(--d2);">${escapeHTML(s.sub)}</div>
            ${s.renew?`<div style="font-size:10px;color:var(--d2);margin-top:1px;">Renouvelle le ${escapeHTML(s.renew)}</div>`:''}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);">${s.amt.toFixed(0)} €</div>
            <div style="font-size:10px;color:var(--d2);">/${escapeHTML(s.freq)}</div><div style="font-size:9.5px;color:rgba(201,168,76,.72);margin-top:4px;white-space:nowrap;">${Math.round((Number(s.amt)||0)*12)} € / an</div>
          </div>
        </div>`).join('')
    )
  }

  // Mode filtré (pas all) — affichage direct sans accordéon
  if(filter==='warr'){
    html+=WARR.map((w,i)=>`
      <div class="cd tp" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="wg"><svg viewBox="0 0 58 58" aria-hidden="true"><circle class="wg-p" cx="29" cy="29" r="26"/><circle class="wg-a" cx="29" cy="29" r="26" stroke="${(w.days||0)<=90?'#E0A05A':'var(--g)'}" style="stroke-dashoffset:${(163.4*(1-Math.max(0,Math.min(1,(w.days||0)/730)))).toFixed(1)}"/></svg><div class="wg-s">${escapeHTML(String(w.brand||'?').charAt(0).toUpperCase())}</div></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--g);margin-bottom:2px;font-weight:700;">${escapeHTML(w.brand)}</div>
          <div style="font-size:13px;color:var(--cr);font-weight:400;">${escapeHTML(w.name)}</div>
          <div style="font-size:11px;color:var(--d2);margin-top:1px;">Expire le ${escapeHTML(w.exp)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;"><div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;line-height:1;color:${(w.days||0)<=90?'#E0A05A':'var(--cr)'};">${(w.days||0)>=60?Math.round((w.days||0)/30):(w.days||0)}</div><div style="font-size:9.5px;letter-spacing:.08em;margin-top:3px;color:${(w.days||0)<=90?'rgba(224,160,90,.75)':'var(--d2)'};">${(w.days||0)>=60?'MOIS':'JOURS'}</div></div>
      </div>`).join('')
  }
  if(filter==='subs'){
    html+=SUBS.map((s,i)=>`
      <div class="cd tp" onclick="showSub('${escapeHTML(s.id)}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;${s.st==='paused'?'opacity:.5':''}animation:sk .4s var(--e2) ${(i%4)*.07}s both;">
        <div class="vic">${logo(s.name)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${escapeHTML(s.name)}</div>
          <div style="font-size:11px;color:var(--d2);">${escapeHTML(s.sub)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);letter-spacing:-.02em;">${s.amt.toFixed(2)} €</div>
          <div style="font-size:10px;color:var(--d2);">/${escapeHTML(s.freq)}</div><div style="font-size:9.5px;color:rgba(201,168,76,.72);margin-top:4px;white-space:nowrap;">${Math.round((Number(s.amt)||0)*12)} € / an</div>
        </div>
      </div>`).join('')
  }
  if(filter==='contracts'){
    html+=CONTR.map((s,i)=>`
      <div class="cd tp" onclick="showSub('${escapeHTML(s.id)}')" style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="sic">${s.name==='Bail appartement'?'🔑':'📱'}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:1px;">${escapeHTML(s.name)}</div>
          <div style="font-size:11px;color:var(--d2);">${escapeHTML(s.sub)}</div>
          ${s.renew?`<div style="font-size:10px;color:var(--d2);margin-top:1px;">Renouvelle le ${escapeHTML(s.renew)}</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:300;color:var(--g);">${s.amt.toFixed(0)} €</div>
          <div style="font-size:10px;color:var(--d2);">/${escapeHTML(s.freq)}</div><div style="font-size:9.5px;color:rgba(201,168,76,.72);margin-top:4px;white-space:nowrap;">${Math.round((Number(s.amt)||0)*12)} € / an</div>
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
          <h2 class="sr" style="font-size:1.9rem;font-weight:300;color:var(--cr);line-height:1.08;">${escapeHTML(s.name)}</h2>
          <p style="font-size:12px;color:var(--d2);margin-top:5px;">${escapeHTML(s.sub)}</p>
        </div>
      </div>
      <div class="glcd" style="margin-bottom:18px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div><p class="sl" style="margin-bottom:8px;">Montant</p><div class="sr" style="font-family:'DM Sans',sans-serif;font-size:1.9rem;font-weight:200;letter-spacing:-.05em;font-feature-settings:'tnum' 1;color:var(--g);">${s.amt.toFixed(2)} €<span style="font-size:.42em;color:var(--d2);letter-spacing:0;">/${escapeHTML(s.freq)}</span></div></div>
          <div><p class="sl" style="margin-bottom:8px;">Prochain prélèv.</p><div style="font-size:14px;color:var(--cr);margin-top:9px;font-weight:400;">${escapeHTML(s.next)}</div></div>
          ${s.renew?`<div><p class="sl" style="margin-bottom:8px;">Renouvellement</p><div style="font-size:13px;color:var(--cr);margin-top:9px;">${escapeHTML(s.renew)}</div></div>`:''}
          <div><p class="sl" style="margin-bottom:8px;">Coût annuel</p><div class="sr" style="font-family:'DM Sans',sans-serif;font-size:1.2rem;font-weight:200;letter-spacing:-.04em;font-feature-settings:'tnum' 1;color:var(--cr);margin-top:7px;">${annualEquivalent(s).toFixed(0)} €</div></div>
        </div>
        ${s.notice?`<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--ln2);"><p style="font-size:12px;color:var(--g);">⚠ ${escapeHTML(s.notice)}</p></div>`:''}
      </div>
      <div class="cd tp" onclick="go(\'p-vault\')" style="margin-bottom:18px;display:flex;align-items:center;gap:13px;"><div class="vic"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg></div><span style="font-size:13px;color:var(--d1);flex:1;">Contrat dans le Coffre-Fort</span><span style="font-size:11px;color:var(--g);">Voir →</span></div>
      <p class="sl" style="margin-bottom:13px;">Actions</p>
      ${s.res?`<button class="bg fw" style="margin-bottom:10px;" onclick="toast('Disponible dans la version complète CLERVIO')">Résilier cet abonnement</button><button class="bgh fw" style="margin-bottom:10px;" onclick="toast('Disponible dans la version complète CLERVIO')">Modifier le forfait</button>`:`<div class="cd" style="margin-bottom:10px;"><p style="font-size:13px;color:var(--d1);line-height:1.65;">Ce contrat ne peut pas être résilié en ligne. Consultez votre contrat dans le Coffre-Fort ou contactez directement le prestataire.</p></div>`}
      <button class="bgh fw" onclick="toast('🔔 Rappel ajouté — 30 jours avant le renouvellement')">Rappel avant le renouvellement</button>
    </div>`
  go('p-sd')
}

