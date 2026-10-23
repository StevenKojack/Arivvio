import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
export type PrivacyRequest = { id: string; profile_id: string; request_type: string; status: string; details: string; response: string; created_at: string; reviewed_at: string | null; completed_at: string | null };
export type PrivacyQueue = { requests: PrivacyRequest[]; notes: { id: string; request_id: string; note: string; created_at: string }[] };
export async function privacyOperation<T>(operation: string, payload: Record<string, Json> = {}): Promise<T> {
 const {data,error}=await createBrowserSupabaseClient().rpc("privacy_operation",{operation,payload});
 if(error) throw new Error(error.message); return data as T;
}
