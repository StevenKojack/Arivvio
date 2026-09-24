import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';
import type { MarketplaceItem } from '@/app/data/marketplace';
import { understandEvent } from '@/lib/event-intelligence/understanding';
export type PageContext = { path: string; services?: string[]; providers?: ReturnType<typeof providerContext>[]; requestStatus?: string; readOnly?: boolean };
export function providerContext(p: MarketplaceItem) {
  return {id:p.id,name:p.name,services:p.services,events:p.events,location:p.location,price:p.price,description:p.description.slice(0,500),cultures:p.cultures,tags:p.tags?.slice(0,12),maxGuestCount:p.maxGuestCount,serviceRadiusMiles:p.serviceRadiusMiles,availability:'Unconfirmed. Ask provider.',source:p.databaseSource ? 'Listing metadata, not a confirmed offer' : 'Demo listing'};
}
export function compactEvent(profile: EventIntelligenceProfile | null) {
  if (!profile) return null;
  const u = understandEvent(profile);
  return {event:profile.eventType.value,planning:profile.planning,audience:profile.audience,dateHint:profile.dateHint,approximateGuests:profile.approximateGuests,homeEvent:profile.homeEvent,venueRequired:profile.venueRequired,cultures:profile.cultures,cuisines:profile.cuisines,services:profile.requestedServices,stages:profile.stages,excludedServices:profile.excludedServices,understanding:{tone:u.tone,readiness:u.readiness,nextBestQuestion:u.nextBestQuestion,recommended:u.recommended,logistics:u.logistics,ambiguous:u.ambiguous,budget:u.budget}};
}
