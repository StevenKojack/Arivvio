import type { EventIntelligenceProfile } from "./types";

const storageKey = "arivvio:event-intelligence";

export function saveEventIntelligenceProfile(profile: EventIntelligenceProfile) {
  if (typeof window === "undefined") return;
  const existing = loadEventIntelligenceProfile();
  const eventId = profile.eventId ?? (existing?.plannerIntent?.rawText === profile.plannerIntent.rawText ? existing.eventId : undefined) ?? crypto.randomUUID();
  const serialized = JSON.stringify({ ...profile, eventId });
  window.sessionStorage.setItem(storageKey, serialized);
  window.localStorage.setItem(storageKey, serialized);
  window.dispatchEvent(new Event("arivvio:profile-changed"));
}

export function loadEventIntelligenceProfile() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(storageKey) ?? window.localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored) as EventIntelligenceProfile;
  } catch {
    return null;
  }
}
