/* ═══════════════════════════════════════════════════════════════
   CLERVIO INTELLIGENCE — déterministe, traçable, orientée action.
   Les montants, dates et priorités sont calculés localement depuis
   les données déjà chargées. Le modèle de langage explique ; ce
   moteur conserve la responsabilité des faits et des décisions.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.ClervioIntelligence) return;

  var DAY = 86400000;
  var currentInsights = [];

  function collection(name){
    try{
      if (name === 'orders' && typeof ORDS !== 'undefined' && Array.isArray(ORDS)) return ORDS;
      if (name === 'warranties' && typeof WARR !== 'undefined' && Array.isArray(WARR)) return WARR;
      if (name === 'subscriptions' && typeof SUBS !== 'undefined' && Array.isArray(SUBS)) return SUBS;
      if (name === 'contracts' && typeof CONTR !== 'undefined' && Array.isArray(CONTR)) return CONTR;
      if (name === 'documents' && typeof DOCS !== 'undefined' && Array.isArray(DOCS)) return DOCS;
    }catch(e){}
    return [];
  }

  function data(){
    return {
      orders:collection('orders'),
      warranties:collection('warranties'),
      subscriptions:collection('subscriptions'),
      contracts:collection('contracts'),
      documents:collection('documents')
    };
  }

  function normalize(value){
    return String(value == null ? '' : value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9€]+/g,' ').trim();
  }

  function amount(value){
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function monthly(item){
    var n = amount(item && (item.amt != null ? item.amt : item.amount));
    var f = normalize(item && (item.freq || item.frequency));
    if (f.indexOf('an') > -1 || f.indexOf('year') > -1) return n / 12;
    if (f.indexOf('trim') > -1 || f.indexOf('quarter') > -1) return n / 3;
    return n;
  }

  function formatMoney(value, maximumFractionDigits){
    return new Intl.NumberFormat('fr-FR', {
      style:'currency',currency:'EUR',
      maximumFractionDigits:maximumFractionDigits == null ? (value % 1 ? 2 : 0) : maximumFractionDigits
    }).format(amount(value));
  }

  function parseDate(value){
    if (!value) return null;
    var raw = String(value);
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return null;
    var d = new Date(raw.length === 10 ? raw + 'T12:00:00' : raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function daysUntil(value){
    var d = parseDate(value);
    if (!d) return null;
    var today = new Date();
    today.setHours(12,0,0,0);
    return Math.ceil((d.getTime() - today.getTime()) / DAY);
  }

  function warrantyDays(item){
    var given = Number(item && item.days);
    if (Number.isFinite(given)) return given;
    return daysUntil(item && (item.warrantyEndsAt || item.warranty_ends_at));
  }

  function status(item){
    return normalize(item && (item.st || item.status));
  }

  function nameOf(item){
    return [item && item.brand,item && item.name].filter(Boolean).join(' · ') || 'Élément';
  }

  function snapshot(input){
    var d = input || data();
    var recurring = d.subscriptions.concat(d.contracts);
    var monthlyTotal = recurring.reduce(function(sum,item){ return sum + monthly(item); },0);
    var refunds = d.orders.filter(function(o){
      var s = status(o);
      return s.indexOf('retour') > -1 || s.indexOf('rembours') > -1 || normalize(o.refundStatus).indexOf('attente') > -1;
    });
    var transit = d.orders.filter(function(o){
      var s = status(o);
      return s.indexOf('transit') > -1 || s.indexOf('expedi') > -1 || s.indexOf('shipped') > -1;
    });
    var warranties = d.warranties.map(function(w){ return { item:w, days:warrantyDays(w) }; })
      .filter(function(w){ return w.days != null && w.days >= 0; })
      .sort(function(a,b){ return a.days-b.days; });
    var missingProof = d.orders.filter(function(o){
      return !o.facture && !o.factureMime && !o.invoiceUrl && !o.invoice_path && !o.invoicePath;
    });
    return {
      data:d,
      tracked:d.orders.length + d.warranties.length + recurring.length,
      recurringCount:recurring.length,
      monthlyTotal:monthlyTotal,
      annualTotal:monthlyTotal * 12,
      refunds:refunds,
      transit:transit,
      warranties:warranties,
      missingProof:missingProof
    };
  }

  function insightList(input){
    var s = input && input.data ? input : snapshot(input);
    var out = [];
    if (s.refunds.length){
      var knownRefund = s.refunds.reduce(function(sum,o){ return sum + amount(o.refundAmount || o.refund_amount); },0);
      out.push({
        id:'refunds',rank:100,tone:'danger',kind:'refund',eyebrow:'À faire maintenant',
        title:s.refunds.length + ' remboursement' + (s.refunds.length>1?'s':'') + ' à suivre',
        detail:'Gardez la preuve et relancez le marchand si le délai annoncé est dépassé.',
        metric:knownRefund ? formatMoney(knownRefund) : 'Suivi actif',
        cta:'Ouvrir les achats',action:'orders'
      });
    }
    if (s.warranties.length && s.warranties[0].days <= 120){
      var w = s.warranties[0];
      out.push({
        id:'warranty-' + String(w.item.id || 'next'),rank:w.days<=30?95:82,tone:w.days<=30?'danger':'warning',kind:'warranty',
        eyebrow:w.days<=30?'Échéance proche':'À anticiper',
        title:nameOf(w.item) + ' : garantie dans ' + w.days + ' jour' + (w.days>1?'s':''),
        detail:'Vérifiez que la facture et le numéro de commande sont bien conservés.',
        metric:w.days + ' j',cta:'Voir la garantie',action:'warranties'
      });
    }
    if (s.transit.length){
      var order = s.transit[0];
      out.push({
        id:'transit-' + String(order.id || 'next'),rank:72,tone:'info',kind:'delivery',eyebrow:'En mouvement',
        title:nameOf(order) + ' est en route',
        detail:order.carrier ? 'Livraison suivie avec ' + order.carrier + '.' : 'Le statut de livraison est surveillé.',
        metric:s.transit.length + ' en cours',cta:'Suivre la commande',action:'orders'
      });
    }
    if (s.recurringCount){
      out.push({
        id:'recurring',rank:55,tone:'neutral',kind:'subscription',eyebrow:'Budget récurrent',
        title:formatMoney(s.annualTotal) + ' engagés par an',
        detail:s.recurringCount + ' service' + (s.recurringCount>1?'s sont':' est') + ' actuellement suivi' + (s.recurringCount>1?'s':'') + '.',
        metric:formatMoney(s.monthlyTotal) + '/mois',cta:'Examiner les abonnements',action:'subscriptions'
      });
    }
    if (s.missingProof.length){
      out.push({
        id:'proofs',rank:34,tone:'neutral',kind:'proof',eyebrow:'Coffre à compléter',
        title:s.missingProof.length + ' achat' + (s.missingProof.length>1?'s sans justificatif':' sans justificatif'),
        detail:'Une facture facilite un retour, une garantie ou une réclamation.',
        metric:'Preuve manquante',cta:'Scanner une facture',action:'scan'
      });
    }
    if (!out.length){
      out.push({
        id:'ready',rank:1,tone:'success',kind:'ready',eyebrow:'Coffre prêt',
        title:s.tracked ? 'Aucune échéance urgente détectée' : 'Votre centre de pilotage est prêt',
        detail:s.tracked ? 'CLERVIO continue de surveiller vos éléments enregistrés.' : 'Ajoutez un premier achat pour activer les échéances et les actions utiles.',
        metric:s.tracked ? s.tracked + ' suivis' : '0 élément',
        cta:s.tracked?'Interroger le concierge':'Ajouter un achat',action:s.tracked?'ai':'add-order'
      });
    }
    return out.sort(function(a,b){ return b.rank-a.rank; });
  }

  function icon(name){
    var paths = {
      refund:'<path d="M4 8h12a4 4 0 010 8H8"/><path d="M8 12l-4-4 4-4"/>',
      warranty:'<path d="M12 3l7 3v5c0 4.4-2.8 8.1-7 10-4.2-1.9-7-5.6-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
      delivery:'<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
      subscription:'<path d="M4 7h16M4 12h16M4 17h10"/>',
      proof:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>',
      ready:'<path d="M5 12l4 4L19 6"/>',
      scan:'<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M8 12h8"/>',
      ai:'<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z"/>',
      orders:'<path d="M5 7h14l-1 14H6L5 7z"/><path d="M9 9V5a3 3 0 016 0v4"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.ready) + '</svg>';
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function setText(id,value){ var el=document.getElementById(id); if(el) el.textContent=value; }

  function renderHome(){
    var s = snapshot();
    currentInsights = insightList(s);
    var first = currentInsights[0];
    var signal = document.getElementById('home-signal');
    if (signal && first){
      signal.dataset.tone = first.tone;
      signal.innerHTML =
        '<div class="signal-card__top"><span class="signal-card__eyebrow">' + esc(first.eyebrow) + '</span><span class="signal-card__metric">' + esc(first.metric) + '</span></div>' +
        '<h2 class="signal-card__title">' + esc(first.title) + '</h2>' +
        '<p class="signal-card__detail">' + esc(first.detail) + '</p>' +
        '<button class="signal-card__action" type="button" data-clervio-action="' + esc(first.action) + '">' + esc(first.cta) + '</button>';
    }
    setText('home-tracked-value',String(s.tracked));
    setText('home-tracked-label',s.tracked>1?'éléments surveillés':'élément surveillé');
    setText('home-recurring-value',formatMoney(s.monthlyTotal));
    setText('home-recurring-label','budget récurrent par mois');
    setText('home-orders-value',String(s.data.orders.length));
    setText('home-orders-label',s.data.orders.length>1?'achats centralisés':'achat centralisé');
    setText('home-actions-meta',Math.max(0,currentInsights.length-(first.kind==='ready'?1:0)) + ' signal' + (currentInsights.length>2?'s':'') + ' détecté' + (currentInsights.length>2?'s':''));
    var dateEl = document.getElementById('home-date');
    if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
    return { snapshot:s, insights:currentInsights.slice() };
  }

  function act(action){
    try{
      if (action === 'orders') return typeof go === 'function' && go('p-orders');
      if (action === 'warranties') return typeof goVaultTab === 'function' ? goVaultTab('warr') : go('p-vault');
      if (action === 'subscriptions') return typeof goVaultTab === 'function' ? goVaultTab('subs') : go('p-vault');
      if (action === 'scan') return typeof go === 'function' && go('p-scan');
      if (action === 'emails') return typeof go === 'function' && go('p-email-sources');
      if (action === 'add-order') return typeof go === 'function' && go('p-add-order');
      if (action === 'ai') return typeof go === 'function' && go('p-ai');
    }catch(e){ if(typeof toast==='function') toast('Action momentanément indisponible'); }
  }

  function matches(item,query){
    var hay = normalize([item && item.brand,item && item.name,item && item.sub].filter(Boolean).join(' '));
    if (!hay || !query) return false;
    return hay.split(' ').some(function(part){ return part.length>2 && query.indexOf(part) > -1; });
  }

  function exactOrOnly(items,query,genericWords){
    var named = items.filter(function(item){ return matches(item,query); });
    if (named.length === 1) return { item:named[0],ambiguous:false };
    if (named.length > 1) return { items:named,ambiguous:true };
    var isGeneric = genericWords.some(function(word){ return query.indexOf(word)>-1; });
    return isGeneric && items.length === 1 ? { item:items[0],ambiguous:false } : { item:null,ambiguous:false };
  }

  function evidence(message){
    var q = normalize(message), d = data(), label = 'Votre coffre', count = 0, action = 'ai', actionLabel = '';
    if (q.indexOf('garanti') > -1){ count=d.warranties.length; label=count + ' garantie' + (count>1?'s':''); action='warranties'; actionLabel='Ouvrir les garanties'; }
    else if (q.indexOf('abonn') > -1 || q.indexOf('renouvel') > -1){ count=d.subscriptions.length+d.contracts.length; label=count + ' service' + (count>1?'s':''); action='subscriptions'; actionLabel='Voir les abonnements'; }
    else if (q.indexOf('rembours') > -1 || q.indexOf('commande') > -1 || q.indexOf('livr') > -1 || q.indexOf('depens') > -1){ count=d.orders.length; label=count + ' achat' + (count>1?'s':''); action='orders'; actionLabel='Ouvrir les achats'; }
    else { count=d.orders.length+d.warranties.length+d.subscriptions.length+d.contracts.length; label=count + ' élément' + (count>1?'s':''); }
    return { label:label,count:count,action:action,actionLabel:actionLabel };
  }

  function localAnswer(message){
    var q = normalize(message), s = snapshot(), d = s.data;
    var ev = evidence(message);
    var result = { text:'',evidence:ev.label,evidenceCount:ev.count,action:ev.action,actionLabel:ev.actionLabel };

    if ((q.indexOf('abonn')>-1 || q.indexOf('service')>-1) && (q.indexOf('an')>-1 || q.indexOf('annuel')>-1 || q.indexOf('cout')>-1 || q.indexOf('coute')>-1)){
      result.text = s.recurringCount
        ? 'Vos ' + s.recurringCount + ' services suivis représentent ' + formatMoney(s.annualTotal,2) + ' par an, soit ' + formatMoney(s.monthlyTotal,2) + ' par mois.'
        : "Aucun abonnement actif n'est enregistré dans votre coffre.";
      return result;
    }

    if (q.indexOf('depens')>-1){
      var now = new Date();
      var monthOrders = d.orders.filter(function(o){ var dt=parseDate(o.orderDate||o.order_date); return dt && dt.getMonth()===now.getMonth() && dt.getFullYear()===now.getFullYear(); });
      var total = monthOrders.reduce(function(sum,o){ return sum+amount(o.amt||o.amount); },0);
      result.text = monthOrders.length
        ? 'Vous avez enregistré ' + formatMoney(total,2) + ' d’achats ce mois-ci, répartis sur ' + monthOrders.length + ' commande' + (monthOrders.length>1?'s':'') + '.'
        : "Aucun achat daté de ce mois n'est enregistré dans votre coffre.";
      return result;
    }

    if (q.indexOf('garanti')>-1){
      var foundWarranty = exactOrOnly(d.warranties,q,['garanti','expire','expiration']);
      if (foundWarranty.ambiguous){
        result.text = 'Plusieurs garanties correspondent. Précisez le marchand ou le produit : ' + foundWarranty.items.slice(0,3).map(nameOf).join(', ') + '.';
      } else if (foundWarranty.item){
        var wd = warrantyDays(foundWarranty.item);
        result.text = 'La garantie ' + nameOf(foundWarranty.item) + (foundWarranty.item.exp ? ' expire le ' + foundWarranty.item.exp : (wd!=null ? ' expire dans ' + wd + ' jours' : " n'a pas de date d'expiration enregistrée")) + '.';
      } else {
        result.text = "Je ne trouve pas de garantie correspondant à ce produit. Je préfère m'abstenir plutôt que d'utiliser une autre garantie.";
      }
      return result;
    }

    if (q.indexOf('abonn')>-1 || q.indexOf('renouvel')>-1){
      var recurring = d.subscriptions.concat(d.contracts);
      var foundSub = exactOrOnly(recurring,q,['abonn','renouvel']);
      if (foundSub.ambiguous){
        result.text = 'Plusieurs services correspondent. Précisez lequel : ' + foundSub.items.slice(0,3).map(nameOf).join(', ') + '.';
      } else if (foundSub.item){
        result.text = nameOf(foundSub.item) + ' coûte ' + formatMoney(foundSub.item.amt||foundSub.item.amount,2) + ' par ' + (foundSub.item.freq||'mois') + (foundSub.item.renew ? ' et se renouvelle le ' + foundSub.item.renew : ". La date de renouvellement n'est pas renseignée") + '.';
      } else {
        result.text = "Je ne trouve pas d'abonnement correspondant dans votre coffre.";
      }
      return result;
    }

    if (q.indexOf('rembours')>-1){
      if (s.refunds.length === 1) result.text = nameOf(s.refunds[0]) + ' est indiqué « ' + (s.refunds[0].st||s.refunds[0].refundStatus||'en attente') + ' » dans votre coffre.';
      else if (s.refunds.length > 1) result.text = s.refunds.length + ' remboursements sont suivis. Ouvrez vos achats pour choisir le dossier à examiner.';
      else result.text = "Aucun remboursement en attente n'est enregistré pour le moment.";
      return result;
    }

    if (q.indexOf('commande')>-1 || q.indexOf('livr')>-1 || q.indexOf('transit')>-1){
      var foundOrder = exactOrOnly(d.orders,q,['commande','livr','transit']);
      if (foundOrder.ambiguous) result.text = 'Plusieurs commandes correspondent. Précisez le marchand ou le produit : ' + foundOrder.items.slice(0,3).map(nameOf).join(', ') + '.';
      else if (foundOrder.item) result.text = nameOf(foundOrder.item) + ' est actuellement indiqué « ' + (foundOrder.item.st||foundOrder.item.status||'statut inconnu') + ' »' + (foundOrder.item.carrier ? ' chez ' + foundOrder.item.carrier : '') + '.';
      else result.text = "Je ne trouve pas de commande correspondant à votre question.";
      return result;
    }

    if (q.indexOf('peux tu')>-1 || q.indexOf('faire pour moi')>-1 || q.indexOf('aide')>-1){
      result.text = 'Je peux vérifier une échéance, calculer votre budget récurrent, retrouver le statut d’un achat ou préparer la prochaine action. Chaque réponse reste limitée aux données de votre coffre.';
      return result;
    }

    if (s.tracked){
      result.text = 'Votre coffre contient ' + d.orders.length + ' achat' + (d.orders.length>1?'s':'') + ', ' + d.warranties.length + ' garantie' + (d.warranties.length>1?'s':'') + ' et ' + s.recurringCount + ' service' + (s.recurringCount>1?'s':'') + '. Précisez le marchand, le produit ou le calcul à vérifier.';
    } else {
      result.text = "Je n'ai pas encore de donnée à vérifier. Ajoutez un achat ou connectez une source pour obtenir une réponse factuelle.";
      result.action='add-order';result.actionLabel='Ajouter un achat';result.evidence='Aucune donnée';result.evidenceCount=0;
    }
    return result;
  }

  function suggestions(){
    var s = snapshot(), out = [];
    if (s.warranties.length && s.warranties[0].days <= 180) out.push({icon:'warranty',text:'Quelle garantie expire en premier ?'});
    if (s.recurringCount) out.push({icon:'subscription',text:'Combien me coûtent mes abonnements par an ?'});
    if (s.transit.length) out.push({icon:'delivery',text:'Où en est ma commande ' + (s.transit[0].brand||s.transit[0].name||'en cours') + ' ?'});
    if (s.data.orders.length) out.push({icon:'orders',text:'Combien ai-je dépensé ce mois-ci ?'});
    out.push({icon:'ai',text:'Que peux-tu faire pour moi ?'});
    return out.slice(0,4);
  }

  document.addEventListener('click',function(event){
    var target = event.target && event.target.closest ? event.target.closest('[data-clervio-action]') : null;
    if (!target) return;
    var action = target.getAttribute('data-clervio-action');
    if (action) act(action);
  });

  window.ClervioIntelligence = {
    data:data,
    snapshot:snapshot,
    insights:insightList,
    renderHome:renderHome,
    localAnswer:localAnswer,
    suggestions:suggestions,
    evidence:evidence,
    action:act,
    icon:icon,
    escape:esc,
    formatMoney:formatMoney
  };

  // Le résolveur de session peut terminer pendant le chargement des scripts.
  // Réhydrate donc l'écran actif une fois le moteur réellement disponible.
  function hydrateActiveScreen(){
    if (!document || typeof document.querySelector !== 'function') return;
    var active = document.querySelector('.pg.on');
    if (!active) return;
    if (active.id === 'p-home'){
      renderHome();
      if (typeof initHome === 'function') initHome();
      if (typeof renderHomePriorities === 'function') renderHomePriorities();
    }
    if (active.id === 'p-ai' && typeof prepareAI === 'function') prepareAI();
  }
  if (document && typeof document.querySelector === 'function'){
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') document.addEventListener('DOMContentLoaded',hydrateActiveScreen,{once:true});
    else setTimeout(hydrateActiveScreen,0);
    if (typeof window.addEventListener === 'function') window.addEventListener('clervio-app-ready',hydrateActiveScreen,{once:true});
  }
})();
