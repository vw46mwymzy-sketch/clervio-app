import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/28-intelligence.js',import.meta.url),'utf8');

function engineWith(values={}){
  const context = {
    console,
    Intl,
    Date,
    setTimeout,
    clearTimeout,
    document:{ addEventListener(){},getElementById(){ return null; } },
    ORDS:values.orders || [],
    WARR:values.warranties || [],
    SUBS:values.subscriptions || [],
    CONTR:values.contracts || [],
    DOCS:values.documents || []
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'28-intelligence.js'});
  return context.ClervioIntelligence;
}

test('calcule le budget récurrent sans modèle de langage',()=>{
  const engine = engineWith({
    subscriptions:[
      {name:'Mensuel',amt:10,freq:'mois'},
      {name:'Annuel',amt:120,freq:'an'},
      {name:'Trimestriel',amt:30,freq:'trim.'}
    ]
  });
  const snapshot = engine.snapshot();
  assert.equal(snapshot.monthlyTotal,30);
  assert.equal(snapshot.annualTotal,360);
  const answer = engine.localAnswer('Combien me coûtent mes abonnements par an ?');
  assert.match(answer.text,/360,00\s€|360\s€/);
  assert.equal(answer.evidenceCount,3);
});

test('refuse de substituer une garantie sans correspondance',()=>{
  const engine = engineWith({
    warranties:[
      {brand:'Apple',name:'iPhone',exp:'2 juin 2028'},
      {brand:'Dyson',name:'Aspirateur',exp:'8 mai 2027'}
    ]
  });
  const answer = engine.localAnswer('Ma garantie MacBook expire quand ?');
  assert.match(answer.text,/ne trouve pas de garantie correspondant/i);
  assert.doesNotMatch(answer.text,/iPhone|Aspirateur/);
});

test('classe un remboursement avant une livraison',()=>{
  const engine = engineWith({
    orders:[
      {id:'1',brand:'Nike',name:'Chaussures',st:'En transit'},
      {id:'2',brand:'Sephora',name:'Parfum',st:'Retour',refundStatus:'attente'}
    ]
  });
  const insights = engine.insights();
  assert.equal(insights[0].kind,'refund');
  assert.equal(insights[1].kind,'delivery');
});

test('n’invente pas une alerte quand le coffre est vide',()=>{
  const engine = engineWith();
  const snapshot = engine.snapshot();
  const insights = engine.insights(snapshot);
  assert.equal(snapshot.tracked,0);
  assert.equal(insights.length,1);
  assert.equal(insights[0].kind,'ready');
  assert.equal(insights[0].action,'add-order');
});
