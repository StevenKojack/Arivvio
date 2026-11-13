export const statuses = ['Hold', 'Tentative', 'Confirmed', 'Completed', 'Cancelled'] as const;
export type ManualEvent = {
 id:string; vendor_id:string; name:string; date:string; end_date:string; start_time:string; end_time:string; timezone:string;
 status:typeof statuses[number]; event_type:string; client_id?:string|null; client_name:string; client_contact:string; location:string; service_id:string|null; notes:string;
 tasks:{title:string;done:boolean}[]; version:number; created_by:string; updated_by:string; created_at:string; updated_at:string;
};
export type CalendarEntry = {id:string;name:string;date:string|null;end_date:string|null;start_time:string|null;end_time:string|null;status:string;source:'External Event'|'ARIVVIO';timezone:string|null;location:string;notes:string;service:string;service_id?:string|null;eventType?:string;manual?:ManualEvent};
// Date-only arithmetic deliberately never converts a business date to UTC.
export function shiftDate(date:string,days:number){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);}
export function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function todayIn(zone:string){if(!zone)return localDate();return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function onDay(entry: CalendarEntry, date: string) {
  if (!entry.date || entry.date > date || (entry.end_date ?? entry.date) < date) return false;
  return !(date !== entry.date && date === entry.end_date && /^00:00(?::00(?:\.0+)?)?$/.test(entry.end_time ?? ''));
}
export function overlap(a:CalendarEntry,b:CalendarEntry){
 if(a.status.toLowerCase()==='cancelled'||b.status.toLowerCase()==='cancelled'||!a.date||!b.date||!a.start_time||!a.end_time||!b.start_time||!b.end_time)return false;
 const range=(e:CalendarEntry)=>[wallTime(e.date!,e.start_time!,e.timezone||a.timezone||b.timezone),wallTime(e.end_date||e.date!,e.end_time!,e.timezone||a.timezone||b.timezone)];
 const [as,ae]=range(a),[bs,be]=range(b);return as<be&&bs<ae;

}
export function manualEntry(e:ManualEvent,service=''):CalendarEntry{return {...e,source:'External Event',manual:e,service};}
export function sortEntries(entries:CalendarEntry[]){return [...entries].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.start_time||'99').localeCompare(b.start_time||'99')||a.name.localeCompare(b.name));}

// Convert only for overlap comparison. Stored local date/time values remain untouched.
export function wallTime(date:string,time:string,zone:string|null){
 if (time.slice(0,5)==='24:00') return wallTime(shiftDate(date,1),'00:00',zone);
 const desired=Date.parse(date+'T'+time.slice(0,5)+':00Z');if(!zone||!Number.isFinite(desired))return desired;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const rendered=(ms:number)=>{const p=Object.fromEntries(format.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);};
 const candidates=[desired-86400000,desired,desired+86400000].map(ms=>desired-(rendered(ms)-ms)).filter(ms=>rendered(ms)===desired);
 return new Set(candidates).size===1?candidates[0]:NaN;
}

export function bookingEntry(b:{id:string;booking_status:string;service_id?:string|null;vendor_notes?:string|null},context?:{title:string;date:string|null;start_time:string|null;end_time:string|null;city:string|null;event_type?:string},service=''):CalendarEntry{
 const start=context?.start_time||null,end=context?.end_time||null;
 // Existing bookings have no explicit end date. Do not infer an overnight duration.
 const valid=!!start&&!!end&&end>start;
 return {id:b.id,name:context?.title||'ARIVVIO booking',date:context?.date||null,end_date:context?.date||null,start_time:valid?start:null,end_time:valid?end:null,timezone:null,status:b.booking_status,source:'ARIVVIO',location:context?.city||'',notes:b.vendor_notes||'',service,service_id:b.service_id,eventType:context?.event_type};
}
