import { buildEventIntelligenceProfile } from "../event-intelligence/engine";
import type { EventIntelligenceProfile } from "../event-intelligence/types";
import type { Json, PublicTableRow } from "../supabase/database.types";

export function profileFromEvent(
  event: PublicTableRow<"events">,
): EventIntelligenceProfile {
  const stored =
    event.event_profile as unknown as EventIntelligenceProfile | null;
  if (
    stored?.eventType?.value &&
    stored.plannerIntent &&
    Array.isArray(stored.stages)
  ) {
    return { ...stored, eventId: event.id };
  }
  return {
    ...buildEventIntelligenceProfile({
      query: event.event_type,
      planning: {
        date: event.date ?? "",
        startTime: event.start_time?.slice(0, 5) ?? "",
        endTime: event.end_time?.slice(0, 5) ?? "",
        location: event.address ?? event.city ?? "",
        guestCount: event.guest_count ?? 0,
        budget: event.budget_max ?? 0,
      },
    }),
    eventId: event.id,
  };
}

export function eventFields(profile: EventIntelligenceProfile) {
  if (
    !profile.eventType?.value ||
    !profile.plannerIntent ||
    !Array.isArray(profile.stages)
  )
    throw new Error("A complete event profile is required.");
  const p = profile.planning;
  const date =
    p?.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    !Number.isNaN(Date.parse(p.date))
      ? p.date
      : null;
  const time = (value?: string) =>
    value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
  return {
    event_type: profile.eventType.value,
    title:
      profile.recognition.identity.selectedDisplayEvent ||
      profile.eventType.value,
    event_profile: JSON.parse(JSON.stringify(profile)) as Json,
    date,
    start_time: time(p?.startTime),
    end_time: time(p?.endTime),
    address: p?.location || null,
    guest_count: p?.guestCount || profile.guestSize || null,
    budget_max: p?.budget || null,
    venue_needed: profile.venueRequired,
    subtype: profile.subtype?.value ?? null,
    culture: profile.cultures.join(", ") || null,
    religion: profile.religiousContext.join(", ") || null,
  };
}

export function eventGroup(
  event: Pick<PublicTableRow<"events">, "status" | "date">,
  today: string,
) {
  if (event.status === "cancelled") return "Cancelled";
  if (event.status === "completed" || (event.date && event.date < today))
    return "Past / completed";
  if (event.status === "draft" || !event.date) return "Still planning";
  return "Current / upcoming";
}
