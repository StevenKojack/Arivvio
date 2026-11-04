// Operator-only data update preparation. Never import this module into a client bundle.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const businessFields=new Set(['description','phone','email']);
const serviceFields=new Set(['description','event_types_supported']);
const events=new Set(['Birthday','Wedding','Corporate','Private Party','Fundraiser','Baby Shower','Graduation','Convention']);
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
const json=value=>literal(JSON.stringify(value))+'::jsonb';
function patch(before,after,allowed){
 if(!before||!after||!Object.keys(after).length||JSON.stringify(Object.keys(before).sort())!==JSON.stringify(Object.keys(after).sort()))throw Error('Before/after fields must match');
 for(const [key,value] of Object.entries(after)){
  if(!allowed.has(key))throw Error('Forbidden factual field: '+key);
  if(key==='event_types_supported') {if(!Array.isArray(value)||!value.length||value.some(v=>!events.has(v)))throw Error('Invalid event type');}
  else if(typeof value!=='string'||!value.trim()||value.length>1600)throw Error('Invalid factual value');
  if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Invalid email');
  if(key==='phone'&&!/^[+\d() .-]{7,30}$/.test(value))throw Error('Invalid phone');
 }
}
export function validateEnrichment(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Business updates required');
 const ids=new Set(),services=new Set();
 for(const r of rows){
  if(!uuid.test(r.business_id)||ids.has(r.business_id))throw Error('Unique existing business UUID required');ids.add(r.business_id);
  if(!r.business_name||!r.identity?.website_url?.startsWith('https://')||!r.identity.service_area_city)throw Error('Branch identity required');
  patch(r.before,r.after,businessFields);
  if(!r.sources?.length||r.sources.some(s=>s.type!=='official website'||!s.url.startsWith('https://')||!s.facts?.length||!/^\d{4}-\d{2}-\d{2}$/.test(s.reviewed_on)))throw Error('Official source and review date required');
  const facts=new Set(r.sources.flatMap(s=>s.facts));
  for(const key of Object.keys(r.after))if(!facts.has(key))throw Error('Missing source for '+key);
  for(const s of r.services){
   if(!uuid.test(s.id)||services.has(s.id)||!s.category)throw Error('Unique existing service UUID required');services.add(s.id);
   patch(s.before,s.after,serviceFields);
   for(const key of Object.keys(s.after))if(!facts.has(key))throw Error('Missing service source for '+key);
  }
  if(r.media_status!=='permission_required')throw Error('Media approval is a separate Admin operation');
 }
 return {businesses:ids.size,services:services.size};
}
function assignments(after){return Object.entries(after).map(([k,v])=>`${k}=${Array.isArray(v)?'array['+v.map(literal).join(',')+']::text[]':literal(v)}`).join(',');}
function guard(table,alias,id,before,after){return `if not (to_jsonb(${alias}) @> ${json(before)} or to_jsonb(${alias}) @> ${json(after)}) then raise exception 'Concurrent ${table} edit: ${id}'; end if;`;}
export function enrichmentSql(rows){
 validateEnrichment(rows);
 const commands=rows.map(r=>{
 const sources=r.sources.map(s=>{const note=`ARIVVIO enrichment 2026-11-03; reviewed ${s.reviewed_on}; original summary, no media permission implied.`;return `insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,note) select ${literal(r.business_id)}::uuid,${literal(s.url)},'official website',array[${s.facts.map(literal).join(',')}]::text[],${literal(note)} where not exists(select 1 from public.listing_sources where vendor_id=${literal(r.business_id)}::uuid and source_url=${literal(s.url)} and note=${literal(note)});`;}).join('\n');
 return `select * into v from public.vendor_businesses where id=${literal(r.business_id)}::uuid for update;
 if v.id is null or v.owner_id is not null or v.applicant_id is not null or v.verification_status<>'unverified' or v.business_name is distinct from ${literal(r.business_name)} or v.location_name is distinct from ${r.branch===null?'null':literal(r.branch)} or not(to_jsonb(v) @> ${json(r.identity)}) then raise exception 'Business identity/state changed: ${r.business_id}'; end if;
 ${guard('business','v',r.business_id,r.before,r.after)}
 update public.vendor_businesses set ${assignments(r.after)} where id=v.id;
 ${r.services.map(s=>`select * into svc from public.vendor_services where id=${literal(s.id)}::uuid for update;
 if svc.id is null or svc.vendor_id<>v.id or svc.category<>${literal(s.category)} then raise exception 'Service identity mismatch'; end if;
 ${guard('service','svc',s.id,s.before,s.after)}
 update public.vendor_services set ${assignments(s.after)} where id=svc.id;`).join('\n')}
 ${sources}`;
 }).join('\n');
 return `begin;\ndo ${literal('declare v public.vendor_businesses; svc public.vendor_services; begin\n'+commands+'\nend')};\nselect ${rows.length} as businesses_checked, ${rows.reduce((n,r)=>n+r.services.length,0)} as services_checked;\ncommit;\n`;
}
