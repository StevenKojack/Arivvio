import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getRequestInbox } from './messagesRepository';
import { getBookingsForVendors } from './bookingsRepository';
import { bookingEntry, manualEntry, sortEntries, type ManualEvent, type CalendarEntry } from '@/lib/vendor-calendar/model';

export async function loadCalendar(vendorId: string) {
  const client = createBrowserSupabaseClient();
  const [events, availability, services, inbox, bookings, business] = await Promise.all([
    client.from('vendor_calendar_events').select('*').eq('vendor_id', vendorId).order('date'),
    client.from('vendor_availability').select('*').eq('vendor_id', vendorId),
    client.from('vendor_services').select('*').eq('vendor_id', vendorId),
    getRequestInbox(client, 'vendor'),
    getBookingsForVendors(client, [vendorId]),
    client.from('vendor_businesses').select('vacation_mode').eq('id', vendorId).single(),
  ]);
  for (const result of [events, availability, services, business]) {
    if (result.error) throw Error(result.error.message);
  }
  const serviceRows = services.data ?? [];
  const serviceNames = new Map(serviceRows.map(s => [s.id, s.service_name]));
  const entries: CalendarEntry[] = (events.data ?? []).map(event =>
    manualEntry(event as ManualEvent, serviceNames.get(event.service_id ?? '')));
  const bookingContext = new Map(inbox.flatMap(row =>
    row.booking?.vendor_id === vendorId ? [[row.booking.id, row] as const] : []));
  const uniqueBookings = new Map(bookings.map(booking => [booking.id, booking]));
  for (const [id, row] of bookingContext) {
    if (row.booking && !uniqueBookings.has(id)) uniqueBookings.set(id, row.booking);
  }
  for (const booking of uniqueBookings.values()) {
    const row = bookingContext.get(booking.id);
    entries.push(bookingEntry(booking, row?.context, row?.service_name || serviceNames.get(booking.service_id ?? '')));
  }
  return { inbox, vacation: business.data?.vacation_mode ?? false, entries: sortEntries(entries), availability: availability.data ?? [], services: serviceRows };
}

export type EventChanges = Partial<Pick<ManualEvent,
  'name' | 'date' | 'end_date' | 'start_time' | 'end_time' | 'timezone' | 'status' |
  'event_type' | 'client_id' | 'client_name' | 'client_contact' | 'location' | 'service_id' | 'notes' | 'tasks'>>;

export async function updateCalendarEvent(vendorId: string, event: ManualEvent, changes: EventChanges) {
  if (event.vendor_id !== vendorId || event.version < 1) throw Error('Select the event’s business before saving.');
  const { data, error } = await createBrowserSupabaseClient().from('vendor_calendar_events')
    .update(changes).eq('id', event.id).eq('vendor_id', vendorId).eq('version', event.version)
    .select('*').maybeSingle();
  if (error) throw Error(error.message);
  if (!data) throw Error('This event changed elsewhere or access changed. Refresh the calendar before saving again.');
  return data as ManualEvent;
}

export async function saveCalendarEvent(vendorId: string, event: ManualEvent) {
  if (event.vendor_id !== vendorId) throw Error('Select the event’s business before saving.');
  const { id, vendor_id, created_by, updated_by, created_at, updated_at, version, ...changes } = event;
  void created_by; void updated_by; void created_at; void updated_at;
  if (version) return updateCalendarEvent(vendorId, event, changes);
  const { data, error } = await createBrowserSupabaseClient().from('vendor_calendar_events')
    .insert({ id, vendor_id, ...changes }).select('*').single();
  if (error) throw Error(error.message);
  return data as ManualEvent;
}
