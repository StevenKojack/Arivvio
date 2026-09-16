export type EventStatus = "Confirmed" | "Tentative" | "Hold";
export type VendorEvent = {
  id: string; name: string; type: string; client: string; date: string;
  start: string; end: string; location: string; service: string; notes: string;
  status: EventStatus; source: "ARIVVIO" | "MANUAL";
  tasks: { title: string; done: boolean }[];
};
export type Hours = { enabled: boolean; start: string; end: string };
export type DemoService = { id: string; name: string; category: string; details: string; price: string; active: boolean };
export type Business = { name: string; location: string; description: string; contact: string; languages: string; specialties: string };
export type HubState = { version: 1; events: VendorEvent[]; blocked: string[]; hours: Hours[]; business: Business; services: DemoService[] };
export const storageKey = "arivvio.vendor-demo.v1";
export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const serviceFields: Record<string, string> = {
  DJ: "Genres, languages, MC, equipment and lighting",
  Catering: "Cuisine, service style, dietary options and minimums",
  Venue: "Capacity, indoor/outdoor spaces, amenities and parking",
  Photography: "Event specialties, style, photo/video and deliverables",
  "AV Production": "Sound, lighting, equipment and setup requirements",
};
export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function parseDate(date: string) { return new Date(`${date}T12:00:00`); }
export function dateLabel(date: string) { return parseDate(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
export function seedHub(business: Business, now = new Date()): HubState {
  const offset = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return dateKey(d); };
  const events: VendorEvent[] = [
    { id: "mixer", name: "Studio team mixer", type: "Corporate", client: "Mira Bennett", date: offset(0), start: "17:00", end: "21:00", location: "Demo Studio, Glendale", service: "DJ & MC", status: "Confirmed", source: "MANUAL", notes: "Arrive one hour early. Client will provide a playlist shortlist.", tasks: [{ title: "Confirm loading access", done: false }] },
    { id: "birthday", name: "Alex's 13th birthday", type: "Birthday", client: "Sam Rivera", date: offset(3), start: "15:00", end: "19:00", location: "Demo Garden, Burbank", service: "DJ & MC", status: "Tentative", source: "ARIVVIO", notes: "Clean edits only. Confirm microphone for speeches.", tasks: [{ title: "Review music preferences", done: false }] },
    { id: "wedding", name: "Jordan & Riley's wedding", type: "Wedding", client: "Jordan Ellis", date: offset(8), start: "16:00", end: "23:00", location: "Demo Terrace, Pasadena", service: "DJ & MC", status: "Confirmed", source: "MANUAL", notes: "Ceremony sound check at 3 PM. First dance after dinner.", tasks: [{ title: "Receive final running order", done: false }] },
    { id: "celebration", name: "Autumn celebration", type: "Private Party", client: "Taylor Morgan", date: offset(14), start: "18:00", end: "22:00", location: "Demo Hall, Los Angeles", service: "Sound & lighting", status: "Hold", source: "ARIVVIO", notes: "Date on hold pending the client's decision.", tasks: [] },
  ];
  return { version: 1, business, events, blocked: [offset(6)], hours: days.map((_, i) => ({ enabled: i !== 1, start: "10:00", end: "23:30" })), services: [
    { id: "dj", name: "DJ & MC", category: "DJ", details: "Top 40, modern Armenian, English and Armenian MC. Sound system included.", price: "$195 / hour, four-hour minimum", active: true },
    { id: "av", name: "Sound & lighting", category: "AV Production", details: "PA, wireless microphone and dance-floor lighting. Setup included.", price: "Custom estimate", active: true },
  ] };
}
export function daySchedule(state: HubState, date: string) {
  const events = state.events.filter(e => e.date === date).sort((a,b) => a.start.localeCompare(b.start));
  const hours = state.hours[parseDate(date).getDay()];
  const blocked = state.blocked.includes(date);
  return { events, hours, blocked, label: blocked ? "Blocked" : !hours.enabled ? "Outside working hours" : events.length ? "Scheduled" : "Available" };
}
export function scheduleWarnings(state: HubState, event: VendorEvent): string[] {
  if (!event.date || Number.isNaN(parseDate(event.date).getTime())) return [];
  const { hours, blocked } = daySchedule(state, event.date);
  const warnings: string[] = [];
  if (blocked) warnings.push("This date is blocked.");
  if (!hours.enabled || event.start < hours.start || event.end > hours.end) warnings.push("This event falls outside your working hours.");
  if (state.events.some(e => e.id !== event.id && e.date === event.date && e.start < event.end && event.start < e.end)) warnings.push("This time overlaps another event or hold.");
  return warnings;
}
