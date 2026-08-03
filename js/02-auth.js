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



(function(){
  if (window.CLERVIO_RECONNEXION) return;
  window.CLERVIO_RECONNEXION = true;

  async function remplirReconnexion(){
    try{
      var profil = (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile : null;
      var email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';

      if ((!profil || !email) && typeof supa !== 'undefined' && supa){
        try{
          var s = await supa.auth.getSession();
          var session = s && s.data && s.data.session;
          if (session && session.user){
            if (!email) email = session.user.email || '';
            if (!profil){
              var r = await supa.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
              if (r && r.data) profil = r.data;
            }
          }
        }catch(e){}
      }

      var nom = (profil && (profil.full_name || profil.name)) || (email ? email.split('@')[0] : '') || 'Votre compte';
      var elNom = document.getElementById('reconnect-name');
      if (elNom) elNom.textContent = nom;
      var elAvatar = document.querySelector('#p-faceid-reconnect .sr');
      if (elAvatar) elAvatar.textContent = (nom.trim().charAt(0) || 'C').toUpperCase();
    }catch(e){}
  }

  function surNavigation(){
    if (typeof window.go !== 'function' || window.go.__reconnexion) return;
    var orig = window.go;
    var w = function(id){
      var r = orig.apply(window, arguments);
      if (id === 'p-faceid-reconnect') setTimeout(remplirReconnexion, 30);
      return r;
    };
    w.__reconnexion = true;
    window.go = w;
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', surNavigation);
  else surNavigation();
  window.addEventListener('load', surNavigation);
  setTimeout(surNavigation, 900);
})();
