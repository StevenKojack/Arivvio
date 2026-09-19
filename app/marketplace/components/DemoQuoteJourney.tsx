"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EventPartsSummary } from "@/app/discover/components/EventParts";
import { saveDemoQuoteRequest, type DemoQuoteRequest } from "@/lib/event-intelligence/demo-quotes";
import { formatTime } from "@/lib/utils/format";

export function DemoQuoteJourney({ request, alreadySubmitted = false, onClose, onSubmitted }: {
  request: DemoQuoteRequest; alreadySubmitted?: boolean; onClose: () => void; onSubmitted: (request: DemoQuoteRequest) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submittedRef = useRef(alreadySubmitted);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [message, setMessage] = useState(request.message);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const event = request.event;
  function submit() {
    if (submittedRef.current) return;
    const complete = { ...request, message };
    try { saveDemoQuoteRequest(complete); submittedRef.current = true; setSubmitted(true); onSubmitted(complete); }
    catch { setError("Your browser could not save this request. Free some browser storage and try again."); }
  }
  return <dialog ref={dialog} onCancel={onClose} aria-label={submitted ? "Demo request confirmation" : "Review quote request"} className="quote-journey ui-surface m-auto max-h-[92dvh] w-[min(740px,94vw)] overflow-y-auto rounded-3xl p-5 sm:p-7 backdrop:bg-black/50">
    <div className="quote-progress" aria-label="Request progress"><span>Select providers</span><span aria-current={!submitted ? "step" : undefined}>Review request</span><span aria-current={submitted ? "step" : undefined}>Demo confirmation</span></div>
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest ui-muted">{submitted ? "Saved in this browser" : "Request pricing"}</p><h2 className="mt-1 text-2xl font-semibold">{submitted ? "Your demo request is ready" : "Review your event and providers"}</h2></div><button className="hub-button" onClick={onClose}>Close</button></div>
    <p className="my-4 rounded-2xl ui-soft p-3 text-sm">{submitted ? "Demo request created. No vendors were contacted. This is an illustrative request, not a booking or confirmed price." : "No account required. Submitting saves a demo request in this browser only. No vendors will be contacted."}</p>
    {submitted && <p role="status" className="mb-4 text-sm">Status: Demo created · Reference {request.id.slice(-8)}</p>}
    <section className="hub-card p-4"><h3 className="font-semibold">{event.name}</h3><p className="mt-2 text-sm ui-muted">{event.date || "Date to confirm"} · {formatTime(event.startTime)} – {formatTime(event.endTime)}</p><p className="text-sm ui-muted">{event.location || "Location to confirm"}</p><p className="text-sm ui-muted">{event.guestCount} guests · ${event.budget.toLocaleString()} overall budget</p>{event.requirements && <p className="mt-2 text-sm ui-muted">{event.requirements}</p>}</section>
    <div className="my-4"><EventPartsSummary stages={event.profile?.stages ?? []} defaults={event} /></div>
    <section><h3 className="font-semibold">Selected providers & services</h3><ul className="mt-2 space-y-2">{request.opportunities.map((item) => <li key={item.id} className="quote-provider hub-card p-4 text-sm"><p className="font-semibold">{item.providerName} · {item.service}</p><p className="ui-muted">{formatTime(item.startTime)} – {formatTime(item.endTime)} · ${item.estimate.toLocaleString()} demo estimate</p><p className="ui-muted">{item.stageIds.length ? event.profile?.stages.filter((part) => item.stageIds.includes(part.id)).map((part) => part.label).join(" + ") : "Entire event"}</p>{submitted && <p className="mt-1 ui-muted">Demo only · Not sent</p>}</li>)}</ul></section>
    {submitted && message && <section className="mt-4 rounded-2xl ui-soft p-4"><h3 className="text-sm font-semibold">Your message</h3><p className="mt-2 whitespace-pre-wrap text-sm ui-muted">{message}</p></section>}
    {submitted ? <div className="mt-5 flex flex-wrap gap-2"><Link className="hub-button" href="/discover">View event</Link><Link className="hub-button" href="/discover">Continue planning</Link><button className="hub-button" onClick={onClose}>Return to Marketplace</button></div> : <><label className="mt-5 block text-sm font-medium">Optional message<textarea className="hub-input mt-2 min-h-24 w-full" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Anything else you would like providers to know?" /></label>{error && <p role="alert" className="mt-2 text-sm">{error}</p>}<div className="mt-5 flex flex-wrap gap-3"><button className="hub-button" onClick={onClose}>Edit selections</button><button className="rounded-full ui-primary px-5 py-3 font-semibold" onClick={submit}>Submit demo request</button></div></>}
  </dialog>;
}
