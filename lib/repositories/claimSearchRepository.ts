import type { ArivvioSupabaseClient } from "./types";
import {
  mergeListings,
  searchTerm,
  type ClaimSearchListing,
} from "../public-navigation/claim-search";
const fields = "id,business_name,category,service_area_city,owner_id";
const pageSize = 20;
export async function searchClaimListings(
  client: ArivvioSupabaseClient,
  input: string,
  page = 0,
) {
  const term = searchTerm(input);
  if (!term) return { listings: [] as ClaimSearchListing[], hasMore: false };
  const pattern = `*${term}*`;
  const start = Math.max(0, page) * pageSize;
  // Search businesses and active services independently; published-only filters
  // apply even when an owner/admin session can read additional private records.
  const [businesses, services] = await Promise.all([
    client
      .from("vendor_businesses")
      .select(fields)
      .eq("approval_status", "approved")
      .or(
        `business_name.ilike.${pattern},service_area_city.ilike.${pattern},category.ilike.${pattern}`,
      )
      .order("business_name")
      .order("id")
      .range(start, start + pageSize),
    client
      .from("vendor_services")
      .select("vendor_id")
      .eq("active", true)
      .or(`service_name.ilike.${pattern},category.ilike.${pattern}`)
      .order("vendor_id")
      .order("id")
      .range(start, start + pageSize),
  ]);
  if (businesses.error || services.error)
    throw new Error("We couldn’t search the directory. Please try again.");
  const vendorIds = [
    ...new Set(
      (services.data ?? []).slice(0, pageSize).map((row) => row.vendor_id),
    ),
  ];
  let serviceBusinesses: ClaimSearchListing[] = [];
  if (vendorIds.length) {
    const result = await client
      .from("vendor_businesses")
      .select(fields)
      .eq("approval_status", "approved")
      .in("id", vendorIds);
    if (result.error)
      throw new Error("We couldn’t search the directory. Please try again.");
    serviceBusinesses = result.data ?? [];
  }
  return {
    listings: mergeListings(
      (businesses.data ?? []).slice(0, pageSize),
      serviceBusinesses,
    ),
    hasMore:
      (businesses.data?.length ?? 0) > pageSize ||
      (services.data?.length ?? 0) > pageSize,
  };
}
