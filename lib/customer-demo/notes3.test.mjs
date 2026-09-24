import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/') || specifier.startsWith('.')) {
    const base = specifier.startsWith('@/') ? pathToFileURL(resolve(specifier.slice(2))).href : new URL(specifier, context.parentURL).href;
    for (const suffix of ['', '.ts', '/index.ts']) if (existsSync(fileURLToPath(base + suffix)) && !(!suffix && !/\.[cm]?[jt]s$/.test(base))) return next(base + suffix, context);
  }
  return next(specifier, context);
} });
const {buildEventIntelligenceProfile: build} = await import('../event-intelligence/engine.ts');
const {understandEvent} = await import('../event-intelligence/understanding.ts');
const {previewPlanningTurn} = await import('../assistant/preview.ts');
const {applyPlanActions} = await import('../assistant/actions.ts');
const {saveEventIntelligenceProfile, loadEventIntelligenceProfile} = await import('../event-intelligence/storage.ts');
const {saveDemoQuoteRequest, loadDemoQuoteRequests, appendDemoMessage, respondToDemoOpportunity} = await import('../event-intelligence/demo-quotes.ts');
const {loadCustomerEvents, deleteCustomerEvent, eventPeriod, collectCustomerEvents, eventsKey} = await import('./events.ts');
const {activeAssistantEvent, saveAssistantProfile} = await import('../assistant/session.ts');
function browser() {
 const storage = () => { const data=new Map(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}; };
 globalThis.window = { localStorage:storage(),sessionStorage:storage(),dispatchEvent:()=>{} };
 globalThis.localStorage=window.localStorage;globalThis.sessionStorage=window.sessionStorage;
 globalThis.CustomEvent = class extends Event { constructor(type,options){super(type);this.detail=options.detail;} };
}
function request(profile,id='r1') { return {id,version:1,source:'ARIVVIO_DEMO',status:'demo-created',createdAt:'2026-09-24T12:00:00Z',event:{name:profile.eventType.value,date:profile.planning.date,profile},opportunities:[{id:'dj',providerId:'49',providerName:'Apricot Sound DJs',service:'DJ',stageIds:[],status:'demo-not-sent'},{id:'other',providerId:'20',providerName:'Other',status:'demo-not-sent'}],message:'Please include setup'}; }
test('venue is a foundational recommendation, not an automatic requested service',()=>{
 const wedding=build({query:'Wedding'});assert.equal(understandEvent(wedding).recommended[0].service,'Venue');assert.ok(!wedding.requestedServices.includes('Venue'));
 for(const query of ['Birthday at my house for 150 people','Wedding. We booked the hall already.','Wedding. We already booked the venue.']){
  const p=build({query});assert.equal(p.venueRequired,false);assert.ok(!understandEvent(p).recommended.some(r=>r.service==='Venue'));assert.ok(!understandEvent(p).missing.some(q=>q.id==='venue'));
 }
 const home=understandEvent(build({query:'Backyard birthday for 150 people'}));assert.ok(home.logistics.some(l=>/restroom/.test(l.detail)));
});
test('casual follow-up facts affect only the relevant canonical fields',()=>{
 let p=build({query:'Anniversary for 100 people. Need a venue, DJ and cake.'});
 p=applyPlanActions(p,previewPlanningTurn('Actually make it 120.',p).actions).profile;assert.equal(p.planning.guestCount,120);
 p=applyPlanActions(p,previewPlanningTurn('We booked the hall already.',p).actions).profile;assert.equal(p.venueRequired,false);assert.ok(!understandEvent(p).recommended.some(r=>r.service==='Venue'));
 p=applyPlanActions(p,previewPlanningTurn('There are going to be about 25 kids.',p).actions).profile;assert.equal(p.audience.childrenCount,25);assert.equal(p.planning.guestCount,120);
 p=applyPlanActions(p,previewPlanningTurn('My cousin is handling dessert.',p).actions).profile;assert.ok(p.excludedServices.includes('Cake & Desserts'));assert.ok(p.requestedServices.includes('DJ'));
 const rebuilt=build({query:p.plannerIntent.rawText,audience:p.audience});assert.equal(rebuilt.audience.childrenCount,25);
});
test('stage changes remain isolated and ambiguous times do not create certainty',()=>{
 const p=build({query:'Wedding with Ceremony and Reception'});p.stages=[{id:'ceremony',label:'Ceremony',order:1,startTime:'15:00'},{id:'reception',label:'Reception',order:2,startTime:'17:00'}];
 assert.deepEqual(previewPlanningTurn('Move the reception to 6',p).actions,[]);
 const n=applyPlanActions(p,previewPlanningTurn('Move the reception to 6 pm',p).actions).profile;
 assert.equal(n.stages[0].startTime,'15:00');assert.equal(n.stages[1].startTime,'18:00');
});
test('event collection groups requests by canonical identity and dates remain honest',()=>{
 const p={...build({query:'Wedding'}),eventId:'e1'};const q=request(p);const events=collectCustomerEvents([p],[q,{...q,id:'r2'}]);assert.equal(events.length,1);assert.equal(events[0].requests.length,2);assert.equal(eventPeriod(events[0],'2026-09-24'),'Planning · date to confirm');
 p.planning.date='2026-09-23';p.stages=[{id:'part',label:'Reception',order:1,date:'2026-09-25'}];assert.equal(eventPeriod(collectCustomerEvents([p],[])[0],'2026-09-24'),'Current / upcoming');
 assert.equal(eventPeriod(collectCustomerEvents([p],[])[0],'2026-09-26'),'Past');
});
test('deletion removes one event and dependencies while preserving another and vendor manual events',()=>{
 browser();const one={...build({query:'Birthday'}),eventId:'one'};const two={...build({query:'Wedding'}),eventId:'two'};
 saveEventIntelligenceProfile(two);saveEventIntelligenceProfile(one);saveDemoQuoteRequest(request(one));saveDemoQuoteRequest(request(two,'r2'));
 localStorage.setItem('arivvio:conversation:one','messages');localStorage.setItem('arivvio:conversation:request:r1','messages');localStorage.setItem('arivvio:demo-planner:v1','old');localStorage.setItem('arivvio:demo-cart:v1','old');
 localStorage.setItem('arivvio.vendor-demo.v1',JSON.stringify({events:[{id:'v1',requestId:'r1'},{id:'manual',source:'MANUAL'},{id:'v2',requestId:'r2'}],notices:[{eventId:'v1'},{eventId:'v2'}]}));
 deleteCustomerEvent('one');assert.deepEqual(loadCustomerEvents().map(e=>e.id),['two']);assert.equal(loadEventIntelligenceProfile(),null);assert.equal(loadDemoQuoteRequests().length,1);assert.equal(localStorage.getItem('arivvio:conversation:one'),null);assert.equal(localStorage.getItem('arivvio:conversation:request:r1'),null);assert.equal(localStorage.getItem('arivvio:demo-cart:v1'),null);
 assert.deepEqual(JSON.parse(localStorage.getItem('arivvio.vendor-demo.v1')).events.map(e=>e.id),['manual','v2']);
 assert.throws(()=>saveEventIntelligenceProfile(one),/removed/);
});
test('failed deletion rolls back and never reports success',()=>{
 browser();const p={...build({query:'Birthday'}),eventId:'one'};saveEventIntelligenceProfile(p);saveDemoQuoteRequest(request(p));
 const set=localStorage.setItem;let failed=false;localStorage.setItem=(k,v)=>{if(k==='arivvio:removed-events:v1'&&!failed){failed=true;throw new Error('Quota');}set(k,v);};
 assert.throws(()=>deleteCustomerEvent('one'),/Unable/);assert.equal(loadCustomerEvents().length,1);assert.equal(loadDemoQuoteRequests().length,1);assert.ok(JSON.parse(localStorage.getItem(eventsKey)).some(p=>p.eventId==='one'));
});
test('provider threads persist both sides and quote history without crossing provider or event',()=>{
 browser();const p={...build({query:'Wedding'}),eventId:'one'};saveDemoQuoteRequest(request(p));
 appendDemoMessage('r1','dj','customer','Can you bring microphones?');appendDemoMessage('r1','dj','vendor','Included in the demo package.','49');respondToDemoOpportunity('r1','dj','49',{status:'quoted',price:1200,note:'Microphones included',at:'2026-09-24T12:00:00Z'});
 const saved=loadDemoQuoteRequests()[0];assert.equal(saved.opportunities[0].thread.length,3);assert.equal(saved.opportunities[1].thread,undefined);assert.equal(saved.event.profile.eventId,'one');
 assert.throws(()=>appendDemoMessage('r1','other','vendor','Wrong vendor','49'));assert.throws(()=>appendDemoMessage('missing','dj','customer','Hello'));assert.throws(()=>appendDemoMessage('r1','dj','customer',' '.repeat(8)));
});
test('assistant reads the displayed Event Hub and switching preserves event-specific carts',()=>{
 browser();const one={...build({query:'Birthday'}),eventId:'one'};const two={...build({query:'Wedding'}),eventId:'two'};saveEventIntelligenceProfile(two);saveEventIntelligenceProfile(one);
 localStorage.setItem('arivvio:demo-cart:v1','cart-one');localStorage.setItem('arivvio:cart:two','cart-two');
 assert.equal(activeAssistantEvent('/account/demo/events/two').profile.eventType.value,'Wedding');saveAssistantProfile(two);assert.equal(localStorage.getItem('arivvio:demo-cart:v1'),'cart-two');assert.equal(localStorage.getItem('arivvio:cart:one'),'cart-one');assert.equal(activeAssistantEvent('/account/demo/events/missing').readOnly,true);
});
test('layout safeguards reserve launchers and reuse shared stage controls',()=>{
 const css=readFileSync('app/globals.css','utf8');assert.match(css,/body\.has-customer-assistant\s*\{\s*padding-bottom:/);assert.match(css,/width: min\(350px, calc\(100vw - 195px\)\)/);
 const market=readFileSync('app/marketplace/MarketplaceBrowser.tsx','utf8');assert.ok(!market.includes('renderQuoteCart("bar")'));assert.ok(market.includes('marketplace-cart-launch'));
 const parts=readFileSync('app/discover/components/EventParts.tsx','utf8');assert.ok(parts.includes('<CalendarPicker'));assert.ok(parts.includes('<TimeDurationPicker'));assert.ok(!parts.includes('type={key === "date"'));
});

test('latest flagship wording retains approximate budget and does not mistake unbooked venues for secured ones',()=>{
 const p=build({query:"I'm planning my parents' 30th anniversary in October. Around 100 people, Armenian food, DJ and photographer, probably a banquet hall near Glendale, around $20k."});
 assert.equal(p.planning.guestCount,100);assert.equal(p.planning.budget,20000);assert.equal(p.planning.location,'Glendale');assert.equal(p.planning.date,'');assert.equal(p.dateHint,'October');assert.equal(p.venueRequired,true);assert.ok(p.cuisines.includes('Armenian'));assert.ok(p.requestedServices.includes('DJ'));assert.ok(p.requestedServices.includes('Photography'));
 assert.equal(previewPlanningTurn("We haven't booked the hall",p).actions.some(a=>a.kind==='venue_status'),false);
 assert.equal(build({query:"Wedding. We have not booked the venue."}).commercialVenue,false);
});
