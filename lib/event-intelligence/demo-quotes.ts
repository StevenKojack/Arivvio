import type { EventIntelligenceProfile } from "./types";

export type DemoQuoteRequest = {
  id: string;
  version: 1;
  source: "ARIVVIO_DEMO";
  status: "demo-created";
  createdAt: string;
  eventId?: string;
  event: { name: string; date: string; startTime: string; endTime: string; location: string; guestCount: number; budget: number; requirements: string; profile: EventIntelligenceProfile | null };
  opportunities: { id: string; providerId: string; providerName: string; service: string; startTime: string; endTime: string; estimate: number; stageIds: string[]; status: "demo-not-sent"; response?: { status: "quoted" | "declined"; price?: number; note: string; at: string }; reviewedAt?: string }[];
  message: string;
};
const key = "arivvio:demo-quote-requests:v1";
export function loadDemoQuoteRequests(): DemoQuoteRequest[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter((item) => item.version === 1 && item.source === "ARIVVIO_DEMO") : []; } catch { return []; }
}
export function saveDemoQuoteRequest(request: DemoQuoteRequest) {
  const previous = loadDemoQuoteRequests();
  // Retrying the same submission must not create another opportunity.
  window.localStorage.setItem(key, JSON.stringify([request, ...previous.filter((item) => item.id !== request.id)].slice(0, 30)));
}

export type DemoOpportunity = DemoQuoteRequest["opportunities"][number];
export function updateDemoOpportunity(requestId: string, opportunityId: string, update: (item: DemoOpportunity) => DemoOpportunity) {
  const request = loadDemoQuoteRequests().find(item => item.id === requestId);
  if (!request || !request.opportunities.some(item => item.id === opportunityId)) throw new Error("This request is no longer saved in this browser.");
  const next = { ...request, opportunities: request.opportunities.map(item => item.id === opportunityId ? update(item) : item) };
  saveDemoQuoteRequest(next);
  return next;
}
export function respondToDemoOpportunity(requestId: string, opportunityId: string, providerId: string, response: NonNullable<DemoOpportunity["response"]>) {
  if (response.status === "quoted" && (!Number.isFinite(response.price) || response.price! < 0)) throw new Error("Enter a valid demo quote amount.");
  return updateDemoOpportunity(requestId, opportunityId, item => {
    if (item.providerId !== providerId) throw new Error("This inquiry belongs to another provider.");
    return { ...item, response, reviewedAt: undefined };
  });
}
export function opportunityStatus(item: DemoOpportunity) {
  return item.response?.status === "declined" ? "Declined in demo" : item.response?.status === "quoted" ? item.reviewedAt ? "Demo quote reviewed" : "Demo quote ready" : "Demo request saved · Not sent";
}
