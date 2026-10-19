import type { QuoteStatus } from "../types/domain";
export function requestStatus(
  status: QuoteStatus,
  booked = false,
  vendor = false,
  revision = 0,
) {
  if (booked) return "Booked";
  switch (status) {
    case "pending":
      return vendor ? "New inquiry" : "Request sent";
    case "sent":
      return revision > 1
        ? "Updated quote"
        : vendor
          ? "Quote sent"
          : "Quote received";
    case "countered":
      return "Updated quote";
    case "accepted":
      return "Offer ready to confirm";
    case "declined":
      return "Provider declined";
    case "cancelled":
      return "Request withdrawn";
    case "expired":
      return "Request expired";
    default:
      return "Request";
  }
}
export function actionableQuote(status: QuoteStatus, booked = false) {
  return !booked && ["sent", "countered", "accepted"].includes(status);
}
export function requestPriority(
  status: QuoteStatus,
  booked: boolean,
  needsReply: boolean,
  vendor = false,
) {
  if (["declined", "cancelled", "expired"].includes(status)) return 3;
  if (
    needsReply ||
    (!booked && (vendor ? status === "pending" : actionableQuote(status)))
  )
    return 0;
  return booked ? 2 : 1;
}
export function validateMessage(body: string) {
  const value = body.trim();
  if (!value || value.length > 4000)
    throw new Error("Enter a message between 1 and 4000 characters.");
  return value;
}
export function legacyRequestNote(body: string | null) {
  return !!body && /\nDate: .+\nLocation: .+\nGuests: /.test(body);
}
