import type { EventIntelligenceProfile } from '../event-intelligence/types';
import { loadDemoQuoteRequests, demoRequestsKey, type DemoQuoteRequest } from '../event-intelligence/demo-quotes';
export const eventsKey = 'arivvio:customer-events:v1';
export const removedEventsKey = 'arivvio:removed-events:v1';
export const customerChanged = 'arivvio:customer-changed';
const activeKey = 'arivvio:event-intelligence';
export type CustomerEvent = { id: string; name: string; date: string; lastDate: string; profile: EventIntelligenceProfile | null; requests: DemoQuoteRequest[] };
export function loadProfiles(): EventIntelligenceProfile[] {
  try { const data = JSON.parse(window.localStorage.getItem(eventsKey) ?? '[]'); return Array.isArray(data) ? data.filter(p => p?.eventId && p?.recognition && p?.plannerIntent) : []; } catch { return []; }
}
export function isRemoved(id?: string) {
  if (!id || typeof window === 'undefined') return false;
  try { return (JSON.parse(window.localStorage.getItem(removedEventsKey) ?? '[]') as string[]).includes(id); } catch { return false; }
}
export function rememberProfile(profile: EventIntelligenceProfile) {
  if (!profile.eventId) return;
  if (isRemoved(profile.eventId)) throw new Error('This demo event was removed. Start a new event.');
  window.localStorage.setItem(eventsKey, JSON.stringify([profile, ...loadProfiles().filter(p => p.eventId !== profile.eventId)]));
}
export function requestEventId(request: DemoQuoteRequest) { return request.event.profile?.eventId ?? request.eventId ?? `request:${request.id}`; }
export function collectCustomerEvents(profiles: EventIntelligenceProfile[], requests: DemoQuoteRequest[]): CustomerEvent[] {
  const events = new Map<string, CustomerEvent>();
  for (const p of profiles) if (p.eventId) events.set(p.eventId, { id: p.eventId, name: p.eventType.value, date: p.planning?.date ?? '', lastDate: '', profile: p, requests: [] });
  for (const request of requests) {
    const id = requestEventId(request);
    const event = events.get(id) ?? { id, name: request.event.name, date: request.event.date, lastDate: '', profile: request.event.profile, requests: [] };
    event.requests.push(request); events.set(id, event);
  }
  return [...events.values()].map(event => ({ ...event, lastDate: [event.date, (event.profile?.planning as { endDate?: string } | undefined)?.endDate ?? "", ...(event.profile?.stages ?? []).map(s => s.date ?? '')].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1) ?? '' }));
}
export function loadCustomerEvents() {
  const profiles = loadProfiles();
  try {
    const active = JSON.parse(window.localStorage.getItem(activeKey) ?? window.sessionStorage.getItem(activeKey) ?? 'null');
    if (active?.eventId && !profiles.some(p => p.eventId === active.eventId)) profiles.unshift(active);
  } catch { /* Existing saved requests remain available. */ }
  return collectCustomerEvents(profiles, loadDemoQuoteRequests()).filter(event => !isRemoved(event.id));
}
export function eventPeriod(event: CustomerEvent, today: string) {
  return !event.date ? 'Planning · date to confirm' : event.lastDate < today ? 'Past' : 'Current / upcoming';
}
// Browser-local deletion only. Roll back writes if a storage operation fails.
export function deleteCustomerEvent(id: string) {
  const event = loadCustomerEvents().find(e => e.id === id);
  if (!event) throw new Error('This event is no longer saved here.');
  const local = window.localStorage; const session = window.sessionStorage;
  const requests = loadDemoQuoteRequests();
  const removedRequests = requests.filter(r => requestEventId(r) === id);
  const requestIds = new Set(removedRequests.map(r => r.id));
  const writes: { store: Storage; key: string; value: string | null }[] = [
    { store: local, key: eventsKey, value: JSON.stringify(loadProfiles().filter(p => p.eventId !== id)) },
    { store: local, key: demoRequestsKey, value: JSON.stringify(requests.filter(r => !requestIds.has(r.id))) },
    { store: local, key: removedEventsKey, value: JSON.stringify([...new Set([...JSON.parse(local.getItem(removedEventsKey) ?? '[]'), id])]) },
    { store: local, key: `arivvio:conversation:${id}`, value: null },
    { store: local, key: `arivvio:cart:${id}`, value: null },
    ...removedRequests.map(r => ({ store: local, key: `arivvio:conversation:request:${r.id}`, value: null })),
  ];
  for (const store of [local, session]) {
    const active = JSON.parse(store.getItem(activeKey) ?? 'null');
    if (active?.eventId === id) {
      for (const key of [activeKey, 'arivvio:demo-planner:v1', 'arivvio:demo-cart:v1', 'arivvio:assistant-intake']) writes.push({ store, key, value: null });
    }
  }
  const vendorKey = 'arivvio.vendor-demo.v1';
  const vendor = JSON.parse(local.getItem(vendorKey) ?? 'null');
  if (vendor?.events && requestIds.size) {
    const removedVendorIds = new Set(vendor.events.filter((e: { requestId?: string }) => e.requestId && requestIds.has(e.requestId)).map((e: { id: string }) => e.id));
    writes.push({ store: local, key: vendorKey, value: JSON.stringify({ ...vendor, events: vendor.events.filter((e: { id: string }) => !removedVendorIds.has(e.id)), notices: vendor.notices?.filter((n: { eventId?: string }) => !n.eventId || !removedVendorIds.has(n.eventId)) }) });
  }
  const before = writes.map(w => ({ ...w, value: w.store.getItem(w.key) }));
  try { for (const w of writes) { if (w.value === null) w.store.removeItem(w.key); else w.store.setItem(w.key, w.value); } }
  catch { for (const w of before) { try { if (w.value === null) w.store.removeItem(w.key); else w.store.setItem(w.key, w.value); } catch { /* Report failure rather than claiming deletion. */ } } throw new Error('Unable to remove this event. Check browser storage and try again.'); }
  window.dispatchEvent(new Event(customerChanged));
  window.dispatchEvent(new Event('arivvio:profile-changed'));
}
