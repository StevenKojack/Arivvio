"use client";
import { useState, type ReactNode } from "react";
import { days, serviceFields, scheduleWarnings, type VendorEvent, type HubState, type DemoService, type Business } from "@/lib/vendor-demo/model";

export const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-[#0D1321] focus:outline-2 focus:outline-[#8A6A16]";
export const buttonClass = "rounded-full bg-[#0D1321] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
export const secondaryClass = "rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1321]";
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium">{label}{children}</label>; }
export function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"><h2 className="mb-5 text-lg font-semibold">{title}</h2>{children}</section>; }

export function EventForm({ event, state, onSave, onCancel }: { event: VendorEvent; state: HubState; onSave: (event: VendorEvent) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(event);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const warnings = scheduleWarnings(state, draft);
  function update(key: keyof VendorEvent, value: string) { setDraft({ ...draft, [key]: value }); setAcknowledged(false); setError(""); }
  return <Panel title={state.events.some(e => e.id === event.id) ? "Edit event" : "Add an external booking"}>
    <p className="mb-6 text-sm text-neutral-600">Keep every event here, wherever your client found you. Times use your business location&apos;s local time. Use a separate entry for each day of a multi-day event.</p>
    <form onSubmit={e => { e.preventDefault(); if (draft.end <= draft.start) { setError("End time must be after start time on the same day."); return; } if (!draft.name.trim() || !draft.client.trim()) { setError("Enter an event and client name."); return; } if (warnings.length && !acknowledged) { setError("Review the scheduling notice and confirm before saving."); return; } onSave(draft); }} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Event name"><input required maxLength={100} className={inputClass} value={draft.name} onChange={e => update("name", e.target.value)} /></Field>
        <Field label="Event type"><select className={inputClass} value={draft.type} onChange={e => update("type", e.target.value)}>{["Birthday", "Wedding", "Corporate", "Graduation", "Private Party", "Other"].map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Client name"><input required maxLength={100} className={inputClass} value={draft.client} onChange={e => update("client", e.target.value)} /></Field>
        <Field label="Date"><input required type="date" className={inputClass} value={draft.date} onChange={e => update("date", e.target.value)} /></Field>
        <Field label="Start time"><input required type="time" className={inputClass} value={draft.start} onChange={e => update("start", e.target.value)} /></Field>
        <Field label="End time"><input required type="time" className={inputClass} value={draft.end} onChange={e => update("end", e.target.value)} /></Field>
        <Field label="Location"><input required maxLength={200} className={inputClass} value={draft.location} onChange={e => update("location", e.target.value)} /></Field>
        <Field label="Service"><input required list="hub-services" maxLength={100} className={inputClass} value={draft.service} onChange={e => update("service", e.target.value)} /><datalist id="hub-services">{state.services.filter(s => s.active).map(s => <option key={s.id} value={s.name} />)}</datalist></Field>
        <Field label="Status"><select className={inputClass} value={draft.status} onChange={e => update("status", e.target.value)}>{["Confirmed", "Tentative", "Hold"].map(t => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="Notes and requirements"><textarea rows={3} maxLength={3000} className={inputClass} value={draft.notes} onChange={e => update("notes", e.target.value)} /></Field>
      {warnings.length > 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><p>{warnings.join(" ")}</p><label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />Save despite this scheduling conflict</label></div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3"><button className={buttonClass}>Save event</button><button type="button" onClick={onCancel} className={secondaryClass}>Cancel</button></div>
    </form>
  </Panel>;
}

export function ServiceForm({ service, onSave, onCancel }: { service: DemoService; onSave: (service: DemoService) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(service);
  return <Panel title="Service details"><form className="space-y-5" onSubmit={e => { e.preventDefault(); if (draft.name.trim() && draft.details.trim()) onSave(draft); }}>
    <Field label="Service name"><input required className={inputClass} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
    <Field label="Service category"><select className={inputClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{Object.keys(serviceFields).map(s => <option key={s}>{s}</option>)}</select></Field>
    <Field label={serviceFields[draft.category]}><textarea required rows={4} className={inputClass} value={draft.details} onChange={e => setDraft({ ...draft, details: e.target.value })} /></Field>
    <Field label="Pricing information"><input required className={inputClass} value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} /></Field>
    <div className="flex gap-3"><button className={buttonClass}>Save service</button><button type="button" className={secondaryClass} onClick={onCancel}>Cancel</button></div>
  </form></Panel>;
}

export function BusinessForm({ business, onSave }: { business: Business; onSave: (business: Business) => void }) {
  const [draft, setDraft] = useState(business);
  return <Panel title="Business profile"><form className="space-y-5" onSubmit={e => { e.preventDefault(); if (draft.name.trim()) onSave(draft); }}>
    <p className="text-sm text-neutral-600">Return here anytime. Saved fields feed your customer profile preview. Demo edits are not published to the public marketplace.</p>
    {([["name", "Business name"], ["location", "Service area"], ["contact", "Business email"], ["languages", "Languages"], ["specialties", "Event specialties"]] as const).map(([key, label]) => <Field key={key} label={label}><input required={key === "name" || key === "location"} type={key === "contact" ? "email" : "text"} className={inputClass} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></Field>)}
    <Field label="Business description"><textarea rows={4} className={inputClass} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <button className={buttonClass}>Save profile</button>
  </form></Panel>;
}

export function WorkingHours({ state, onSave }: { state: HubState; onSave: (hours: HubState["hours"]) => void }) {
  const [hours, setHours] = useState(state.hours);
  const [error, setError] = useState("");
  return <Panel title="Normal working schedule"><form onSubmit={e => { e.preventDefault(); if (hours.some(h => h.enabled && h.end <= h.start)) { setError("Each closing time must be after its opening time."); return; } setError(""); onSave(hours); }} className="space-y-4">
    <p className="text-sm text-neutral-600">Local business time. Events reserve their time range. Tentative events and holds also flag conflicts. Blocked dates override these hours.</p>
    {hours.map((h, i) => <div key={days[i]} className="flex flex-wrap items-center gap-3 border-b pb-3"><label className="flex w-32 items-center gap-2 text-sm"><input type="checkbox" checked={h.enabled} onChange={e => setHours(hours.map((v,j) => j === i ? { ...v, enabled: e.target.checked } : v))} />{days[i]}</label>{h.enabled ? <><input aria-label={`${days[i]} opening time`} required type="time" className="rounded-lg border p-2 text-sm" value={h.start} onChange={e => setHours(hours.map((v,j) => j === i ? { ...v, start: e.target.value } : v))} /><span>to</span><input aria-label={`${days[i]} closing time`} required type="time" className="rounded-lg border p-2 text-sm" value={h.end} onChange={e => setHours(hours.map((v,j) => j === i ? { ...v, end: e.target.value } : v))} /></> : <span className="text-sm text-neutral-500">Unavailable</span>}</div>)}
    {error && <p role="alert" className="text-red-700">{error}</p>}<button className={buttonClass}>Save working hours</button>
  </form></Panel>;
}
