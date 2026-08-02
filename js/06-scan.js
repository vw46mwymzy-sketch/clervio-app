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
  /* La fonction serveur renvoie { extrait: {...} } avec des clés
     françaises. Les clés anglaises restent acceptées : une réponse
     d'une version antérieure ne doit pas passer pour un échec. */
  const data = payload?.extrait || payload?.result || payload?.data || payload || {}
  const conf = data.confiance || data.confidence
  const enPourcent = { haute: 92, moyenne: 68, faible: 35 }
  return {
    brand: String(data.marchand || data.brand || data.merchant || data.vendor || '').trim(),
    name: String(data.produit || data.product || data.name || data.item || '').trim(),
    amount: Number(data.montant ?? data.amount ?? data.total ?? 0) || 0,
    orderDate: String(data.date_achat || data.order_date || data.orderDate || data.date || '').slice(0,10),
    orderNumber: String(data.numero_commande || data.order_number || data.orderNumber || data.invoice_number || data.reference || '').trim(),
    status: String(data.status || 'Livré'),
    warrantyMonths: Number(data.garantie_mois ?? data.warranty_months ?? data.warrantyMonths ?? data.warranty ?? 0) || 0,
    confidence: typeof conf === 'string'
      ? (enPourcent[conf] ?? null)
      : (Math.round(Number(conf ?? 0) * (Number(conf ?? 0) <= 1 ? 100 : 1)) || null),
    fichier: payload?.fichier?.chemin || null,
    fichierOctets: payload?.fichier?.octets || 0,
    fichierMime: payload?.fichier?.mime || null
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
async async function confirmScannedOrder(){
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
  /* Le document scanné suit la commande : sans ce lien, la facture
     reste orpheline dans le coffre et introuvable depuis l'achat. */
  const order = {
    id:Date.now(), brand, name, amt:amount, st:status, sc:scMap[status]||'b',
    dt:formatDateFR(orderDate), orderDate,
    warr:warrantyMonths, tracking:orderNumber || null, manual:false,
    invoicePath: lastScanResult?.fichier || null,
    invoiceSize: lastScanResult?.fichierOctets || null,
    invoiceMime: lastScanResult?.fichierMime || null
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

