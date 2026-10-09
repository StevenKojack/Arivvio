import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "../supabase/client";
import { getEventWorkspace } from "../repositories/eventsRepository";
import { profileFromEvent } from "./profile";
import { updateCloudEvent } from "./events";
import type { EventIntelligenceProfile } from "../event-intelligence/types";
let loadGeneration = 0;
let current: {
  id: string;
  profile: EventIntelligenceProfile;
  revision: number;
  readOnly: boolean;
  status: string;
} | null = null;
export function cloudEventId(path: string) {
  if (
    typeof window === "undefined" ||
    path.startsWith("/account/demo") ||
    path.startsWith("/requests")
  )
    return null;
  return (
    path.match(/^\/events\/([^/]+)$/)?.[1] ??
    new URLSearchParams(window.location?.search ?? "").get("eventId")
  );
}
export function cloudAssistantEvent(path: string) {
  const id = cloudEventId(path);
  if (!id) return null;
  return current?.id === id
    ? {
        key: `cloud:${id}`,
        profile: current.profile,
        readOnly: current.readOnly,
        status: current.status,
      }
    : {
        key: `cloud:${id}`,
        profile: null,
        readOnly: true,
        status: "Account event not loaded. Sign in to access it.",
      };
}
export async function loadCloudAssistantEvent(path: string) {
  const generation = ++loadGeneration;
  const id = cloudEventId(path);
  current = null;
  if (!id || !hasSupabaseConfig()) return;
  const client = createBrowserSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return;
  const workspace = await getEventWorkspace(client, id);
  const { data: owner } = await client
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (generation !== loadGeneration) return;
  current = {
    id,
    profile: profileFromEvent(workspace.event),
    revision: workspace.event.profile_revision,
    readOnly:
      owner?.id !== workspace.event.planner_id ||
      ["cancelled", "completed"].includes(workspace.event.status),
    status:
      workspace.quotes
        .slice(0, 20)
        .map((q) => `Request ${q.id}: ${q.status}`)
        .join(", ") +
      `. ${workspace.bookings.length} bookings. No payment is collected here.`,
  };
  window.dispatchEvent(new Event("arivvio:profile-changed"));
}
export async function saveConfirmedCloudProfile(
  path: string,
  profile: EventIntelligenceProfile,
) {
  const id = cloudEventId(path);
  if (!id || current?.id !== id || current.readOnly)
    throw new Error("This account event is not editable.");
  if (profile.eventId !== id) throw new Error("The proposed changes belong to another event.");
  const target = current;
  const generation = loadGeneration;
  const row = await updateCloudEvent(
    createBrowserSupabaseClient(),
    { ...profile, eventId: id },
    target.revision,
  );
  if (generation !== loadGeneration || current !== target) return;
  current = {
    ...target,
    profile: profileFromEvent(row),
    revision: row.profile_revision,
  };
  window.dispatchEvent(
    new CustomEvent("arivvio:cloud-event-changed", { detail: row }),
  );
  window.dispatchEvent(new Event("arivvio:profile-changed"));
}
