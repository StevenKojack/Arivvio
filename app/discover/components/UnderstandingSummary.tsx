import { understandEvent } from '@/lib/event-intelligence/understanding';
import type { EventIntelligenceProfile } from '@/lib/event-intelligence/types';

export function UnderstandingSummary({ profile }: { profile: EventIntelligenceProfile }) {
  const result = understandEvent(profile);
  const guest = result.known.find(item => item.field === 'planning.guestCount');
  const details = [guest ? `${profile.approximateGuests ? 'About ' : ''}${guest.value} guests` : '', profile.homeEvent ? 'At home' : '', profile.planning?.date || profile.dateHint || '', ...profile.requestedServices].filter(Boolean);
  return <section className="hub-card p-5" aria-label="Event understanding">
    <h3 className="font-semibold">Arivvio understands</h3>
    <p className="mt-2 text-sm">{details.length ? details.join(' · ') : 'The occasion is a starting point. Your size, setting and services are still open.'}</p>
    {result.nextBestQuestion && <p className="mt-3 text-sm ui-muted">Still helpful to know: {result.nextBestQuestion.question}</p>}
    <details className="mt-3 text-sm ui-muted"><summary className="cursor-pointer">Planning details · {result.readiness}</summary>
      <ul className="mt-3 space-y-2">{result.missing.slice(1, 4).map(item => <li key={item.id}>{item.question}</li>)}{result.ambiguous.map(item => <li key={item}>{item}</li>)}</ul>
      {result.serviceRelationships.filter(item => item.source === 'deterministic-inference' && item.scope === 'stage').map(item => <p className="mt-2" key={item.service}>{item.explanation}</p>)}
      {result.budget.signals.map(item => <p key={item} className="mt-2">{item}</p>)}
    </details>
  </section>;
}
