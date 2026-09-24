"use client";
import { DemoProviderThread } from "@/app/components/DemoProviderThread";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadDemoQuoteRequests, opportunityStatus, respondToDemoOpportunity, type DemoQuoteRequest, type DemoOpportunity } from "@/lib/event-intelligence/demo-quotes";
import { inquiryEvent } from "@/lib/vendor-demo/inquiries";
import { scheduleWarnings, type HubState, type VendorEvent } from "@/lib/vendor-demo/model";
import { EventPartsSummary } from "@/app/discover/components/EventParts";
import { Panel, inputClass, buttonClass, secondaryClass } from "./HubForms";

export function Inquiries({ state, save, openEvent }: { state: HubState; save: (state: HubState, notice?: string) => void; openEvent: (event: VendorEvent) => void }) {
  const [requests, setRequests] = useState<DemoQuoteRequest[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => { setRequests(loadDemoQuoteRequests()); setReady(true); };
    queueMicrotask(refresh); window.addEventListener("arivvio:customer-changed", refresh); window.addEventListener("focus", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("arivvio:customer-changed", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const inquiries = requests.flatMap(request => request.opportunities.filter(item => item.providerId === "49").map(item => ({ request, item })));
  return <Panel title="Arivvio inquiries"><p className="mb-5 text-sm leading-6 ui-muted">Requests for this fictional business, Apricot Sound DJs, appear here from this browser. You are simulating the vendor response. Nothing is sent to a real customer or vendor.</p>{!ready ? <p>Loading inquiries…</p> : inquiries.length ? <div className="space-y-5">{inquiries.map(({ request, item }) => <Inquiry key={`${item.id}:${item.response?.at ?? "new"}`} request={request} item={item} state={state} refresh={() => setRequests(loadDemoQuoteRequests())} save={save} openEvent={openEvent} />)}</div> : <div className="rounded-xl ui-soft p-5"><h3 className="font-semibold">No customer inquiries yet</h3><p className="mt-2 text-sm ui-muted">Add Apricot Sound DJs to a customer quote and submit a demo request to try the connected flow.</p><Link className={`${secondaryClass} mt-4 inline-block`} href="/marketplace?entryMode=service&services=DJ">Find the demo business</Link></div>}</Panel>;
}
function Inquiry({ request, item, state, refresh, save, openEvent }: { request: DemoQuoteRequest; item: DemoOpportunity; state: HubState; refresh: () => void; save: (state: HubState, notice?: string) => void; openEvent: (event: VendorEvent) => void }) {
  const [price, setPrice] = useState(String(item.response?.price ?? item.estimate));
  const [note, setNote] = useState(item.response?.note ?? "");
  const [error, setError] = useState("");
  const proposed = inquiryEvent(request, item);
  const existing = state.events.find(event => event.id === proposed.id);
  const warnings = scheduleWarnings(state, proposed);
  function respond(status: "quoted" | "declined") {
    try { if (status === "quoted" && !price.trim()) throw new Error("Enter a demo quote amount."); respondToDemoOpportunity(request.id, item.id, "49", { status, price: status === "quoted" ? Number(price) : undefined, note: note.trim(), at: new Date().toISOString() }); setError(""); refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save the response."); }
  }
  return <article className="rounded-2xl border ui-border p-4 sm:p-6"><p className="text-xs ui-muted">{opportunityStatus(item)} · {request.id.slice(-8)}</p><h3 className="mt-2 text-xl font-semibold">{request.event.name}</h3><p className="mt-2 text-sm ui-muted">{request.event.date || "Date to confirm"} · {item.startTime}–{item.endTime} · {request.event.guestCount} guests</p><p className="mt-1 text-sm ui-muted">{request.event.location || "Location to confirm"} · {item.service}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Event details and customer message</summary><div className="mt-3"><p className="text-sm ui-muted">Overall budget: ${request.event.budget.toLocaleString()}</p><p className="my-3 whitespace-pre-wrap text-sm ui-muted">{[request.event.requirements, request.message].filter(Boolean).join("\n") || "No additional notes."}</p><EventPartsSummary stages={request.event.profile?.stages ?? []} defaults={request.event} /></div></details>
    <DemoProviderThread request={request} opportunity={item} sender="vendor" />
    <form className="mt-5 grid gap-3" onSubmit={event => { event.preventDefault(); respond("quoted"); }}><label className="text-sm">Demo quote amount ($)<input className={`${inputClass} mt-1`} type="number" min="0" step="0.01" required value={price} onChange={event => setPrice(event.target.value)} /></label><label className="text-sm">Included services or response notes<textarea className={`${inputClass} mt-1`} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label><div className="flex flex-wrap gap-2"><button className={buttonClass}>Save demo quote</button><button type="button" className={secondaryClass} onClick={() => respond("declined")}>Decline in demo</button></div></form>
    <div className="mt-5 border-t ui-border pt-4">{existing ? <button className={secondaryClass} onClick={() => openEvent(existing)}>Open tentative event</button> : <><p className="mb-3 text-xs ui-muted">A tentative event flags availability conflicts. It does not confirm a customer booking.</p>{warnings.length > 0 && <p className="mb-3 text-sm ui-muted">{warnings.join(" ")}</p>}<button className={secondaryClass} disabled={!request.event.date} onClick={() => { save({ ...state, events: [...state.events, proposed] }, "Inquiry added as a tentative event. No booking confirmed."); }}>Add tentative calendar event</button>{!request.event.date && <p className="mt-2 text-xs ui-muted">A customer event date is needed before adding it to the calendar.</p>}</>}<Link className="mt-4 block text-sm underline" href={`/requests/${request.id}`}>View customer request workspace</Link></div>{error && <p role="alert" className="mt-3 text-sm">{error}</p>}
  </article>;
}
