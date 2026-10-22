import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { ListingRecord, ClaimRecord } from "./listingsRepository";
export type BusinessMatch = ListingRecord & {
  score: number;
  location_name?: string;
};
export type Evidence = {
  id: string;
  claim_id: string;
  method: string;
  status: string;
  identity_confirmed: boolean;
  authority_confirmed: boolean;
  location_scope: string;
  source_reference: string;
  note: string;
  expires_at: string;
  reviewed_by: string | null;
};
export type Membership = {
  id: string;
  vendor_id: string;
  profile_id: string | null;
  email: string;
  role: string;
  status: string;
  expires_at: string | null;
};
export type TrustWorkspace = {
  actor_id: string;
  businesses: ListingRecord[];
  claims: (ClaimRecord & {
    business_name: string;
    verification_status: string;
    official_domain: string | null;
    review_message: string | null;
    location_scope: string;
  })[];
  evidence: Evidence[];
  memberships: Membership[];
};
export type AdminTrust = {
  evidence: Evidence[];
  memberships: Membership[];
  audit: {
    id: string;
    vendor_id: string;
    action: string;
    note: string;
    created_at: string;
  }[];
  access: {
    id: string;
    vendor_id: string;
    profile_id: string;
    note: string;
    status: string;
  }[];
};
export async function trustOperation<T>(
  operation: string,
  payload: Record<string, Json | undefined> = {},
): Promise<T> {
  const { data, error } = await createBrowserSupabaseClient().rpc(
    "trust_operation",
    { operation, payload },
  );
  if (error) throw new Error(error.message);
  return data as T;
}
export async function findBusinessMatches(
  payload: Record<string, Json | undefined>,
): Promise<BusinessMatch[]> {
  const { data, error } = await createBrowserSupabaseClient().rpc(
    "business_matches",
    { payload },
  );
  if (error) throw new Error(error.message);
  return data as BusinessMatch[];
}
