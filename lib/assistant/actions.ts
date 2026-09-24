import { allServices, type ServiceName } from '@/app/data/marketplace';
import { buildEventIntelligenceProfile } from '@/lib/event-intelligence/engine';
import { createServiceSelection } from '@/lib/planning-taxonomy/selection';
import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';
import { planningEvidence } from '@/lib/event-intelligence/understanding';
export type PlanAction = { kind: 'create' | 'planning' | 'stage' | 'add_service' | 'remove_service' | 'venue_status' | 'audience'; field: string; value: string; stageId: string };
const fields = ['date','startTime','endTime','location','guestCount','budget'];
function validValue(field: string, value: string) {
  if (field === 'guestCount' || field === 'budget') return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= (field === 'guestCount' ? 1 : 0) && Number(value) <= (field === 'guestCount' ? 100000 : 100000000) && (field !== 'guestCount' || Number.isInteger(Number(value)));
  if (field === 'date') return /^20\d{2}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (field.endsWith('Time')) return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  return value.trim().length > 0 && value.length <= 300;
}
export function validateActions(input: unknown, profile: EventIntelligenceProfile | null): PlanAction[] {
  if (!Array.isArray(input) || input.length > 12) throw new Error('Invalid plan changes.');
  return input.map((a: PlanAction) => {
    if (!a || !['kind','field','value','stageId'].every(k=>typeof a[k as keyof PlanAction] === 'string') || a.value.length > 2000) throw new Error('Invalid plan change.');
    if (a.kind === 'create') { if (profile || input.length !== 1 || !a.value.trim()) throw new Error('Start a new event explicitly first.'); }
    else if (!profile) throw new Error('Describe your event first.');
    else if (a.kind === 'planning') {
      if (a.field === 'dateHint') { if (!a.value.trim() || a.value.length > 80) throw new Error('Invalid date hint.'); }
      else if (a.field === 'approximateGuests') { if (!['true','false'].includes(a.value)) throw new Error('Invalid approximation.'); }
      else if (!fields.includes(a.field) || !validValue(a.field,a.value)) throw new Error('Check the planning value.');
    } else if (a.kind === 'audience') {
      if (a.field !== 'childrenCount' || !/^\d+$/.test(a.value) || Number(a.value) > 100000) throw new Error('Check the child headcount.');
    } else if (a.kind === 'stage') {
      if (!profile.stages.some(s=>s.id === a.stageId) || !fields.includes(a.field) || !validValue(a.field,a.value)) throw new Error('Check the event part and value.');
    } else if (a.kind === 'add_service' || a.kind === 'remove_service') {
      if (!allServices.includes(a.value as ServiceName)) throw new Error('Unknown service.');
      if (a.kind === 'add_service' && profile.recognition.excludedServices.includes(a.value as ServiceName)) throw new Error('This service is excluded from this event.');
    } else if (a.kind === 'venue_status') {
      if (!['secured','home','needed'].includes(a.value)) throw new Error('Unknown venue status.');
    } else throw new Error('Unsupported action. No bookings or external actions can be changed.');
    return {kind:a.kind,field:a.field,value:a.value,stageId:a.stageId};
  });
}
export function applyPlanActions(profile: EventIntelligenceProfile | null, input: unknown) {
  const actions = validateActions(input, profile);
  let next = profile ? structuredClone(profile) : null;
  const changes: string[] = [];
  for (const a of actions) {
    if (a.kind === 'create') { next = buildEventIntelligenceProfile({query:a.value}); changes.push(`Event: ${next.eventType.value}`, `Guests: ${next.planning?.guestCount ? `${next.approximateGuests ? 'About ' : ''}${next.planning.guestCount}` : 'To confirm'}`, `Date: ${next.planning?.date || next.dateHint || 'To confirm'}`, `Location: ${next.planning?.location || (next.homeEvent ? 'At home, city to confirm' : 'To confirm')}`, `Budget: ${next.planning?.budget ? `$${next.planning.budget.toLocaleString()}` : 'To confirm'}`, `Services: ${next.requestedServices.join(', ') || 'None selected'}`); if(next.cuisines.length)changes.push(`Food: ${next.cuisines.join(', ')}`); if(next.venuePreferences.length)changes.push(`Venue preference: ${next.venuePreferences.join(', ')}`); continue; }
    if (!next) throw new Error('Missing event.');
    const typed = ['guestCount','budget'].includes(a.field) ? Number(a.value) : a.value;
    if (a.kind === 'planning') {
      if (a.field === 'dateHint') { next.dateHint = a.value; changes.push(`Date to confirm: ${a.value}`); }
      else if (a.field === 'approximateGuests') { next.approximateGuests = a.value === 'true'; }
      else {
        const planning = next.planning ?? {date:'',startTime:'',endTime:'',location:'',guestCount:0,budget:0};
        changes.push(`${a.field}: ${planning[a.field as keyof typeof planning] || 'Not set'} → ${a.value}`);
        next.planning = {...planning,[a.field]:typed};
        next.evidence = [...next.evidence.filter(e=>e.field !== `planning.${a.field}`), ...planningEvidence(next.planning,[a.field])];
        if (a.field === 'guestCount') next.guestSize = Number(a.value);
      }
    } else if (a.kind === 'audience') {
      next.audience = {...next.audience, childrenCount:Number(a.value)};
      changes.push(`Children expected: ${a.value}`);
    } else if (a.kind === 'stage') {
      next.stages = next.stages.map(s=>s.id === a.stageId ? {...s,[a.field]:typed} : s);
      changes.push(`${next.stages.find(s=>s.id === a.stageId)?.label} ${a.field}: ${a.value}`);
    } else if (a.kind === 'add_service') {
      const service = a.value as ServiceName;
      next.excludedServices = next.excludedServices.filter(s=>s !== service);
      next.requestedServices = [...new Set([...next.requestedServices,service])];
      if (!next.planSelections.some(s=>s.matchingServices.includes(service))) next.planSelections.push(createServiceSelection(service,'user-search'));
      changes.push(`Added ${service}`);
    } else if (a.kind === 'remove_service') {
      removeService(next,a.value as ServiceName); changes.push(`Removed ${a.value} from planning only`);
    } else if (a.kind === 'venue_status') {
      next.homeEvent = a.value === 'home'; next.commercialVenue = a.value === 'secured'; next.venueRequired = a.value === 'needed';
      if (a.value !== 'needed') removeService(next,'Venue');
      else next.excludedServices = next.excludedServices.filter(service => service !== 'Venue');
      changes.push(`Venue: ${a.value}`);
    }
  }
  if (!next) throw new Error('No event to update.');
  return {profile:next,changes};
}
function removeService(p: EventIntelligenceProfile, service: ServiceName) {
  p.requestedServices = p.requestedServices.filter(s=>s !== service);
  p.planSelections = p.planSelections.filter(s=>s.linkedService !== service).map(s=>({...s,matchingServices:s.matchingServices.filter(v=>v !== service),details:s.details.filter(d=>!d.matchingServices?.includes(service))}));
  p.stages = p.stages.map(s=>({...s,services:s.services?.filter(v=>v !== service)}));
  p.excludedServices = [...new Set([...p.excludedServices,service])];
  p.evidence = p.evidence.filter(e=>!e.field.startsWith(`service.${service}`));
}
