import {createBrowserSupabaseClient} from '@/lib/supabase/client';
import {getRequestInbox} from './messagesRepository';
import {getBookingsForVendors} from './bookingsRepository';
import {bookingEntry,manualEntry,sortEntries,type ManualEvent,type CalendarEntry} from '@/lib/vendor-calendar/model';
export async function loadCalendar(vendorId:string){
 const c=createBrowserSupabaseClient();
 const [events,availability,services,inbox,bookings,business]=await Promise.all([
 c.from('vendor_calendar_events').select('*').eq('vendor_id',vendorId).order('date'),
 c.from('vendor_availability').select('*').eq('vendor_id',vendorId),
 c.from('vendor_services').select('*').eq('vendor_id',vendorId),getRequestInbox(c,'vendor'),getBookingsForVendors(c,[vendorId]),c.from('vendor_businesses').select('vacation_mode').eq('id',vendorId).single()]);
 for(const result of [events,availability,services,business])if(result.error)throw Error(result.error.message);
 const serviceRows=services.data||[];
 const entries:CalendarEntry[]=(events.data||[]).map(e=>manualEntry(e as ManualEvent,serviceRows.find(s=>s.id===e.service_id)?.service_name||''));
 const allBookings=[...new Map([...bookings,...inbox.flatMap(r=>r.booking?.vendor_id===vendorId?[r.booking]:[])].map(b=>[b.id,b])).values()];
 for(const b of allBookings){const row=inbox.find(r=>r.booking?.id===b.id);const ctx=row?.context;
 entries.push(bookingEntry(b,ctx,row?.service_name||''));}
 return {vacation:business.data?.vacation_mode||false,entries:sortEntries(entries),availability:availability.data||[],services:serviceRows};
}
export async function saveCalendarEvent(event:ManualEvent,isNew:boolean){
 const c=createBrowserSupabaseClient();
 const {created_by,updated_by,created_at,updated_at,version,...data}=event;void created_by;void updated_by;void created_at;void updated_at;
 const result=isNew?await c.from('vendor_calendar_events').insert(data).select('*').single():await c.from('vendor_calendar_events').update(data).eq('id',event.id).eq('vendor_id',event.vendor_id).eq('version',version).select('*').maybeSingle();
 if(result.error)throw Error(result.error.message);if(!result.data)throw Error('This event changed elsewhere. Reload the calendar before saving.');return result.data as ManualEvent;
}
