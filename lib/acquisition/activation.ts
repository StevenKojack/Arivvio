export type ReadinessBusiness = {
  id: string;
  owner_id: string | null;
  verification_status?: string;
  verified_at?: string | null;
  approval_status: string;
  description: string | null;
  service_area_city: string | null;
  vacation_mode?: boolean;
};
export function vendorReadiness(
  b: ReadinessBusiness,
  services: { vendor_id: string; active: boolean }[],
) {
  const authority =
    !!b.owner_id &&
    b.verification_status === "verified" &&
    !!b.verified_at &&
    b.approval_status === "approved";
  const profile = !!b.description?.trim() && !!b.service_area_city?.trim();
  const service = services.some((s) => s.vendor_id === b.id && s.active);
  return {
    authority,
    profile,
    service,
    ready: authority && profile && service && !b.vacation_mode,
  };
}
export const outreachStates = [
  "not_contacted",
  "contact_planned",
  "contacted",
  "follow_up_needed",
  "interested",
  "not_interested",
] as const;
export type OutreachState = (typeof outreachStates)[number];
export type ContactAttempt = {
  id: string;
  vendor_id: string;
  contacted_at: string;
  channel: string;
  outcome: OutreachState;
  note: string;
  follow_up_on: string | null;
  actor_id: string;
  lead_id: string | null;
};
export type ActivationRow = ReadinessBusiness & {
  business_name: string;
  location_name: string | null;
  category: string;
  base_address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  phone: string | null;
  state: OutreachState;
  follow_up_on: string | null;
  suppressed: boolean;
  pending_claims: number;
  ready: boolean;
  attempts: ContactAttempt[];
};
export function nextActivationAction(b: ActivationRow) {
  if (b.suppressed) return "Do not contact";
  if (b.pending_claims) return "Review verification evidence";
  if (b.verification_status === "verified")
    return b.ready ? "Open inquiries" : "Complete vendor profile";
  if (b.owner_id) return "Complete business verification";
  if (b.state === "not_interested") return "No outreach planned";
  if (b.state === "interested") return "Help business claim its listing";
  if (b.follow_up_on) return "Review follow-up";
  return b.attempts.length ? "Plan next contact" : "Prepare outreach";
}
export function inActivationQueue(
  b: ActivationRow,
  queue: string,
  today: string,
) {
  if (queue === "all") return true;
  if (b.suppressed) return false;
  if (queue === "due")
    return (
      !!b.follow_up_on &&
      b.follow_up_on <= today &&
      b.state !== "not_interested"
    );
  if (queue === "interested") return b.state === "interested";
  if (queue === "claims") return b.pending_claims > 0;
  if (queue === "activation")
    return b.verification_status === "verified" && !b.ready;
  return (
    !b.owner_id &&
    !b.pending_claims &&
    ["not_contacted", "contact_planned"].includes(b.state)
  );
}
export function confirmedMapMatch(
  match: {
    isFallback: boolean;
    placeType: string;
    coordinates: { lat: number; lng: number };
  },
  confirmed: boolean,
) {
  return (
    confirmed &&
    !match.isFallback &&
    match.placeType === "address" &&
    Number.isFinite(match.coordinates.lat) &&
    Number.isFinite(match.coordinates.lng) &&
    Math.abs(match.coordinates.lat) <= 90 &&
    Math.abs(match.coordinates.lng) <= 180
  );
}
export const inquiryReturnKey = "arivvio:inquiry-return";
export function inquiryReturnPath(value: string | null, eventId: string) {
  if (!value || !/^\/business\/[0-9a-f-]{36}(\?|$)/i.test(value)) return null;
  const url = new URL(value, "https://www.arivvio.com");
  url.searchParams.set("eventId", eventId);
  url.searchParams.set("mode", "request");
  return url.pathname + url.search;
}
