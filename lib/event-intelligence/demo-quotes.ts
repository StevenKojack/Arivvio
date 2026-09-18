import type { EventIntelligenceProfile } from "./types";

export type DemoQuoteRequest = {
  id: string;
  version: 1;
  source: "ARIVVIO_DEMO";
  status: "demo-created";
  createdAt: string;
  eventId?: string;
  event: { name: string; date: string; startTime: string; endTime: string; location: string; guestCount: number; budget: number; requirements: string; profile: EventIntelligenceProfile | null };
  opportunities: { id: string; providerId: string; providerName: string; service: string; startTime: string; endTime: string; estimate: number; stageIds: string[]; status: "demo-not-sent" }[];
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
