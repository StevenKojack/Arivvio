import type { User } from "@supabase/supabase-js";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import { profileRoleForEmail } from "@/lib/auth/roles";
import type { ArivvioSupabaseClient } from "./types";

export async function getCurrentProfile(
  supabase: ArivvioSupabaseClient,
  user: User,
): Promise<PublicTableRow<"profiles"> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  supabase: ArivvioSupabaseClient,
  input: {
    email: string;
    fullName?: string | null;
    phone?: string | null;
    userId: string;
  },
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      email: input.email,
      full_name: input.fullName ?? null,
      phone: input.phone ?? null,
      role: profileRoleForEmail(input.email),
      user_id: input.userId,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureCurrentProfile(
  supabase: ArivvioSupabaseClient,
  user: User,
): Promise<PublicTableRow<"profiles">> {
  const existingProfile = await getCurrentProfile(supabase, user);

  if (existingProfile) {
    const { error } = await supabase.rpc("complete_legal_acceptance", {});
    if (error) throw error;
    return existingProfile;
  }

  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const profile = await upsertProfile(supabase, {
    email: user.email ?? "",
    fullName,
    phone: null,
    userId: user.id,
  });
  const { error } = await supabase.rpc("complete_legal_acceptance", {});
  if (error) throw error;
  return profile;
}
