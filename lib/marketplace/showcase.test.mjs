import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
registerHooks({resolve(s,c,next){if(s.startsWith('@/')||s.startsWith('.')){const base=s.startsWith('@/')?pathToFileURL(resolve(s.slice(2))).href:new URL(s,c.parentURL).href;for(const suffix of ['', '.ts'])if(existsSync(fileURLToPath(base+suffix)))return next(base+suffix,c);}return next(s,c);}});
const {showcaseItems,marketplaceItems,isAvailableAt}=await import('../../app/data/marketplace.ts');
const {composeProviders,listingType,marketplaceMode,selectMarketplaceMatches,requestRoute,cartGroups,providerKey,discoveryGroup}=await import('./sources.ts');
const {listingPresentation}=await import('./listing-state.ts');
const {matchesListingRequirements}=await import('./matching-tiers.ts');
const {loadDemoCart,saveDemoCart}=await import('../event-intelligence/demo-session.ts');
const real=(status='unclaimed',id='a')=>({...showcaseItems[0],id:1,vendorId:`vendor-${id}`,serviceId:`service-${id}`,databaseSource:true,listingState:status==='unclaimed'?'unclaimed':'claimed',verificationStatus:status,availability:[],pricingKnown:false,coordinatesKnown:false,rating:0,reviewCount:0});
test('four exact labels and decisive routing',()=>{
 for(const [item,label,route] of [[showcaseItems[0],'Fictional Demo Provider','demo'],[real(),'Unclaimed Business','concierge'],[real('verified'),'Verified Business','direct'],[real('pending'),'Business-Managed · Verification Pending','blocked']]){assert.equal(listingPresentation(item).label,label);assert.equal(requestRoute(item),route);}
 assert.equal(listingPresentation({databaseSource:true}).canRequest,false);
});
test('showcase retains sourced businesses alongside fictional inventory; modes are explicit',()=>{
 assert.equal(composeProviders([real()],showcaseItems,'showcase').length,showcaseItems.length+1);
 assert.equal(composeProviders([real()],showcaseItems,'real').length,1);
 assert.ok(composeProviders([real()],showcaseItems,'demo').every(i=>listingType(i)==='demo'));
 assert.equal(marketplaceMode('real'),'real');assert.equal(marketplaceMode('unknown'),'showcase');
});
test('same numeric legacy IDs never alias real UUIDs or fictional providers',()=>{
 const input=Array.from({length:1500},(_,i)=>real('unclaimed',String(i)));
 const a=composeProviders(input,showcaseItems,'showcase'),b=composeProviders([...input].reverse(),showcaseItems,'showcase');
 assert.equal(new Set(a.map(i=>i.id)).size,a.length);assert.equal(new Set(a.map(i=>i.sourceKey)).size,a.length);
 assert.deepEqual(a.map(i=>[i.sourceKey,i.id]),b.map(i=>[i.sourceKey,i.id]));
 assert.equal(composeProviders([input[0],input[0]],[],'real').length,1);
 assert.equal(providerKey(input[0]),'business:vendor-0:service:service-0');
});
test('real unknown schedules remain visible when Demo has abundant exact matches',()=>{
 const items=composeProviders([real('verified','v'),real('unclaimed','u')],showcaseItems.slice(0,5),'showcase');
 const assessments=new Map(items.map(i=>[i.id,{hardMatch:true,localMatch:true,availabilityKnown:!i.databaseSource}]));
 const selected=selectMarketplaceMatches(items,assessments);
 assert.equal(listingType(selected.items[0]),'verified');assert.equal(listingType(selected.items[1]),'unclaimed');assert.equal(selected.items.length,7);
 assessments.set(items[0].id,{hardMatch:false,localMatch:true,availabilityKnown:true});assert.ok(!selectMarketplaceMatches(items,assessments).items.includes(items[0]));
});
test('listing filter composes with hard service, language and event requirements',()=>{
 const req={event:'Wedding',services:['DJ'],excluded:[],query:'wedding dj',language:'Armenian',specialty:'',estimate:1000,guests:150};
 const matches=showcaseItems.filter(i=>listingType(i)==='demo'&&matchesListingRequirements(i,req));assert.ok(matches.length);assert.ok(matches.every(i=>i.services.includes('DJ')&&i.languages.includes('Armenian')));
 assert.equal(matchesListingRequirements(real(),req),false);
});
test('48 curated examples cover event service categories without real websites or fabricated reviews',()=>{
 assert.equal(showcaseItems.length,48);
 for(const service of ['Venue','Catering','DJ','Live Music','Photography','Florals','Rentals','Cake & Desserts','Magic','Photo Booth','Transportation','Staffing','Security','AV Production'])assert.ok(showcaseItems.some(i=>i.services.includes(service)),service);
 assert.ok(showcaseItems.some(i=>/videography/.test(i.description)));
 assert.ok(marketplaceItems.every(i=>i.databaseSource===false&&i.rating===0&&i.reviewCount===0&&i.sourceUrl==='/demo'));
 assert.ok(showcaseItems.every(i=>discoveryGroup(i)));
 assert.ok(!marketplaceItems.some(i=>/Yelp|Ebell|NOOR|Scooter|Wolfgang|Taglyan/.test(i.name)));
});
test('unknown real schedule or pricing is not a fabricated offer',()=>{const r=real();assert.equal(isAvailableAt(r),false);assert.equal(r.pricingKnown,false);assert.equal(r.coordinatesKnown,false);assert.equal(r.rating,0);});
test('mixed carts keep Demo, direct, concierge and blocked requests distinct',()=>{
 const groups=cartGroups([showcaseItems[0],real(),real('verified'),real('pending')].map(item=>({item})));
 assert.equal(groups.demo.length,1);assert.equal(groups.real.length,1);assert.equal(groups.blocked.length,2);
 assert.ok(groups.demo.every(l=>!l.item.databaseSource));assert.ok(groups.real.every(l=>requestRoute(l.item)==='direct'));
});
test('Demo carts preserve account event isolation and public browsing continuity',()=>{
 const data=new Map();globalThis.window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
 try{saveDemoCart(['public']);saveDemoCart(['event A'],'a');saveDemoCart(['event B'],'b');assert.deepEqual(loadDemoCart(),['public']);assert.deepEqual(loadDemoCart('a'),['event A']);assert.deepEqual(loadDemoCart('b'),['event B']);assert.equal(loadDemoCart('c'),null);}finally{delete globalThis.window;}
});
test('cards, profiles and maps use shared source labels; concierge links preserve event context',()=>{
 for(const file of ['VendorCard','ProviderProfile','MarketplaceMap'])assert.match(readFileSync(`app/marketplace/components/${file}.tsx`,'utf8'),/listingPresentation/);
 for(const file of ['VendorCard','ProviderProfile'])assert.match(readFileSync(`app/marketplace/components/${file}.tsx`,'utf8'),/eventId=\$\{encodeURIComponent\(eventId\)\}/);
 assert.match(readFileSync('app/marketplace/components/MarketplaceMap.tsx','utf8'),/pin.item.type === "Venue" && pin.item.coordinatesKnown !== false/);
});

test('birthday and corporate plans retain relevant service variety at realistic guest counts',()=>{
 for(const [event,guests,services] of [['Birthday',40,['Venue','Magic','Catering','Cake & Desserts','Photography','Rentals']],['Corporate',150,['Venue','Catering','AV Production','Photography','Staffing']]]) {
  for(const service of services) {
   const requirements={event,guests,services:[service],excluded:[],query:'',language:'',specialty:'',estimate:1000};
   assert.ok(showcaseItems.some(item=>matchesListingRequirements(item,requirements)),`${event}: ${service}`);
  }
 }
});
