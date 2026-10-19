import type { PublicTableRow } from "@/lib/supabase/database.types";

export function buildMarketplaceHrefForEvent(event: PublicTableRow<"events">) {
  const params = new URLSearchParams({
    budget: String(event.budget_max ?? 0),
    date: event.date ?? "",
    event: event.event_type,
    eventId: event.id,
    guests: String(event.guest_count ?? 0),
    time: event.start_time?.slice(0, 5) ?? "",
  });

  return `/marketplace?${params.toString()}`;
}
