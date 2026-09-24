import type { IntelligenceEvidence } from './types';

export type PlanningDetails = { date: string; startTime: string; endTime: string; location: string; guestCount: number; budget: number };
export type ParsedFacts = { planning: Partial<PlanningDetails>; evidence: IntelligenceEvidence[]; dateHint?: string; approximateGuests: boolean; assumptions: string[] };

// No current-date dependency: incomplete dates stay incomplete until confirmed.
export function extractEventFacts(query: string): ParsedFacts {
  const planning: Partial<PlanningDetails> = {};
  const evidence: IntelligenceEvidence[] = [];
  const assumptions: string[] = [];
  const add = (field: keyof PlanningDetails, value: string | number, inferred = false) => {
    Object.assign(planning, { [field]: value });
    evidence.push({ field: `planning.${field}`, value, confidence: inferred ? .7 : .98, source: inferred ? 'deterministic-inference' : 'explicit-text', userConfirmed: false });
  };
  const guests = query.match(/\b(?:(around|about|approximately|roughly)\s+)?(\d[\d,]*)\s*(?:people|guests|employees|attendees)\b/i);
  if (guests && Number(guests[2].replaceAll(',', '')) > 0) add('guestCount', Number(guests[2].replaceAll(',', '')));
  const budget = query.match(/\b(?:budget(?:\s+of|\s+is)?|under|up to)\s*(?:around\s+|about\s+|approximately\s+)?\$?([\d,]+(?:\.\d+)?)\s*(k\b)?/i);
  const approximateBudget = budget ?? query.match(/\b(?:around|about|approximately)\s+\$([\d,]+(?:\.\d+)?)\s*(k\b)?/i);
  if (approximateBudget) add('budget', Number(approximateBudget[1].replaceAll(',', '')) * (approximateBudget[2] ? 1000 : 1));
  const iso = query.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso && !Number.isNaN(Date.parse(iso[1])) && new Date(iso[1]).toISOString().slice(0, 10) === iso[1]) add('date', iso[1]);
  const dateHint = query.match(/\b(?:next\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+20\d{2})?)?\b/i)?.[0];
  const city = query.match(/\b(?:house|home|backyard)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=[,.;!?]|\s+(?:for|with|on|in|from)|$)/)?.[1];
  if (city && !/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(city)) add('location', city);
  const months = /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i;
  const area = [...query.matchAll(/\b(?:around|near|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=[,.;!?]|\s+(?:for|with|on|and)|$)/g)].map(match=>match[1]).find(value=>!months.test(value));
  if (!city && area) add('location', area);
  const range = query.match(/\bfrom\s+(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)?\s*(?:to|until|[-–])\s*(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)?\b/i);
  if (range) {
    const inferred = !range[3] || !range[6];
    const defaultMeridiem = /\b(morning|breakfast)\b/i.test(query) ? 'am' : 'pm';
    add('startTime', clockTime(range[1], range[2], range[3] || range[6] || defaultMeridiem), inferred);
    add('endTime', clockTime(range[4], range[5], range[6] || range[3] || defaultMeridiem), inferred);
    if (inferred) assumptions.push(`Interpreted the time window as ${planning.startTime}–${planning.endTime}. Please confirm AM/PM.`);
  }
  return { planning, evidence, dateHint, approximateGuests: Boolean(guests?.[1]), assumptions };
}
export function clockTime(hour: string, minute = '00', meridiem = 'pm') {
  return `${String(Number(hour) % 12 + (meridiem.toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${minute}`;
}

export function hasSecuredVenue(text: string) {
  return text.split(/[.!?;]/).some(clause => /\b(?:already have|booked|secured|found|reserved)\b.{0,25}\b(?:venue|hall|church|restaurant|hotel|ballroom|location)\b/i.test(clause) && !/\b(?:not|no|haven['’]t|haven not|hadn['’]t|haven’t|never)\b/i.test(clause));
}
