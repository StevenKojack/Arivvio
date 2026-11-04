import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validateEnrichment,enrichmentSql} from './enrichment.mjs';
const rows=JSON.parse(readFileSync('research/enrichment/2026-11-03-existing-businesses.json','utf8'));
test('existing enrichment has 18 business UUIDs, 21 service UUIDs and separate Porto branches',()=>{
 assert.deepEqual(validateEnrichment(rows),{businesses:18,services:21});
 const portos=rows.filter(r=>r.business_name==='Porto’s Bakery');assert.equal(portos.length,2);assert.notEqual(portos[0].business_id,portos[1].business_id);assert.notEqual(portos[0].after.phone,portos[1].after.phone);
 assert.equal(rows.find(r=>r.business_name==="Scooter's Jungle").branch,'El Segundo / South Bay');
});
test('enrichment rejects ownership, media approval, prices, missing facts and duplicate UUIDs',()=>{
 for(const key of ['owner_id','verification_status','media_status','base_price','latitude']){
  const copy=structuredClone(rows);copy[0].before[key]=null;copy[0].after[key]='bad';assert.throws(()=>validateEnrichment(copy),/Forbidden/);
 }
 const copy=structuredClone(rows);copy[0].sources=[];assert.throws(()=>validateEnrichment(copy),/source/);assert.throws(()=>validateEnrichment([...rows,rows[0]]),/Unique/);
});
test('generated transaction preserves sources, retries safely and rejects stale or cross-business changes',async()=>{
 const db=new PGlite();const r=structuredClone(rows[0]);
 try{
 await db.exec('create table vendor_businesses(id uuid primary key, owner_id uuid, applicant_id uuid, verification_status text,business_name text,location_name text,website_url text,service_area_city text,base_address text,description text); create table vendor_services(id uuid primary key,vendor_id uuid,category text,description text,event_types_supported text[]);create table listing_sources(vendor_id uuid,source_url text,source_type text,supported_fields text[],note text);');
 await db.query('insert into vendor_businesses values($1,null,null,$2,$3,$4,$5,$6,$7,$8)',[r.business_id,'unverified',r.business_name,r.branch,r.identity.website_url,r.identity.service_area_city,r.identity.base_address,r.before.description]);
 const s=r.services[0];await db.query('insert into vendor_services values($1,$2,$3,$4,$5)',[s.id,r.business_id,s.category,s.before.description,['Birthday']]);
 await db.query("insert into listing_sources values($1,'https://original.example','official website',array['identity'],'Original source')",[r.business_id]);
 await db.exec(enrichmentSql([r]));await db.exec(enrichmentSql([r]));
 assert.equal((await db.query('select count(*)::int n from listing_sources')).rows[0].n,1+r.sources.length);
 assert.equal((await db.query('select owner_id,description from vendor_businesses')).rows[0].owner_id,null);
 await db.query("update vendor_businesses set description='Concurrent edit'");
 await assert.rejects(db.exec(enrichmentSql([r])),/Concurrent business edit/);await db.exec('rollback');
 await db.query('update vendor_businesses set description=$1',[r.after.description]);await db.query('update vendor_services set vendor_id=$1',[rows[1].business_id]);
 await assert.rejects(db.exec(enrichmentSql([r])),/Service identity/);await db.exec('rollback');
 }finally{await db.close();}
});
test('official work links are HTTPS and logos preserve proportions on cards and galleries',()=>{
 const links=JSON.parse(readFileSync('app/data/businessReferences.json','utf8'));assert.equal(Object.keys(links).length,18);
 for(const [id,ref] of Object.entries(links)){assert.ok(rows.some(r=>r.business_id===id));assert.equal(new URL(ref.url).protocol,'https:');}
 for(const path of ['app/marketplace/components/ProviderProfile.tsx','app/marketplace/components/VendorCard.tsx'])assert.match(readFileSync(path,'utf8'),/object-contain/);
 assert.doesNotMatch(readFileSync('app/components/OfficialBusinessWork.tsx','utf8'),/<img|<Image/);
});
