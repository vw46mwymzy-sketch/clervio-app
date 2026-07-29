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

