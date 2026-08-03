/* ══════ FICHIER: 00-diagnostic.js ══════ */
/* ══ DIAGNOSTIC ══════════════════════════════════════════ */
/* Chargé en premier. Aucune dépendance. N'altère aucun comportement. */
/* Activation : ?debug=1 dans l'URL, ou clervioDebug() dans la console. */
(function(){
  'use strict';
  if (window.CLERVIO_DIAG) return;

  var T0 = Date.now(), MAX = 300, buf = [], panelOpen = false, el = null, vue = null;

  function push(type, mod, msg){
    try{
      buf.push({ t: Date.now()-T0, type: type, mod: mod||'-', msg: String(msg).slice(0,400) });
      if (buf.length > MAX) buf.shift();
      if (panelOpen) render();
      if (type === 'err') remonter(mod, msg);
    }catch(e){}
  }

  /* ── Remontée serveur (table client_errors) ──────────────
     Bornée : 20 envois par session, doublons ignorés.
     Silencieuse : n'émet jamais d'erreur qui se réinjecterait. */
  var envoyees = 0, dejaVues = {}, enCours = false;
  function remonter(mod, msg){
    try{
      if (enCours || envoyees >= 20) return;
      var cle = String(mod) + '|' + String(msg).slice(0,120);
      if (dejaVues[cle]) return;
      if (typeof supa === 'undefined' || !supa) return;
      if (typeof currentUser === 'undefined' || !currentUser || !currentUser.id) return;
      dejaVues[cle] = 1;
      envoyees++;
      enCours = true;
      supa.from('client_errors').insert({
        user_id: currentUser.id,
        module:  String(mod).slice(0,80),
        message: String(msg).slice(0,600),
        page:    String(location.hash || location.search || '/').slice(0,200),
        agent:   String(navigator.userAgent || '').slice(0,300)
      }).then(function(){ enCours = false; }, function(){ enCours = false; });
    }catch(e){ enCours = false; }
  }
  function fichier(src){
    if(!src) return '-';
    var m = String(src).split('/').pop().split('?')[0];
    return m || '-';
  }
  function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

  var DIAG = {
    log: function(mod,msg){ push('log',mod,msg); },
    err: function(mod,msg){ push('err',mod,msg); },
    entrees: function(){ return buf.slice(); },
    texte: function(){
      return buf.map(function(e){
        return (e.t/1000).toFixed(2)+'s  ['+e.type+']  '+e.mod+'  '+e.msg;
      }).join(String.fromCharCode(10));
    },
    ouvrir: function(){ openPanel(); }
  };
  window.CLERVIO_DIAG = DIAG;

  window.addEventListener('error', function(ev){
    push('err', fichier(ev.filename), (ev.message||'erreur') + '  ligne ' + (ev.lineno||'?'));
  });
  window.addEventListener('unhandledrejection', function(ev){
    var r = ev.reason;
    push('err','promesse', (r && (r.message||r)) || 'rejet non traité');
  });

  if (window.fetch){
    var origFetch = window.fetch;
    window.fetch = function(){
      var url = '';
      try{ url = (typeof arguments[0]==='string') ? arguments[0] : (arguments[0] && arguments[0].url) || ''; }catch(e){}
      var court = String(url).replace(/^https?:\/\/[^\/]+/,'').slice(0,90);
      var t = Date.now(), p;
      try { p = origFetch.apply(window, arguments); }
      catch(e){ push('err','réseau', court+' — '+e.message); throw e; }
      return p.then(function(res){
        push(res.ok?'net':'err','réseau', court+' → '+res.status+'  '+(Date.now()-t)+'ms');
        return res;
      }, function(e){
        push('err','réseau', court+' → échec  '+(Date.now()-t)+'ms  '+((e&&e.message)||''));
        throw e;
      });
    };
  }

  if (window.console && console.error){
    var origErr = console.error;
    console.error = function(){
      try{ push('err','console', Array.prototype.map.call(arguments,String).join(' ')); }catch(e){}
      return origErr.apply(console, arguments);
    };
  }

  function wrapGo(){
    if (typeof window.go === 'function' && !window.go.__diag){
      var orig = window.go;
      var w = function(p){ push('nav','navigation', String(p)); return orig.apply(window, arguments); };
      w.__diag = true;
      window.go = w;
      push('log','diagnostic','navigation instrumentée');
    }
  }
  window.addEventListener('DOMContentLoaded', wrapGo);
  window.addEventListener('load', wrapGo);
  setTimeout(wrapGo, 400);
  setTimeout(wrapGo, 1500);

  function bouton(txt, style, fn){
    var b = document.createElement('button');
    b.textContent = txt;
    b.setAttribute('style', style);
    b.onclick = fn;
    return b;
  }

  function openPanel(){
    if (el){ el.style.display='flex'; panelOpen=true; render(); return; }
    if (!document.body) { setTimeout(openPanel, 200); return; }
    el = document.createElement('div');
    el.setAttribute('style','position:fixed;left:0;right:0;bottom:0;height:52vh;z-index:99999;background:#0A0A0C;border-top:1px solid rgba(201,168,76,.45);display:flex;flex-direction:column;font:11px/1.45 ui-monospace,Menlo,monospace;color:#EDE0C8;');
    var bar = document.createElement('div');
    bar.setAttribute('style','display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;');
    var titre = document.createElement('span');
    titre.textContent = 'DIAGNOSTIC';
    titre.setAttribute('style','color:#C9A84C;letter-spacing:.12em;font-weight:600;');
    var espace = document.createElement('span');
    espace.setAttribute('style','flex:1;');
    var bCopier = bouton('Copier','background:#C9A84C;color:#0A0A0C;border:none;border-radius:6px;padding:5px 11px;font:600 11px sans-serif;', function(){
      var t = DIAG.texte();
      try{ if (navigator.clipboard) navigator.clipboard.writeText(t); }catch(e){}
      bCopier.textContent = 'Copié';
      setTimeout(function(){ bCopier.textContent='Copier'; }, 1200);
    });
    var bVider = bouton('Vider','background:rgba(255,255,255,.08);color:#EDE0C8;border:none;border-radius:6px;padding:5px 11px;font:600 11px sans-serif;', function(){ buf.length=0; render(); });
    var bFermer = bouton('✕','background:none;color:#EDE0C8;border:none;padding:5px 8px;font-size:14px;', function(){ el.style.display='none'; panelOpen=false; });
    bar.appendChild(titre); bar.appendChild(espace);
    bar.appendChild(bCopier); bar.appendChild(bVider); bar.appendChild(bFermer);
    vue = document.createElement('div');
    vue.setAttribute('style','flex:1;overflow:auto;padding:8px 10px;white-space:pre-wrap;word-break:break-word;');
    el.appendChild(bar); el.appendChild(vue);
    document.body.appendChild(el);
    panelOpen = true;
    render();
  }

  function render(){
    if(!vue) return;
    var h = '';
    for (var i=Math.max(0,buf.length-200); i<buf.length; i++){
      var e = buf[i];
      var c = e.type==='err' ? '#FF8A7A' : (e.type==='nav' ? '#C9A84C' : (e.type==='net' ? '#8FBF7F' : 'rgba(237,224,200,.55)'));
      h += '<div style="color:'+c+';">'+(e.t/1000).toFixed(2)+'s  '+esc(e.mod)+'  '+esc(e.msg)+'</div>';
    }
    vue.innerHTML = h;
    vue.scrollTop = vue.scrollHeight;
  }

  function peutOuvrir(){
    try{
      if (location.search.indexOf('debug=1') > -1 || localStorage.getItem('clervio_debug') === '1') openPanel();
    }catch(e){}
  }
  window.addEventListener('DOMContentLoaded', peutOuvrir);
  window.addEventListener('load', peutOuvrir);

  window.clervioDebug = function(actif){
    try{
      if (actif === false){
        localStorage.removeItem('clervio_debug');
        if(el){ el.style.display='none'; panelOpen=false; }
        return 'diagnostic désactivé';
      }
      localStorage.setItem('clervio_debug','1');
    }catch(e){}
    openPanel();
    return 'diagnostic activé';
  };

  push('log','diagnostic','journal démarré');
})();

/* ══════ FICHIER: 01-nav.js ══════ */


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


/* ══════ FICHIER: 02-auth.js ══════ */
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


/* ══════ FICHIER: 03-analyse.js ══════ */
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


/* ══════ FICHIER: 04-storage.js ══════ */
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

  if(o.facture){
    html+='<div style="display:flex;gap:8px;margin-bottom:10px;"><div class="cd tp" data-p="'+escapeHTML(o.facture)+'" onclick="ouvrirFacture(this.dataset.p)" style="display:flex;align-items:center;gap:12px;flex:1;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><span style="font-size:13px;color:var(--cr);flex:1;">Facture</span><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg></div><button data-id="'+escapeHTML(o.id)+'" data-p="'+escapeHTML(o.facture)+'" onclick="retirerFacture(this.dataset.id,this.dataset.p)" aria-label="Retirer la facture" style="background:none;border:1px solid rgba(237,224,200,.09);border-radius:16px;padding:0 14px;color:rgba(237,224,200,.22);cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>'
  }else{
    html+='<button data-id="'+escapeHTML(o.id)+'" onclick="attacherFacture(this.dataset.id)" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px dashed rgba(201,168,76,.22);border-radius:16px;padding:15px;margin-bottom:10px;color:var(--d1);font-size:13px;cursor:pointer;font-family:inherit;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Joindre la facture</button>'
  }
  if(o.tracking){
    html+='<div class="cd tp" data-id="'+escapeHTML(o.id)+'" data-tracking="'+escapeHTML(o.tracking)+'" onclick="trackDelivery(this.dataset.id,this.dataset.tracking)" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">📦 Suivre · '+escapeHTML(o.tracking)+'</span><span style="font-size:11px;color:var(--g);">Actualiser →</span></div>'
  }
  if(o.warr){
    html+='<div class="cd tp" onclick="go(\'p-vault\')" style="display:flex;align-items:center;gap:12px;"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style="font-size:13px;color:var(--d1);flex:1;">🛡 Garantie · '+escapeHTML(o.warr)+' mois</span><span style="font-size:11px;color:var(--g);">Voir dans le coffre →</span></div>'
  }
  if(o.notes && o.notes.trim()){
    html+='<button data-id="'+escapeHTML(o.id)+'" onclick="genererDossierLitige(this.dataset.id)" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px solid rgba(201,168,76,.22);border-radius:100px;padding:13px;margin-top:14px;color:var(--gh);font-size:12.5px;cursor:pointer;font-family:inherit;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gh)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>Constituer le dossier de litige</button>'
  }
  if(o.refundStatus){
    var _lbl = o.refundStatus==='attente' ? 'Remboursement en attente' : (o.refundStatus==='recu' ? 'Remboursement reçu' : 'Remboursement refusé')
    var _coul = o.refundStatus==='attente' ? 'var(--gh)' : (o.refundStatus==='recu' ? '#8FBF7F' : '#E08A7A')
    html+='<div class="cd" style="margin-top:18px;padding:16px 18px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:'+(o.refundStatus==='attente'?'12':'0')+'px;">'
      +'<span style="font-size:12.5px;color:'+_coul+';">● '+_lbl+'</span>'
      +(o.refundAmount!=null?'<span style="font-size:13px;color:var(--cr);">'+o.refundAmount.toFixed(2).replace('.',',')+' €</span>':'')
      +'</div>'
      +(o.refundStatus==='attente'?'<div style="display:flex;gap:8px;"><button data-id="'+escapeHTML(o.id)+'" data-m="'+(o.amt||0)+'" onclick="confirmerRemboursementRecu(this.dataset.id,parseFloat(this.dataset.m))" style="flex:1;height:38px;border:none;border-radius:100px;background:rgba(143,191,127,.14);color:#8FBF7F;font-size:12px;font-family:inherit;">Reçu</button><button data-id="'+escapeHTML(o.id)+'" onclick="marquerRemboursementRefuse(this.dataset.id)" style="flex:1;height:38px;border:none;border-radius:100px;background:rgba(224,138,122,.10);color:#E08A7A;font-size:12px;font-family:inherit;">Refusé</button></div>':'')
      +'</div>'
  }
  if(o.returnDeadline){
    var _jrsRetour = Math.ceil((new Date(o.returnDeadline+'T00:00:00') - new Date())/86400000)
    if(_jrsRetour>=0){
      html+='<button data-id="'+escapeHTML(o.id)+'" onclick="imprimerBonRetour(this.dataset.id)" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px dashed rgba(237,224,200,.20);border-radius:100px;padding:13px;margin-top:12px;color:var(--d1);font-size:12.5px;cursor:pointer;font-family:inherit;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--d1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Imprimer le bon de retour</button>'
    }
  }
  html+='<button data-id="'+escapeHTML(o.id)+'" onclick="aiderReclamationParId(this.dataset.id)" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px solid rgba(201,168,76,.24);border-radius:100px;padding:14px;margin-top:18px;color:var(--cr);font-size:13px;cursor:pointer;font-family:inherit;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Faire une réclamation</button>'
  html+='<button data-id="'+escapeHTML(o.id)+'" onclick="rangerDansCoffre(this.dataset.id)" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px solid rgba(237,224,200,.10);border-radius:100px;padding:14px;margin-top:18px;color:var(--d1);font-size:13px;cursor:pointer;font-family:inherit;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--d1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Ranger dans le coffre</button>'
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
      chemin:d.file_path || null, poids:d.file_size || 0
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
      <div class="cd tp"${d.chemin?` onclick="coffreOuvrir('${escapeHTML(d.chemin)}')"`:''} style="margin-bottom:8px;display:flex;align-items:center;gap:14px;padding:14px 16px;animation:sk .4s var(--e2) ${i*.07}s both;">
        <div class="vic">${logo(d.brand)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--cr);font-weight:400;margin-bottom:2px;white-space:nowrap;overflow:visible;text-overflow:ellipsis;">${escapeHTML(d.name)}</div>
          <div style="font-size:11px;color:var(--d2);">${escapeHTML(d.sub)}${d.chemin?'':' · sans pièce jointe'}</div>
        </div>
        ${d.chemin?`<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>`:``}<button onclick="event.stopPropagation();supprimerDocument('${escapeHTML(d.id)}')" aria-label="Supprimer" style="background:none;border:none;padding:7px;margin-left:4px;color:rgba(237,224,200,.20);cursor:pointer;flex-shrink:0;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
      </div>`).join('')
    html+=`<button onclick="ajouterDocument()" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px dashed rgba(201,168,76,.22);border-radius:16px;padding:15px;margin-top:4px;color:var(--d1);font-size:13px;cursor:pointer;font-family:inherit;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Ajouter un document</button>`
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
      ${s.res?`<button class="bg fw" style="margin-bottom:10px;" onclick="aiderResiliationParId('${escapeHTML(s.id)}')">Résilier cet abonnement</button>`:`<div class="cd" style="margin-bottom:10px;"><p style="font-size:13px;color:var(--d1);line-height:1.65;">CLERVIO peut préparer un courrier de résiliation à envoyer vous-même au prestataire.</p></div><button class="bgh fw" style="margin-bottom:10px;" onclick="aiderResiliationParId('${escapeHTML(s.id)}')">Préparer un courrier de résiliation</button>`}
      <button class="bgh fw" onclick="toast('🔔 Rappel ajouté — 30 jours avant le renouvellement')">Rappel avant le renouvellement</button>
    </div>`
  go('p-sd')
}


/* ══════ FICHIER: 05-ai.js ══════ */
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


/* ══════ FICHIER: 06-scan.js ══════ */
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
/* Une facture déjà réglée n'a rien à faire dans « Commandes » :
   ce mot annonce un achat en cours, un suivi, une livraison.
   L'utilisateur choisit la destination après l'analyse. */
async function confirmScannedDocument(){
  const brand = document.getElementById('scan-brand')?.value?.trim()
  const name  = document.getElementById('scan-name')?.value?.trim()
  const amount = parseFloat(document.getElementById('scan-amount')?.value) || 0
  const docDate = document.getElementById('scan-date')?.value || new Date().toISOString().slice(0,10)
  const warrantyMonths = parseInt(document.getElementById('scan-warranty')?.value) || null
  if(!name && !brand){ highlight('scan-name'); return }

  if(typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser){
    toast('Connectez-vous pour enregistrer ce document'); return
  }

  const ligne = {
    user_id: currentUser.id,
    name: name || brand || 'Document',
    type: 'facture',
    brand: brand || null,
    amount: amount || null,
    currency: 'EUR',
    doc_date: docDate,
    warranty_months: warrantyMonths,
    source: 'scan',
    file_path: lastScanResult?.fichier || null,
    file_size: lastScanResult?.fichierOctets || null,
    file_mime: lastScanResult?.fichierMime || null,
    file_added_at: new Date().toISOString()
  }

  const { error } = await supa.from('vault_documents').insert(ligne)
  if(error){ toast('❌ ' + (error.message || 'Erreur')); return }

  lastScanResult = null
  if(typeof rechargerDonnees === 'function'){ try{ await rechargerDonnees() }catch(e){} }
  renderScan('done')
  toast('✓ Rangé dans votre coffre')
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
      <p class="sl" style="margin-bottom:10px;">Où le ranger ?</p>
      <button class="bg fw lg" onclick="confirmScannedOrder()">Suivre comme un achat</button>
      <p style="font-size:11.5px;color:var(--d2);line-height:1.5;margin:7px 0 14px;">Pour une commande en cours : livraison, garantie, retour.</p>
      <button onclick="confirmScannedDocument()" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;background:none;border:1px solid rgba(201,168,76,.28);border-radius:100px;padding:15px;color:var(--cr);font-size:14px;cursor:pointer;font-family:inherit;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Ranger dans le coffre</button>
      <p style="font-size:11.5px;color:var(--d2);line-height:1.5;margin:7px 0 0;">Pour une facture déjà réglée, un contrat, un justificatif à conserver.</p>
      <button class="bt" onclick="renderScan('choice')" style="margin-top:16px;">Annuler</button>
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


/* ══════ FICHIER: 07-vault.js ══════ */
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

function addDocToFolder(){
  hideFolderMenu()
  toast('Suivi en temps réel — Bientôt disponible')
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


/* ══════ FICHIER: 08-data.js ══════ */
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
    refundStatus: o.refund_status || null,
    refundAmount: (o.refund_amount != null ? Number(o.refund_amount) : null),
    notes: o.notes || '',
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



/* ══════ FICHIER: 09-compte.js ══════ */
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


/* ══════ FICHIER: 10-home.js ══════ */
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



/* ══════ FICHIER: 11-email.js ══════ */
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
   détection s'arrête une heure après la connexion.

   Capturer le jeton SEULEMENT au moment de synchroniser était
   la faille : une redirection OAuth recharge la page, referme
   la fenêtre qui portait les jetons, et ils étaient perdus si
   personne ne les récupérait à cet instant précis. */
/* Le compteur du profil ('Aucun email connecté') était figé
   en dur dans le HTML : rien ne le mettait jamais à jour,
   qu'il y ait zéro ou trois boîtes connectées. */
async function rafraichirCompteurEmails(){
  var el = document.getElementById('email-sources-count')
  if (!el || !supa || !currentUser) return
  try{
    var r = await supa.from('email_sources')
      .select('email', { count: 'exact', head: false })
      .eq('user_id', currentUser.id)
      .is('revoked_at', null)
    var n = (r && r.data) ? r.data.length : 0
    if (n === 0) el.textContent = 'Aucun email connecté'
    else if (n === 1) el.textContent = r.data[0].email
    else el.textContent = n + ' boîtes connectées'
  }catch(e){}
}
window.rafraichirCompteurEmails = rafraichirCompteurEmails

function initCaptureJetonOAuth(){
  if (location.search.indexOf('mail=connected') === -1) return
  if (typeof supa === 'undefined' || !supa){ setTimeout(initCaptureJetonOAuth, 300); return }

  var dejaTraite = false

  async function tenterCapture(session){
    if (dejaTraite || !session || !session.provider_token) return
    dejaTraite = true
    var email = (session.user && session.user.email) || (typeof currentUser !== 'undefined' && currentUser && currentUser.email) || ''
    try{
      var ok = await conserverJetonAvecReprise(
        email.toLowerCase(),
        session.provider_token,
        session.provider_refresh_token || ''
      )
      if (typeof window.CLERVIO_DIAG !== 'undefined' && window.CLERVIO_DIAG.log){
        window.CLERVIO_DIAG.log('email', ok
          ? (session.provider_refresh_token ? 'jeton de renouvellement capturé' : 'jeton capturé sans renouvellement')
          : 'échec de la conservation après trois tentatives')
      }
      toast(ok ? 'Boîte connectée.' : 'Connecté, mais la synchronisation en arrière-plan pourrait ne pas tenir. Réessayez si besoin.')
      setTimeout(function(){ if (typeof rafraichirCompteurEmails==='function') rafraichirCompteurEmails() }, 300)

      if (ok && sessionStorage.getItem('clervio_pending_import') === '1'){
        sessionStorage.removeItem('clervio_pending_import')
        setTimeout(function(){
          try{ if (typeof startMailImport === 'function') startMailImport() }catch(e){}
        }, 300)
      }
    }finally{
      try{ history.replaceState(null, '', location.pathname) }catch(e){}
    }
  }

  try{
    supa.auth.onAuthStateChange(function(event, session){
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') tenterCapture(session)
    })
  }catch(e){}

  try{
    supa.auth.getSession().then(function(r){ tenterCapture(r && r.data && r.data.session) })
  }catch(e){}

  setTimeout(function(){
    if (!dejaTraite){
      dejaTraite = true
      journal('err', 'aucun événement d\'authentification exploitable après 10s')
      try{ history.replaceState(null, '', location.pathname) }catch(e){}
    }
  }, 10000)
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', initCaptureJetonOAuth)
else initCaptureJetonOAuth()

function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('email',m); }catch(e){} }

async function conserverJetonAvecReprise(email, accessToken, refreshToken){
  var essai = 0, ok = false, derniereErreur = null

  try{
    var diag = await supa.auth.getSession()
    var s = diag && diag.data && diag.data.session
    journal('err', 'DIAG avant appel — session: ' + (s ? 'présente' : 'absente')
      + ', access_token: ' + (s && s.access_token ? (s.access_token.length + ' car.') : 'absent')
      + ', expire: ' + (s && s.expires_at ? new Date(s.expires_at*1000).toISOString() : '—'))
  }catch(eDiag){ journal('err', 'diag session : ' + ((eDiag&&eDiag.message)||eDiag)) }

  while (essai < 3 && !ok){
    try{
      var r = await supa.functions.invoke('gmail-token', { body:{
        action:'conserver', email:email, access_token:accessToken,
        refresh_token: refreshToken || '', expires_in: 3600
      }})
      if (r && r.error){
        derniereErreur = r.error
        throw r.error
      }
      ok = true
    }catch(e){
      derniereErreur = e
      essai++
      if (essai < 3) await new Promise(function(r){ setTimeout(r, 600 * essai) })
    }
  }
  if (!ok && derniereErreur){
    journal('err', 'conservation jeton — échec final : ' + (derniereErreur.message || derniereErreur.name || JSON.stringify(derniereErreur)).slice(0,200)
      + (derniereErreur.context && derniereErreur.context.status ? (' [status ' + derniereErreur.context.status + ']') : ''))
  }
  return ok
}

async function jetonGmailValide(){
  if(!currentUser || !supa) return null
  try{
    const { data:{ session } } = await supa.auth.getSession()

    if(session?.provider_token){
      conserverJetonAvecReprise(
        (currentUser.email || '').toLowerCase(),
        session.provider_token,
        session.provider_refresh_token || ''
      ).catch(function(){})
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



/* ══════ FICHIER: 12-concierge.js ══════ */
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
  /* Le modèle produit du markdown : gras, listes, séparateurs.
     Non rendu, il s'affiche en brut — astérisques et tirets visibles.
     L'échappement passe toujours en premier : le texte vient de l'IA,
     donc de l'extérieur. */
  const formatted = escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|<br\/>)\s*[-–—]{3,}\s*(?=<br\/>|$)/g, '$1<span style="display:block;height:1px;background:rgba(237,224,200,.10);margin:12px 0;"></span>')
    .replace(/(^|\n)\s*[-•]\s+/g, '$1• ')
    .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, '<em>$1</em>')
    .split('\n').join('<br/>')
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
    '<div style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.2);border-radius:16px 16px 4px 16px;padding:12px 16px;max-width:80%;font-size:13px;color:var(--cr);line-height:1.6;">' + escapeHTML(msg) + '</div>' +
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


/* ══════ FICHIER: 13-ui.js ══════ */
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
/* L'échappement est assuré par escapeHTML(), définie dans 05-ai.js
   et appelée 33 fois. Un doublon escapeHtml() vivait ici sans jamais
   être appelé : retiré le 29/07/2026 pour éviter toute confusion
   de casse à l'usage. */

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


/* ══════ FICHIER: 14-init.js ══════ */
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


/* ══════ FICHIER: 19-push.js ══════ */
/* ══ NOTIFICATIONS PUSH ══════════════════════════════════
   Inscription de l'appareil et enregistrement de l'abonnement.
   Sur iOS, les notifications web n'existent QUE si la PWA est
   installée sur l'écran d'accueil — l'onglet Safari ne suffit pas.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_PUSH) return;
  window.CLERVIO_PUSH = true;

  var CLE_PUBLIQUE = 'BBuuyDn6AQ-GQm5eBnW8ch5UeVuRPngZYnNgkHgNb0X0BOr0CzHN74Qw03R9nBPB1VfKqDSH_lQ9rTML8Zpqrv4';

  function journal(type, msg){
    try{
      var D = window.CLERVIO_DIAG;
      if (D && D[type]) D[type]('push', msg);
    }catch(e){}
  }

  function b64urlVersOctets(s){
    var p = (s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(p);
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }

  function octetsVersB64url(buf){
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function installee(){
    try{
      return window.navigator.standalone === true ||
             (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    }catch(e){ return false; }
  }

  function iOS(){
    try{ return /iPad|iPhone|iPod/.test(navigator.userAgent); }catch(e){ return false; }
  }

  function dire(msg){
    try{ if (typeof window.toast === 'function') window.toast(msg); }catch(e){}
  }

  window.notificationsEtat = function(){
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'non supporte';
    if (iOS() && !installee()) return 'installation requise';
    try{ return Notification.permission; }catch(e){ return 'inconnu'; }
  };

  async function souscrire(silencieux){
    try{
      if (!('serviceWorker' in navigator) || !('PushManager' in window)){
        if (!silencieux) dire("Les notifications ne sont pas prises en charge sur ce navigateur.");
        return false;
      }
      if (iOS() && !installee()){
        if (!silencieux) dire("Installez d'abord CLERVIO sur votre écran d'accueil pour recevoir les alertes.");
        journal('log', 'iOS sans installation, inscription impossible');
        return false;
      }

      var perm = Notification.permission;
      if (perm === 'default' && !silencieux) perm = await Notification.requestPermission();
      if (perm !== 'granted'){
        if (!silencieux) dire('Notifications refusées.');
        journal('log', 'permission ' + perm);
        return false;
      }

      var reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      var abo = await reg.pushManager.getSubscription();
      if (!abo){
        abo = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: b64urlVersOctets(CLE_PUBLIQUE)
        });
      }

      var j = abo.toJSON ? abo.toJSON() : null;
      var p256dh = j && j.keys ? j.keys.p256dh : octetsVersB64url(abo.getKey('p256dh'));
      var auth   = j && j.keys ? j.keys.auth   : octetsVersB64url(abo.getKey('auth'));

      if (typeof supa === 'undefined' || !supa) { journal('err', 'client Supabase indisponible'); return false; }
      if (typeof currentUser === 'undefined' || !currentUser || !currentUser.id){
        journal('log', 'utilisateur non connecté, abonnement non enregistré');
        return false;
      }

      var res = await supa.from('push_subscriptions').upsert({
        user_id: currentUser.id,
        endpoint: abo.endpoint,
        p256dh: p256dh,
        auth: auth,
        user_agent: (navigator.userAgent || '').slice(0, 300)
      }, { onConflict: 'user_id,endpoint' });

      if (res && res.error){ journal('err', 'enregistrement : ' + res.error.message); return false; }

      journal('log', 'appareil abonné');
      if (!silencieux) dire('Notifications activées.');
      return true;
    }catch(e){
      journal('err', 'souscription : ' + (e && e.message ? e.message : e));
      if (!silencieux) dire("Impossible d'activer les notifications.");
      return false;
    }
  }

  /* Remplace l'ancienne fonction appelée depuis l'interface */
  window.requestPushPermission = function(){ return souscrire(false); };
  window.activerNotifications  = function(){ return souscrire(false); };

  /* Renouvellement demandé par le navigateur */
  try{
    navigator.serviceWorker.addEventListener('message', function(e){
      if (e && e.data && e.data.type === 'push-resouscrire') souscrire(true);
      if (e && e.data && e.data.type === 'notification' && e.data.url && e.data.url !== '/'){
        try{ if (typeof window.go === 'function') window.go(e.data.url.replace(/^\//, '')); }catch(err){}
      }
    });
  }catch(e){}

  /* Si la permission est déjà accordée, on garde l'abonnement à jour en silence */
  setTimeout(function(){
    try{ if (Notification.permission === 'granted') souscrire(true); }catch(e){}
  }, 4000);
})();

/* ══════ FICHIER: 15-resilience.js ══════ */
/* ══ RÉSILIENCE ══════════════════════════════════════════ */
/* Enveloppe les points d'entrée appelés depuis le HTML.            */
/* Une erreur dans un module ne fige plus l'écran : elle est        */
/* tracée dans le journal et signalée sans bloquer l'interface.     */
(function(){
  'use strict';
  if (window.CLERVIO_RESILIENCE) return;
  window.CLERVIO_RESILIENCE = true;

  var NOMS = ('activateFaceID,addDocToFolder,closeMailIntroModal,confirmMailIntro,confirmScannedOrder,'
    + 'createFolder,deleteCurrentFolder,deleteMyAccount,doFaceIDReconnect,editPersonalInfo,exportMyData,'
    + 'fO,fV,go,goVaultTab,handleEmailAuth,handlePendingAction,handlePhoto,hideFabMenu,hideFolderMenu,'
    + 'hideNewFolder,installApp,loginDemo,markAlertRead,openDocumentUrl,openEmailAuth,openFolder,'
    + 'openSocialAuth,openSupport,renameCurrentFolder,renderOrds,renderScan,requestPushPermission,'
    + 'returningUser,sAI,sAIi,selectColor,selectIcon,selectPeriod,selectSubType,sendResetEmail,'
    + 'showFolderMenu,showForgotPassword,showMailIntroModal,showNewFolder,showOrd,showSub,'
    + 'signInWithApple,signInWithGoogle,signOut,startMailImport,submitOrder,submitSub,'
    + 'toggleAccordion,toggleFabMenu,togglePw,trackDelivery,updatePassword').split(',');

  function journal(type, mod, msg){
    try{
      var D = window.CLERVIO_DIAG;
      if (D && D[type]) D[type](mod, msg);
      else if (window.console && console.warn) console.warn('[' + mod + '] ' + msg);
    }catch(e){}
  }

  var banniere = null, minuteur = null;

  function masquer(){ if (banniere) banniere.style.display = 'none'; }

  function afficher(){
    try{
      if (!document.body) return;
      if (!banniere){
        banniere = document.createElement('div');
        banniere.setAttribute('style','position:fixed;left:14px;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:99998;background:#17151A;border:1px solid rgba(255,122,102,.35);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;font:13px/1.4 -apple-system,system-ui,sans-serif;color:#EDE0C8;box-shadow:0 8px 28px rgba(0,0,0,.55);');
        var texte = document.createElement('span');
        texte.textContent = "Cette action n'a pas abouti.";
        texte.setAttribute('style','flex:1;');
        var recharger = document.createElement('button');
        recharger.textContent = 'Recharger';
        recharger.setAttribute('style','background:rgba(201,168,76,.92);color:#0A0A0C;border:none;border-radius:9px;padding:7px 13px;font:600 12px -apple-system,sans-serif;');
        recharger.onclick = function(){ try{ location.reload(); }catch(e){} };
        var fermer = document.createElement('button');
        fermer.textContent = '✕';
        fermer.setAttribute('style','background:none;border:none;color:rgba(237,224,200,.5);font-size:15px;padding:2px 4px;');
        fermer.onclick = masquer;
        banniere.appendChild(texte);
        banniere.appendChild(recharger);
        banniere.appendChild(fermer);
        document.body.appendChild(banniere);
      }
      banniere.style.display = 'flex';
      clearTimeout(minuteur);
      minuteur = setTimeout(masquer, 7000);
    }catch(e){}
  }

  function signaler(nom, err){
    journal('err', 'résilience', nom + '() a échoué : ' + ((err && err.message) || err));
    afficher();
  }

  function proteger(nom){
    var orig = window[nom];
    if (typeof orig !== 'function' || orig.__protege) return false;
    var enveloppe = function(){
      var res;
      try{
        res = orig.apply(this, arguments);
      }catch(e){
        signaler(nom, e);
        return undefined;
      }
      if (res && typeof res.then === 'function' && typeof res['catch'] === 'function'){
        return res['catch'](function(e){ signaler(nom, e); return undefined; });
      }
      return res;
    };
    enveloppe.__protege = true;
    enveloppe.__nom = nom;
    try{ window[nom] = enveloppe; }catch(e){ return false; }
    return true;
  }

  var totalProteges = 0;
  function passe(){
    var n = 0;
    for (var i = 0; i < NOMS.length; i++){ if (proteger(NOMS[i])) n++; }
    if (n){
      totalProteges += n;
      journal('log', 'résilience', n + ' gestionnaires protégés (total ' + totalProteges + ')');
    }
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', passe);
  else passe();
  window.addEventListener('load', passe);
  setTimeout(passe, 1200);
  setTimeout(passe, 3000);
})();

/* ══════ FICHIER: 16-barre.js ══════ */
/* ══ BARRE SUPÉRIEURE ════════════════════════════════════ */
/* Pose une barre normalisée (retour / CLERVIO / action) sur les   */
/* écrans configurés. N'altère aucun balisage existant : la barre  */
/* est insérée à l'exécution et le padding du bloc suivant ajusté. */
(function(){
  'use strict';
  if (window.CLERVIO_BARRE) return;
  window.CLERVIO_BARRE = true;

  /* page : { retour: id ou null } — null = pas de chevron */
  var CONFIG = {
    'p-folder':         { retour: 'p-vault'   },
    'p-add-order':      { retour: 'p-vault'   },
    'p-add-sub':        { retour: 'p-vault'   },
    'p-legal':          { retour: 'p-profile' },
    'p-privacy':        { retour: 'p-legal'   },
    'p-pro':            { retour: 'p-ob1'     },
    'p-ob2':            { retour: 'p-ob1'     },
    'p-login':          { retour: 'p-ob1'     },
    'p-cgv':            { retour: 'p-legal'   },
    'p-pricing':        { retour: 'p-profile' },
    'p-email-sources':  { retour: 'p-profile' },
    'p-forgot':         { retour: 'p-login'   },
    'p-reset-password': { retour: 'p-login'   },
    'p-orders':         { retour: null },
    'p-vault':          { retour: null },
    'p-profile':        { retour: null }
  };

  var CHEVRON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  function style(el, s){ el.setAttribute('style', s); }

  function construire(page, cfg){
    var barre = document.createElement('div');
    barre.className = 'ctb';
    style(barre, 'display:grid;grid-template-columns:44px 1fr 44px;align-items:center;'
      + 'padding:calc(env(safe-area-inset-top,0px) + 46px) 22px 14px;'
      + 'border-bottom:1px solid rgba(237,224,200,.09);flex-shrink:0;');

    var gauche = document.createElement('div');
    if (cfg.retour){
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Retour');
      style(b, 'width:34px;height:34px;border-radius:50%;border:1px solid rgba(237,224,200,.13);'
        + 'background:none;display:flex;align-items:center;justify-content:center;'
        + 'color:rgba(237,224,200,.55);cursor:pointer;padding:0;');
      b.innerHTML = CHEVRON;
      b.onclick = function(){
        try{ if (typeof window.go === 'function') window.go(cfg.retour); }catch(e){}
      };
      gauche.appendChild(b);
    }

    var titre = document.createElement('div');
    titre.textContent = 'CLERVIO';
    style(titre, 'text-align:center;font-size:12px;font-weight:500;letter-spacing:.32em;'
      + 'text-indent:.32em;color:var(--cr);font-family:Inter,-apple-system,sans-serif;');

    var droite = document.createElement('div');

    barre.appendChild(gauche);
    barre.appendChild(titre);
    barre.appendChild(droite);
    return barre;
  }

  function poser(id){
    var cfg = CONFIG[id];
    if (!cfg) return false;
    var page = document.getElementById(id);
    if (!page) return false;
    var hote = page.querySelector('.sc') || page;
    if (hote.querySelector(':scope > .ctb')) return false;

    var barre = construire(id, cfg);
    hote.insertBefore(barre, hote.firstElementChild);

    /* L'ancien chevron flottant fait doublon avec celui de la barre.
       Deux boutons retour sur un meme ecran, c'est une hesitation
       offerte a l'utilisateur pour rien. */
    var bk = page.querySelector('.bk');
    if (bk) bk.style.display = 'none';

    /* Le bloc suivant porte un padding haut prévu sans barre : on le réduit. */
    var suivant = barre.nextElementSibling;
    if (suivant && suivant.style){
      suivant.dataset.ctbPad = suivant.style.paddingTop || '';
      suivant.style.paddingTop = '14px';
    }
    return true;
  }

  function passe(){
    var n = 0;
    for (var id in CONFIG){ if (poser(id)) n++; }
    if (n){
      try{
        var D = window.CLERVIO_DIAG;
        if (D && D.log) D.log('barre', n + ' barres posées');
      }catch(e){}
    }
  }

  /* ── Écrans reconstruits en JavaScript ─────────────────── */
  /* La barre est posée hors du conteneur .sc : les rendus     */
  /* successifs réécrivent .sc sans jamais l'effacer.          */
  var DYNAMIQUES = { 'p-od':'p-orders', 'p-sd':'p-vault', 'p-scan':'p-home' };

  function ajusterContenu(sc){
    try{
      var premier = sc.firstElementChild;
      if (premier && premier.style && premier.dataset && !premier.dataset.ctbAjuste){
        premier.dataset.ctbAjuste = '1';
        premier.style.paddingTop = '14px';
      }
    }catch(e){}
  }

  function poserDynamique(id, retour){
    var page = document.getElementById(id);
    if (!page) return false;
    var sc = page.querySelector('.sc');
    if (!sc) return false;
    if (!page.querySelector('.ctb')){
      page.insertBefore(construire(id, { retour: retour }), sc);
      var bk = page.querySelector('.bk');
      if (bk) bk.style.display = 'none';
      if (window.MutationObserver){
        try{
          new MutationObserver(function(){ ajusterContenu(sc); }).observe(sc, { childList: true });
        }catch(e){}
      }
    }
    ajusterContenu(sc);
    return true;
  }

  function passeDynamique(){
    for (var id in DYNAMIQUES){
      try{ poserDynamique(id, DYNAMIQUES[id]); }catch(e){}
    }
  }

  function tout(){ passe(); passeDynamique(); }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', tout);
  else tout();
  window.addEventListener('load', tout);
  setTimeout(tout, 600);
  setTimeout(tout, 2000);
})();

/* ══════ FICHIER: 18-contexte.js ══════ */
/* ══ GARDE-FOU DE CONTEXTE ═══════════════════════════════
   Les écrans de détail n'ont de sens qu'avec un élément choisi.
   Ouverts sans contexte, ils affichent une page blanche.
   Ce module les renvoie vers leur écran parent après un délai
   assez large pour ne jamais couper un rendu en cours.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_CONTEXTE) return;
  window.CLERVIO_CONTEXTE = true;

  var PARENT = { 'p-od': 'p-orders', 'p-sd': 'p-vault', 'p-folder': 'p-vault' };
  var DELAI = 1200;

  /* Longueur du contenu réel, barre supérieure exclue. */
  function contenuUtile(page){
    try{
      var sc = page.querySelector('.sc');
      if (!sc) return 0;
      var t = '';
      for (var i = 0; i < sc.children.length; i++){
        var el = sc.children[i];
        if (el.classList && el.classList.contains('ctb')) continue;
        t += (el.textContent || '');
      }
      return t.replace(/\s+/g, '').length;
    }catch(e){ return 999; }
  }

  function verifier(id){
    try{
      var parent = PARENT[id];
      if (!parent) return;
      var page = document.getElementById(id);
      if (!page || !page.classList.contains('on')) return;
      if (contenuUtile(page) >= 12) return;
      if (window.CLERVIO_DIAG && window.CLERVIO_DIAG.log){
        window.CLERVIO_DIAG.log('contexte', id + ' ouvert sans donnée, retour vers ' + parent);
      }
      if (typeof window.go === 'function') window.go(parent);
    }catch(e){}
  }

  function enrober(){
    if (typeof window.go !== 'function' || window.go.__contexte) return;
    var orig = window.go;
    var enveloppe = function(id){
      var r = orig.apply(window, arguments);
      if (PARENT[id]) setTimeout(function(){ verifier(id); }, DELAI);
      return r;
    };
    enveloppe.__contexte = true;
    window.go = enveloppe;
    if (window.CLERVIO_DIAG && window.CLERVIO_DIAG.log){
      window.CLERVIO_DIAG.log('contexte', 'garde-fou actif');
    }
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', enrober);
  else enrober();
  window.addEventListener('load', enrober);
  setTimeout(enrober, 800);
  setTimeout(enrober, 2500);
})();

/* ══════ FICHIER: 20-profil.js ══════ */
/* ══ PROFIL ══════════════════════════════════════════════
   Alimente l'en-tête du profil : nom, initiale, offre,
   et l'anneau de progression de la période d'essai.
   Ces champs n'étaient alimentés par personne — le nom
   restait un tiret, et le badge annonçait « Premium »
   à des utilisateurs qui n'ont jamais payé.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_PROFIL) return;
  window.CLERVIO_PROFIL = true;

  var C = 245; /* circonférence : 2 × π × 39 */

  function journal(type, msg){
    try{ var D = window.CLERVIO_DIAG; if (D && D[type]) D[type]('profil', msg); }catch(e){}
  }

  function jours(a, b){
    return Math.ceil((a.getTime() - b.getTime()) / 86400000);
  }

  function libelle(n){
    if (n <= 0) return 'Essai terminé';
    if (n === 1) return 'Essai — dernier jour';
    return 'Essai — ' + n + ' jours restants';
  }

  function poser(profil, utilisateur){
    try{
      var email = (utilisateur && utilisateur.email) || '';
      var nom = (profil && (profil.full_name || profil.name)) || email.split('@')[0] || 'Vous';

      var elNom = document.getElementById('profile-name');
      if (elNom) elNom.textContent = nom;

      var elInit = document.getElementById('prof-init');
      if (elInit) elInit.textContent = (nom.charAt(0) || '?').toUpperCase();

      /* Ligne « Abonnement » des réglages : elle annonçait
         « Premium · 4,99 €/mois » à tout le monde, y compris
         aux comptes gratuits. */
      try{
        var at = document.getElementById('prof-abo-titre');
        var ad = document.getElementById('prof-abo-detail');
        var lib = (profil && profil.libelle_offre) || null;
        if (at) at.textContent = 'Abonnement';
        if (ad){
          var p = (profil && profil.plan) || 'gratuit';
          if (p === 'gratuit')        ad.textContent = 'Découverte · gratuit';
          else if (p === 'trial')     ad.textContent = 'Essai en cours';
          else if (p === 'essentiel') ad.textContent = 'Essentiel · 4,99 €/mois';
          else if (p === 'famille')   ad.textContent = 'Famille · 8,99 €/mois';
          else if (p === 'pro')       ad.textContent = 'Intégral · 14,99 €/mois';
          else if (p && p.indexOf('pro_') === 0) ad.textContent = 'Offre professionnelle';
          else ad.textContent = lib || 'Découverte · gratuit';
        }
      }catch(e){}

      var plan = (profil && profil.plan) || 'gratuit';
      var fin  = profil && profil.trial_ends_at ? new Date(profil.trial_ends_at) : null;
      var arc  = document.getElementById('prof-arc');
      var badge = document.getElementById('profile-badge');

      if (plan === 'trial' && fin){
        var restants = Math.max(0, jours(fin, new Date()));
        var part = Math.max(0, Math.min(1, restants / 30));
        if (arc){
          arc.style.stroke = restants <= 7 ? '#E0A05A' : 'var(--g)';
          arc.style.strokeDashoffset = String(Math.round(C * (1 - part)));
        }
        if (badge) badge.textContent = libelle(restants);
        journal('log', 'essai, ' + restants + ' jours restants');
      } else if (plan === 'expire'){
        if (arc){ arc.style.stroke = '#E0A05A'; arc.style.strokeDashoffset = String(C); }
        if (badge) badge.textContent = 'Essai terminé';
      } else {
        /* Abonné : l'anneau est plein, il marque l'appartenance */
        if (arc){ arc.style.stroke = 'var(--g)'; arc.style.strokeDashoffset = '0'; }
        if (badge) badge.textContent = 'Abonné · 4,99 € / mois';
      }
    }catch(e){ journal('err', 'affichage : ' + (e && e.message ? e.message : e)); }
  }

  async function charger(){
    try{
      if (typeof currentUser === 'undefined' || !currentUser) return false;

      var profil = (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile : null;

      if (!profil && typeof supa !== 'undefined' && supa){
        var r = await supa.from('profiles')
          .select('full_name,plan,trial_ends_at')
          .eq('id', currentUser.id).maybeSingle();
        if (r && r.data) profil = r.data;
      }

      poser(profil, currentUser);
      return true;
    }catch(e){ journal('err', 'chargement : ' + (e && e.message ? e.message : e)); return false; }
  }

  window.rafraichirProfil = charger;

  /* Le compteur d'e-mails connectés vit dans js/11-email.js,
     mais ce module ne sait pas quand le profil s'ouvre. */
  function chargerAvecCompteurs(){
    charger();
    try{ if (typeof window.rafraichirCompteurEmails === 'function') window.rafraichirCompteurEmails(); }catch(e){}
  }

  /* L'écran profil peut être atteint à tout moment : on rafraîchit
     à l'ouverture plutôt qu'une seule fois au démarrage. */
  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__profil) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-profile') setTimeout(chargerAvecCompteurs, 60);
      return r;
    };
    w.__profil = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 900);
  setTimeout(charger, 2500);
})();

/* ══════ FICHIER: 21-concierge.js ══════ */
/* ══ CONCIERGE ═══════════════════════════════════════════
   Le concierge annonce ce qu'il connaît, et propose des
   questions tirées du coffre réel plutôt qu'une liste figée.
   Corrige aussi une affirmation fausse : l'écran annonçait
   « Disponible » alors que le service ne répond pas encore.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_CONCIERGE) return;
  window.CLERVIO_CONCIERGE = true;

  function n(v){ return Array.isArray(v) ? v.length : 0; }

  function lire(nom){
    try{ return typeof window[nom] !== 'undefined' ? window[nom] : (eval(nom) || []); }
    catch(e){ return []; }
  }

  function collections(){
    var o = [], w = [], s = [];
    try{ o = (typeof ORDS !== 'undefined' && Array.isArray(ORDS)) ? ORDS : []; }catch(e){}
    try{ w = (typeof WARR !== 'undefined' && Array.isArray(WARR)) ? WARR : []; }catch(e){}
    try{ s = (typeof SUBS !== 'undefined' && Array.isArray(SUBS)) ? SUBS : []; }catch(e){}
    return { o: o, w: w, s: s };
  }

  function portee(){
    var el = document.getElementById('ai-portee');
    if (!el) return;
    var c = collections();
    var total = n(c.o) + n(c.w) + n(c.s);

    if (total === 0){
      el.textContent = "Votre coffre est vide. Ajoutez un achat pour que je puisse vous répondre.";
      return;
    }

    var bouts = [];
    if (n(c.o)) bouts.push(n(c.o) + (n(c.o) > 1 ? ' commandes' : ' commande'));
    if (n(c.w)) bouts.push(n(c.w) + (n(c.w) > 1 ? ' garanties' : ' garantie'));
    if (n(c.s)) bouts.push(n(c.s) + (n(c.s) > 1 ? ' abonnements' : ' abonnement'));

    var liste = bouts.length > 1
      ? bouts.slice(0, -1).join(', ') + ' et ' + bouts[bouts.length - 1]
      : bouts[0];

    el.textContent = 'Je connais ' + liste + '.';
  }

  function suggestions(){
    var zone = document.getElementById('aisugg');
    if (!zone) return;
    var boutons = zone.querySelectorAll('button');
    if (!boutons.length) return;

    var c = collections();
    var propositions = [];

    /* Une garantie qui approche de son terme prime sur tout le reste */
    var urgente = null;
    for (var i = 0; i < c.w.length; i++){
      var d = Number(c.w[i] && c.w[i].days);
      if (!isNaN(d) && d > 0 && d <= 120 && (!urgente || d < Number(urgente.days))) urgente = c.w[i];
    }
    if (urgente) propositions.push('Quelles garanties expirent bientôt ?');

    if (c.s.length){
      propositions.push('Combien me coûtent mes abonnements par an ?');
    }

    var enRoute = null;
    for (var j = 0; j < c.o.length; j++){
      var st = String((c.o[j] && c.o[j].st) || '').toLowerCase();
      if (st.indexOf('transit') > -1 || st.indexOf('expédi') > -1){ enRoute = c.o[j]; break; }
    }
    if (enRoute && enRoute.brand){
      propositions.push('Où en est ma commande ' + String(enRoute.brand) + ' ?');
    }

    if (c.o.length) propositions.push('Combien ai-je dépensé ce mois-ci ?');
    propositions.push('Que peux-tu faire pour moi ?');

    for (var k = 0; k < boutons.length; k++){
      if (propositions[k]) {
        boutons[k].textContent = propositions[k];
        boutons[k].style.display = '';
      } else {
        boutons[k].style.display = 'none';
      }
    }
  }

  function rafraichir(){
    try{ portee(); suggestions(); }
    catch(e){
      try{ if (window.CLERVIO_DIAG) window.CLERVIO_DIAG.err('concierge', String(e && e.message || e)); }catch(x){}
    }
  }
  window.rafraichirConcierge = rafraichir;

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__concierge) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-ai') setTimeout(rafraichir, 70);
      return r;
    };
    w.__concierge = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 900);
  setTimeout(rafraichir, 2600);
})();

/* ══════ FICHIER: 22-coffre.js ══════ */
/* ══ COFFRE — FICHIERS ═══════════════════════════════════
   Dépôt, ouverture et suppression des pièces justificatives.
   Le compartiment est privé : toute lecture passe par un lien
   signé, valable cinq minutes.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_COFFRE) return;
  window.CLERVIO_COFFRE = true;

  var BUCKET = 'coffre';
  var TYPES = {
    'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png',
    'image/webp':'webp', 'image/heic':'heic', 'image/heif':'heif'
  };
  var MAX_OCTETS = 10 * 1024 * 1024;

  function journal(type, msg){
    try{ var D = window.CLERVIO_DIAG; if (D && D[type]) D[type]('coffre', msg); }catch(e){}
  }
  function dire(msg){
    try{ if (typeof window.toast === 'function') window.toast(msg); }catch(e){}
  }
  function pret(){
    try{ return (typeof supa !== 'undefined' && supa)
              && (typeof currentUser !== 'undefined' && currentUser && currentUser.id); }
    catch(e){ return false; }
  }

  /* ── État du coffre ──────────────────────────────────── */
  async function etat(){
    if (!pret()) return null;
    try{
      var r = await supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id });
      return (r && r.data) ? r.data : null;
    }catch(e){ journal('err', 'état : ' + (e && e.message || e)); return null; }
  }

  /* ── Dépôt d'un fichier, sans analyse ────────────────── */
  async function deposer(fichier, meta){
    if (!pret()){ dire('Connectez-vous pour ajouter un document.'); return null; }
    if (!fichier){ return null; }

    var mime = String(fichier.type || '').toLowerCase();
    if (!TYPES[mime]){
      dire('Format non accepté. Utilisez un PDF ou une photo.');
      return null;
    }
    if (fichier.size > MAX_OCTETS){
      dire('Fichier trop volumineux — 10 Mo maximum.');
      return null;
    }

    var e = await etat();
    if (e && (Number(e.documents) >= Number(e.documents_max) || Number(e.mo) >= Number(e.mo_max))){
      dire('Coffre plein : ' + e.documents + ' documents sur ' + e.documents_max + '. Supprimez-en un pour continuer.');
      return null;
    }

    try{
      var chemin = currentUser.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.' + TYPES[mime];
      var up = await supa.storage.from(BUCKET).upload(chemin, fichier, { contentType: mime, upsert: false });
      if (up && up.error){ journal('err', 'dépôt : ' + up.error.message); dire("Le dépôt a échoué."); return null; }

      meta = meta || {};
      var ligne = {
        user_id: currentUser.id,
        name: meta.nom || fichier.name || 'Document',
        type: meta.type || 'facture',
        brand: meta.marque || null,
        amount: meta.montant != null ? meta.montant : null,
        currency: meta.devise || 'EUR',
        doc_date: meta.date || null,
        warranty_months: meta.garantie_mois != null ? meta.garantie_mois : null,
        folder_id: meta.dossier || null,
        source: meta.source || 'manuel',
        file_path: chemin,
        file_size: fichier.size,
        file_mime: mime,
        file_added_at: new Date().toISOString()
      };

      var ins = await supa.from('vault_documents').insert(ligne).select('id').maybeSingle();
      if (ins && ins.error){
        /* La fiche a échoué : on ne laisse pas le fichier orphelin */
        try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){}
        journal('err', 'fiche : ' + ins.error.message);
        dire("L'enregistrement a échoué.");
        return null;
      }

      journal('log', 'document déposé (' + Math.round(fichier.size/1024) + ' Ko)');
      dire('Document ajouté à votre coffre.');
      return { id: ins && ins.data ? ins.data.id : null, chemin: chemin };
    }catch(err){
      journal('err', 'dépôt : ' + (err && err.message || err));
      dire("Le dépôt a échoué.");
      return null;
    }
  }

  /* ── Ouverture : lien signé, cinq minutes ────────────── */
  async function ouvrir(chemin){
    if (!pret() || !chemin) return;
    try{
      var r = await supa.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (r && r.data && r.data.signedUrl){
        window.open(r.data.signedUrl, '_blank', 'noopener');
      } else {
        journal('err', 'lien signé indisponible');
        dire("Impossible d'ouvrir ce document.");
      }
    }catch(e){
      journal('err', 'ouverture : ' + (e && e.message || e));
      dire("Impossible d'ouvrir ce document.");
    }
  }

  /* ── Suppression : la fiche part, le fichier suit ───── */
  async function supprimer(id){
    if (!pret() || !id) return false;
    try{
      var r = await supa.from('vault_documents').delete().eq('id', id);
      if (r && r.error){ journal('err', 'suppression : ' + r.error.message); return false; }
      journal('log', 'document supprimé');
      dire('Document supprimé.');
      return true;
    }catch(e){ journal('err', 'suppression : ' + (e && e.message || e)); return false; }
  }

  /* ── Sélecteur de fichier, sans passer par le scan ──── */
  function choisir(meta){
    try{
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
      input.style.display = 'none';
      input.onchange = async function(){
        var f = input.files && input.files[0];
        input.remove();
        if (!f) return;
        var res = await deposer(f, meta);
        if (res && typeof window.renderVault === 'function'){
          try{ window.renderVault(); }catch(e){}
        }
      };
      document.body.appendChild(input);
      input.click();
    }catch(e){ journal('err', 'sélecteur : ' + (e && e.message || e)); }
  }

  /* ── Rafraîchissement de la vue coffre ─────────────── */
  function rafraichirCoffre(){
    try{
      if (typeof rechargerDonnees === 'function') { rechargerDonnees(); return; }
      if (typeof renderVault === 'function') { renderVault(); return; }
      if (typeof window.go === 'function') window.go('p-vault');
    }catch(e){ journal('err', 'rafraîchissement : ' + (e && e.message || e)); }
  }

  /* ── Suppression depuis l'interface, avec confirmation ── */
  async function supprimerDepuisVue(id){
    if (!id) return;
    var ok = true;
    try{ ok = window.confirm('Supprimer ce document ? Le fichier sera effacé définitivement.'); }catch(e){}
    if (!ok) return;
    var fait = await supprimer(id);
    if (fait) setTimeout(rafraichirCoffre, 250);
  }

  window.supprimerDocument = supprimerDepuisVue;
  window.rafraichirCoffre  = rafraichirCoffre;
  window.coffreEtat       = etat;
  window.coffreDeposer    = deposer;
  window.coffreOuvrir     = ouvrir;
  window.coffreSupprimer  = supprimer;
  window.ajouterDocument  = choisir;
})();

/* ══════ FICHIER: 23-quota.js ══════ */
/* ══ JAUGE D'OFFRE ═══════════════════════════════════════
   Montre à l'utilisateur où il en est, et propose de monter
   quand il approche — jamais quand il bute.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_QUOTA) return;
  window.CLERVIO_QUOTA = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('offre',m); }catch(e){} }
  function pret(){
    try{ return (typeof supa!=='undefined'&&supa)&&(typeof currentUser!=='undefined'&&currentUser&&currentUser.id); }
    catch(e){ return false; }
  }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }

  function barre(part, alerte){
    var pct = Math.max(0, Math.min(100, Math.round(part*100)));
    var teinte = alerte
      ? 'linear-gradient(90deg,#C98A4A,#E0A05A)'
      : 'linear-gradient(90deg,var(--gd),var(--g) 55%,var(--gh))';
    return '<div style="height:3px;background:rgba(237,224,200,.07);border-radius:3px;overflow:hidden;margin-top:9px;">'
         + '<div style="height:100%;width:' + pct + '%;background:' + teinte + ';border-radius:3px;'
         + 'transition:width .9s cubic-bezier(0.16,1,0.3,1);"></div></div>';
  }

  function ligne(libelle, utilise, max, alerte){
    if (max < 0) return '';
    return '<div style="margin-bottom:15px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
      + '<span style="font-size:13px;color:var(--cr);">' + esc(libelle) + '</span>'
      + '<span style="font-family:\'Cormorant Garamond\',serif;font-size:1.05rem;color:'
      + (alerte ? '#E0A05A' : 'var(--cr)') + ';">' + utilise
      + '<span style="font-size:.68em;color:var(--d2);"> / ' + max + '</span></span></div>'
      + barre(max ? utilise/max : 0, alerte) + '</div>';
  }

  async function rendre(){
    var bloc = document.getElementById('quota-bloc');
    if (!bloc || !pret()) return;

    try{
      var [el, doc, al] = await Promise.all([
        supa.rpc('verifier_quota', { p_user_id: currentUser.id, p_action: 'element' }),
        supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id }),
        supa.rpc('verifier_quota', { p_user_id: currentUser.id, p_action: 'alerte' })
      ]);

      var e = el && el.data, d = doc && doc.data, a = al && al.data;
      if (!e) return;

      var illimite = Number(e.max) < 0;
      if (illimite && (!d || Number(d.documents_max) <= 0)) { bloc.style.display='none'; return; }

      /* On alerte à 70 %, pas à 100 : proposer avant de buter. */
      var partEl  = illimite ? 0 : Number(e.used)/Math.max(1,Number(e.max));
      var partDoc = d ? Number(d.documents)/Math.max(1,Number(d.documents_max)) : 0;
      var proche  = partEl >= 0.7 || partDoc >= 0.7;

      var html = '<div style="background:linear-gradient(158deg,#161419,#100F13 62%,#0C0B0E);'
        + 'border-radius:19px;padding:19px 20px;'
        + 'box-shadow:0 0 0 1px ' + (proche ? 'rgba(224,160,90,.28)' : 'rgba(237,224,200,.075)')
        + ',inset 0 1px 0 rgba(255,255,255,.045),0 6px 22px rgba(0,0,0,.46);">'
        + '<div style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--d2);margin-bottom:16px;">'
        + 'Votre offre · ' + esc(e.libelle || '') + '</div>';

      html += ligne('Achats suivis', Number(e.used), Number(e.max), partEl >= 0.7);
      if (d) html += ligne('Documents', Number(d.documents), Number(d.documents_max), partDoc >= 0.7);
      if (a && Number(a.max) >= 0) html += ligne('Alertes envoyées', Number(a.used), Number(a.max), false);

      if (proche || (a && Number(a.max) >= 0 && Number(a.remaining) === 0)){
        html += '<div style="margin-top:4px;padding-top:15px;border-top:1px solid rgba(237,224,200,.07);">'
          + '<p style="font-size:12.5px;color:var(--d1);line-height:1.55;margin-bottom:13px;">'
          + 'CLERVIO continue de détecter vos achats. Passez à Essentiel pour qu\'il puisse tout garder.</p>'
          + '<button onclick="go(\'p-pricing\')" style="width:100%;height:46px;border:none;border-radius:100px;'
          + 'cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;color:#0B0906;'
          + 'background:linear-gradient(102deg,var(--gd),var(--g) 26%,var(--gh) 52%,var(--g) 78%,var(--gd));'
          + 'box-shadow:0 6px 22px rgba(201,168,76,.20),inset 0 1px 0 rgba(255,255,255,.35);">'
          + 'Voir les offres</button></div>';
      }

      html += '</div>';
      bloc.innerHTML = html;
      bloc.style.display = 'block';
      journal('log', e.used + '/' + e.max + ' achats suivis');
    }catch(err){
      journal('err', 'jauge : ' + ((err && err.message) || err));
    }
  }

  window.rafraichirQuota = rendre;

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__quota) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-profile') setTimeout(rendre, 90);
      return r;
    };
    w.__quota = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 1000);
})();

/* ══════ FICHIER: 24-offres.js ══════ */
/* ══ OFFRES ══════════════════════════════════════════════
   Les tarifs affichés viennent de la base, jamais du HTML.

   Raison d'être : ce soir, l'écran tarifs annonçait encore
   « 30 jours d'essai » et « Premium » — un modèle remplacé
   quelques heures plus tôt. La règle vivait dans plan_limites,
   le discours dans le balisage, et rien ne les reliait.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_OFFRES) return;
  window.CLERVIO_OFFRES = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('offres',m); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }
  function euros(cents){
    return (Number(cents)/100).toFixed(2).replace('.', ',');
  }

  var cache = null;

  async function charger(){
    if (cache) return cache;
    try{
      if (typeof supa === 'undefined' || !supa) return null;
      var r = await supa.from('plan_limites')
        .select('plan,libelle,prix_cents,ordre,actif,usage_pro,elements_max,alertes_max,documents_max,notes')
        .eq('actif', true).order('ordre');
      if (r && r.error){ journal('err', r.error.message); return null; }
      cache = (r && r.data) ? r.data : null;
      return cache;
    }catch(e){ journal('err', String(e && e.message || e)); return null; }
  }

  function ligne(txt){
    return '<div style="font-size:13px;color:var(--d1);line-height:1.5;">' + esc(txt) + '</div>';
  }

  function carte(o, accent){
    var illimite = function(v){ return Number(v) < 0; };
    var details = [];

    if (illimite(o.elements_max)) details.push('Achats suivis sans limite');
    else details.push(o.elements_max + ' achats suivis');

    if (illimite(o.alertes_max)) details.push('Alertes illimitées');
    else details.push(o.alertes_max + ' alertes avant échéance');

    details.push(o.documents_max + ' documents conservés');

    var fond = accent
      ? 'linear-gradient(158deg,#1A1712,#131009 62%,#0D0B07)'
      : 'linear-gradient(158deg,#161419,#100F13 62%,#0C0B0E)';
    var filet = accent ? 'rgba(201,168,76,.26)' : 'rgba(237,224,200,.075)';
    var prix = Number(o.prix_cents) === 0
      ? '<span style="font-family:\'Cormorant Garamond\',serif;font-size:2.5rem;font-weight:300;color:var(--cr);line-height:1;">Gratuit</span>'
      : '<span style="font-family:\'Cormorant Garamond\',serif;font-size:2.5rem;font-weight:300;line-height:1;'
        + (accent ? 'background:linear-gradient(120deg,var(--gh),var(--g));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;' : 'color:var(--cr);')
        + '">' + euros(o.prix_cents) + '<span style="font-size:.42em;color:var(--d2);-webkit-text-fill-color:var(--d2);"> €/mois</span></span>';

    return '<div style="padding:24px;margin-bottom:12px;border-radius:19px;background:' + fond
      + ';box-shadow:0 0 0 1px ' + filet + ',inset 0 1px 0 rgba(255,255,255,.045),0 6px 22px rgba(0,0,0,.46);">'
      + '<div style="font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--d2);margin-bottom:12px;">'
      + esc(o.libelle) + '</div>'
      + '<div style="margin-bottom:16px;">' + prix + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:9px;">' + details.map(ligne).join('') + '</div>'
      + '</div>';
  }

  async function rendre(){
    var hote = document.getElementById('offres-liste');
    if (!hote) return;
    var offres = await charger();
    if (!offres || !offres.length) return;   /* on laisse le HTML de secours */

    var visibles = offres.filter(function(o){ return o.usage_pro !== true && o.plan !== 'trial' && o.plan !== 'expire'; });
    if (!visibles.length) return;

    var payantes = visibles.filter(function(o){ return Number(o.prix_cents) > 0; });
    var mise = payantes.length ? payantes[0].plan : null;

    hote.innerHTML = visibles.map(function(o){ return carte(o, o.plan === mise); }).join('');
    journal('log', visibles.length + ' offres affichées depuis la base');
  }

  window.rafraichirOffres = rendre;

  /* La page professionnelle promet un export et une TVA qui
     n'existent pas encore : accessible par lien, pas au tout-venant. */
  function ouvrirPro(){
    try{
      if (location.search.indexOf('pro=1') === -1) return;
      var b = document.getElementById('ob1-pro');
      if (b) b.style.display = 'block';
    }catch(e){}
  }

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__offres) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-pricing') setTimeout(rendre, 80);
      return r;
    };
    w.__offres = true;
    window.go = w;
  }

  function demarrer(){ surNavigation(); ouvrirPro(); }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
  window.addEventListener('load', demarrer);
  setTimeout(demarrer, 1000);
})();

/* ══════ FICHIER: 25-facture.js ══════ */
/* ══ FACTURE D'UNE COMMANDE ══════════════════════════════
   Attacher, ouvrir et retirer la pièce justificative d'un achat.
   Une facture qu'on ne retrouve pas depuis sa commande ne sert
   à rien le jour d'un litige.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_FACTURE) return;
  window.CLERVIO_FACTURE = true;

  var BUCKET = 'coffre';
  var TYPES = {
    'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png',
    'image/webp':'webp', 'image/heic':'heic', 'image/heif':'heif'
  };
  var MAX = 10 * 1024 * 1024;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('facture',m); }catch(e){} }
  function dire(m){ try{ if (typeof window.toast === 'function') window.toast(m); }catch(e){} }
  function pret(){
    try{ return (typeof supa!=='undefined'&&supa)&&(typeof currentUser!=='undefined'&&currentUser&&currentUser.id); }
    catch(e){ return false; }
  }

  /* ── Attacher ── */
  function attacher(orderId){
    if (!pret()){ dire('Connectez-vous pour ajouter une facture.'); return; }
    try{
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
      input.style.display = 'none';

      input.onchange = async function(){
        var f = input.files && input.files[0];
        input.remove();
        if (!f) return;

        var mime = String(f.type || '').toLowerCase();
        if (!TYPES[mime]){ dire('Format non accepté. Utilisez un PDF ou une photo.'); return; }
        if (f.size > MAX){ dire('Fichier trop volumineux — 10 Mo maximum.'); return; }

        try{
          var e = await supa.rpc('stockage_utilisateur', { p_user_id: currentUser.id });
          var st = e && e.data;
          if (st && (Number(st.documents) >= Number(st.documents_max) || Number(st.mo) >= Number(st.mo_max))){
            dire('Coffre plein : ' + st.documents + ' documents sur ' + st.documents_max + '.');
            return;
          }
        }catch(err){ /* le quota ne doit pas bloquer si indisponible */ }

        dire('Envoi de la facture…');
        try{
          var chemin = currentUser.id + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '.' + TYPES[mime];
          var up = await supa.storage.from(BUCKET).upload(chemin, f, { contentType: mime, upsert: false });
          if (up && up.error){ journal('err','dépôt : '+up.error.message); dire("L'envoi a échoué."); return; }

          var maj = await supa.from('orders')
            .update({ invoice_path: chemin, invoice_size: f.size, invoice_mime: mime })
            .eq('id', orderId).eq('user_id', currentUser.id);

          if (maj && maj.error){
            try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){}
            journal('err','liaison : '+maj.error.message);
            dire("L'enregistrement a échoué.");
            return;
          }

          journal('log','facture attachée (' + Math.round(f.size/1024) + ' Ko)');
          dire('Facture ajoutée à la commande.');
          if (typeof rechargerDonnees === 'function') { try{ await rechargerDonnees(); }catch(x){} }
          if (typeof showOrd === 'function') { try{ showOrd(orderId); }catch(x){} }
        }catch(err){
          journal('err','attache : ' + ((err && err.message) || err));
          dire("L'envoi a échoué.");
        }
      };

      document.body.appendChild(input);
      input.click();
    }catch(e){ journal('err','sélecteur : ' + ((e && e.message) || e)); }
  }

  /* ── Ouvrir : lien signé, cinq minutes ── */
  async function ouvrir(chemin){
    if (!pret() || !chemin) return;
    try{
      var r = await supa.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (r && r.data && r.data.signedUrl) window.open(r.data.signedUrl, '_blank', 'noopener');
      else dire("Impossible d'ouvrir cette facture.");
    }catch(e){
      journal('err','ouverture : ' + ((e && e.message) || e));
      dire("Impossible d'ouvrir cette facture.");
    }
  }

  /* ── Retirer ── */
  async function retirer(orderId, chemin){
    if (!pret() || !orderId) return;
    var ok = true;
    try{ ok = window.confirm('Retirer cette facture ? Le fichier sera effacé définitivement.'); }catch(e){}
    if (!ok) return;
    try{
      var maj = await supa.from('orders')
        .update({ invoice_path: null, invoice_size: null, invoice_mime: null })
        .eq('id', orderId).eq('user_id', currentUser.id);
      if (maj && maj.error){ journal('err','retrait : '+maj.error.message); return; }
      if (chemin){ try{ await supa.storage.from(BUCKET).remove([chemin]); }catch(x){} }
      dire('Facture retirée.');
      if (typeof rechargerDonnees === 'function') { try{ await rechargerDonnees(); }catch(x){} }
      if (typeof showOrd === 'function') { try{ showOrd(orderId); }catch(x){} }
    }catch(e){ journal('err','retrait : ' + ((e && e.message) || e)); }
  }

  /* ── Déplacer une commande vers le coffre ──────────────
     Une facture déjà réglée classée en « commande » n'a pas
     de sens : on la déplace sans perdre la pièce jointe. */
  async function versLeCoffre(orderId){
    if (!pret() || !orderId) return;
    var ok = true;
    try{ ok = window.confirm('Ranger cet achat dans votre coffre ? Il ne sera plus suivi comme une commande en cours.'); }catch(e){}
    if (!ok) return;

    try{
      var r = await supa.from('orders')
        .select('brand,name,amount,currency,order_date,warranty_months,invoice_path,invoice_size,invoice_mime')
        .eq('id', orderId).eq('user_id', currentUser.id).maybeSingle();
      if (!r || r.error || !r.data){ dire("Commande introuvable."); return; }
      var o = r.data;

      var ins = await supa.from('vault_documents').insert({
        user_id: currentUser.id,
        name: o.name || o.brand || 'Document',
        type: 'facture',
        brand: o.brand || null,
        amount: o.amount || null,
        currency: o.currency || 'EUR',
        doc_date: o.order_date || null,
        warranty_months: o.warranty_months || null,
        source: 'deplace',
        file_path: o.invoice_path || null,
        file_size: o.invoice_size || null,
        file_mime: o.invoice_mime || null,
        file_added_at: new Date().toISOString()
      });
      if (ins && ins.error){ journal('err','copie : '+ins.error.message); dire("Le déplacement a échoué."); return; }

      /* On détache la pièce avant de supprimer : le déclencheur de
         suppression effacerait sinon le fichier qu'on vient de reprendre. */
      await supa.from('orders')
        .update({ invoice_path: null, invoice_size: null, invoice_mime: null })
        .eq('id', orderId).eq('user_id', currentUser.id);

      var del = await supa.from('orders').delete().eq('id', orderId).eq('user_id', currentUser.id);
      if (del && del.error){ journal('err','suppression : '+del.error.message); }

      journal('log','achat déplacé vers le coffre');
      dire('Rangé dans votre coffre.');
      if (typeof rechargerDonnees === 'function'){ try{ await rechargerDonnees(); }catch(x){} }
      if (typeof window.go === 'function') window.go('p-vault');
    }catch(e){
      journal('err','déplacement : ' + ((e && e.message) || e));
      dire("Le déplacement a échoué.");
    }
  }

  window.rangerDansCoffre = versLeCoffre;
  window.attacherFacture = attacher;
  window.ouvrirFacture   = ouvrir;
  window.retirerFacture  = retirer;
})();

/* ══════ FICHIER: 26-motdepasse.js ══════ */
/* ══ MOT DE PASSE OUBLIÉ ═════════════════════════════════
   Le bouton « Envoyer le lien » appelait sendResetEmail(),
   fonction absente des dix-neuf modules. Quelqu'un bloqué
   hors de son compte appuyait, et rien ne se passait —
   ni erreur, ni message. Trouvé en vérifiant ce parcours.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_RESET) return;
  window.CLERVIO_RESET = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('mdp',m); }catch(e){} }

  function valide(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim());
  }

  window.sendResetEmail = async function(){
    var champ = document.getElementById('forgot-email');
    var email = champ ? champ.value.trim() : '';
    var confirmation = document.getElementById('forgot-confirm');
    var bouton = document.querySelector('#p-forgot .bg');

    if (!valide(email)){
      if (champ){ champ.style.boxShadow = '0 0 0 1px rgba(224,138,122,.6)'; champ.focus(); }
      return;
    }
    if (champ) champ.style.boxShadow = '';

    if (typeof supa === 'undefined' || !supa){
      journal('err', 'client Supabase indisponible');
      return;
    }

    var libelle = bouton ? bouton.textContent : '';
    if (bouton){ bouton.textContent = 'Envoi…'; bouton.disabled = true; }

    try{
      var r = await supa.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + '/?reset=1'
      });

      /* Toujours confirmer, que l'adresse existe ou non : révéler
         l'inexistence d'un compte est une fuite d'information. */
      if (confirmation) confirmation.style.display = 'block';
      if (champ) champ.value = '';
      journal('log', r && r.error ? 'échec silencieux, confirmation affichée quand même' : 'lien envoyé');
    }catch(e){
      if (confirmation) confirmation.style.display = 'block';
      journal('err', 'reset : ' + ((e && e.message) || e));
    }finally{
      if (bouton){ bouton.textContent = libelle || 'Envoyer le lien'; bouton.disabled = false; }
    }
  };
})();

/* ══════ FICHIER: 27-agir.js ══════ */
/* ══ AIDER À AGIR ════════════════════════════════════════
   CLERVIO détectait et alertait, sans jamais aider à faire
   quoi que ce soit avec cette information. Une alerte de
   renouvellement ne change presque jamais le comportement
   toute seule — il faut un texte prêt, pas juste une date.

   Choix délibéré : aucun annuaire d'adresses par marchand.
   Les contacts changent sans prévenir ; un lien mort casse
   la confiance. La lettre, elle, ne se périme jamais —
   l'utilisateur l'envoie où le marchand le lui permet.
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.CLERVIO_AGIR) return;
  window.CLERVIO_AGIR = true;

  function journal(t,m){ try{ var D=window.CLERVIO_DIAG; if(D&&D[t]) D[t]('agir',m); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }
  function dateFR(iso){
    if (!iso) return null;
    try{ return new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e){ return iso; }
  }
  function joursRestants(iso){
    if (!iso) return null;
    try{ return Math.ceil((new Date(iso+'T00:00:00') - new Date()) / 86400000); }
    catch(e){ return null; }
  }

  /* ── Résiliation ── */
  function genererResiliation(sub){
    var nom = sub.name || sub.brand || 'ce service';
    var depart = dateFR(sub.start_date || sub.startDate);
    var montant = (sub.amount || sub.amt) ? Number(sub.amount || sub.amt).toFixed(2).replace('.',',') + ' €' : null;

    var lignes = [];
    lignes.push('Objet : Résiliation de mon abonnement — ' + nom);
    lignes.push('');
    lignes.push('Madame, Monsieur,');
    lignes.push('');
    lignes.push('Je vous informe par la présente de ma décision de résilier mon abonnement ' + nom
      + (depart ? ', souscrit le ' + depart : '') + '.');
    lignes.push('');
    lignes.push('Je vous demande de bien vouloir prendre en compte cette résiliation dans les meilleurs délais et de m\'en confirmer la prise en effet, ainsi que la date d\'arrêt des prélèvements' + (montant ? ' (actuellement ' + montant + ')' : '') + '.');
    lignes.push('');
    lignes.push('Je vous remercie de votre compréhension.');
    lignes.push('');
    lignes.push('Cordialement.');
    return lignes.join('\\n');
  }

  /* ── Réclamation : rétractation, garantie commerciale, ou garantie légale ── */
  function genererReclamation(o){
    var nom = o.name || o.brand || 'cet article';
    var marque = o.brand || '';
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = o.order_number || o.orderNumber || o.tracking || null;
    var montant = o.amount ? Number(o.amount).toFixed(2).replace('.',',') + ' €' : null;

    var joursRetour = joursRestants(o.return_deadline || o.returnDeadline);
    var joursGarantie = joursRestants(o.warranty_ends_at || o.warrantyEndsAt);

    var lignes = [];

    if (joursRetour !== null && joursRetour >= 0){
      /* Droit de rétractation encore ouvert */
      lignes.push('Objet : Exercice de mon droit de rétractation — Commande ' + (numero ? 'n° ' + numero : nom));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('Par la présente, j\\'exerce mon droit de rétractation concernant ma commande de ' + nom
        + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ', passée le ' + achat : '')
        + (numero ? ', référence ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Conformément à l\\'article L221-18 du Code de la consommation, je dispose de 14 jours pour me rétracter sans avoir à justifier de motif. Je vous demande de bien vouloir procéder au remboursement' + (montant ? ' de ' + montant : '') + ' selon les modalités prévues.');
      lignes.push('');
      lignes.push('Je me tiens à votre disposition pour les modalités de retour du produit.');
      lignes.push('');
      lignes.push('Cordialement.');
    } else if (joursGarantie !== null && joursGarantie >= 0){
      /* Garantie commerciale du vendeur, encore valide */
      lignes.push('Objet : Mise en œuvre de la garantie — ' + nom + (numero ? ' (commande n° ' + numero + ')' : ''));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('J\\'ai acheté ' + nom + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ' le ' + achat : '') + (numero ? ', commande n° ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Ce produit présente un défaut de fonctionnement et je souhaite faire jouer la garantie dont il bénéficie encore. Je vous remercie de m\\'indiquer la marche à suivre pour la réparation, l\\'échange, ou à défaut le remboursement du produit.');
      lignes.push('');
      lignes.push('Je reste à votre disposition pour tout justificatif complémentaire.');
      lignes.push('');
      lignes.push('Cordialement.');
    } else {
      /* Hors garantie commerciale affichée : la garantie légale de conformité
         (2 ans) s'applique quoi qu'il arrive, et c'est ce qui protège le mieux
         l'utilisateur quand le vendeur n'a rien annoncé ou que sa garantie est passée. */
      lignes.push('Objet : Défaut de conformité — ' + nom + (numero ? ' (commande n° ' + numero + ')' : ''));
      lignes.push('');
      lignes.push('Madame, Monsieur,');
      lignes.push('');
      lignes.push('J\\'ai acheté ' + nom + (marque && marque !== nom ? ' (' + marque + ')' : '')
        + (achat ? ' le ' + achat : '') + (numero ? ', commande n° ' + numero : '') + '.');
      lignes.push('');
      lignes.push('Ce produit présente un défaut. Conformément aux articles L217-3 et suivants du Code de la consommation relatifs à la garantie légale de conformité, applicable pendant deux ans à compter de la livraison, je vous demande la réparation ou le remplacement du produit, sans frais de ma part.');
      lignes.push('');
      lignes.push('À défaut de réponse satisfaisante sous 30 jours, je me réserve la possibilité de solliciter le médiateur de la consommation compétent.');
      lignes.push('');
      lignes.push('Cordialement.');
    }

    return { texte: lignes.join('\\n'), type: joursRetour>=0?'retractation':(joursGarantie>=0?'garantie':'conformite') };
  }

  /* ── Interface : une lettre à copier ou envoyer ── */
  function afficherLettre(titre, texte, orderIdPourSuivi){
    var ancien = document.getElementById('agir-overlay');
    if (ancien) ancien.remove();

    var ov = document.createElement('div');
    ov.id = 'agir-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(5,4,6,.86);backdrop-filter:blur(6px);display:flex;align-items:flex-end;';
    ov.innerHTML =
      '<div style="width:100%;max-width:430px;margin:0 auto;background:linear-gradient(180deg,#141217,#0C0B0E);border-radius:24px 24px 0 0;padding:26px 22px calc(env(safe-area-inset-bottom,0px) + 22px);max-height:86vh;display:flex;flex-direction:column;">'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
      +     '<span style="font-family:\\'Cormorant Garamond\\',serif;font-size:1.5rem;color:var(--cr);">' + esc(titre) + '</span>'
      +     '<button onclick="document.getElementById(\\'agir-overlay\\').remove()" style="background:none;border:none;color:var(--d2);font-size:22px;padding:4px;">×</button>'
      +   '</div>'
      +   '<div style="font-size:11.5px;color:var(--d2);line-height:1.5;margin-bottom:14px;">Un brouillon, pas un envoi automatique. Relisez, adaptez si besoin, puis envoyez-le où le service client vous répond habituellement.</div>'
      +   '<textarea id="agir-texte" readonly style="flex:1;min-height:280px;background:rgba(255,255,255,.03);border:1px solid rgba(237,224,200,.10);border-radius:14px;padding:16px;color:var(--cr);font-size:13.5px;line-height:1.65;font-family:inherit;resize:none;margin-bottom:16px;">' + esc(texte) + '</textarea>'
      +   (orderIdPourSuivi ? '<button onclick="suivreRemboursement(\'' + esc(orderIdPourSuivi) + '\')" style="width:100%;height:44px;border:1px solid rgba(201,168,76,.28);border-radius:100px;background:none;color:var(--gh);font-size:12.5px;font-family:inherit;margin-bottom:10px;">Suivre ce remboursement dans CLERVIO</button>' : '')
      +   '<div style="display:flex;gap:10px;">'
      +     '<button onclick="window.copierLettre()" style="flex:1;height:50px;border:1px solid rgba(237,224,200,.16);border-radius:100px;background:none;color:var(--cr);font-size:14px;font-family:inherit;">Copier le texte</button>'
      +     '<button onclick="window.envoyerLettre(\\'' + esc(titre).replace(/'/g,"\\\\'") + '\\')" style="flex:1;height:50px;border:none;border-radius:100px;background:linear-gradient(102deg,var(--gd),var(--g) 26%,var(--gh) 52%,var(--g) 78%,var(--gd));color:#0B0906;font-size:14px;font-weight:500;font-family:inherit;">Envoyer par e-mail</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(ov);
  }

  window.copierLettre = function(){
    var t = document.getElementById('agir-texte');
    if (!t) return;
    try{
      navigator.clipboard.writeText(t.value);
      if (typeof toast === 'function') toast('Texte copié.');
    }catch(e){ t.select(); }
  };

  window.envoyerLettre = function(sujet){
    var t = document.getElementById('agir-texte');
    if (!t) return;
    var corps = t.value.split('\\n').slice(2).join('\\n'); /* le sujet est déjà dans le corps, mailto le reprend séparément */
    var lignes = t.value.split('\\n');
    var objetLigne = (lignes[0] || '').replace(/^Objet\\s*:\\s*/i,'');
    var reste = lignes.slice(2).join('\\n');
    var url = 'mailto:?subject=' + encodeURIComponent(objetLigne) + '&body=' + encodeURIComponent(reste);
    window.location.href = url;
  };

  /* ── Points d'entrée ── */
  window.aiderReclamationParId = function(id){
    try{
      var o = (typeof ORDS !== 'undefined' ? ORDS : []).find(function(x){ return String(x.id)===String(id); });
      if (o) aiderReclamation(o);
    }catch(e){ journal('err','lookup réclamation : ' + ((e&&e.message)||e)); }
  };
  window.aiderResiliationParId = function(id){
    try{
      var todo = [];
      try{ todo = todo.concat(typeof SUBS !== 'undefined' ? SUBS : []); }catch(x){}
      try{ todo = todo.concat(typeof CONTR !== 'undefined' ? CONTR : []); }catch(x){}
      var s = todo.find(function(x){ return String(x.id)===String(id); });
      if (s) aiderResiliation(s);
    }catch(e){ journal('err','lookup résiliation : ' + ((e&&e.message)||e)); }
  };

  window.aiderResiliation = function(sub){
    if (!sub){ journal('err','résiliation : données manquantes'); return; }
    var texte = genererResiliation(sub);
    afficherLettre('Résiliation', texte);
    journal('log','lettre de résiliation générée : ' + (sub.name||sub.brand||'?'));
  };

  function dateJournal(){
    return new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
      + ' ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }

  async function ajouterAuJournal(orderId, ligne){
    if (typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return;
    try{
      var lu = await supa.from('orders').select('notes').eq('id', orderId).eq('user_id', currentUser.id).maybeSingle();
      var existant = (lu && lu.data && lu.data.notes) ? lu.data.notes : '';
      var nouvelle = '[' + dateJournal() + '] ' + ligne;
      var complet = existant ? (existant + '\\n' + nouvelle) : nouvelle;
      await supa.from('orders').update({ notes: complet }).eq('id', orderId).eq('user_id', currentUser.id);
    }catch(e){ journal('err','journal litige : ' + ((e&&e.message)||e)); }
  }

  async function marquerRemboursement(orderId, statut, montant){
    if (typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return false;
    try{
      var maj = { refund_status: statut };
      if (montant !== undefined) maj.refund_amount = montant;
      var r = await supa.from('orders').update(maj).eq('id', orderId).eq('user_id', currentUser.id);
      if (r && r.error){ journal('err','maj remboursement : '+r.error.message); return false; }
      var _libelles = { attente:'Réclamation suivie — remboursement en attente', recu:'Remboursement reçu' + (montant!=null?' ('+Number(montant).toFixed(2).replace('.',',')+' €)':''), refuse:'Remboursement refusé par le marchand' };
      ajouterAuJournal(orderId, _libelles[statut] || ('Statut : '+statut));
      return true;
    }catch(e){ journal('err','maj remboursement : '+((e&&e.message)||e)); return false; }
  }

  window.suivreRemboursement = async function(orderId){
    var ok = await marquerRemboursement(orderId, 'attente');
    if (ok){
      if (typeof toast === 'function') toast('Remboursement suivi. CLERVIO vous le rappellera.');
      try{ document.getElementById('agir-overlay').remove(); }catch(e){}
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.confirmerRemboursementRecu = async function(orderId, montantDefaut){
    var saisie = null;
    try{ saisie = window.prompt('Montant reçu (€)', montantDefaut != null ? String(montantDefaut) : ''); }catch(e){}
    if (saisie === null) return;
    var n = parseFloat(String(saisie).replace(',','.'));
    if (isNaN(n) || n < 0){ if (typeof toast === 'function') toast('Montant invalide.'); return; }
    var ok = await marquerRemboursement(orderId, 'recu', n);
    if (ok){
      if (typeof toast === 'function') toast('Remboursement enregistré : ' + n.toFixed(2).replace('.',',') + ' €');
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.marquerRemboursementRefuse = async function(orderId){
    var ok = true;
    try{ ok = window.confirm('Le marchand a-t-il refusé le remboursement ?'); }catch(e){}
    if (!ok) return;
    var fait = await marquerRemboursement(orderId, 'refuse');
    if (fait){
      if (typeof toast === 'function') toast('Noté. Vous pouvez saisir le médiateur de la consommation si besoin.');
      try{ if (typeof rechargerDonnees === 'function') await rechargerDonnees(); }catch(e){}
      try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      try{ if (typeof showOrd === 'function') showOrd(orderId); }catch(e){}
    }
  };

  window.rafraichirRemboursements = async function(){
    var el = document.querySelector('.stat-refunds');
    if (!el || typeof supa === 'undefined' || !supa || typeof currentUser === 'undefined' || !currentUser) return;
    try{
      var r = await supa.from('orders').select('id',{count:'exact',head:true})
        .eq('user_id', currentUser.id).eq('refund_status','attente');
      var n = (r && typeof r.count === 'number') ? r.count : 0;
      el.textContent = String(n);
    }catch(e){ journal('err','compteur remboursements : '+((e&&e.message)||e)); }
  };

  window.aiderReclamation = function(o){
    if (!o){ journal('err','réclamation : données manquantes'); return; }
    var r = genererReclamation(o);
    var titres = { retractation:'Rétractation', garantie:'Garantie', conformite:'Réclamation' };
    var _libellesType = { retractation:'Lettre de rétractation générée', garantie:'Lettre de mise en jeu de garantie générée', conformite:'Lettre de réclamation (garantie légale) générée' };
    ajouterAuJournal(o.id, _libellesType[r.type] || 'Lettre de réclamation générée');
    var suiviDisponible = (r.type === 'garantie' || r.type === 'conformite') ? o.id : null;
    afficherLettre(titres[r.type] || 'Réclamation', r.texte, suiviDisponible);
    journal('log','lettre de réclamation générée (' + r.type + ') : ' + (o.name||o.brand||'?'));
  };

  /* Le compteur de l'accueil affichait « 0 » figé dans le HTML,
     jamais relié aux remboursements réellement suivis. */
  function surNavigationRemboursements(){
    if (typeof window.go !== 'function' || window.go.__remb) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-home') setTimeout(function(){
        try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){}
      }, 200);
      return r;
    };
    w.__remb = true;
    window.go = w;
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigationRemboursements);
  else surNavigationRemboursements();
  window.addEventListener('load', surNavigationRemboursements);
  setTimeout(surNavigationRemboursements, 1000);
  setTimeout(function(){ try{ if (typeof rafraichirRemboursements === 'function') rafraichirRemboursements(); }catch(e){} }, 1200);

  function genererBonDeRetourHTML(o){
    var nom = esc(o.name || o.brand || 'Article');
    var marque = esc(o.brand || '');
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = esc(o.order_number || o.orderNumber || o.ref || '—');
    var montant = o.amt || o.amount;
    var aujourd = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

    return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
      + '<title>Bon de retour — ' + nom + '</title>'
      + '<style>'
      + '@page{margin:22mm}'
      + 'body{font-family:Georgia,serif;color:#111;max-width:640px;margin:0 auto;padding:20px;}'
      + 'h1{font-size:20px;font-weight:400;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px;}'
      + '.ligne{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:14px;}'
      + '.lbl{color:#666;}'
      + '.val{font-weight:600;}'
      + '.motif{margin-top:24px;padding:16px;border:1px solid #ccc;min-height:70px;font-size:13px;}'
      + '.avert{margin-top:28px;padding:14px;background:#fdf3e2;border:1px solid #e8c98a;font-size:11.5px;line-height:1.6;color:#5a4a20;}'
      + '.pied{margin-top:30px;font-size:11px;color:#999;text-align:center;}'
      + '@media print{.noprint{display:none}}'
      + '</style></head><body>'
      + '<h1>Bon de retour</h1>'
      + '<div class="ligne"><span class="lbl">Article</span><span class="val">' + nom + (marque && marque!==nom ? ' — '+marque : '') + '</span></div>'
      + '<div class="ligne"><span class="lbl">Référence de commande</span><span class="val">' + numero + '</span></div>'
      + (achat ? '<div class="ligne"><span class="lbl">Date d\\'achat</span><span class="val">' + achat + '</span></div>' : '')
      + (montant ? '<div class="ligne"><span class="lbl">Montant</span><span class="val">' + Number(montant).toFixed(2).replace('.',',') + ' €</span></div>' : '')
      + '<div class="ligne"><span class="lbl">Date du retour</span><span class="val">' + aujourd + '</span></div>'
      + '<div class="motif"><div class="lbl" style="font-size:12px;margin-bottom:8px;">Motif du retour</div></div>'
      + '<div class="avert">Ce document est un bon de référence à joindre au colis, généré par CLERVIO. <strong>Ce n\\'est pas une étiquette d\\'affranchissement</strong> : l\\'adresse de retour et le mode d\\'envoi restent ceux indiqués par le vendeur dans sa procédure de retour.</div>'
      + '<div class="pied">Généré par CLERVIO le ' + aujourd + '</div>'
      + '<div class="noprint" style="margin-top:24px;text-align:center;"><button onclick="window.print()" style="padding:12px 28px;font-size:14px;cursor:pointer;">Imprimer</button></div>'
      + '</body></html>';
  }

  window.imprimerBonRetour = function(orderId){
    try{
      var todo = (typeof ORDS !== 'undefined' ? ORDS : []);
      var o = todo.find(function(x){ return String(x.id)===String(orderId); });
      if (!o){ journal('err','bon de retour : commande introuvable'); return; }
      var html = genererBonDeRetourHTML(o);
      var w = window.open('', '_blank');
      if (!w){ if (typeof toast==='function') toast('Autorisez les fenêtres pop-up pour imprimer le bon.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      journal('log','bon de retour généré : ' + (o.name||o.brand||'?'));
    }catch(e){ journal('err','bon de retour : ' + ((e&&e.message)||e)); }
  };

  function genererDossierLitigeHTML(o){
    var nom = esc(o.name || o.brand || 'Article');
    var marque = esc(o.brand || '');
    var achat = dateFR(o.order_date || o.orderDate);
    var numero = esc(o.order_number || o.orderNumber || o.ref || '—');
    var montant = o.amt || o.amount;
    var aujourd = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

    var lignesJournal = (o.notes || '').split('\\n').filter(function(l){ return l.trim(); });
    var journalHTML = lignesJournal.length
      ? lignesJournal.map(function(l){
          var m = l.match(/^\\[([^\\]]+)\\]\\s*(.*)$/);
          return '<div class="evt"><span class="evt-d">' + esc(m?m[1]:'') + '</span><span class="evt-t">' + esc(m?m[2]:l) + '</span></div>';
        }).join('')
      : '<div class="evt"><span class="evt-t" style="color:#999;">Aucune démarche enregistrée pour l\\'instant.</span></div>';

    var statutLabels = { attente:'Remboursement en attente', recu:'Remboursement reçu', refuse:'Remboursement refusé' };
    var statutActuel = o.refundStatus ? (statutLabels[o.refundStatus] || o.refundStatus) : 'Aucun remboursement en cours de suivi';

    return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
      + '<title>Dossier — ' + nom + '</title>'
      + '<style>'
      + '@page{margin:20mm}'
      + 'body{font-family:Georgia,serif;color:#111;max-width:680px;margin:0 auto;padding:24px;line-height:1.5;}'
      + 'h1{font-size:21px;font-weight:400;margin-bottom:4px;}'
      + '.sst{color:#888;font-size:12.5px;margin-bottom:26px;}'
      + 'h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#555;border-bottom:1px solid #ccc;padding-bottom:6px;margin:26px 0 14px;}'
      + '.ligne{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13.5px;}'
      + '.lbl{color:#666;}.val{font-weight:600;}'
      + '.evt{display:flex;gap:14px;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:12.5px;}'
      + '.evt-d{color:#999;white-space:nowrap;min-width:110px;}'
      + '.evt-t{color:#222;}'
      + '.statut{padding:12px 16px;background:#f7f4ec;border-left:3px solid #b8944a;font-size:13.5px;margin-top:4px;}'
      + '.piece{margin-top:10px;padding:12px 16px;border:1px dashed #bbb;font-size:12.5px;color:#555;}'
      + '.pied{margin-top:34px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:14px;}'
      + '@media print{.noprint{display:none}}'
      + '</style></head><body>'
      + '<h1>Dossier de litige</h1>'
      + '<div class="sst">Constitué par CLERVIO le ' + aujourd + '</div>'

      + '<h2>Achat concerné</h2>'
      + '<div class="ligne"><span class="lbl">Article</span><span class="val">' + nom + (marque && marque!==nom ? ' — '+marque : '') + '</span></div>'
      + '<div class="ligne"><span class="lbl">Référence de commande</span><span class="val">' + numero + '</span></div>'
      + (achat ? '<div class="ligne"><span class="lbl">Date d\\'achat</span><span class="val">' + achat + '</span></div>' : '')
      + (montant ? '<div class="ligne"><span class="lbl">Montant</span><span class="val">' + Number(montant).toFixed(2).replace('.',',') + ' €</span></div>' : '')

      + '<h2>Chronologie des démarches</h2>'
      + journalHTML

      + '<h2>État actuel</h2>'
      + '<div class="statut">' + esc(statutActuel) + '</div>'

      + '<h2>Justificatif</h2>'
      + (o.facture
          ? '<div class="piece">Une facture ou un justificatif est conservé dans le coffre CLERVIO associé à cette commande. Joignez-le séparément à ce dossier : ouvrez la commande dans l\\'application, section « Facture », pour l\\'exporter.</div>'
          : '<div class="piece">Aucun justificatif n\\'est actuellement attaché à cette commande dans CLERVIO.</div>')

      + '<div class="pied">Document généré automatiquement à partir des informations saisies dans CLERVIO. Il constitue une aide à la constitution de votre dossier et ne remplace pas un conseil juridique.</div>'
      + '<div class="noprint" style="margin-top:22px;text-align:center;"><button onclick="window.print()" style="padding:12px 28px;font-size:14px;cursor:pointer;">Imprimer / Enregistrer en PDF</button></div>'
      + '</body></html>';
  }

  window.genererDossierLitige = function(orderId){
    try{
      var todo = (typeof ORDS !== 'undefined' ? ORDS : []);
      var o = todo.find(function(x){ return String(x.id)===String(orderId); });
      if (!o){ journal('err','dossier litige : commande introuvable'); return; }
      var html = genererDossierLitigeHTML(o);
      var w = window.open('', '_blank');
      if (!w){ if (typeof toast==='function') toast('Autorisez les fenêtres pop-up pour ouvrir le dossier.'); return; }
      w.document.open(); w.document.write(html); w.document.close();
      journal('log','dossier de litige généré : ' + (o.name||o.brand||'?'));
    }catch(e){ journal('err','dossier litige : ' + ((e&&e.message)||e)); }
  };
})();

/* ══════ FICHIER: 17-autotest.js ══════ */
/* ══ TESTS DE FUMÉE ══════════════════════════════════════ */
/* Ne s'exécute JAMAIS sans demande explicite.                     */
/*   ?selftest=1    → écrans sûrs uniquement                       */
/*   ?selftest=all  → inclut les écrans à effet de bord            */
/*   clervioTest()  → depuis la console                            */
(function(){
  'use strict';
  if (window.CLERVIO_TEST) return;
  window.CLERVIO_TEST = true;

  /* risque = l'affichage déclenche un effet de bord (caméra, biométrie, flux) */
  var ECRANS = [
    { id:'p-ob1',            risque:false },
    { id:'p-ob2',            risque:false },
    { id:'p-login',          risque:false },
    { id:'p-faceid-prompt',  risque:true  },
    { id:'p-faceid-reconnect', risque:true },
    { id:'p-analyse',        risque:true  },
    { id:'p-home',           risque:false },
    { id:'p-orders',         risque:false },
    { id:'p-od',             risque:false },
    { id:'p-vault',          risque:false },
    { id:'p-folder',         risque:false },
    { id:'p-sd',             risque:false },
    { id:'p-ai',             risque:false },
    { id:'p-profile',        risque:false },
    { id:'p-scan',           risque:true  },
    { id:'p-legal',          risque:false },
    { id:'p-add-order',      risque:false },
    { id:'p-add-sub',        risque:false },
    { id:'p-email-sources',  risque:false },
    { id:'p-forgot',         risque:false },
    { id:'p-reset-password', risque:false },
    { id:'p-pricing',        risque:false },
    { id:'p-privacy',        risque:false },
    { id:'p-cgv',            risque:false },
    { id:'p-pro',            risque:false }
  ];

  /* Écrans devant porter la barre supérieure (miroir de 16-barre.js) */
  var AVEC_BARRE = ['p-folder','p-add-order','p-add-sub','p-legal','p-pricing',
                    'p-email-sources','p-forgot','p-reset-password',
                    'p-orders','p-vault','p-profile',
                    'p-od','p-sd','p-scan','p-privacy','p-cgv','p-pro'];

  function nbErreurs(){
    try{
      var D = window.CLERVIO_DIAG;
      if (!D || !D.entrees) return 0;
      var e = D.entrees(), n = 0;
      for (var i=0;i<e.length;i++) if (e[i].type === 'err') n++;
      return n;
    }catch(e){ return 0; }
  }

  function attendre(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  /* Écrans de détail : sans élément choisi, le garde-fou les renvoie
     vers leur parent. Les deux issues sont valides. */
  var CONTEXTUELS = { 'p-od':'p-orders', 'p-sd':'p-vault', 'p-folder':'p-vault' };

  function verifier(ec){
    var pb = [];
    var el = document.getElementById(ec.id);
    if (!el) return ['écran absent du document'];

    var parent = CONTEXTUELS[ec.id];
    if (parent && !el.classList.contains('on')){
      var p = document.getElementById(parent);
      if (p && p.classList.contains('on')) return [];
      pb.push("ni l'écran ni son parent " + parent + " ne s'affichent");
      return pb;
    }

    if (!el.classList.contains('on')) pb.push("l'écran ne s'affiche pas (classe 'on' absente)");
    if (el.children.length === 0) pb.push('aucun élément enfant');
    if (AVEC_BARRE.indexOf(ec.id) > -1 && !el.querySelector('.ctb')) pb.push('barre supérieure absente');
    if (!parent){
      var txt = (el.textContent || '').trim();
      if (txt.length < 10) pb.push('contenu vide ou quasi vide (' + txt.length + ' caractères)');
    }
    return pb;
  }

  function lancer(tout){
    var depart = null;
    try{
      var actif = document.querySelector('.pg.on');
      depart = actif ? actif.id : 'p-home';
    }catch(e){ depart = 'p-home'; }

    var liste = ECRANS.filter(function(e){ return tout || !e.risque; });
    var resultats = [], i = 0;

    afficher([], liste.length, true);

    function suivant(){
      if (i >= liste.length){
        try{ if (typeof window.go === 'function') window.go(depart); }catch(e){}
        setTimeout(function(){
          fonctions().forEach(function(r){ resultats.push(r); });
          afficher(resultats, resultats.length, false);
        }, 450);
        return;
      }
      var ec = liste[i++];
      var avant = nbErreurs();
      var lance = Date.now();
      try{
        if (typeof window.go !== 'function') throw new Error('go() indisponible');
        window.go(ec.id);
      }catch(e){
        resultats.push({ id:ec.id, ok:false, pb:['go() a levé : ' + e.message], ms:0 });
        afficher(resultats, liste.length, true);
        return suivant();
      }
      attendre(CONTEXTUELS[ec.id] ? 1500 : 320).then(function(){
        var pb = verifier(ec);
        var apres = nbErreurs();
        if (apres > avant) pb.push((apres-avant) + ' erreur(s) pendant la transition');
        resultats.push({ id:ec.id, ok:pb.length===0, pb:pb, ms:Date.now()-lance });
        afficher(resultats, liste.length, true);
        suivant();
      });
    }
    suivant();
  }

  /* ── Seconde phase : le fonctionnement, pas seulement l'affichage ── */
  /* ORDS, WARR et SUBS sont declares en let : ils vivent dans
     l'environnement lexical global, pas sur window. On y accede
     donc par identifiant direct, jamais par window[...]. */
  function tableau(nom){
    var v = null;
    try{
      if (nom === 'ORDS') v = (typeof ORDS !== 'undefined') ? ORDS : null;
      else if (nom === 'WARR') v = (typeof WARR !== 'undefined') ? WARR : null;
      else if (nom === 'SUBS') v = (typeof SUBS !== 'undefined') ? SUBS : null;
    }catch(e){ return null; }
    return Array.isArray(v) ? v : null;
  }

  function connecte(){
    try{ return (typeof currentUser !== 'undefined') && !!currentUser; }
    catch(e){ return false; }
  }

  function fonctions(){
    var res = [];
    function test(nom, fn){
      var t = Date.now(), pb = [];
      try{ pb = fn() || []; }catch(e){ pb = ['exception : ' + ((e && e.message) || e)]; }
      res.push({ id: nom, ok: pb.length === 0, pb: pb, ms: Date.now() - t });
    }

    test('modules chargés', function(){
      var p = [];
      [['CLERVIO_DIAG','diagnostic'],['CLERVIO_RESILIENCE','résilience'],['CLERVIO_BARRE','barre'],
       ['CLERVIO_CONTEXTE','contexte'],['CLERVIO_PUSH','push'],['CLERVIO_PROFIL','profil'],
       ['CLERVIO_CONCIERGE','concierge']].forEach(function(m){
        if (!window[m[0]]) p.push(m[1] + ' absent');
      });
      return p;
    });

    test('couche de données', function(){
      var p = [];
      ['ORDS','WARR','SUBS'].forEach(function(n){
        if (!tableau(n)) p.push(n + ' introuvable ou pas un tableau');
      });
      return p;
    });

    test('cohérence des compteurs', function(){
      var p = [];
      function cmp(sel, ref, lib){
        var el = document.querySelector(sel);
        if (!el || !ref) return;
        var v = parseInt((el.textContent || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(v) && v !== ref.length) p.push(lib + ' : ' + v + ' affiché, ' + ref.length + ' en mémoire');
      }
      cmp('.stat-orders', tableau('ORDS'), 'commandes');
      cmp('.stat-warr',   tableau('WARR'), 'garanties');
      cmp('.stat-subs',   tableau('SUBS'), 'abonnements');
      return p;
    });

    test('portée du concierge', function(){
      var el = document.getElementById('ai-portee');
      if (!el) return ['élément absent'];
      var t = (el.textContent || '').trim();
      if (!t || t === 'Concierge') return ['portée non renseignée'];
      return [];
    });

    test('en-tête du profil', function(){
      var p = [];
      /* Hors session, il n'y a rien a afficher : ce n'est pas une panne */
      if (!connecte()) return [];
      var n = document.getElementById('profile-name');
      var v = n ? (n.textContent || '').trim() : '';
      if (!v || v === '—') p.push('nom non renseigné');
      var b = document.getElementById('profile-badge');
      if (b && (b.textContent || '').indexOf('Premium') > -1) p.push('badge annonce une offre non souscrite');
      var a = document.getElementById('prof-arc');
      if (a && !a.style.strokeDashoffset) p.push('anneau non initialisé');
      return p;
    });

    test('aucune injection HTML', function(){
      var p = [];
      ['p-vault','p-orders','p-home','p-ai'].forEach(function(id){
        var el = document.getElementById(id);
        if (!el) return;
        var scripts = el.querySelectorAll ? el.querySelectorAll('script') : [];
        for (var k = 0; k < scripts.length; k++){
          if (!scripts[k].hasAttribute('data-clervio')) p.push(id + ' contient un script non identifié');
        }
      });
      return p;
    });

    return res;
  }

  var panneau = null, corps = null, entete = null;

  function afficher(res, total, encours){
    try{
      if (!document.body) return;
      if (!panneau){
        panneau = document.createElement('div');
        panneau.setAttribute('style','position:fixed;inset:0;z-index:100000;background:#08080B;'
          + 'display:flex;flex-direction:column;font:12px/1.5 ui-monospace,Menlo,monospace;color:#EDE0C8;');
        var barre = document.createElement('div');
        barre.setAttribute('style','display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px 12px;border-bottom:1px solid rgba(255,255,255,.1);flex-shrink:0;');
        entete = document.createElement('span');
        entete.setAttribute('style','flex:1;color:#C9A84C;letter-spacing:.1em;font-weight:600;');
        var bCopier = document.createElement('button');
        bCopier.textContent = 'Copier';
        bCopier.setAttribute('style','background:#C9A84C;color:#0A0A0C;border:none;border-radius:7px;padding:7px 12px;font:600 12px -apple-system,sans-serif;');
        bCopier.onclick = function(){
          var t = res.map(function(r){
            return (r.ok?'OK   ':'ÉCHEC') + '  ' + r.id + '  ' + r.ms + 'ms'
                 + (r.pb.length ? '  — ' + r.pb.join(' ; ') : '');
          }).join(String.fromCharCode(10));
          try{ if (navigator.clipboard) navigator.clipboard.writeText(t); }catch(e){}
          bCopier.textContent = 'Copié';
          setTimeout(function(){ bCopier.textContent = 'Copier'; }, 1200);
        };
        var bFermer = document.createElement('button');
        bFermer.textContent = 'Fermer';
        bFermer.setAttribute('style','background:rgba(255,255,255,.1);color:#EDE0C8;border:none;border-radius:7px;padding:7px 12px;font:600 12px -apple-system,sans-serif;');
        bFermer.onclick = function(){ panneau.remove(); panneau = null; };
        barre.appendChild(entete); barre.appendChild(bCopier); barre.appendChild(bFermer);
        corps = document.createElement('div');
        corps.setAttribute('style','flex:1;overflow:auto;padding:12px 16px;');
        panneau.appendChild(barre); panneau.appendChild(corps);
        document.body.appendChild(panneau);
      }

      var echecs = res.filter(function(r){ return !r.ok; }).length;
      entete.textContent = encours
        ? 'TESTS  ' + res.length + '/' + total + '…'
        : 'TESTS  ' + (res.length - echecs) + '/' + res.length + ' réussis';
      entete.style.color = (!encours && echecs) ? '#FF8A7A' : '#C9A84C';

      var h = '';
      for (var i=0;i<res.length;i++){
        var r = res[i];
        h += '<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">'
          +  '<span style="color:' + (r.ok ? '#8FBF7F' : '#FF8A7A') + ';font-weight:600;">'
          +  (r.ok ? '✓' : '✗') + '</span>  '
          +  '<span style="color:#EDE0C8;">' + r.id + '</span>'
          +  '<span style="color:rgba(237,224,200,.35);">  ' + r.ms + 'ms</span>';
        for (var k=0;k<r.pb.length;k++){
          h += '<div style="color:#FF8A7A;padding-left:18px;font-size:11px;">' + r.pb[k] + '</div>';
        }
        h += '</div>';
      }
      if (encours) h += '<div style="padding:8px 0;color:rgba(237,224,200,.4);">en cours…</div>';
      corps.innerHTML = h;
      corps.scrollTop = corps.scrollHeight;
    }catch(e){}
  }

  window.clervioTest = function(tout){ lancer(tout === true); return 'tests lancés'; };

  function auto(){
    try{
      var s = location.search;
      if (s.indexOf('selftest=all') > -1) setTimeout(function(){ lancer(true); }, 1500);
      else if (s.indexOf('selftest=1') > -1) setTimeout(function(){ lancer(false); }, 1500);
    }catch(e){}
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', auto);
  else auto();
})();

