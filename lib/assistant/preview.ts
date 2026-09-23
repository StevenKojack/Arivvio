import { buildEventIntelligenceProfile } from '@/lib/event-intelligence/engine';
import { extractEventFacts, clockTime } from '@/lib/event-intelligence/facts';
import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';
import type { PlanAction } from './actions';
// Explicitly labelled parser preview, never a simulated model conversation.
export function previewPlanningTurn(text: string, profile: EventIntelligenceProfile | null): {actions:PlanAction[]; clarification?:string} {
 const action=(kind:PlanAction['kind'],field:string,value:string,stageId=''):PlanAction=>({kind,field,value,stageId});
 if(!profile)return {actions:[action('create','',text)]};
 const facts=extractEventFacts(text);
 const actions=Object.entries(facts.planning).map(([field,value])=>action('planning',field,String(value)));
 if(facts.dateHint)actions.push(action('planning','dateHint',facts.dateHint));
 if(facts.planning.guestCount)actions.push(action('planning','approximateGuests',String(facts.approximateGuests)));
 const matchingStages=profile.stages.filter(s=>text.toLowerCase().includes(s.label.toLowerCase()));
 if(/\b(move|change|start|moved)\b/i.test(text)&&matchingStages.length){
  const clock=text.match(/\b(?:to|at)\s+(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\b/i);
  if(clock){
   if(matchingStages.length!==1)return {actions:[],clarification:'Which event part should change? Please update one part at a time.'};
   if(!clock[3]&&Number(clock[1])<=12)return {actions:[],clarification:`Do you mean ${clock[1]} AM or PM for ${matchingStages[0].label}? Include AM/PM so the other event parts stay unchanged.`};
   const time=clock[3]?clockTime(clock[1],clock[2],clock[3]):`${clock[1].padStart(2,'0')}:${clock[2]??'00'}`;
   actions.push(action('stage','startTime',time,matchingStages[0].id));
  }
 }
 if(/\b(found|have|secured|booked)\b.{0,25}\bvenue\b/i.test(text))actions.push(action('venue_status','','secured'));
 if(/\b(?:at|to) (?:my|our|the) (?:house|home|backyard)\b/i.test(text))actions.push(action('venue_status','','home'));
 const removal=/\b(don['’]t need|do not need|no longer need|remove|cancel)\b/i.test(text);
 if(removal||/\b(add|need|want)\b/i.test(text)){
  const positive=text.replace(/\b(don['’]t need|do not need|no longer need|remove|cancel)\b/gi,'need').replace(/\banymore\b/gi,'');
  const parsed=buildEventIntelligenceProfile({query:`${profile.eventType.value}. ${positive}`});
  for(const service of parsed.requestedServices)actions.push(action(removal?'remove_service':'add_service','',service));
 }
 return {actions,clarification:actions.length?undefined:'No unambiguous changes were extracted. Use guided planning for other details until live conversation is connected.'};
}
