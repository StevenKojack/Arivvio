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

export async function activationOperation<T>(operation:string,payload:unknown={}):Promise<T>{
 const {data,error}=await createBrowserSupabaseClient().rpc("activation_operation",{operation,payload:payload as Json});
 if(error)throw new Error(error.message);return data as T;
}

export async function mediaOperation<T>(operation:string,payload:unknown={}):Promise<T>{
 const {data,error}=await createBrowserSupabaseClient().rpc("media_operation",{operation,payload:payload as Json});
 if(error)throw new Error(error.message);return data as T;
}
