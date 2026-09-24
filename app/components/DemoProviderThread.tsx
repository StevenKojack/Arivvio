"use client";
import { useEffect, useState } from "react";
import { appendDemoMessage, loadDemoQuoteRequests, type DemoQuoteRequest, type DemoOpportunity } from "@/lib/event-intelligence/demo-quotes";
export function DemoProviderThread({ request, opportunity, sender = "customer" }: { request: DemoQuoteRequest; opportunity: DemoOpportunity; sender?: "customer" | "vendor" }) {
  const [item, setItem] = useState(opportunity);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const refresh = () => { const next = loadDemoQuoteRequests().find(r => r.id === request.id)?.opportunities.find(o => o.id === opportunity.id); if (next) setItem(next); };
    queueMicrotask(refresh);
    window.addEventListener("arivvio:customer-changed", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("arivvio:customer-changed", refresh); window.removeEventListener("storage", refresh); };
  }, [request.id, opportunity.id]);
  return <details className="mt-5 border-t ui-border pt-4"><summary className="cursor-pointer font-semibold text-sm">Messages with {opportunity.providerName} ({item.thread?.length ?? 0})</summary>
    <p className="my-3 text-xs leading-5 ui-muted">{request.event.name} · Request {request.id.slice(-8)} · {opportunity.service}. Browser-only demo conversation. Nothing is delivered externally.</p>
    <div className="max-h-80 space-y-3 overflow-y-auto" aria-label={`Conversation with ${opportunity.providerName}`}>
      {request.message && <div className="rounded-xl ui-soft p-3"><p className="text-xs font-semibold">Customer · Original request</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.message}</p></div>}
      {item.response && !item.thread?.some(m => m.at === item.response?.at) && <div className="rounded-xl ui-soft p-3"><p className="text-xs font-semibold">{opportunity.providerName} · Demo response</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.response.note || item.response.status}</p></div>}
      {item.thread?.map(message => <div key={message.id} className="rounded-xl ui-soft p-3"><p className="text-xs font-semibold">{message.sender === "customer" ? "Customer" : opportunity.providerName} · {new Date(message.at).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.text}</p></div>)}
      {!item.thread?.length && !request.message && !item.response && <p className="text-sm ui-muted">No messages yet. Add a question or planning detail.</p>}
    </div>
    <form className="mt-4" onSubmit={event => { event.preventDefault(); try { appendDemoMessage(request.id, item.id, sender, text, sender === "vendor" ? "49" : undefined); setText(""); setError(""); setNotice("Message saved in this browser. Not sent externally."); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save message."); } }}>
      <label className="text-sm">{sender === "vendor" ? "Demo vendor reply" : "Your message"}<textarea className="hub-input mt-2 min-h-24 w-full" required maxLength={2000} value={text} onChange={event => setText(event.target.value)} /></label><button className="hub-button mt-3">Save demo message</button>
    </form>{notice && <p role="status" className="mt-2 text-xs ui-muted">{notice}</p>}{error && <p role="alert" className="mt-2 text-sm">{error}</p>}
  </details>;
}
