import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
export async function acquisitionOperation<T>(
  operation: string,
  payload: unknown = {},
): Promise<T> {
  const { data, error } = await createBrowserSupabaseClient().rpc(
    "acquisition_operation",
    { operation, payload: payload as Json },
  );
  if (error) throw new Error(error.message);
  return data as T;
}
