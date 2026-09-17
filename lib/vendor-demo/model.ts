export type EventStatus = "Confirmed" | "Tentative" | "Hold";
export type VendorEvent = {
  id: string; name: string; type: string; client: string; date: string;
  start: string; end: string; location: string; service: string; notes: string;
  status: EventStatus; source: "ARIVVIO" | "MANUAL";
  tasks: { title: string; done: boolean }[];
};
export type Hours = { enabled: boolean; start: string; end: string };
export type ListingMedia = { cover?: string; profile?: string; gallery: string[] };
export type SchedulingPolicy = { mode: "single" | "capacity" | "manual"; simultaneous: number; dailyLimit: number | null };
export type DemoService = { id: string; name: string; category: string; details: string; price: string; active: boolean; pricingModel?: string; amount?: number; duration?: string; included?: string; addons?: string };
export type Business = { name: string; location: string; description: string; contact: string; languages: string; specialties: string };
export type MarketplaceRules = { headline: string; eventMode: "unspecified" | "selected"; served: string[]; excluded: string[]; audience: "unspecified" | "all" | "adults" | "kids" | "21plus"; tags: string[]; radius: number | null; region: string; travel: boolean; travelNotes: string };
export type HubNotice = { id: string; title: string; body: string; at: string; read: boolean; eventId?: string; destination: "Calendar" | "Business Profile"; source: "Demo customer" | "Arivvio" | "Your activity" };
export type HubState = { version: 1; events: VendorEvent[]; blocked: string[]; hours: Hours[]; business: Business; services: DemoService[]; rules?: MarketplaceRules; notices?: HubNotice[]; specialHours?: Record<string, Hours>; media?: ListingMedia; scheduling?: SchedulingPolicy };
export function defaultRules(): MarketplaceRules { return { headline: "Music and hosting for your next celebration", eventMode: "unspecified", served: [], excluded: [], audience: "unspecified", tags: ["Bilingual", "Live mixing"], radius: null, region: "", travel: false, travelNotes: "" }; }
export function hydrateHub(state: HubState): HubState { return { ...state, rules: { ...defaultRules(), ...state.rules }, specialHours: state.specialHours ?? {}, notices: state.notices ?? [
  { id: "welcome", title: "Your calendar workspace is ready", body: "Manage outside bookings and sample Arivvio events together. This is a fictional demo account.", at: new Date().toISOString(), read: false, destination: "Calendar", source: "Arivvio" },
  { id: "client-update", title: "Sample customer update", body: "Alex's family requested clean edits and a microphone for speeches. Review the sample event notes.", at: new Date().toISOString(), read: false, eventId: state.events.find(e => e.source === "ARIVVIO")?.id, destination: "Calendar", source: "Demo customer" },
  { id: "setup", title: "Review your marketplace preferences", body: "Choose your event types, audience and travel area to make your profile more useful.", at: new Date().toISOString(), read: false, destination: "Business Profile", source: "Arivvio" },
] }; }
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
  const hours = state.specialHours?.[date] ?? state.hours[parseDate(date).getDay()];
  const blocked = state.blocked.includes(date);
  const atDailyLimit = Boolean(state.scheduling?.dailyLimit && events.length >= state.scheduling.dailyLimit);
  return { events, hours, blocked, label: blocked ? "Blocked" : !hours.enabled ? "Outside working hours" : atDailyLimit ? "Daily capacity reached" : events.length ? "Scheduled" : "Available" };
}
export function scheduleWarnings(state: HubState, event: VendorEvent): string[] {
  if (!event.date || Number.isNaN(parseDate(event.date).getTime())) return [];
  const { hours, blocked } = daySchedule(state, event.date);
  const warnings: string[] = [];
  if (blocked) warnings.push("This date is blocked.");
  if (!hours.enabled || event.start < hours.start || event.end > hours.end) warnings.push("This event falls outside your working hours.");
  const others = state.events.filter(e => e.id !== event.id && e.date === event.date);
  const policy = state.scheduling ?? { mode: "single", simultaneous: 1, dailyLimit: null };
  if (policy.dailyLimit && others.length >= policy.dailyLimit) warnings.push("This date has reached your daily event limit.");
  if (policy.mode !== "manual") {
    const capacity = policy.mode === "single" ? 1 : Math.max(1, policy.simultaneous);
    // Sweep clipped intervals. End points sort first, so adjacent bookings do not overlap.
    const points = others.filter(e => e.start < event.end && event.start < e.end).flatMap(e => [{time:e.start < event.start ? event.start : e.start,delta:1},{time:e.end > event.end ? event.end : e.end,delta:-1}]).sort((a,b)=>a.time.localeCompare(b.time) || a.delta-b.delta);
    let concurrent = 0;
    if (points.some(p => { concurrent += p.delta; return concurrent >= capacity; })) warnings.push(`This time overlaps bookings beyond your capacity of ${capacity} simultaneous event${capacity === 1 ? "" : "s"}.`);
  }
  return warnings;
}
