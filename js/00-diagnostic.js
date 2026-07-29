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
