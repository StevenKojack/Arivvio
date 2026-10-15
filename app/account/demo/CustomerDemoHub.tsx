"use client";
import { EventPlanSnapshot } from "@/app/components/EventPlanSnapshot";
import { atmosphereForEvent } from "@/lib/event-intelligence/atmosphere";
import { CustomerDialog } from "@/app/components/CustomerDialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { customerChanged, deleteCustomerEvent, eventPeriod, loadCustomerEvents, type CustomerEvent } from "@/lib/customer-demo/events";
import { loadEventIntelligenceProfile, saveEventIntelligenceProfile } from "@/lib/event-intelligence/storage";
import { saveAssistantProfile } from "@/lib/assistant/session";
import { EventPartsSummary } from "@/app/discover/components/EventParts";
import { EventHubSummary } from "@/app/requests/EventHubSummary";
import { understandEvent } from "@/lib/event-intelligence/understanding";
import { formatMoney, formatTime } from "@/lib/utils/format";
import { AskArivvioButton } from "@/app/components/AskArivvioButton";
import { ThemeControl } from "@/app/components/ThemeControl";

export function CustomerDemoHub({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [section, setSection] = useState("Events");
  const [confirm, setConfirm] = useState<CustomerEvent | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const refresh = () => { setEvents(loadCustomerEvents()); const date = new Date(); setToday(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`); setReady(true); };
    queueMicrotask(() => { try { const active = loadEventIntelligenceProfile(); if (active && !active.eventId) saveEventIntelligenceProfile(active); setName(localStorage.getItem("arivvio:customer-name") ?? ""); } catch { setError("Some browser settings could not be saved."); } refresh(); });
    window.addEventListener(customerChanged, refresh); window.addEventListener("arivvio:profile-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("focus", refresh);
    return () => { window.removeEventListener(customerChanged, refresh); window.removeEventListener("arivvio:profile-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  function resume(event: CustomerEvent) {
    if (!event.profile) return;
    try {
      saveAssistantProfile(event.profile); router.push("/discover?assistant=1");
    } catch { setError("Unable to open this plan. Check your browser’s privacy settings."); }
  }
  const selected = events.find(event => event.id === eventId);
  const requestCards = (event: CustomerEvent) => event.requests.map(request => <Link className="hub-card block p-5" key={request.id} href={`/requests/${request.id}`}><p className="text-xs ui-muted">{event.name} · Request {request.id.slice(-8)}</p><h3 className="mt-2 font-semibold">{request.opportunities.length} vendor requests</h3><p className="mt-2 text-sm ui-muted">{request.opportunities.filter(o => o.response).length} demo responses · {request.opportunities.reduce((n,o) => n + (o.thread?.length ?? 0), 0)} messages</p><p className="mt-3 text-sm font-semibold">Review vendors and messages</p></Link>);
  const card = (event: CustomerEvent) => <article className="account-event-card" key={event.id}><p className="text-xs ui-muted">{event.date || event.profile?.dateHint || "Date to confirm"}</p><h3 className="mt-2 text-xl font-semibold">{event.name}</h3><p className="mt-2 text-sm ui-muted">{event.profile?.planning?.guestCount ? `${event.profile.planning.guestCount} guests · ` : ""}{event.requests.length} saved requests</p><div className="mt-5 flex flex-wrap gap-2"><Link href={`/account/demo/events/${encodeURIComponent(event.id)}`} className="hub-primary">Open Event Hub</Link><button className="hub-button text-red-700 dark:text-red-300" onClick={() => setConfirm(event)}>Remove event</button></div></article>;
  return <section className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
    <p className="eyebrow">{eventId ? "Event Hub" : "Your occasions"}</p><h1 className="mt-3 text-3xl font-semibold">{selected?.name ?? (eventId ? "Your event" : name ? `${name}'s events` : "Your events")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 ui-muted">Your plans stay on this device during the preview. No real bookings or vendor contact.</p>
    <div className="my-6 flex flex-wrap gap-3"><Link className="hub-button" href="/account/demo">My events</Link><Link className="hub-button" href="/demo">Plan an event</Link><Link className="hub-button" href="/requests">Saved requests</Link></div>
    {!ready ? <p role="status">Loading your events…</p> : eventId ? selected ? <>
      {selected.profile && <><EventPlanSnapshot name={selected.name} date={selected.date || selected.profile.dateHint || "Date to confirm"} guests={selected.profile.planning?.guestCount ? `${selected.profile.planning.guestCount} people` : "To confirm"} budget={formatMoney(selected.profile.planning?.budget)} services={selected.profile.requestedServices} atmosphere={atmosphereForEvent(selected.profile.recognition)} /><div className="next-planning-step mt-5"><p className="eyebrow">Your next step</p><h2 className="mt-2 text-xl font-semibold">{understandEvent(selected.profile).readiness}</h2><p className="mt-3 text-sm">{understandEvent(selected.profile).nextBestQuestion?.question ?? "Review your vendor requests and schedule."}</p><p className="mt-3 text-sm ui-muted">{selected.date || selected.profile.dateHint || "Date to confirm"} · {formatTime(selected.profile.planning?.startTime)} – {formatTime(selected.profile.planning?.endTime)}</p><p className="mt-2 text-sm ui-muted">{selected.profile.planning?.location || "Location to confirm"} · {selected.profile.planning?.guestCount || "Unconfirmed"} guests · {formatMoney(selected.profile.planning?.budget)} budget</p><div className="mt-4 flex flex-wrap gap-3"><button className="hub-primary" onClick={() => resume(selected)}>Continue planning</button><AskArivvioButton /></div></div>{selected.profile.planning && <div className="mt-5"><EventPartsSummary stages={selected.profile.stages} defaults={selected.profile.planning} /></div>}</>}
      {selected.requests[0] && <EventHubSummary request={selected.requests[0]} />}
      <section id="provider-requests" className="mt-6"><h2 className="text-xl font-semibold">Requests and conversations</h2><p className="mt-2 text-sm ui-muted">Each submitted request preserves its event snapshot. Open it to review responses and messages.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{requestCards(selected)}</div>{!selected.requests.length && <p className="hub-card mt-4 p-5 text-sm ui-muted">Your event team is still taking shape. Continue planning to find vendors for this occasion.</p>}</section>
      <section id="event-details" className="mt-6"><button className="hub-button text-red-700 dark:text-red-300" onClick={() => setConfirm(selected)}>Remove this demo event</button></section>
    </> : <div className="hub-card p-6"><h2 className="font-semibold">Event not saved here</h2><p className="mt-2 ui-muted">It may have been removed or saved in another browser.</p></div> : <>
      <nav aria-label="Customer account sections" className="account-tabs mb-6 flex flex-wrap">{["Events", "Requests / Vendors", "Account"].map(label => <button key={label} className={section === label ? "hub-primary" : "hub-button"} aria-pressed={section === label} onClick={() => setSection(label)}>{label}</button>)}</nav>
      {section === "Events" && (events.length ? <div className="space-y-8">{["Planning · date to confirm", "Current / upcoming", "Past"].map(period => { const group = events.filter(e => eventPeriod(e,today) === period); return group.length ? <section key={period}><h2 className="mb-4 text-xl font-semibold">{period}</h2><div className="grid gap-4 sm:grid-cols-2">{group.map(card)}</div></section> : null; })}</div> : <div className="hub-card p-6"><h2 className="text-xl font-semibold">Your first occasion starts here.</h2><p className="mt-3 ui-muted">Plan an event or describe it to Ask ARIVVIO. Your saved plan will appear here.</p><Link className="hub-primary mt-5" href="/demo">Start planning</Link></div>)}
      {section === "Requests / Vendors" && <div className="grid gap-4 sm:grid-cols-2">{events.flatMap(requestCards)}{!events.some(e => e.requests.length) && <p className="hub-card p-5 ui-muted">Provider requests and demo conversations will appear after you submit a request.</p>}</div>}
      {section === "Account" && <div className="hub-card p-6"><h2 className="text-xl font-semibold">Your demo account</h2><form className="mt-5 max-w-sm" onSubmit={e => { e.preventDefault(); try { localStorage.setItem("arivvio:customer-name",name.trim()); setNotice("Name saved."); setError(""); } catch { setError("Unable to save your name."); } }}><label className="text-sm">Display name<input className="hub-input mt-2 w-full" maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><button className="hub-button mt-3">Save name</button></form><div className="mt-6 flex items-center gap-3"><span className="text-sm">Appearance</span><ThemeControl /></div><p className="mt-5 text-sm ui-muted">No email or password is required for the demo.</p><Link href="/account" className="mt-4 inline-block text-sm underline">Open signed-in account</Link></div>}
    </>}
    {confirm && <CustomerDialog title="Remove demo event" onClose={() => setConfirm(null)}><section aria-labelledby="remove-event-title" className="rounded-2xl border border-red-400 p-5 ui-surface"><h2 id="remove-event-title" className="text-lg font-semibold">Remove “{confirm.name}”?</h2><p className="mt-3 text-sm ui-muted">This removes only this browser’s event, its saved requests, conversations and linked tentative Vendor Demo entries. It cannot be undone. No cloud event or real booking will change.</p><div className="mt-4 flex flex-wrap gap-3"><button className="hub-button" onClick={() => setConfirm(null)}>Keep event</button><button className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white" onClick={() => { try { deleteCustomerEvent(confirm.id); setConfirm(null); setNotice("Demo event removed from this browser."); setError(""); if (eventId) router.push("/account/demo"); } catch (e) { setError(e instanceof Error ? e.message : "Unable to remove event."); } }}>Confirm removal</button></div></section></CustomerDialog>}
    {notice && <p className="mt-4 text-sm" role="status">{notice}</p>}{error && <p className="mt-4 text-sm" role="alert">{error}</p>}
  </section>;
}
