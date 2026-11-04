"use client";
import { ProfileSections } from "@/app/components/ProfileSections";
import { OfficialBusinessWork } from "@/app/components/OfficialBusinessWork";
import { BusinessMark } from "@/app/components/BusinessMark";
import { representativePhoto } from "@/lib/marketplace/vendorImages";
import Image from "next/image";
import type {PublicTableRow} from "@/lib/supabase/database.types";
import Link from "next/link";
import {BusinessStatusBadge} from "@/app/components/BusinessStatusBadge";
import {inquiryReturnKey} from "@/lib/acquisition/activation";
import {AccessRequest} from "@/app/vendor/verification/AccessRequest";
import {AuthorityFields} from "@/app/vendor/verification/AuthorityFields";
import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  listingOperation,
  type ListingRecord,
  type ClaimRecord,
} from "@/lib/repositories/listingsRepository";
export function BusinessListing({
  id,
  initialEventId,
  initialServiceId,
  initialMode,
}: {
  id: string;
  initialEventId?: string;
  initialServiceId?: string;
  initialMode?: string;
}) {
  const [eventId, setEventId] = useState(initialEventId ?? ""),
    [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [photos,setPhotos]=useState<PublicTableRow<"vendor_photos">[]>([]);
  const [listing, setListing] = useState<ListingRecord | null>(null),
    [signedIn, setSignedIn] = useState(false),
    [events, setEvents] = useState<{ id: string; title: string }[]>([]),
    [services, setServices] = useState<PublicTableRow<"vendor_services">[]>(
      [],
    ),
    [mode, setMode] = useState(initialMode === "claim" ? "claim" : "request"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [claim, setClaim] = useState<ClaimRecord | null>(null);
  useEffect(() => {
    let live = true;
    const client = createBrowserSupabaseClient();
    (async () => {
      const [business, serviceRows, auth, media] = await Promise.all([
        client.from("vendor_businesses").select("*").eq("id", id).single(),
        client
          .from("vendor_services")
          .select("*")
          .eq("vendor_id", id)
          .eq("active", true),
        client.auth.getUser(),
        client.from("vendor_photos").select("*").eq("vendor_id",id).eq("media_status","approved").order("sort_order").order("id"),
      ]);
      if (business.error) throw business.error;
      if (!live) return;
      setPhotos(media.data ?? []);
      setListing(business.data);
      setServices(serviceRows.data ?? []);
      setSignedIn(!!auth.data.user);
      if (auth.data.user) {
        const [ev, mine] = await Promise.all([
          client
            .from("events")
            .select("id,title")
            .not("status", "in", "(cancelled,completed)"),
          listingOperation<{ claims: ClaimRecord[] }>("mine"),
        ]);
        if (!live) return;
        if (ev.error) throw ev.error;
        setEvents(ev.data ?? []);
        setClaim(
          mine.claims.find(
            (c) => c.vendor_id === id && c.status === "pending",
          ) ?? null,
        );
      }
    })().catch((e) => {
      if (live) setMessage(e.message ?? "Listing unavailable.");
    });
    return () => {
      live = false;
    };
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    try {
      if (mode === "claim") {
        const c = await listingOperation<ClaimRecord>("claim", {
          ...values,
          vendor_id: id,
        });
        setClaim(c);
        setMessage(
          "Claim submitted. ARIVVIO will review ownership before granting access.",
        );
      } else {
        await listingOperation("lead", { ...values, vendor_id: id });
        setMessage(
          "ARIVVIO is reviewing your request and may reach out. Your request is saved in your account.",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }
  const field = "mt-1 w-full rounded-lg border ui-border ui-surface p-3";
  const next = new URLSearchParams({
    mode,
    ...(eventId ? { eventId } : {}),
    ...(serviceId ? { serviceId } : {}),
  });
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-12">
      <Link href={initialMode === "claim" ? "/claim-business" : "/marketplace"} className="text-sm underline">
        {initialMode === "claim" ? "Back to business search" : "Back to Marketplace"}
      </Link>
      {!listing ? (
        <p className="mt-6" role="status">
          {message || "Loading business..."}
        </p>
      ) : (
        <>
          {!photos.some(p=>p.media_kind==="business_photo")&&<figure className="relative mt-6 overflow-hidden rounded-2xl"><Image src={representativePhoto(listing.category,listing.description||"")} alt="Representative event photograph" width={800} height={360} unoptimized className="aspect-[2.65] w-full object-cover"/><figcaption className="cover-caption">AI-generated representative photo</figcaption></figure>}
          <div className="mt-5 flex items-center gap-3">{!photos.some(p=>p.media_kind==="logo")&&<BusinessMark name={listing.business_name}/>}<BusinessStatusBadge item={{databaseSource:true,listingState:listing.owner_id?"claimed":"unclaimed",verificationStatus:listing.verification_status}}/></div>
          <h1 className="mt-2 text-3xl font-semibold">
            {listing.business_name}
          </h1>
          {photos.filter(p=>p.media_kind==="logo").slice(0,1).map(p=><figure key={p.id}><Image unoptimized src={p.image_url} alt={p.alt_text||"Business logo"} width={96} height={96} className="my-3 h-24 w-24 object-contain"/>{p.attribution&&<figcaption>{p.attribution}</figcaption>}</figure>)}
          {listing.short_intro&&<p className="mt-3 font-medium">{listing.short_intro}</p>}<p className="mt-3 whitespace-pre-line">{listing.description}</p><ProfileSections sections={listing.profile_sections}/>
          {(listing.email||listing.phone)&&<p className="mt-3 flex flex-wrap gap-4">{listing.phone&&<a href={"tel:"+listing.phone} className="underline">{listing.phone}</a>}{listing.email&&<a href={"mailto:"+listing.email} className="underline">{listing.email}</a>}</p>}
          {photos.some(p=>p.media_kind==="business_photo")&&<section aria-label="Business photos" className="my-4 grid grid-cols-2 gap-3">{photos.filter(p=>p.media_kind==="business_photo").map((p,i)=><figure key={p.id} className={i===0?"col-span-2":""}><Image src={p.image_url} alt={p.alt_text||"Business photo"} width={900} height={500} unoptimized className="aspect-video w-full rounded-xl object-cover"/>{p.attribution&&<figcaption>{p.attribution}</figcaption>}</figure>)}</section>}
          {services.length>0&&<details className="my-4"><summary>Services and pricing</summary>{services.map(s=><div key={s.id} className="mt-3"><strong>{s.service_name}</strong><p className="whitespace-pre-line">{s.description}</p><p>{s.pricing_type==="hourly"&&s.hourly_rate!=null?`$${s.hourly_rate} per hour`:s.base_price!=null?`$${s.base_price}${s.pricing_type==="per_guest"?" per guest":""}`:"Contact for pricing"}</p></div>)}</details>}
          <p className="mt-2 ui-muted">
            {listing.location_name} {listing.service_area_city || "Service area not confirmed"} {listing.base_address}
          </p>
          {listing.website_url && /^https?:\/\//.test(listing.website_url) && <p className="mt-3"><a href={listing.website_url} target="_blank" rel="noopener noreferrer" className="underline">Official business website</a></p>}
          <OfficialBusinessWork businessId={listing.id}/>
          {!listing.owner_id ? (
            <>
              <p className="mt-6 rounded-xl ui-soft p-4 text-sm">
                This business has not claimed its ARIVVIO profile. Pricing,
                availability and responses have not been confirmed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setMode("request")}
                  aria-pressed={mode === "request"}
                  className="hub-primary"
                >
                  Request through ARIVVIO
                </button>
                <button
                  onClick={() => setMode("claim")}
                  aria-pressed={mode === "claim"}
                  className="text-link px-2 py-3"
                >
                  Own this business? Claim this listing
                </button>
              </div>
              {!signedIn ? (
                <Link
                  className="mt-6 inline-block underline"
                  href={`/auth/login?next=${encodeURIComponent(`/business/${id}?${next}`)}`}
                >
                  {mode === "claim" ? "Sign in to claim this listing" : "Sign in to request through ARIVVIO"}
                </Link>
              ) : mode === "claim" && claim?.status === "pending" ? (
                <p className="mt-6">
                  Claim submitted. Your claim is awaiting review. <Link href="/vendor/verification" className="underline">Continue verification</Link>
                </p>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-5">
                  {mode === "request" ? (
                    <>
                      <p>
                        ARIVVIO will review your interest and may contact this business. A response is not guaranteed. This does not reserve a date or create a
                        booking.
                      </p>
                      <label className="block">
                        Your event
                        <select
                          name="event_id"
                          required
                          value={eventId}
                          onChange={(e) => setEventId(e.target.value)}
                          className={field}
                        >
                          <option value="">Choose an event</option>
                          {events.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!events.length && (
                        <Link href="/plan" onClick={()=>sessionStorage.setItem(inquiryReturnKey,`/business/${id}?mode=request${serviceId?`&serviceId=${encodeURIComponent(serviceId)}`:""}`)} className="underline">
                          Create or save an event to your account first.
                        </Link>
                      )}
                      <label className="block">
                        Service
                        <select
                          name="service_id"
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                          className={field}
                        >
                          <option value="">General inquiry</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.service_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        Event part, if relevant
                        <input
                          name="stage_label"
                          maxLength={120}
                          placeholder="For example, reception"
                          className={field}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label>
                          Start time
                          <input
                            type="time"
                            name="start_time"
                            className={field}
                          />
                        </label>
                        <label>
                          End time
                          <input
                            type="time"
                            name="end_time"
                            className={field}
                          />
                        </label>
                      </div>
                      <label className="block">
                        What would you like them to know?
                        <textarea
                          name="customer_note"
                          maxLength={4000}
                          rows={4}
                          className={field}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <AuthorityFields />
                    </>
                  )}
                  <button
                    disabled={busy || (mode === "request" && !events.length)}
                    className="rounded-lg ui-primary px-5 py-3 disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : mode === "claim"
                        ? "Submit claim"
                        : "Confirm concierge request"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="mt-6 space-y-4">
              <p>This business is already managed on ARIVVIO.</p><AccessRequest vendorId={id}/>
              <div className="flex flex-wrap gap-4"><Link className="hub-button" href="/vendor/login">Vendor sign in</Link><Link className="hub-button" href="/support-project">Contact ARIVVIO</Link></div>
              <Link href="/marketplace" className="underline">
                View services and request a quote in Marketplace.
              </Link>
            </div>
          )}
          {message && (
            <p role="status" className="mt-6 rounded-xl ui-soft p-4">
              {message}{" "}
              <Link href="/plan" onClick={()=>sessionStorage.setItem(inquiryReturnKey,`/business/${id}?mode=request${serviceId?`&serviceId=${encodeURIComponent(serviceId)}`:""}`)} className="underline">
                View your account
              </Link>
            </p>
          )}
          <Link
            href="/support-project"
            className="mt-8 inline-block text-sm underline"
          >
            Correct or remove this listing
          </Link>
        </>
      )}
    </main>
  );
}
