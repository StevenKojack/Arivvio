import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {getVendorMedia} from './vendorImages.ts';
import {listingPresentation} from './listing-state.ts';
import {lockDocumentScroll} from '../ui/scroll-lock.ts';
const require=createRequire(import.meta.url);
function component(path,stubs={}){const source=readFileSync(path,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;const exports={};new Function('require','exports',code)(name=>stubs[name]??require(name),exports);return exports;}
const {BusinessStatusBadge}=component('app/components/BusinessStatusBadge.tsx',{'@/lib/marketplace/listing-state':{listingPresentation}});
const base={id:1,name:'Fixture business',type:'DJ',listingState:'unclaimed',databaseSource:true};
test('shared badge exposes authority only on verified claimed businesses',()=>{
 for(const [item,label,check] of [[base,'Unclaimed Business',false],[{...base,listingState:'demo',databaseSource:false},'Fictional Demo Business',false],[{...base,listingState:'claimed',verificationStatus:'pending'},'Claimed Business · Verification pending',false],[{...base,listingState:'claimed',verificationStatus:'verified'},'Claimed Business',true]]){
 const html=renderToStaticMarkup(React.createElement(BusinessStatusBadge,{item}));assert.ok(html.includes(label));assert.equal(html.includes('aria-label="Business authority verified by ARIVVIO"'),check);
 }
});
test('media ignores unapproved and legacy raw URLs, uses attested then licensed actual photos',()=>{
 const media=(url,kind='business_photo',status='approved',vendorAttested=false,order=0)=>({url,kind,status,vendorAttested,order,alt:'Accurate description',attribution:'Credit'});
 const fallback=getVendorMedia({...base,name:'Scooter raceway',photoUrl:'https://unapproved.example/photo'});assert.equal(fallback.illustrative,true);assert.match(fallback.alt,/not a photograph of/);assert.equal(fallback.src,getVendorMedia({...base,name:'Different name'}).src);
 assert.equal(getVendorMedia({...base,media:[media('candidate','business_photo','candidate')]}).illustrative,true);
 const item={...base,media:[media('illustration','illustration'),media('logo','logo'),media('licensed'),media('attested','business_photo','approved',true)]};
 assert.equal(getVendorMedia(item).src,'attested');item.media.pop();assert.equal(getVendorMedia(item).src,'licensed');item.media.pop();assert.equal(getVendorMedia(item).src,'logo');
 assert.equal(getVendorMedia({...base,type:'Security'}).src,'/marketplace-placeholder.svg');
 assert.notEqual(getVendorMedia({...base,id:1}).src,getVendorMedia({...base,id:2}).src);
});
test('nested fixed-body scroll locks restore exact position and preexisting styles only after last close',()=>{
 const body={style:{position:'relative',top:'',left:'',width:'',overflow:'auto',paddingRight:'4px'}},root={style:{overflow:'visible',scrollBehavior:'smooth'},clientWidth:980},calls=[];
 const win={scrollX:12,scrollY:734,innerWidth:1000,scrollTo:(x,y)=>calls.push([x,y])};const before={...body.style};
 const unlock=lockDocumentScroll({body,documentElement:root},win);assert.equal(body.style.top,'-734px');assert.equal(body.style.position,'fixed');
 const inner=lockDocumentScroll({body,documentElement:root},win);unlock();assert.equal(body.style.position,'fixed');inner();assert.deepEqual(body.style,before);assert.deepEqual(calls,[[12,734]]);inner();assert.equal(calls.length,1);assert.equal(root.style.scrollBehavior,'smooth');
});
test('card stretched target and actions remain siblings with visible focus and no clipping ancestor',()=>{
 const card=readFileSync('app/marketplace/components/VendorCard.tsx','utf8'),css=readFileSync('app/globals.css','utf8');
 assert.match(card,/button className="provider-profile-trigger/);assert.match(card,/provider-action/);assert.doesNotMatch(card,/role="button"/);assert.doesNotMatch(card,/<h3[^>]*line-clamp/);assert.match(css,/provider-profile-trigger::after/);assert.match(css,/provider-action[^}]*z-index: 2/);assert.match(css,/provider-profile-trigger:focus-visible/);
 const profile=readFileSync('app/marketplace/components/ProviderProfile.tsx','utf8');assert.match(profile,/lockDocumentScroll/);assert.match(profile,/onCancel=\{onClose\}/);assert.match(profile,/preventScroll:true/);assert.match(css,/overscroll-behavior: contain/);
});
test('occasion removal preserves search keyboard navigation and automatic motion',()=>{
 const source=readFileSync('app/components/EventDiscoverySearch.tsx','utf8');assert.ok(!source.includes('↗'));assert.match(source,/ArrowDown/);assert.match(source,/ArrowUp/);assert.match(source,/occasion/);
});
