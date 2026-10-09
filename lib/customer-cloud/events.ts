import type { ArivvioSupabaseClient } from "../repositories/types";
import { ensureCurrentProfile } from "../repositories/profilesRepository";
import type { EventIntelligenceProfile } from "../event-intelligence/types";
import { eventFields } from "./profile";

export async function saveLocalEventToAccount(
  client: ArivvioSupabaseClient,
  profile: EventIntelligenceProfile,
) {
  if (!profile.eventId)
    throw new Error("Save your browser draft before importing it.");
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user || user.is_anonymous)
    throw new Error("Sign in to save this event to your account.");
  const owner = await ensureCurrentProfile(client, user);
  const lookup = () =>
    client
      .from("events")
      .select("*")
      .eq("planner_id", owner.id)
      .eq("source_event_id", profile.eventId!)
      .maybeSingle();
  const existing = await lookup();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data; // Explicit handoff never overwrites an existing cloud event.
  const id = crypto.randomUUID();
  const { data, error } = await client
    .from("events")
    .insert({
      ...eventFields({ ...profile, eventId: id }),
      id,
      planner_id: owner.id,
      source_event_id: profile.eventId,
      status: "planning",
    })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const retry = await lookup();
    if (retry.data) return retry.data;
  }
  if (error) throw error;
  return data;
}

export async function updateCloudEvent(
  client: ArivvioSupabaseClient,
  profile: EventIntelligenceProfile,
  revision: number,
) {
  if (!profile.eventId) throw new Error("No account event selected.");
  const { data, error } = await client
    .from("events")
    .update(eventFields(profile))
    .eq("id", profile.eventId)
    .eq("profile_revision", revision)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "This event changed or is no longer editable. Reload it before applying your changes.",
    );
  return data;
}

export async function removeCloudEvent(
  client: ArivvioSupabaseClient,
  eventId: string,
  action: "delete" | "cancel",
) {
  const { data, error } = await client.rpc("manage_customer_event", {
    target_event: eventId,
    operation: action,
  });
  if (error) throw error;
  return data;
}
