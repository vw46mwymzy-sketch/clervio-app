/* ═══════════════════════════════════════════════════════════════
   CLERVIO — Quiet Motion
   Une orchestration légère des transitions, révélations et retours
   tactiles. Tous les mouvements restent fonctionnels, interrompables
   et sont désactivés lorsque l’utilisateur le demande.
   ═══════════════════════════════════════════════════════════════ */
(function initClervioMotion(){
  'use strict'

  const root = document.documentElement
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  const visitedPages = new Set()
  const revealSeen = new WeakSet()
  let reduced = reduceQuery.matches

  root.classList.add('motion-ready')
  root.classList.toggle('motion-reduced', reduced)

  function onMotionPreference(event){
    reduced = event.matches
    root.classList.toggle('motion-reduced', reduced)
    if(reduced) document.getAnimations?.().forEach(animation => animation.finish())
  }
  if(typeof reduceQuery.addEventListener === 'function') reduceQuery.addEventListener('change',onMotionPreference)
  else reduceQuery.addListener?.(onMotionPreference)

  function play(node,keyframes,options){
    if(reduced || !node?.animate || !node.isConnected) return null
    return node.animate(keyframes,{fill:'none',...options})
  }

  function pageEntrance(pageId,forceFirst){
    const page = document.getElementById(pageId)
    if(!page) return
    const first = forceFirst ?? !visitedPages.has(pageId)
    visitedPages.add(pageId)

    page.classList.remove('motion-first')
    if(first){
      void page.offsetWidth
      page.classList.add('motion-first')
      window.setTimeout(() => page.classList.remove('motion-first'),1500)
    }

    if(reduced) return
    if(!first){
      const shell = page.querySelector('.sc,.ai-shell')
      play(shell,[
        {opacity:.72,transform:'translateY(4px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'})
      return
    }

    const selectors = {
      'p-home':'.home-command__bar,.home-command__date,.home-command__greeting,.home-command__promise,.signal-card',
      'p-ai':'.ai-header__row,.ai-intro__eyebrow,.ai-intro__title,.ai-intro__detail,.ai-suggestion',
      'p-ob1':'.ob1-wm,.ob1-tag,.ob1-hero > p:not(.ob1-tag),.ob1-proof__item,.ob1-foot > button',
      'p-scan':'#sc-c > div > *'
    }
    const query = selectors[pageId]
    const targets = query ? [...page.querySelectorAll(query)] : [...page.querySelectorAll(':scope > .sc > *')].slice(0,6)
    targets.forEach((target,index) => {
      play(target,[
        {opacity:0,transform:'translateY(14px) scale(.985)'},
        {opacity:1,transform:'translateY(0) scale(1)'}
      ],{
        duration:560,
        delay:Math.min(index * 58,420),
        easing:'cubic-bezier(.16,1,.3,1)'
      })
    })
  }

  function reveal(node,index=0){
    if(reduced || revealSeen.has(node) || !node.isConnected) return
    revealSeen.add(node)
    play(node,[
      {opacity:0,transform:'translateY(18px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:520,delay:Math.min(index * 45,180),easing:'cubic-bezier(.16,1,.3,1)'})
  }

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return
      reveal(entry.target)
      revealObserver.unobserve(entry.target)
    })
  },{threshold:.16,rootMargin:'0px 0px -26px'}) : null

  function observeReveals(scope=document){
    if(!revealObserver || reduced) return
    scope.querySelectorAll?.('.home-section,.priority-card').forEach(node => {
      if(!revealSeen.has(node)) revealObserver.observe(node)
    })
  }

  function animateMessage(message){
    if(reduced || !message?.classList?.contains('ai-message')) return
    const direction = message.classList.contains('ai-message--user') ? 10 : -10
    play(message,[
      {opacity:0,transform:`translateX(${direction}px) translateY(6px)`},
      {opacity:1,transform:'translateX(0) translateY(0)'}
    ],{duration:400,easing:'cubic-bezier(.16,1,.3,1)'})
    message.querySelectorAll('.ai-evidence,.ai-followups').forEach((node,index) => {
      play(node,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{
        duration:320,delay:120 + index * 55,easing:'cubic-bezier(.16,1,.3,1)'
      })
    })
  }

  function settleContent(node){
    if(reduced || !node?.isConnected) return
    play(node,[
      {opacity:.62,transform:'translateY(4px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:340,easing:'cubic-bezier(.16,1,.3,1)'})
  }

  function observeDynamicContent(){
    const messages = document.getElementById('aimsgs')
    if(messages) new MutationObserver(records => records.forEach(record => {
      record.addedNodes.forEach(node => {
        if(node.nodeType === 1) animateMessage(node)
      })
    })).observe(messages,{childList:true})

    const signal = document.getElementById('home-signal')
    if(signal) new MutationObserver(() => {
      if(document.getElementById('p-home')?.classList.contains('on')) settleContent(signal)
    }).observe(signal,{childList:true})

    const priorities = document.getElementById('home-priorities')
    if(priorities) new MutationObserver(() => observeReveals(priorities)).observe(priorities,{childList:true})

    const scanner = document.getElementById('sc-c')
    if(scanner) new MutationObserver(() => {
      const content = scanner.firstElementChild
      if(document.getElementById('p-scan')?.classList.contains('on')) settleContent(content)
    }).observe(scanner,{childList:true})
  }

  function activateNavigation(pageId){
    document.querySelectorAll('.nav .just-activated').forEach(node => node.classList.remove('just-activated'))
    const item = document.querySelector(`.nav [data-nav-page="${pageId}"]`)
    if(!item || reduced) return
    item.classList.add('just-activated')
    window.setTimeout(() => item.classList.remove('just-activated'),520)
  }

  const pressSelector = [
    'button','.cd.tp','.stcd','.glcd','[role="button"]'
  ].join(',')
  function clearPressed(){
    document.querySelectorAll('.is-pressing').forEach(node => node.classList.remove('is-pressing'))
  }
  document.addEventListener('pointerdown',event => {
    const action = event.target.closest?.(pressSelector)
    if(action && !action.disabled) action.classList.add('is-pressing')
  },{passive:true})
  document.addEventListener('pointerup',clearPressed,{passive:true})
  document.addEventListener('pointercancel',clearPressed,{passive:true})
  window.addEventListener('blur',clearPressed)

  function enableSignalTilt(){
    if(reduced || !precisePointer.matches) return
    const card = document.getElementById('home-signal')
    if(!card) return
    card.addEventListener('pointermove',event => {
      const rect = card.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - .5
      const y = (event.clientY - rect.top) / rect.height - .5
      card.style.setProperty('--tilt-x',`${(-y * 2.4).toFixed(2)}deg`)
      card.style.setProperty('--tilt-y',`${(x * 2.8).toFixed(2)}deg`)
      card.style.setProperty('--glow-x',`${((x + .5) * 100).toFixed(1)}%`)
      card.style.setProperty('--glow-y',`${((y + .5) * 100).toFixed(1)}%`)
    },{passive:true})
    card.addEventListener('pointerleave',() => {
      card.style.removeProperty('--tilt-x')
      card.style.removeProperty('--tilt-y')
      card.style.removeProperty('--glow-x')
      card.style.removeProperty('--glow-y')
    })
  }

  window.addEventListener('clervio:navigated',event => {
    const pageId = event.detail?.to
    if(!pageId) return
    pageEntrance(pageId)
    activateNavigation(pageId)
    observeReveals(document.getElementById(pageId))
  })

  function start(){
    observeDynamicContent()
    observeReveals()
    enableSignalTilt()
    const active = document.querySelector('.pg.on')?.id
    if(active && active !== 'p-splash') pageEntrance(active,true)
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true})
  else start()

  window.ClervioMotion = {
    get reduced(){ return reduced },
    replay(pageId=document.querySelector('.pg.on')?.id){ if(pageId) pageEntrance(pageId,true) }
  }
})()
