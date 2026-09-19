"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { EventType, ServiceName } from "@/app/data/marketplace";

type FilterProps = {
  eventTypes: EventType[]; query: string; excludedServices: ServiceName[];
  selectedEvent: EventType | "All"; selectedServices: ServiceName[]; serviceOptions: ServiceName[];
  language: string; specialty: string; maxEstimate: string; sort: string;
  languages: string[]; specialties: string[]; location: string;
  onEventChange: (value: EventType | "All") => void; onQueryChange: (value: string) => void;
  onToggleExcludedService: (value: ServiceName) => void; onToggleService: (value: ServiceName) => void;
  onLanguageChange: (value: string) => void; onSpecialtyChange: (value: string) => void;
  onMaxEstimateChange: (value: string) => void; onSortChange: (value: string) => void; onClear: () => void;
};
const groups: { label: string; children: { label: string; services: ServiceName[] }[] }[] = [
  { label: "Venues & settings", children: [{ label: "Spaces", services: ["Venue", "Rentals", "Florals", "Balloons"] }] },
  { label: "Food & drink", children: [{ label: "Food services", services: ["Catering", "Cake & Desserts", "Bartending"] }] },
  { label: "Entertainment", children: [{ label: "Music", services: ["DJ", "Live Music"] }, { label: "Performers & activities", services: ["Magic", "Character Performers", "Bounce Houses", "Photo Booth"] }] },
  { label: "Production & support", children: [{ label: "Capture & production", services: ["Photography", "AV Production", "Live Streaming", "Invitations", "Printed Materials", "Printed Programs"] }, { label: "Logistics", services: ["Transportation", "Party Bus", "Valet", "Security", "Staffing", "Cleaning", "Registration", "Booth Rentals", "Portable Restrooms"] }] },
];
function Section({ label, children, open = false }: { label: string; children: ReactNode; open?: boolean }) {
  return <details open={open} className="border-t ui-border py-3"><summary className="cursor-pointer text-sm font-semibold">{label}</summary><div className="mt-3 space-y-3">{children}</div></details>;
}
export function MarketplaceFilters(p: FilterProps) {
  const active = [
    ...(p.selectedEvent !== "All" ? [{ label: p.selectedEvent, remove: () => p.onEventChange("All") }] : []),
    ...p.selectedServices.map((service) => ({ label: service, remove: () => p.onToggleService(service) })),
    ...p.excludedServices.map((service) => ({ label: `Hide ${service}`, remove: () => p.onToggleExcludedService(service) })),
    ...[[p.query, p.onQueryChange], [p.language, p.onLanguageChange], [p.specialty, p.onSpecialtyChange], [p.maxEstimate ? `Under $${p.maxEstimate}` : "", p.onMaxEstimateChange]].filter(([value]) => value).map(([value, setter]) => ({ label: value as string, remove: () => (setter as (value: string) => void)("") })),
  ];
  return <div className="marketplace-filters ui-surface rounded-2xl border ui-border p-4">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Filters</h2><button className="min-h-10 text-xs underline underline-offset-4" onClick={p.onClear}>Clear all</button></div>
    {!!active.length && <div aria-label="Active filters" className="mb-3 space-y-1">{active.map((filter, index) => <button key={`${filter.label}-${index}`} className="flex w-full items-center justify-between gap-2 rounded-lg ui-soft px-3 py-2 text-left text-xs" onClick={filter.remove} aria-label={`Remove filter ${filter.label}`}>{filter.label}<span aria-hidden>×</span></button>)}</div>}
    <Section label="Sort & price" open><label className="block text-xs">Sort providers<select className="hub-input mt-1 w-full" value={p.sort} onChange={(event) => p.onSortChange(event.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Name</option></select></label><label className="block text-xs">Maximum demo estimate<input className="hub-input mt-1 w-full" type="number" min="0" placeholder="Any price" value={p.maxEstimate} onChange={(event) => p.onMaxEstimateChange(event.target.value)} /></label></Section>
    <Section label="Service categories" open>{groups.map((group) => <details key={group.label} open={group.children.some((child) => child.services.some((service) => p.selectedServices.includes(service)))}><summary className="cursor-pointer text-sm">{group.label}</summary><div className="ml-3 mt-2 space-y-3">{group.children.map((child) => <fieldset key={child.label}><legend className="mb-1 text-xs ui-muted">{child.label}</legend>{child.services.filter((service) => p.serviceOptions.includes(service)).map((service) => <label key={service} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={p.selectedServices.includes(service)} onChange={() => p.onToggleService(service)} />{service}</label>)}</fieldset>)}</div></details>)}</Section>
    <Section label="Event compatibility"><label className="block text-xs">Event type<select className="hub-input mt-1 w-full" value={p.selectedEvent} onChange={(event) => p.onEventChange(event.target.value as EventType | "All")}><option>All</option>{p.eventTypes.map((event) => <option key={event}>{event}</option>)}</select></label></Section>
    <Section label="Languages & specialties"><label className="block text-xs">Language<select className="hub-input mt-1 w-full" value={p.language} onChange={(event) => p.onLanguageChange(event.target.value)}><option value="">Any language</option>{p.languages.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-xs">Specialty<select className="hub-input mt-1 w-full" value={p.specialty} onChange={(event) => p.onSpecialtyChange(event.target.value)}><option value="">Any specialty</option>{p.specialties.map((value) => <option key={value}>{value}</option>)}</select></label></Section>
    <Section label="Location & availability"><p className="text-xs ui-muted">{p.location || "Set your location in event context."}</p><p className="text-xs ui-muted">Matches use your event timing and search area. Availability is illustrative until a vendor confirms.</p></Section>
    <Section label="Hide services">{p.serviceOptions.map((service) => <label key={service} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.excludedServices.includes(service)} onChange={() => p.onToggleExcludedService(service)} />{service}</label>)}</Section>
  </div>;
}
export function FilterDrawer({ isOpen, onClose, ...props }: FilterProps & { isOpen: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (isOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [isOpen]);
  return <dialog ref={dialog} onCancel={onClose} aria-label="Marketplace filters" className="ui-surface fixed inset-0 ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(380px,94vw)] max-w-none overflow-y-auto p-4 backdrop:bg-black/40"><button className="hub-button mb-3 w-full" onClick={onClose}>Show results</button><MarketplaceFilters {...props} /></dialog>;
}
