import type { ServiceName } from '@/app/data/marketplace';
import type { EventIntelligenceProfile, IntelligenceEvidence } from './types';
import { getEventContextTone } from './visual-tone';
import { reasonAboutBudget } from './budget';

export type PlanningQuestion = { id: string; question: string; why: string; fields: string[]; priority: number };
export type ServiceRelationship = { service: ServiceName; scope: 'whole-event' | 'stage' | 'multiple-stages' | 'uncertain'; stageIds: string[]; source: 'explicit-step-choice' | 'deterministic-inference'; confidence: number; explanation: string };
export type EventUnderstanding = ReturnType<typeof understandEvent>;

// A derived view over the existing canonical profile. Never mutates or replaces it.
export function understandEvent(profile: EventIntelligenceProfile, selectedProviderCount = 0) {
  const known = profile.evidence.filter(item => item.source !== 'default' && item.source !== 'deterministic-inference');
  const inferred = profile.evidence.filter(item => item.source === 'deterministic-inference');
  const has = (field: string) => known.some(item => item.field === field && item.value !== '' && item.value !== 0 && !/^(Not selected|Venue needed:?|.*: Flexible)$/i.test(String(item.value)));
  const tone = getEventContextTone(profile.recognition);
  const questions: PlanningQuestion[] = [];
  const add = (id: string, question: string, why: string, fields: string[], priority: number) => questions.push({ id, question, why, fields, priority });
  if (profile.recognition.confidence < .48) add('occasion', 'What occasion are you planning?', 'Establish event compatibility.', ['eventType'], 100);
  if (!has('planning.date')) add('date', profile.dateHint ? `What exact date in ${profile.dateHint} are you considering?` : 'What date are you considering?', 'Date determines availability. An approximate month does not confirm a date.', ['planning.date'], 95);
  const needsTime = !has('planning.startTime') || !has('planning.endTime');
  if (needsTime) add('time', profile.stages.length ? 'What overall arrival and finish time should providers plan around?' : 'What start and end time should we plan around?', 'A time window determines provider duration and availability.', ['planning.startTime', 'planning.endTime'], 90);
  if (!has('planning.location')) add('location', profile.homeEvent ? 'Which city or address is the home in?' : 'Which city or venue should we use?', 'Location type alone is not a service area or address.', ['planning.location'], 85);
  if (!has('planning.guestCount')) add('guests', 'About how many guests do you expect?', 'Guest count affects capacity and per-person services.', ['planning.guestCount'], 80);
  if (!has('planning.budget')) add('budget', 'What overall budget would you like to stay within?', 'Keep provider estimates and allocations within your target.', ['planning.budget'], 70);
  if (!profile.homeEvent && !profile.commercialVenue && !profile.requestedServices.includes('Venue')) add('venue', 'Do you have a venue, or would you like help finding one?', 'Distinguish a venue search from services for an existing location.', ['venueRequired'], 65);
  const stageFields = profile.stages.flatMap(stage => [
    ...(!stage.startTime ? [`stages.${stage.id}.startTime`] : []),
    ...(!stage.endTime ? [`stages.${stage.id}.endTime`] : []),
    ...(!stage.location ? [`stages.${stage.id}.location`] : []),
  ]);
  if (stageFields.length) add('parts', 'Confirm the timing and locations for each part.', 'Separate parts can have different provider windows and travel needs.', stageFields, 88);
  if (!profile.requestedServices.length) add('services', 'Which services would you like help finding?', 'Only customer-selected services should become requests.', ['requestedServices'], 60);
  questions.sort((a, b) => b.priority - a.priority);
  const serviceRelationships = relateServicesToStages(profile);
  const ambiguous = [
    ...(profile.timeAssumptions ?? []).filter(() => !has('planning.startTime') || !has('planning.endTime')),
    ...serviceRelationships.filter(item => item.scope === 'uncertain').map(item => item.explanation),
  ];
  const restricted: ServiceName[] = tone === 'respectful' ? ['DJ', 'Balloons', 'Bounce Houses', 'Magic', 'Character Performers', 'Photo Booth', 'Party Bus', 'Cake & Desserts'] : tone === 'professional' ? ['Balloons', 'Bounce Houses', 'Magic', 'Character Performers', 'Party Bus'] : [];
  const recommended = Object.entries(profile.recommendationScores)
    .filter(([service]) => !profile.requestedServices.includes(service as ServiceName) && !profile.excludedServices.includes(service as ServiceName) && !restricted.includes(service as ServiceName))
    .sort((a,b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0,3)
    .map(([service]) => ({ service: service as ServiceName, reason: profile.homeEvent && ['Rentals','Cleaning','Catering'].includes(service) ? 'May help with hosting at home. Optional until you add it.' : 'An optional service relevant to this occasion.' }));
  const logistics: {priority: 'Important' | 'Recommended' | 'Optional'; detail: string}[] = [];
  if (profile.homeEvent && (profile.planning?.guestCount ?? 0) >= 80) {
    logistics.push({priority:'Important',detail:'Check seating, restroom capacity, parking and power for this headcount.'}, {priority:'Recommended',detail:'Decide who handles setup and cleanup. Rentals are optional if you already have enough equipment.'});
  }
  if (profile.homeEvent || profile.indoorOutdoor === 'outdoor') logistics.push({priority:'Recommended',detail:'If any part is outdoors, agree on a weather backup before confirming providers.'});
  if (profile.stages.length > 1) logistics.push({priority:'Important',detail:'Allow travel and setup time between parts. Confirm which services cover each location.'});
  if (profile.audience.audienceType === 'kids') logistics.push({priority:'Important',detail:'Plan age-appropriate activities, supervision and dietary needs with the hosts.'});
  if (tone === 'professional') logistics.push({priority:'Recommended',detail:'Confirm the run of show, check-in process and any AV needs with the event team.'});
  const core = has('planning.guestCount') && (profile.homeEvent || has('planning.location') || profile.venuePreferences.length > 0);
  const scheduling = !has('planning.date') || needsTime || stageFields.length > 0 || ambiguous.length > 0;
  const readiness = !core ? 'Early idea' : scheduling ? 'Needs scheduling details' : !profile.requestedServices.length ? 'Ready for service planning' : !has('planning.location') || !has('planning.budget') ? 'Core details understood' : 'Ready for Marketplace matching';
  return { logistics, known, inferred, ambiguous, missing: questions, nextBestQuestion: questions[0] ?? null, recommended, requestedServices: profile.requestedServices, inferredServices: profile.venueRequired && !profile.requestedServices.includes('Venue') ? [{service: 'Venue' as ServiceName, reason: 'Venue status is not confirmed.'}] : [], serviceRelationships, tone, readiness,
    readyToRequestProviders: readiness === 'Ready for Marketplace matching' && selectedProviderCount > 0,
    budget: reasonAboutBudget({ overall: has('planning.budget') ? profile.planning?.budget : undefined, stages: profile.stages }),
  };
}

export function relateServicesToStages(profile: EventIntelligenceProfile): ServiceRelationship[] {
  return profile.requestedServices.map(service => {
    const explicit = profile.stages.filter(stage => stage.services?.includes(service));
    if (explicit.length) return { service, scope: explicit.length > 1 ? 'multiple-stages' : 'stage', stageIds: explicit.map(stage => stage.id), source: 'explicit-step-choice', confidence: 1, explanation: 'Assigned in your event parts.' };
    if (!profile.stages.length) return { service, scope: 'whole-event', stageIds: [], source: 'deterministic-inference', confidence: .95, explanation: 'One occasion, no separate parts.' };
    const reception = profile.stages.filter(stage => /reception|dinner|lunch/.test(stage.id));
    if (['DJ', 'Catering'].includes(service) && reception.length === 1) return { service, scope: 'stage', stageIds: [reception[0].id], source: 'deterministic-inference', confidence: .75, explanation: `${service} likely applies to ${reception[0].label}. Confirm before assigning providers.` };
    return { service, scope: 'uncertain', stageIds: [], source: 'deterministic-inference', confidence: .4, explanation: `Confirm whether ${service.toLowerCase()} covers one part or multiple parts.` };
  });
}

// Future edit interfaces can compare profiles without rebuilding unaffected parts.
export function getEventChangeImpact(before: EventIntelligenceProfile, after: EventIntelligenceProfile) {
  const changedStages = after.stages.filter(stage => JSON.stringify(stage) !== JSON.stringify(before.stages.find(old => old.id === stage.id))).map(stage => stage.id);
  const removedStages = before.stages.filter(stage => !after.stages.some(next => next.id === stage.id)).map(stage => stage.id);
  const guestCountChanged = before.planning?.guestCount !== after.planning?.guestCount;
  const overallScheduleChanged = before.planning?.date !== after.planning?.date || before.planning?.startTime !== after.planning?.startTime || before.planning?.endTime !== after.planning?.endTime;
  return { changedStages, removedStages, guestCountChanged, recheckCapacity: guestCountChanged, recheckSchedule: changedStages.length + removedStages.length > 0 || before.planning?.date !== after.planning?.date || before.planning?.startTime !== after.planning?.startTime || before.planning?.endTime !== after.planning?.endTime,
    affectedServices: relateServicesToStages(after).filter(item => guestCountChanged || overallScheduleChanged || ((changedStages.length > 0 || removedStages.length > 0) && (item.scope === 'whole-event' || item.scope === 'uncertain' || item.stageIds.some(id => changedStages.includes(id) || removedStages.includes(id))))).map(item => item.service) };
}

export function planningEvidence(planning: Partial<NonNullable<EventIntelligenceProfile['planning']>>, fields: string[]): IntelligenceEvidence[] {
  return fields.flatMap(field => { const value = planning[field as keyof typeof planning]; return value === undefined || value === '' ? [] : [{ field: `planning.${field}`, value, confidence: 1, source: 'explicit-step-choice' as const, userConfirmed: true }]; });
}
