export type MatchTier = "exact" | "nearby" | "similar";
export type MatchAssessment = { hardMatch:boolean; localMatch:boolean; availabilityKnown:boolean; broaderReason?:string };
export function assessMatchTier(assessment:MatchAssessment):MatchTier|null {
  if(!assessment.hardMatch) return null;
  if(!assessment.availabilityKnown) return "similar";
  return assessment.localMatch ? "exact" : "nearby";
}
export function selectMatchingTiers<T extends {id:number}>(ranked:T[],assessments:Map<number,MatchAssessment>,minimum=3) {
  const buckets:{exact:T[];nearby:T[];similar:T[]}={exact:[],nearby:[],similar:[]};
  for(const item of ranked){const a=assessments.get(item.id);const tier=a?assessMatchTier(a):null;if(tier)buckets[tier].push(item);}
  const items=buckets.exact.length>=minimum?buckets.exact:[...buckets.exact,...buckets.nearby.slice(0,6),...buckets.similar.slice(0,Math.max(0,6-buckets.nearby.length))];
  return {items,exactCount:buckets.exact.length,details:Object.fromEntries(items.map(item=>{const a=assessments.get(item.id)!;const tier=assessMatchTier(a)!;return [item.id,{tier,order:tier==="exact"?0:tier==="nearby"?1:2,label:tier==="exact"?"Matches selected filters":tier==="nearby"?"Broader area option":"Similar option",reason:tier==="exact"?"Matches your selected filters. Confirm availability and final pricing.":tier==="nearby"?`${a.broaderReason || "Outside the default nearby area, within the listed service radius."} Confirm travel, availability and pricing.`:`Schedule is not listed.${a.localMatch?"":" Outside the default nearby area."} Confirm timing and service area before making plans.`}];}))};
}
