export function searchTerm(input: string) {
  // Keep user input out of PostgREST's filter grammar and wildcard syntax.
  return input
    .slice(0, 120)
    .replace(/[^\p{L}\p{N}\s'’&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export type ClaimSearchListing = {
  id: string;
  business_name: string;
  category: string;
  service_area_city: string | null;
  owner_id: string | null;
};
export function mergeListings(
  previous: ClaimSearchListing[],
  incoming: ClaimSearchListing[],
) {
  return [
    ...new Map([...previous, ...incoming].map((row) => [row.id, row])).values(),
  ].sort(
    (a, b) =>
      a.business_name.localeCompare(b.business_name) ||
      a.id.localeCompare(b.id),
  );
}
export function claimDestination(listing: ClaimSearchListing) {
  return listing.owner_id
    ? "/vendor/login"
    : `/business/${listing.id}?mode=claim`;
}
