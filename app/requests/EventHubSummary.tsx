"use client";
import { useEffect, useState } from "react";
import type { DemoQuoteRequest } from "@/lib/event-intelligence/demo-quotes";
import { EventPartsSummary } from "@/app/discover/components/EventParts";
import { formatMoney, formatTime } from "@/lib/utils/format";

const sections = ["Overview", "Schedule", "Budget", "Guests", "Invitations"] as const;
export function EventHubSummary({ request }: { request: DemoQuoteRequest }) {
  const [section, setSection] = useState<typeof sections[number]>("Overview");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const refresh = () => setNow(Date.now()); queueMicrotask(refresh); const timer = window.setInterval(refresh, 60000); return () => clearInterval(timer); }, []);
  const event = request.event;
  const date = event.date ? new Date(`${event.date}T${event.startTime || "12:00"}`) : null;
  const days = date && now && !Number.isNaN(date.getTime()) ? Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime()) / 86400000) : null;
  const estimates = request.opportunities.reduce((sum, item) => sum + item.estimate, 0);
  const quotes = request.opportunities.filter(item => item.response?.status === "quoted");
  const quoted = quotes.reduce((sum, item) => sum + (item.response?.price ?? 0), 0);
  return <section className="my-6 hub-card p-5 sm:p-7" aria-label="Event hub">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your event hub</h2><span className="text-sm ui-muted">{days === null ? "Date to confirm" : days < 0 ? "Event date has passed" : days === 0 ? "Today" : `${days} days to go`}</span></div>
    <nav aria-label="Event hub sections" className="my-5 flex flex-wrap gap-2">{sections.map(name => <button key={name} className={section === name ? "hub-primary" : "hub-button"} aria-pressed={section === name} onClick={() => setSection(name)}>{name}</button>)}<a className="hub-button" href="#provider-requests">Vendors / Requests</a><a className="hub-button" href="#event-details">Event Details</a></nav>
    {section === "Overview" && <><div className="grid gap-3 sm:grid-cols-3">{[["Event details", event.date && event.location && event.location !== "Not selected" ? "Date and place saved" : "Details to confirm"], ["Providers", `${request.opportunities.length} requested`], ["Responses", `${request.opportunities.filter(item => item.response).length} demo responses`]].map(([label,value]) => <div key={label} className="rounded-xl ui-soft p-4"><p className="text-xs ui-muted">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</div><p className="mt-4 text-sm ui-muted">{quotes.some(item => !item.reviewedAt) ? "Next: review your new demo quotes below." : "Keep provider requests, event details and your schedule together here."} This hub reflects the saved request. Later planner edits do not change its snapshot.</p></>}
    {section === "Schedule" && <><h3 className="font-semibold">Event schedule</h3><p className="my-3 text-sm ui-muted">{event.date || "Date to confirm"} · {formatTime(event.startTime)} – {formatTime(event.endTime)}</p>{event.profile?.stages.length ? <EventPartsSummary stages={event.profile.stages} defaults={event} /> : <p className="text-sm">One occasion at {event.location || "a location to confirm"}. No additional parts.</p>}<p className="mt-4 text-xs ui-muted">Times follow your plan. Provider availability is not confirmed.</p></>}
    {section === "Budget" && <><h3 className="font-semibold">Budget snapshot</h3><dl className="mt-4 grid gap-4 sm:grid-cols-3">{[["Overall budget", formatMoney(event.budget)], ["Requested estimates", formatMoney(estimates)], ["Demo quotes received", `${formatMoney(quoted)} · ${quotes.length} responses`]].map(([label,value]) => <div key={label}><dt className="text-xs ui-muted">{label}</dt><dd className="mt-2 font-semibold">{value}</dd></div>)}</dl>{event.budget > 0 && estimates > event.budget && <p className="mt-4 text-sm">Requested estimates exceed your overall budget by {formatMoney(estimates - event.budget)}.</p>}<p className="mt-4 text-xs ui-muted">Estimates and quotes are separate comparison totals, not amounts paid or committed. Stage allocations are part of the overall budget.</p></>}
    {section === "Guests" && <><h3 className="font-semibold">{event.guestCount} planned guests</h3><p className="mt-3 text-sm ui-muted">This is your planning headcount. Individual guest lists and RSVP tracking are not available yet.</p></>}
    {section === "Invitations" && <><h3 className="font-semibold">A home for your invitations</h3><p className="mt-3 text-sm ui-muted">Digital invitations, flyer uploads and guest communication will live here in a future release. This event is not publicly shared. No invitation has been sent, and printing or mailing is not available.</p></>}
  </section>;
}
