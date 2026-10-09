"use client";
import Link from "next/link";
import { useState } from "react";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";
import {
  loadEventIntelligenceProfile,
  saveEventIntelligenceProfile,
} from "@/lib/event-intelligence/storage";
import { saveLocalEventToAccount } from "@/lib/customer-cloud/events";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { CustomerDialog } from "./CustomerDialog";
export function SaveEventToAccount({
  profile,
}: {
  profile: EventIntelligenceProfile;
}) {
  return <SaveEventAccountForm key={profile.eventId ?? profile.recognition.identity.selectedDisplayEvent} profile={profile} />;
}
function SaveEventAccountForm({profile}:{profile:EventIntelligenceProfile}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!hasSupabaseConfig())
        throw new Error(
          "Account saving is not connected yet. Your browser event remains safe.",
        );
      let draft = profile;
      if (!draft.eventId) {
        saveEventIntelligenceProfile(draft);
        draft = loadEventIntelligenceProfile() ?? draft;
      }
      const row = await saveLocalEventToAccount(
        createBrowserSupabaseClient(),
        draft,
      );
      setSaved(row.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="hub-button" onClick={() => setOpen(true)}>
        Save this event to your account
      </button>
      {open && (
        <CustomerDialog
          title="Save event to your account"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p className="text-lg font-semibold">
            {profile.recognition.identity.selectedDisplayEvent}
          </p>
          <p className="my-4 text-sm ui-muted">
            Save this plan, including its stages and preferences, to your
            signed-in account. Browser demo requests and simulated conversations
            stay in the demo. Repeating this action opens the existing account
            event without overwriting it.
          </p>
          {saved ? (
            <Link className="hub-primary" href={`/events/${saved}`}>
              Open your account event
            </Link>
          ) : (
            <button
              className="hub-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Confirm save to my account"}
            </button>
          )}
          {error && (
            <p className="mt-3 text-sm" role="alert">
              {error}
            </p>
          )}
          <Link className="ml-4 text-sm underline" href="/auth/login">
            Sign in
          </Link>
        </CustomerDialog>
      )}
    </>
  );
}
