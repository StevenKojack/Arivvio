"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { marketplaceItems } from "@/app/data/marketplace";
import { Logo } from "@/app/components/Logo";
import { CalendarWorkspace } from "./CalendarWorkspace";
import { Notifications } from "./Notifications";
import { MarketplaceEditor } from "./MarketplaceEditor";
import { dateKey, dateLabel, seedHub, storageKey, daySchedule, scheduleWarnings, hydrateHub, type HubState, type VendorEvent, type DemoService } from "@/lib/vendor-demo/model";
import { EventForm, ServiceForm, WorkingHours, Panel, Field, inputClass, buttonClass, secondaryClass } from "./HubForms";

const sections = ["Calendar", "Overview", "Events", "Availability", "Services", "Business Profile", "Setup", "Account"] as const;
type Section = typeof sections[number];
const provider = marketplaceItems.find(item => item.id === 49)!;
function initialState() { return seedHub({ name: provider.name, location: provider.location, description: provider.description, contact: "", languages: (provider.languages ?? []).join(", "), specialties: "Birthdays, weddings and private parties" }); }
const statusClass = { Confirmed: "bg-emerald-50 text-emerald-800", Tentative: "bg-amber-50 text-amber-900", Hold: "bg-violet-50 text-violet-800" };
function Badge({ event }: { event: VendorEvent }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[event.status]}`}>{event.status}</span>; }
function sourceLabel(event: VendorEvent) { return event.source === "ARIVVIO" ? "Arivvio event · demo" : "External booking"; }

export function VendorHub() {
  const [state, setState] = useState<HubState | null>(null);
  const [section, setSection] = useState<Section>("Calendar");
  const [selectedDate, setSelectedDate] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<VendorEvent | null>(null);
  const [editingService, setEditingService] = useState<DemoService | null>(null);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("All sources");
  const [query, setQuery] = useState("");
  const [task, setTask] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // Hydrate browser-only demo storage after SSR; no account data is requested.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let loaded = initialState();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as HubState;
        if (parsed.version === 1 && Array.isArray(parsed.events) && Array.isArray(parsed.services) && parsed.hours?.length === 7 && parsed.business && Array.isArray(parsed.blocked)) loaded = parsed;
      }
    } catch { setStorageError("Saved demo data could not be loaded. This session starts with sample events."); }
    setState(hydrateHub(loaded));
    const today = dateKey(new Date()); setSelectedDate(today);
    const syncHash = () => { let value = ""; try { value = decodeURIComponent(window.location.hash.slice(1)); } catch { return; } if (sections.includes(value as Section)) { setSection(value as Section); setEventId(null); setEditingEvent(null); setEditingService(null); } };
    syncHash(); window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!state) return <main className="min-h-screen bg-[#FAF9F6] p-8"><Logo /><p className="mt-10" role="status">Opening your Vendor Demo…</p></main>;
  const today = dateKey(new Date());
  const sorted = [...state.events].sort((a,b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const upcoming = sorted.filter(e => e.date >= today);
  const current = state.events.find(e => e.id === eventId);
  const schedule = daySchedule(state, selectedDate || today);
  const setup = [
    { name: "Business basics", done: Boolean(state.business.name.trim() && state.business.location.trim()), target: "Business Profile" },
    { name: "Business description", done: Boolean(state.business.description.trim()), target: "Business Profile" },
    { name: "Contact information", done: Boolean(state.business.contact.trim()), target: "Business Profile" },
    { name: "Services and pricing", done: state.services.some(s => s.active && s.details.trim() && s.price.trim()), target: "Services" },
    { name: "Specialties and languages", done: Boolean(state.business.specialties.trim() && state.business.languages.trim()), target: "Business Profile" },
    { name: "Working schedule", done: state.hours.some(h => h.enabled), target: "Availability" },
  ];
  function save(next: HubState, notice = "Saved in this browser.") {
    next = hydrateHub(next);
    if (notice && next.notices === state?.notices) next = { ...next, notices: [{ id: crypto.randomUUID(), title: notice, body: "A change was saved in your demo workspace.", at: new Date().toISOString(), read: false, destination: section === "Business Profile" || section === "Services" ? "Business Profile" as const : "Calendar" as const, source: "Your activity" as const }, ...(next.notices ?? [])].slice(0, 30) };
    setState(next); setMessage(notice);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("Browser storage is unavailable. Changes will last only until this page closes."); }
  }
  function navigate(next: Section) { setSection(next); setEventId(null); setEditingEvent(null); setEditingService(null); setMessage(""); window.history.pushState(null, "", `#${encodeURIComponent(next)}`); }
  function openEvent(event: VendorEvent) { setEventId(event.id); setEditingEvent(null); setTask(""); setMessage(""); }
  function addEvent(date = today) {
    setEditingEvent({ id: crypto.randomUUID(), name: "", type: "Private Party", client: "", date, start: "16:00", end: "20:00", location: "", service: state!.services.find(s => s.active)?.name ?? "", notes: "", status: "Confirmed", source: "MANUAL", tasks: [] }); setEventId(null); setMessage("");
  }
  function eventList(events: VendorEvent[]) { return events.length ? <div className="divide-y divide-neutral-100">{events.map(event => <button key={event.id} onClick={() => openEvent(event)} className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-[#8A6A16]"><div><p className="font-semibold">{event.name}</p><p className="mt-1 text-sm text-neutral-600">{dateLabel(event.date)} · {event.start}–{event.end}</p><p className="mt-1 text-xs text-neutral-500">{event.client} · {sourceLabel(event)}</p></div><Badge event={event} /></button>)}</div> : <p className="py-4 text-sm text-neutral-500">No events here yet. Add an external booking to start organizing your schedule.</p>; }
  function dayPanel() { return <Panel title={dateLabel(selectedDate)}><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-neutral-100 px-3 py-1 text-sm">{schedule.label}</span><span className="text-sm text-neutral-500">{schedule.hours.enabled ? `${schedule.hours.start}–${schedule.hours.end} working hours` : "No normal working hours"}</span></div>{eventList(schedule.events)}<div className="mt-4 flex flex-wrap gap-2"><button className={buttonClass} onClick={() => addEvent(selectedDate)}>Add event on this date</button><button className={secondaryClass} onClick={() => save({ ...state!, blocked: schedule.blocked ? state!.blocked.filter(d => d !== selectedDate) : [...state!.blocked, selectedDate] }, schedule.blocked ? "Date unblocked. Existing events still reserve their time." : "Date blocked. Existing events remain visible.")}>{schedule.blocked ? "Unblock date" : "Block date"}</button></div><p className="mt-4 text-xs leading-5 text-neutral-500">Confirmed events reserve their time. Tentative events and holds flag possible conflicts. Blocking a date closes the entire day without deleting events.</p></Panel>; }

  return <div className="vendor-hub min-h-screen bg-[#F7F6F2] text-[#0D1321] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="border-b border-neutral-200 bg-white px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:py-8"><Logo /><div className="mt-6"><p className="text-xs font-semibold uppercase tracking-widest text-[#8A6A16]">Vendor Demo</p><p className="mt-2 font-semibold">{state.business.name}</p></div><nav aria-label="Vendor workspace" className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:flex-col">{sections.map(item => <button key={item} aria-current={section === item ? "page" : undefined} onClick={() => navigate(item)} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-medium ${section === item ? "bg-[#0D1321] text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>{item}</button>)}</nav><Link href="/" className="mt-4 inline-block text-sm font-semibold text-neutral-600 underline lg:mt-8">Exit demo</Link></aside>
    <main className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl"><header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-neutral-500">Your business workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{editingEvent ? "Manage event" : current ? current.name : section}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Every event in one place, whether clients found you through Arivvio or somewhere else.</p></div><div className="flex flex-wrap gap-2"><Notifications state={state} save={save} follow={notice => { navigate(notice.destination); const event = state.events.find(e => e.id === notice.eventId); if (event) openEvent(event); }} /><button onClick={() => addEvent()} className={buttonClass}>+ Add Event</button></div></header>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8DFC9] bg-[#FFFCF5] px-4 py-3 text-xs text-[#675227]"><span>Fictional demo business. Your edits stay in this browser only.</span><span>No live requests, bookings or payments.</span></div>
      {message && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{storageError && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{storageError}</p>}
      {editingEvent ? <EventForm key={editingEvent.id} event={editingEvent} state={state} onCancel={() => setEditingEvent(null)} onSave={event => { save({ ...state, events: [...state.events.filter(e => e.id !== event.id), event] }, "Event saved. Calendar and availability updated."); setEditingEvent(null); setEventId(event.id); setSelectedDate(event.date); }} /> : current ? <div className="space-y-5">
        <button className={secondaryClass} onClick={() => setEventId(null)}>← Back to {section.toLowerCase()}</button>
        <Panel title="Event workspace"><div className="flex flex-wrap items-center gap-3"><Badge event={current} /><span className="text-sm text-neutral-500">{sourceLabel(current)}</span></div><dl className="mt-6 grid gap-6 sm:grid-cols-2">{[["Client", current.client], ["Date and time", `${dateLabel(current.date)} · ${current.start}–${current.end}`], ["Location", current.location], ["Service", current.service], ["Event type", current.type]].map(([label,value]) => <div key={label}><dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt><dd className="mt-2 font-medium">{value}</dd></div>)}</dl><p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{current.notes || "No notes added yet."}</p>{scheduleWarnings(state, current).length > 0 && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{scheduleWarnings(state, current).join(" ")}</p>}<button className={`${secondaryClass} mt-6`} onClick={() => setEditingEvent(current)}>Edit event</button></Panel>
        <Panel title="Tasks and milestones"><div className="space-y-3">{current.tasks.map((t,i) => <label key={`${i}-${t.title}`} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={t.done} onChange={e => save({ ...state, events: state.events.map(v => v.id === current.id ? { ...v, tasks: v.tasks.map((value,j) => j === i ? { ...value, done: e.target.checked } : value) } : v) }, "Task updated.")} /><span className={t.done ? "text-neutral-400 line-through" : ""}>{t.title}</span></label>)}</div><form className="mt-5 flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); if (!task.trim()) return; save({ ...state, events: state.events.map(v => v.id === current.id ? { ...v, tasks: [...v.tasks, { title: task.trim(), done: false }] } : v) }, "Task added."); setTask(""); }}><input aria-label="New task" placeholder="Add a task or schedule milestone" required maxLength={150} className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" value={task} onChange={e => setTask(e.target.value)} /><button className={secondaryClass}>Add task</button></form></Panel>
        <Panel title="Quotes and payments"><p className="text-sm text-neutral-600">Not connected in this demo. Saving an event does not send a quote, collect a deposit or confirm a customer booking.</p></Panel>
      </div> : <>
        {section === "Overview" && <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3">{[["Today", `${state.events.filter(e => e.date === today).length} events`, "Calendar"], ["Upcoming", `${upcoming.length} events`, "Events"], ["Profile setup", `${setup.filter(s => s.done).length} of ${setup.length} complete`, "Setup"]].map(([label,value,target]) => <button key={label} onClick={() => navigate(target as Section)} className="rounded-2xl border border-neutral-200 bg-white p-6 text-left"><p className="text-sm text-neutral-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-3 text-xs text-[#8A6A16]">Open {target.toLowerCase()} →</p></button>)}</div><div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Panel title="Upcoming events">{eventList(upcoming.slice(0,4))}</Panel><div className="space-y-6"><Panel title="Next actions"><div className="flex flex-col items-start gap-3"><button className={secondaryClass} onClick={() => addEvent()}>Add external booking</button><button className={secondaryClass} onClick={() => navigate("Availability")}>Manage availability</button><button className={secondaryClass} onClick={() => navigate("Setup")}>Complete business setup</button></div></Panel><Panel title="Arivvio opportunities"><p className="text-sm leading-6 text-neutral-600">Your sample Arivvio events show where future accepted requests will appear. Live leads and quote acceptance are not connected yet.</p></Panel></div></div></div>}
        {section === "Events" && <Panel title="All events"><div className="mb-3 grid gap-3 sm:grid-cols-[1fr_200px]"><input aria-label="Search events" placeholder="Search events or clients" className={inputClass} value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Event source" className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}>{["All sources", "Arivvio", "External"].map(f => <option key={f}>{f}</option>)}</select></div>{eventList(sorted.filter(e => (filter === "All sources" || e.source === (filter === "Arivvio" ? "ARIVVIO" : "MANUAL")) && `${e.name} ${e.client}`.toLowerCase().includes(query.toLowerCase())))}</Panel>}
        {section === "Calendar" && <CalendarWorkspace state={state} save={save} openEvent={openEvent} manageAvailability={() => navigate("Availability")} />}
        {section === "Availability" && <div className="space-y-6"><WorkingHours state={state} onSave={hours => save({ ...state, hours }, "Working schedule saved. Calendar availability updated.")} /><Panel title="Date exceptions and event reservations"><Field label="Check a date"><input type="date" required className={inputClass} value={selectedDate} onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }} /></Field><div className="mt-5 flex flex-wrap gap-2">{[...new Set([...state.blocked, ...upcoming.map(e => e.date)])].sort().map(d => <button className={secondaryClass} key={d} onClick={() => setSelectedDate(d)}>{dateLabel(d)} · {state.blocked.includes(d) ? "Blocked" : "Scheduled"}</button>)}</div></Panel>{dayPanel()}</div>}
        {section === "Services" && (editingService ? <ServiceForm key={editingService.id} service={editingService} onCancel={() => setEditingService(null)} onSave={service => { save({ ...state, services: [...state.services.filter(s => s.id !== service.id), service] }, "Service saved. Customer preview updated."); setEditingService(null); }} /> : <Panel title="What your business offers"><button className={buttonClass} onClick={() => setEditingService({ id: crypto.randomUUID(), name: "", category: "DJ", details: "", price: "", active: true })}>Add service</button><div className="mt-5 grid gap-4 md:grid-cols-2">{state.services.map(s => <article className="rounded-xl border p-5" key={s.id}><p className="text-xs text-neutral-500">{s.category} · {s.active ? "Active" : "Paused"}</p><h3 className="mt-2 text-lg font-semibold">{s.name}</h3><p className="mt-3 text-sm leading-6 text-neutral-600">{s.details}</p><p className="mt-3 text-sm font-medium">{s.price}</p><div className="mt-5 flex flex-wrap gap-2"><button className={secondaryClass} aria-label={`Edit ${s.name}`} onClick={() => setEditingService(s)}>Edit</button><button className={secondaryClass} onClick={() => save({ ...state, services: state.services.map(v => v.id === s.id ? { ...v, active: !v.active } : v) }, "Service visibility updated in your preview.")}>{s.active ? "Pause" : "Resume"} {s.name}</button></div></article>)}</div></Panel>)}
        {section === "Business Profile" && <MarketplaceEditor state={state} save={save} editServices={() => navigate("Services")} />}
        {section === "Setup" && <Panel title={`${setup.filter(s => s.done).length} of ${setup.length} setup sections complete`}><p className="mb-5 text-sm text-neutral-600">Progress reflects the actual fields in your demo account. Return to any section to update it.</p><div className="divide-y">{setup.map(s => <button key={s.name} onClick={() => navigate(s.target as Section)} className="flex w-full items-center justify-between gap-4 py-5 text-left"><span className="font-medium">{s.name}</span><span className={`text-sm ${s.done ? "text-emerald-700" : "text-[#8A6A16]"}`}>{s.done ? "Complete · Edit" : "Needs details →"}</span></button>)}</div></Panel>}
        {section === "Account" && <Panel title="Demo account"><p className="text-sm leading-7 text-neutral-600">This is a fictional business workspace with browser-only storage. No credentials are required. Your edits are private to this browser and do not affect other visitors or real vendor accounts.</p><div className="mt-6 flex flex-wrap gap-3"><Link className={buttonClass} href="/vendor/login">Vendor sign in</Link><Link className={secondaryClass} href="/">Exit demo</Link><button className={secondaryClass} onClick={() => setConfirmReset(true)}>Reset demo data</button></div>{confirmReset && <div className="mt-6 rounded-xl bg-amber-50 p-4"><p className="text-sm">Replace your local demo edits and events with the sample account? This cannot be undone.</p><div className="mt-4 flex gap-3"><button className={buttonClass} onClick={() => { save(initialState(), "Demo reset to sample data."); setConfirmReset(false); }}>Confirm reset</button><button className={secondaryClass} onClick={() => setConfirmReset(false)}>Keep my changes</button></div></div>}</Panel>}
      </>}
      </div>
    </main>
  </div>;
}
