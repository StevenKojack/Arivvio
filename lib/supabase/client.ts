import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Reuse auth storage and listeners within a browser tab. Never share a server client.
let browserClient: SupabaseClient<Database> | undefined;

export function hasSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "PROJECT_URL_HERE" &&
      supabaseUrl.startsWith("https://"),
  );
}

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (typeof window !== "undefined" && browserClient) return browserClient;
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  if (typeof window !== "undefined") browserClient = client;
  return client;
}
