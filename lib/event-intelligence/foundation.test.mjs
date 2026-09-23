import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/') || specifier.startsWith('.')) {
    const base = specifier.startsWith('@/') ? pathToFileURL(resolve(specifier.slice(2))).href : new URL(specifier, context.parentURL).href;
    for (const suffix of ['', '.ts', '/index.ts']) if (existsSync(fileURLToPath(base + suffix)) && !(!suffix && !/\.[cm]?[jt]s$/.test(base))) return next(base + suffix, context);
  }
  return next(specifier, context);
} });
const { buildEventIntelligenceProfile: build } = await import('./engine.ts');
const { understandEvent, getEventChangeImpact } = await import('./understanding.ts');
const { reasonAboutBudget } = await import('./budget.ts');
const { rankMarketplaceItemsForPlan } = await import('../marketplace/plan-matching.ts');
const scenarios = {
 birthday: 'Birthday at my house for 35 people from 6 to 10. Need a DJ and tacos.',
 graduation: 'My sister’s graduation party is in June at our house for around 80 people. Need food and a DJ. Not sure what else.',
 wedding: 'Wedding next May. Church ceremony at 3, banquet reception at 5, 180 guests. Need DJ, photographer and flowers.',
 corporate: 'Holiday dinner for 120 employees in December. Need venue, food and AV.',
 memorial: 'Memorial for my grandfather for around 100 people.',
 ambiguous: 'We’re doing something for my parents’ anniversary.',
};
for (const [name, query] of Object.entries(scenarios)) {
 test(`${name}: grounded event understanding`, () => {
  const p = build({ query }); const u = understandEvent(p);
  if (name === 'birthday') {
    assert.equal(p.homeEvent, true); assert.equal(p.guestSize, 35); assert.deepEqual(p.stages, []);
    assert.equal(p.planning.startTime, '18:00'); assert.equal(p.planning.endTime, '22:00');
    assert.deepEqual(new Set(p.requestedServices), new Set(['DJ','Catering']));
    assert.ok(u.ambiguous.some(text => text.includes('AM/PM')));
  }
  if (name === 'graduation') {
    assert.equal(p.recognition.identity.canonicalEventType, 'graduation'); assert.equal(p.guestSize,80); assert.equal(p.dateHint,'June'); assert.equal(p.homeEvent,true); assert.deepEqual(p.stages,[]);
    assert.deepEqual(new Set(p.requestedServices), new Set(['DJ','Catering']));
    assert.ok(u.recommended.length > 0 && u.recommended.length <= 3);
    for (const id of ['date','time','budget']) assert.ok(u.missing.some(q=>q.id===id));
    assert.ok(!u.missing.some(q=>q.id==='guests' || q.id==='venue'));
  }
  if (name === 'wedding') {
    assert.equal(p.recognition.identity.canonicalEventType,'wedding'); assert.equal(p.guestSize,180); assert.equal(p.dateHint,'next May');
    assert.deepEqual(p.stages.map(s=>[s.id,s.startTime]), [['ceremony','15:00'],['reception','17:00']]);
    assert.deepEqual(new Set(p.requestedServices),new Set(['DJ','Photography','Florals']));
    assert.equal(u.serviceRelationships.find(s=>s.service==='DJ').stageIds[0],'reception');
    assert.equal(u.serviceRelationships.find(s=>s.service==='Florals').scope,'uncertain');
  }
  if (name === 'corporate') {
    assert.equal(u.tone,'professional'); assert.equal(p.guestSize,120); assert.equal(p.dateHint,'December');
    for (const s of ['Venue','Catering','AV Production']) assert.ok(p.requestedServices.includes(s),s);
  }
  if (name === 'memorial') {
    assert.equal(u.tone,'respectful'); assert.equal(p.guestSize,100);
    assert.ok(!u.recommended.some(s=>['DJ','Balloons','Photo Booth'].includes(s.service)));
  }
  if (name === 'ambiguous') {
    assert.match(p.recognition.identity.selectedDisplayEvent,/anniversary/i); assert.equal(p.guestSize,undefined); assert.deepEqual(p.requestedServices,[]); assert.ok(u.nextBestQuestion); assert.equal(u.readiness,'Early idea');
  }
 });
}
test('explicit structured parts, edits and serialized context survive intelligence processing', () => {
 const stages = [{id:'ceremony',label:'Ceremony',order:1,startTime:'14:15',endTime:'15:00',location:'Church',guestCount:150,budget:5000,services:['Photography']},{id:'reception',label:'Reception',order:2,startTime:'18:00',endTime:'23:00',location:'Hall',guestCount:180,budget:25000,services:['DJ','Photography']}];
 const planning={date:'2027-05-22',startTime:'14:15',endTime:'23:00',location:'Los Angeles',guestCount:180,budget:35000};
 const p=build({query:scenarios.wedding,stages,planning});
 assert.deepEqual(p.stages,stages); assert.deepEqual(JSON.parse(JSON.stringify(p)).stages,stages);
 assert.equal(understandEvent(p).serviceRelationships.find(s=>s.service==='Photography').scope,'multiple-stages');
 const next=build({query:scenarios.wedding,stages:stages.map(s=>s.id==='reception'?{...s,startTime:'19:00'}:s),planning});
 assert.deepEqual(next.stages[0],p.stages[0]); assert.deepEqual(getEventChangeImpact(p,next).changedStages,['reception']);
});
test('budget totals compare independently and reject nonfinite data',()=>{
 const b=reasonAboutBudget({overall:35000,stages:[{budget:5000},{budget:32000}],estimates:[36000,NaN],quotes:[33000]});
 assert.equal(b.unallocated,-2000); assert.equal(b.remainingAgainstEstimates,-1000); assert.equal(b.remainingAgainstQuotes,2000); assert.equal(b.signals.length,2);
});
test('existing service removal remains authoritative and defaults are not known',()=>{
 const p=build({query:scenarios.birthday,planSelections:[],selectedServices:[],preferences:[],inferPreferencesFromQuery:false,planning:{date:'',startTime:'18:00',endTime:'22:00',location:'',guestCount:60,budget:6000},confirmedPlanningFields:[]});
 assert.deepEqual(p.requestedServices,[]); assert.ok(understandEvent(p).missing.some(q=>q.id==='budget'));
});
test('explicit intent is not replaced by recommendations or missing defaults', () => {
 const p=build({query:'Birthday at my house for 100 people. No DJ, no photographer.'});
 assert.ok(!p.requestedServices.includes('DJ')); assert.ok(!p.requestedServices.includes('Photography'));
 assert.deepEqual(build({query:'Wedding reception for 180 people'}).requestedServices,[]);
 assert.equal(understandEvent(build({query:'Birthday'})).readyToRequestProviders,false);
 const q=build({query:'Birthday at my house in Burbank for 35 guests. Budget $3,000.'});
 assert.equal(q.planning.location,'Burbank'); assert.equal(q.planning.budget,3000);
});
test('conference only includes mentioned parts and uncertain times remain visible',()=>{
 const p=build({query:'Conference with registration at 9 AM, general session at 10 AM, breakouts at 11 AM, lunch at 12 PM and reception at 5 PM.'});
 assert.equal(p.stages.length,5); assert.equal(p.stages[0].startTime,'09:00');
 const wedding=understandEvent(build({query:scenarios.wedding})); assert.ok(wedding.ambiguous.some(item=>item.includes('Stage times')));
});
test('capacity, explicit stage scope, provider rules and budget improve provider ordering',()=>{
 const p=build({query:'Wedding needs a venue',stages:[{id:'ceremony',label:'Ceremony',order:1,guestCount:50,services:['Venue']},{id:'reception',label:'Reception',order:2,guestCount:180}],planning:{date:'2027-05-22',startTime:'15:00',endTime:'22:00',location:'Los Angeles',guestCount:180,budget:5000}});
 const vendor={id:1,name:'Small venue',type:'Venue',services:['Venue'],description:'',events:['Wedding'],pricing:{kind:'flat',basePrice:1000},maxGuestCount:60};
 const larger={...vendor,id:2,name:'Large venue',maxGuestCount:200};
 const tooSmall={...vendor,id:3,name:'Too small',maxGuestCount:30};
 assert.equal(rankMarketplaceItemsForPlan([tooSmall,vendor],p)[0].id,1);
 const expensive={...larger,id:4,pricing:{kind:'flat',basePrice:8000}};
 assert.equal(rankMarketplaceItemsForPlan([expensive,larger],p)[0].id,2);
 const restricted={...larger,id:5,marketplaceRules:{eventMode:'selected',served:['Birthday'],excluded:[],audience:'all'}};
 assert.equal(rankMarketplaceItemsForPlan([restricted,larger],p)[0].id,2);
});
test('quote serialization and session preserve richer evidence and unchanged parts', async()=>{
 const {saveDemoQuoteRequest,loadDemoQuoteRequests}=await import('./demo-quotes.ts');
 const {saveEventIntelligenceProfile,loadEventIntelligenceProfile}=await import('./storage.ts');
 const store=new Map(); const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 globalThis.window={localStorage:storage,sessionStorage:storage,dispatchEvent:()=>true};
 try {
  const p=build({query:scenarios.wedding}); saveEventIntelligenceProfile(p); const loaded=loadEventIntelligenceProfile(); assert.ok(loaded.eventId); assert.deepEqual({...loaded,eventId:undefined}, {...JSON.parse(JSON.stringify(p)),eventId:undefined});
  const request={id:'foundation',version:1,source:'ARIVVIO_DEMO',event:{profile:p},opportunities:[]}; saveDemoQuoteRequest(request);
  assert.deepEqual(loadDemoQuoteRequests()[0].event.profile,JSON.parse(JSON.stringify(p)));
  assert.deepEqual(getEventChangeImpact(p,p).affectedServices,[]);
 } finally { delete globalThis.window; }
});

test('structured guest edits outrank the original description',()=>{
 const p=build({query:scenarios.wedding,guestSize:220});
 assert.equal(p.guestSize,220); assert.equal(p.planning.guestCount,220);
 assert.equal(understandEvent(p).known.find(e=>e.field==='planning.guestCount').value,220);
});
