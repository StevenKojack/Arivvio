import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')||specifier.startsWith('.')){const base=specifier.startsWith('@/')?pathToFileURL(resolve(specifier.slice(2))).href:new URL(specifier,context.parentURL).href;for(const suffix of ['', '.ts'])if(existsSync(fileURLToPath(base+suffix)))return next(base+suffix,context);}return next(specifier,context);}});
const {selectMatchingTiers}=await import('./matching-tiers.ts');
const {marketplaceItems,isAvailableAt}=await import('../../app/data/marketplace.ts');
const {listingPresentation}=await import('./listing-state.ts');
const {businessOverview}=await import('../vendor-demo/operations.ts');
const {seedHub}=await import('../vendor-demo/model.ts');
const exact={hardMatch:true,localMatch:true,availabilityKnown:true};
test('sparse inventory keeps exact first, labels broadened area and unknown schedule separately',()=>{
 const rows=[{id:1},{id:2},{id:3},{id:4}];
 const matches=selectMatchingTiers(rows,new Map([[1,{...exact,localMatch:false}],[2,exact],[3,{...exact,availabilityKnown:false}],[4,{...exact,hardMatch:false}]]));
 assert.deepEqual(matches.items.map(i=>i.id),[2,1,3]);assert.equal(matches.exactCount,1);
 assert.equal(matches.details[1].tier,'nearby');assert.match(matches.details[3].reason,/Schedule is not listed/);assert.equal(matches.details[4],undefined);
});
test('sufficient exact inventory suppresses all fallback tiers',()=>{
 const rows=[{id:1},{id:2},{id:3},{id:4}]; const matches=selectMatchingTiers(rows,new Map(rows.map(i=>[i.id,{...exact,localMatch:i.id!==1}])));
 assert.deepEqual(matches.items.map(i=>i.id),[2,3,4]);
});
test('no alternative is invented when every provider fails hard requirements',()=>{
 const result=selectMatchingTiers([{id:1}],new Map([[1,{...exact,hardMatch:false}]]));assert.equal(result.items.length,0);
});
test('fictional coverage supports core services, large events and Armenian context',()=>{
 const added=marketplaceItems.filter(i=>i.id>=60);
 assert.equal(added.length,13);assert.equal(new Set(marketplaceItems.map(i=>i.id)).size,marketplaceItems.length);
 for(const service of ['Venue','Catering','DJ','Live Music','Photography','Rentals','Florals','Magic','Transportation','Cake & Desserts','Staffing'])assert.ok(added.some(i=>i.services.includes(service)),service);
 for(const event of ['Wedding','Birthday','Corporate','Private Party'])assert.ok(added.some(i=>i.events.includes(event)&&i.maxGuestCount>=350),event);
 assert.ok(added.some(i=>i.type==='Catering'&&i.languages.includes('Armenian')));
 assert.ok(added.every(i=>i.listingState==='demo'&&i.databaseSource===false&&i.rating===0&&/Fictional demo/.test(i.description)));
 assert.ok(added.every(i=>isAvailableAt(i,'2026-10-24','17:00','21:00')));
});
test('unclaimed listing does not imply partnership or allow a request before concierge flow exists',()=>{
 const state=listingPresentation({listingState:'unclaimed',databaseSource:true});assert.equal(state.canRequest,false);assert.match(state.description,/not confirmed/);
 assert.equal(listingPresentation({databaseSource:true}).label,'Provider listing');
 assert.equal(listingPresentation({listingState:'demo'}).label,'Demo listing');
});
test('overview derives next event, warnings and completeness from saved business data',()=>{
 const state=seedHub({name:'Demo',location:'Glendale',contact:'',description:'Test',specialties:'DJ',languages:'English'},new Date(2026,9,15,12));
 let overview=businessOverview(state,'2026-10-15','22:00');assert.equal(overview.next.id,'birthday');assert.equal(overview.today.events.length,1);assert.ok(overview.checks.some(c=>c.label==='Contact'&&!c.done));
 state.blocked.push(overview.next.date);overview=businessOverview(state,'2026-10-15');assert.ok(overview.attention.some(e=>e.event.id==='birthday'));
});
const {matchesListingRequirements}=await import('./matching-tiers.ts');
const requirements={event:'Wedding',services:['Catering'],excluded:[],query:'',language:'',specialty:'',estimate:3000,guests:300};
test('actual listing requirements preserve service, language, budget, capacity, exclusions and query',()=>{
 const item=marketplaceItems.find(i=>i.name==='Copper Apricot Kitchen');
 assert.equal(matchesListingRequirements(item,requirements),true);
 for(const change of [{services:['DJ']},{excluded:['Catering']},{language:'French'},{specialty:'Kosher'},{maxEstimate:2000},{guests:500},{query:'unknown provider'},{event:'Funeral'}])assert.equal(matchesListingRequirements(item,{...requirements,...change}),false,JSON.stringify(change));
 assert.equal(matchesListingRequirements(item,{...requirements,query:'Armenian catering',language:'Armenian'}),true);
 for(const event of ['Wedding','Birthday','Private Party','Corporate'])assert.equal(matchesListingRequirements(item,{...requirements,event}),true,event);
});
