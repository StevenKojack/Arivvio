import { daySchedule, scheduleWarnings, type HubState } from "./model";
export function businessOverview(state: HubState, today: string, time = "00:00") {
  const upcoming = state.events.filter(e => e.date > today || (e.date === today && e.end > time)).sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const attention = upcoming.map(event=>({event,warnings:scheduleWarnings(state,event)})).filter(entry=>entry.warnings.length);
  const checks = [
    {label:"Business name and location",done:Boolean(state.business.name.trim() && state.business.location.trim())},
    {label:"Description",done:Boolean(state.business.description.trim())},
    {label:"Contact",done:Boolean(state.business.contact.trim())},
    {label:"Active services and pricing",done:state.services.some(s=>s.active && s.price.trim() && s.details.trim())},
    {label:"Cover photo",done:Boolean(state.media?.cover)},
    {label:"Languages and specialties",done:Boolean(state.business.languages.trim() && state.business.specialties.trim())},
  ];
  return {upcoming,next:upcoming[0],today:daySchedule(state,today),attention,checks};
}
