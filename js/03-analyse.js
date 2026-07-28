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

