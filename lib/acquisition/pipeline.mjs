import {researchErrors,researchIdentity,publicUrl} from './research.ts';
export const researchStates=['candidate','researching','source_checked','ready_for_admin_review','imported','published','duplicate','rejected','needs_recheck'];
export function validateQueue(rows,categories,existing=[],today=new Date().toISOString().slice(0,10)){
 if(!Array.isArray(rows)||!rows.length||rows.length>50)return ['Provide 1–50 candidate records.'];
 const errors=[],ids=new Set(),identities=new Set();
 for(const row of rows){
  const prefix=row?.candidate_id??'Unknown candidate';
  if(!row||!/^[-a-z0-9]{3,100}$/.test(row.candidate_id??'')){errors.push(`${prefix}: invalid candidate ID`);continue;}
  if(ids.has(row.candidate_id))errors.push(`${prefix}: repeated candidate ID`);ids.add(row.candidate_id);
  if(!researchStates.includes(row.research_status))errors.push(`${prefix}: invalid research state`);
  const validation=researchErrors(row.details,categories,today);errors.push(...validation.map(e=>`${prefix}: ${e}`));
  if(validation.length)continue;
  const identity=researchIdentity(row.details);
  if(identities.has(identity))errors.push(`${prefix}: duplicate business/location in queue`);identities.add(identity);
  if(existing.some(e=>researchIdentity(e)===identity)&&!['duplicate','imported','published'].includes(row.research_status))errors.push(`${prefix}: already exists in supplied inventory`);
  if(row.research_status==='ready_for_admin_review'&&(!row.duplicate_review?.checked_on||row.duplicate_review.result!=='no_match'))errors.push(`${prefix}: resolve duplicate review before export`);
  for(const media of row.proposed_media??[]){
   if(!publicUrl(media.source_url)||!['candidate','rights_review','approved','rejected'].includes(media.status))errors.push(`${prefix}: invalid media provenance`);
   if(media.status==='approved'&&(!media.rights_basis||!media.reviewed_on))errors.push(`${prefix}: approved media requires documented rights and review`);
  }
 }
 return errors;
}
export function exportResearch(rows,categories,existing=[]){
 const errors=validateQueue(rows,categories,existing);if(errors.length)throw new Error(errors.join('\n'));
 // A deliberate allowlist drops media, workflow metadata and arbitrary authority fields.
 return rows.filter(r=>r.research_status==='ready_for_admin_review').map(({details:d})=>Object.fromEntries(['business_name','city','location_name','address','website_url','phone','email','description','services','sources','separate_reason'].filter(k=>d[k]!==undefined).map(k=>[k,d[k]])));
}
