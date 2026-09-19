"use client";

import type { EventStage } from "@/lib/event-intelligence/types";
import type { ServiceName } from "@/app/data/marketplace";
import { formatTime } from "@/lib/utils/format";

type Defaults = { date: string; startTime: string; endTime: string; location: string; guestCount: number; budget: number };
const inputClass = "mt-1 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950";

export function EventPartsEditor({ stages, onChange, defaults, section, services = [] }: {
  stages: EventStage[]; onChange: (parts: EventStage[]) => void; defaults: Defaults;
  section: "structure" | "timing" | "location" | "allocation"; services?: ServiceName[];
}) {
  const update = (id: string, changes: Partial<EventStage>) => onChange(stages.map((part) => part.id === id ? { ...part, ...changes } : part));
  return <section className="event-parts-editor mt-6 space-y-4">
    {stages.length > 0 && <p className="text-sm text-neutral-600">One event, {stages.length} connected {stages.length === 1 ? "part" : "parts"}. Blank details use the overall event details.</p>}
    {stages.map((part, index) => <div key={part.id} className="event-part-card rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-neutral-950">{index + 1}. {part.label || "Event part"}</h3>
        {section === "structure" && <button type="button" className="text-sm text-neutral-600 underline" onClick={() => onChange(stages.filter((item) => item.id !== part.id))}>Remove {part.label}</button>}
      </div>
      {section === "structure" && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Part name<input className={inputClass} value={part.label} onChange={(event) => update(part.id, { label: event.target.value })} /></label>
        <label className="text-sm">Notes<textarea className={inputClass} value={part.notes ?? ""} onChange={(event) => update(part.id, { notes: event.target.value })} /></label>
        <fieldset className="sm:col-span-2"><legend className="text-sm">Services for {part.label}</legend><p className="mb-2 text-xs text-neutral-500">Unassigned services remain with the overall event.</p><div className="grid gap-2 sm:grid-cols-2">{services.map((service) => <label key={service} className="flex min-h-10 items-center gap-2 rounded-lg ui-soft px-3 py-2 text-sm"><input type="checkbox" checked={part.services?.includes(service) ?? false} onChange={(event) => update(part.id, { services: event.target.checked ? [...(part.services ?? []), service] : part.services?.filter((item) => item !== service) })} />{service}</label>)}</div></fieldset>
      </div>}
      {section === "timing" && <div className="mt-3 grid gap-3 sm:grid-cols-3">{([['date', 'Date'], ['startTime', 'Start time'], ['endTime', 'End time']] as const).map(([key, label]) => <label className="text-sm" key={key}>{part.label} {label.toLowerCase()}<input className={inputClass} type={key === "date" ? "date" : "time"} value={part[key] ?? ""} onChange={(event) => update(part.id, { [key]: event.target.value || undefined })} /><span className="text-xs text-neutral-500">Overall: {defaults[key] || "not set"}</span></label>)}</div>}
      {section === "location" && <label className="mt-3 block text-sm">{part.label} location<input className={inputClass} placeholder={defaults.location || "Place, address, or venue needed"} value={part.location ?? ""} onChange={(event) => update(part.id, { location: event.target.value || undefined })} /></label>}
      {section === "allocation" && <div className="mt-3 grid gap-3 sm:grid-cols-2">{([['guestCount', 'guests'], ['budget', 'budget']] as const).map(([key, label]) => <label className="text-sm" key={key}>{part.label} {label}<input className={inputClass} type="number" min="0" step={key === "guestCount" ? "1" : "any"} placeholder={String(defaults[key])} value={part[key] ?? ""} onChange={(event) => update(part.id, { [key]: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) })} /><span className="text-xs text-neutral-500">{key === "budget" ? "Optional allocation, not an additional budget." : "Leave blank to use overall guests."}</span></label>)}</div>}
    </div>)}
    {section === "structure" && <button type="button" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold" onClick={() => onChange([...stages, { id: `part-${crypto.randomUUID()}`, label: `Part ${stages.length + 1}`, order: stages.length + 1 }])}>Add another part</button>}
    {section === "allocation" && stages.length > 0 && <p className="text-sm text-neutral-600">Allocated: ${stages.reduce((sum, part) => sum + (part.budget ?? 0), 0).toLocaleString()} of ${defaults.budget.toLocaleString()}. Allocations do not need to add up exactly; guests may attend more than one part.</p>}
  </section>;
}

export function EventPartsSummary({ stages, defaults }: { stages: EventStage[]; defaults: Defaults }) {
  if (!stages.length) return null;
  return <section className="event-part-summary rounded-2xl border border-neutral-200 bg-white p-5"><h3 className="font-semibold text-neutral-950">Event parts</h3><div className="mt-3 divide-y divide-neutral-200">{stages.map((part) => <div key={part.id} className="py-3 text-sm"><p className="font-semibold text-neutral-950">{part.label}</p><p className="mt-1 text-neutral-600">{part.date || defaults.date || "Date to confirm"} · {formatTime(part.startTime || defaults.startTime)} – {formatTime(part.endTime || defaults.endTime)}</p><p className="text-neutral-600">{part.location || defaults.location || "Location to confirm"}</p><p className="text-neutral-600">{part.guestCount ?? defaults.guestCount} guests · {part.budget === undefined ? `Overall budget $${defaults.budget.toLocaleString()}` : `$${part.budget.toLocaleString()} allocated`}</p>{!!part.services?.length && <p className="text-neutral-600">{part.services.join(", ")}</p>}{part.notes && <p className="text-neutral-600">{part.notes}</p>}</div>)}</div></section>;
}
