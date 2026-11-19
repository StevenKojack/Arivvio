"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CustomerDialog } from "../components/CustomerDialog";
import { loadCustomerEvents } from "@/lib/customer-demo/events";
import { saveAssistantProfile } from "@/lib/assistant/session";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/repositories/profilesRepository";
import { inquiryReturnKey } from "@/lib/acquisition/activation";
import type { MarketplaceItem } from "../data/marketplace";
import type { EventIntelligenceProfile } from "@/lib/event-intelligence/types";

export function businessPath(item: MarketplaceItem) {
  return (
    "/business/" +
    item.vendorId +
    "?" +
    new URLSearchParams({ mode: "request", serviceId: item.serviceId ?? "" })
  );
}
export function demoQuote(id: string, profile: EventIntelligenceProfile) {
  const p = profile.planning;
  const params = new URLSearchParams({
    mode: "demo",
    workspace: "1",
    entryMode: "browse",
    quoteDemo: id,
    eventProfile: "session",
    eventLabel: profile.eventType.value,
  });
  for (const [key, value] of Object.entries({
    guests: p?.guestCount,
    budget: p?.budget,
    location: p?.location,
    date: p?.date,
    time: p?.startTime,
    event: profile.recognition.profile.marketplaceEventType,
  })) {
    if (value) params.set(key, String(value));
  }
  return "/marketplace?" + params;
}
export function BookVendor({
  item,
  currentEvent,
}: {
  item: MarketplaceItem;
  currentEvent?: string;
}) {
  const [open, setOpen] = useState(false),
    [existing, setExisting] = useState(false);
  return (
    <>
      <button
        className="solid"
        onClick={() => {
          setExisting(false);
          setOpen(true);
        }}
      >
        Book vendor
      </button>
      {open && (
        <CustomerDialog
          title="Are you planning an event?"
          onClose={() => setOpen(false)}
        >
          <div className="booking-options">
            <p>
              {item.businessName || item.name} ·{" "}
              {item.serviceTitle || item.type}
            </p>
            {existing ? (
              <EventChoices item={item} currentEvent={currentEvent} />
            ) : (
              <button className="solid" onClick={() => setExisting(true)}>
                I already have an event
              </button>
            )}
            <Link
              className="hub-button"
              href={
                "/plan?" +
                new URLSearchParams(
                  item.databaseSource
                    ? {
                        business: item.vendorId!,
                        service: item.serviceId ?? "",
                      }
                    : { vendor: String(item.id) },
                )
              }
            >
              Help me plan one
            </Link>
            <button onClick={() => setOpen(false)}>I’m just exploring</button>
          </div>
        </CustomerDialog>
      )}
    </>
  );
}
function EventChoices({
  item,
  currentEvent,
}: {
  item: MarketplaceItem;
  currentEvent?: string;
}) {
  const router = useRouter();
  const [local] = useState(loadCustomerEvents);
  const [rows, setRows] = useState<{ id: string; title: string }[]>([]),
    [status, setStatus] = useState("Loading account events…");
  useEffect(() => {
    if (!item.databaseSource) return;
    let live = true;
    async function load() {
      if (!hasSupabaseConfig()) throw Error("Account access is unavailable.");
      const client = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user || user.is_anonymous)
        throw Error("Sign in to choose your account event.");
      const owner = await getCurrentProfile(client, user);
      if (!owner)
        throw Error("An account profile is required to choose an event.");
      const { data, error } = await client
        .from("events")
        .select("id,title")
        .eq("planner_id", owner.id)
        .not("status", "in", "(cancelled,completed)");
      if (error) throw error;
      if (live) {
        setRows(data ?? []);
        setStatus(
          data?.length ? "Choose your event" : "No active account events yet.",
        );
      }
    }
    load().catch((e) => {
      if (live) setStatus(e.message);
    });
    return () => {
      live = false;
    };
  }, [item.databaseSource]);
  if (item.databaseSource) {
    const dest = businessPath(item);
    return (
      <>
        <p role="status">{status}</p>
        {rows.map((e) => (
          <Link
            key={e.id}
            className="hub-button"
            href={
              item.listingState === "claimed" && item.serviceId
                ? "/marketplace?entryMode=event&eventId=" +
                  e.id +
                  "&requestService=" +
                  item.serviceId
                : dest + "&eventId=" + e.id
            }
          >
            {e.title}
            {currentEvent === e.id ? " · Current event" : ""}
          </Link>
        ))}
        {status.startsWith("Sign in") && (
          <Link
            href={"/auth/login?next=" + encodeURIComponent(dest)}
            onClick={() => sessionStorage.setItem(inquiryReturnKey, dest)}
          >
            Sign in
          </Link>
        )}
      </>
    );
  }
  const eligible = local.filter((e) => e.profile);
  return (
    <>
      <p>
        {eligible.length
          ? "Choose a draft saved on this device"
          : "No event drafts on this device yet."}
      </p>
      {eligible.map((e) => (
        <button
          className="hub-button"
          key={e.id}
          onClick={() => {
            saveAssistantProfile(e.profile!);
            router.push(demoQuote(String(item.id), e.profile!));
          }}
        >
          {e.name} {e.date}
        </button>
      ))}
    </>
  );
}
