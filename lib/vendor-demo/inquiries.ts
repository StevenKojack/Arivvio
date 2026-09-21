import type { DemoQuoteRequest, DemoOpportunity } from "../event-intelligence/demo-quotes";
import type { VendorEvent } from "./model";

export function inquiryEvent(request: DemoQuoteRequest, opportunity: DemoOpportunity): VendorEvent {
  return {
    id: `inquiry:${opportunity.id}`, name: request.event.name, type: request.event.profile?.recognition?.identity?.selectedDisplayEvent ?? request.event.name,
    client: "Demo customer", date: request.event.date, start: opportunity.startTime, end: opportunity.endTime,
    location: request.event.location, service: opportunity.service, status: "Tentative", source: "ARIVVIO",
    notes: [`Demo request ${request.id.slice(-8)}. Not a confirmed booking.`, `${request.event.guestCount} guests. Overall budget $${request.event.budget}.`, request.event.requirements, request.message,
      ...(request.event.profile?.stages ?? []).filter(part => !opportunity.stageIds.length || opportunity.stageIds.includes(part.id)).map(part => `${part.label}: ${part.date || request.event.date} ${part.startTime || request.event.startTime}–${part.endTime || request.event.endTime}, ${part.location || request.event.location}`)].filter(Boolean).join("\n"),
    tasks: [], requestId: request.id,
  };
}
