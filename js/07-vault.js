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
        <div style="width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;background:${escapeHTML(folder.color.val)};box-shadow:0 0 0 1.5px ${escapeHTML(folder.color.border)},0 4px 16px rgba(0,0,0,.35);">
          ${escapeHTML(folder.icon)}
        </div>
        <div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;font-weight:300;color:var(--cr);">${escapeHTML(folder.name)}</h1>
          <p style="font-size:12px;color:var(--d2);margin-top:3px;">${docs.length} document${docs.length!==1?'s':''} · Créé le ${escapeHTML(folder.createdAt)}</p>
        </div>
      </div>

      ${docs.length===0 ? `
        <!-- Empty state -->
        <div style="text-align:center;padding:60px 20px;">
          <div style="width:72px;height:72px;border-radius:20px;background:rgba(255,255,255,.04);box-shadow:0 0 0 1px rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;">${escapeHTML(folder.icon)}</div>
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:300;color:var(--cr);margin-bottom:8px;">Dossier vide</h3>
          <p style="font-size:13px;color:var(--d2);margin-bottom:28px;line-height:1.6;">Ajoutez des documents depuis le scanner ou depuis vos autres documents.</p>
          <button class="bgh" onclick="addDocToFolder()" style="font-size:13px;">+ Ajouter un document</button>
        </div>
      ` : docs.map((doc,i) => `
        <div class="cd" style="margin-bottom:9px;display:flex;align-items:center;gap:16px;padding:16px 18px;animation:sk .4s var(--e2) ${i*.06}s both;">
          <div class="vic" style="background:${escapeHTML(folder.color.val)};box-shadow:0 0 0 1px ${escapeHTML(folder.color.border)};">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${escapeHTML(folder.color.icon)}" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${escapeHTML(doc.name)}</div>
            <div style="font-size:11px;color:var(--d2);">${escapeHTML(doc.date)}</div>
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

async function addDocToFolder(){
  hideFolderMenu()
  if(!currentUser || !supa){ toast('Connectez-vous d\'abord'); return }
  const folderId = currentFolderId
  if(!folderId) return

  let docs = []
  try{
    const r = await supa.from('vault_documents')
      .select('id,name,brand,doc_date,folder_id')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending:false })
    if(r.error) throw r.error
    docs = r.data || []
  }catch(e){ toast('Chargement impossible'); return }

  if(!docs.length){ toast('Aucun document dans le coffre pour l\'instant'); return }

  const dispo = docs.filter(d => String(d.folder_id||'') !== String(folderId))
  const overlay = document.createElement('div')
  overlay.id = 'pick-doc-overlay'
  overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(5,4,6,.86);backdrop-filter:blur(6px);display:flex;align-items:flex-end;'
  let lignes = dispo.length
    ? dispo.map(d => '<button data-id="'+escapeHTML(d.id)+'" style="width:100%;text-align:left;background:none;border:none;border-bottom:1px solid rgba(255,255,255,.06);padding:14px 4px;color:var(--cr);font-size:14px;font-family:inherit;">' +
        escapeHTML(d.name||d.brand||'Document') +
        (d.doc_date ? '<span style="display:block;font-size:11px;color:var(--d2);margin-top:2px;">'+escapeHTML(d.doc_date)+'</span>' : '') +
      '</button>').join('')
    : '<div style="padding:20px 4px;color:var(--d2);font-size:13px;">Tous vos documents sont déjà dans ce dossier.</div>'
  overlay.innerHTML =
    '<div style="width:100%;max-width:430px;margin:0 auto;background:linear-gradient(180deg,#141217,#0C0B0E);border-radius:24px 24px 0 0;padding:26px 22px calc(env(safe-area-inset-bottom,0px) + 22px);max-height:70vh;display:flex;flex-direction:column;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<span style="font-family:\\'Cormorant Garamond\\',serif;font-size:1.4rem;color:var(--cr);">Ajouter un document</span>' +
        '<button id="pick-doc-close" style="background:none;border:none;color:var(--d2);font-size:22px;">×</button>' +
      '</div>' +
      '<div style="overflow-y:auto;">' + lignes + '</div>' +
    '</div>'
  document.body.appendChild(overlay)

  document.getElementById('pick-doc-close').onclick = () => overlay.remove()
  overlay.querySelectorAll('button[data-id]').forEach(btn => {
    btn.onclick = async () => {
      const docId = btn.dataset.id
      try{
        const r = await supa.from('vault_documents').update({ folder_id: folderId }).eq('id', docId).eq('user_id', currentUser.id)
        if(r.error) throw r.error
        toast('Document ajouté au dossier')
        overlay.remove()
        if(typeof openFolder === 'function') openFolder(folderId)
      }catch(e){ toast('Échec de l\'ajout') }
    }
  })
}
async function deleteCurrentFolder(){
  hideFolderMenu()
  const folders = loadFolders()
  const folder = folders.find(f=>String(f.id)===String(currentFolderId))
  if(!folder) return
  if(!confirm(`Supprimer le dossier "${escapeHTML(folder.name)}" ?`)) return

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
        <div onclick="openFolder('${escapeHTML(folder.id)}')" style="
          background:linear-gradient(160deg,#161618,#0F0F11);
          border-radius:18px;padding:16px 14px;cursor:pointer;
          box-shadow:0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.07),0 4px 14px rgba(0,0,0,.4);
          transition:all .25s var(--e1);
          animation:sk .4s var(--e2) ${i*.08}s both;
          position:relative;overflow:visible;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 0 0 1px '+${JSON.stringify(folder.color.border)}+',0 8px 24px rgba(0,0,0,.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 0 0 1px rgba(255,255,255,.09),inset 0 1px 0 rgba(255,255,255,.07),0 4px 14px rgba(0,0,0,.4)'">
          <!-- Accent top -->
          <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${escapeHTML(folder.color.border)},transparent);border-radius:18px 18px 0 0;"></div>
          <!-- Icône -->
          <div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:${escapeHTML(folder.color.val)};box-shadow:0 0 0 1px ${escapeHTML(folder.color.border)};margin-bottom:12px;">${escapeHTML(folder.icon)}</div>
          <!-- Nom -->
          <div style="font-size:13px;color:var(--cr);font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${escapeHTML(folder.name)}</div>
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

  const btnO = document.getElementById('ao-submit-btn')
  if(btnO){ if(btnO.disabled) return; btnO.disabled = true }
  try{
    const saved = await saveOrderToSupabase(order)
    if(!saved){ if(btnO) btnO.disabled = false; return }
    ORDS = await fetchOrders()
    toast('✓ Commande "'+name+'" ajoutée')
    clearOrderForm()
    go('p-orders')
  } finally {
    if(btnO) btnO.disabled = false
  }
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

  const btnS = document.getElementById('as-submit-btn')
  if(btnS){ if(btnS.disabled) return; btnS.disabled = true }
  try{
    const saved = await saveSubToSupabase(newSub)
    if(!saved){ if(btnS) btnS.disabled = false; return }
    if(currentUser && supa){
      await loadVaultData()
    }else{
      SUBS.unshift(newSub)
    }
    toast('✓ "'+name+'" ajouté au Coffre-Fort')
    clearSubForm()
    goVaultTab(selectedSubType === 'subs' ? 'subs' : 'contracts')
  } finally {
    if(btnS) btnS.disabled = false
  }
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

