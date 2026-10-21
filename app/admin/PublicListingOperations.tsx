"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { allServices, eventTypes } from "@/app/data/marketplace";
import {
  listingOperation,
  type ListingWorkspace,
  type ListingRecord,
  leadLabel,
} from "@/lib/repositories/listingsRepository";
const blank = {
  id: "",
  business_name: "",
  category: "DJ",
  description: "",
  city: "",
  address: "",
  website_url: "",
  phone: "",
  email: "",
  source_url: "",
  source_type: "official website",
  source_note: "",
  supported_fields: "business name, category, city",
  tags: "",
  event_types: [] as string[],
  publish: false,
};
export function PublicListingOperations({ section }: { section: string }) {
  const [data, setData] = useState<ListingWorkspace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [draft, setDraft] = useState(blank),
    [step, setStep] = useState(0),
    [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    listingOperation<ListingWorkspace>("admin")
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  async function act(
    op: string,
    payload: Parameters<typeof listingOperation>[1],
  ) {
    setBusy(true);
    setError("");
    try {
      await listingOperation(op, payload);
      setRevision((x) => x + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function edit(v: ListingRecord) {
    setDraft({
      ...blank,
      id: v.id,
      business_name: v.business_name,
      category: v.category,
      description: v.description ?? "",
      city: v.service_area_city ?? "",
      address: v.base_address ?? "",
      website_url: v.website_url ?? "",
      phone: v.phone ?? "",
      email: v.email ?? "",
      publish: v.approval_status === "approved",
      event_types:
        data?.services.find((s) => s.vendor_id === v.id)
          ?.event_types_supported ?? [],
      tags:
        data?.tags
          .filter((t) => t.vendor_id === v.id)
          .map((t) => t.tag)
          .join(", ") ?? "",
    });
    setStep(0);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await act("save_listing", {
      ...draft,
      id: draft.id || undefined,
      supported_fields: draft.supported_fields
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: draft.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (ok) {
      setDraft(blank);
      setStep(0);
    }
  }
  const field = "mt-1 w-full rounded-lg border ui-border ui-surface p-3";
  const input = (key: keyof typeof blank, label: string, type = "text") => (
    <label className="block" key={key}>
      {label}
      <input
        type={type}
        value={String(draft[key])}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        className={field}
      />
    </label>
  );
  const business = (id: string) => data?.listings.find((v) => v.id === id);
  return (
    <section className="rounded-2xl border ui-border ui-surface p-5">
      <h2 className="text-2xl font-semibold">{section}</h2>
      {error && (
        <p role="alert" className="my-4">
          {error}
        </p>
      )}
      {!data ? (
        <p className="mt-4">
          {error ? "Unable to load operations." : "Loading operations..."}
        </p>
      ) : (
        <>
          {section === "Public Listings" && (
            <>
              <form onSubmit={save} className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Business",
                    "Services",
                    "Area",
                    "Sources",
                    "Preview / Publish",
                  ].map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-current={step === i ? "step" : undefined}
                      className={`rounded-lg border px-3 py-2 text-sm ${step === i ? "ui-primary" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {step === 0 && (
                  <>
                    {input("business_name", "Business name")}
                    {input("website_url", "Business website", "url")}
                    {input("phone", "Public business phone", "tel")}
                    {input("email", "Public business email", "email")}
                    <label className="block">
                      Original ARIVVIO summary
                      <textarea
                        className={field}
                        rows={4}
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {step === 1 && (
                  <>
                    <label className="block">
                      Service category
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          setDraft({ ...draft, category: e.target.value })
                        }
                        className={field}
                      >
                        {allServices.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    {input(
                      "tags",
                      "Supported specialties and languages, comma separated",
                    )}
                    <p className="text-sm ui-muted">
                      Select only event types supported by your sources. Leave
                      unknown details blank.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {eventTypes.map((e) => (
                        <label key={e} className="text-sm">
                          <input
                            type="checkbox"
                            checked={draft.event_types.includes(e)}
                            onChange={(x) =>
                              setDraft({
                                ...draft,
                                event_types: x.target.checked
                                  ? [...draft.event_types, e]
                                  : draft.event_types.filter((t) => t !== e),
                              })
                            }
                          />{" "}
                          {e}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    {input("city", "Known service city")}
                    {input("address", "Public address, when appropriate")}
                    <p className="text-sm ui-muted">
                      No radius, coordinates, capacity or availability will be
                      invented.
                    </p>
                  </>
                )}
                {step === 3 && (
                  <>
                    {input("source_url", "Source URL", "url")}
                    {input("source_type", "Source type")}
                    {input(
                      "supported_fields",
                      "Fields supported by this source, comma separated",
                    )}
                    {input("source_note", "Internal source note")}
                    <p className="text-sm ui-muted">
                      Record factual information only. Add new sources when
                      correcting a listing. Existing provenance is retained.
                    </p>
                    {data.sources
                      .filter((s) => s.vendor_id === draft.id)
                      .map((s) => (
                        <p key={s.id} className="break-words text-sm">
                          <a
                            href={s.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {s.source_url}
                          </a>{" "}
                          · {s.supported_fields.join(", ")}
                        </p>
                      ))}
                  </>
                )}
                {step === 4 && (
                  <div className="rounded-xl ui-soft p-5">
                    <h3 className="text-xl font-semibold">
                      {draft.business_name || "Business name"}
                    </h3>
                    <p>
                      {draft.category} ·{" "}
                      {draft.city || "Service area not confirmed"}
                    </p>
                    <p className="mt-3">{draft.description}</p>
                    <p className="mt-3">
                      Contact for pricing. Availability not confirmed.
                    </p>
                    <label className="mt-4 block">
                      <input
                        type="checkbox"
                        checked={draft.publish}
                        onChange={(e) =>
                          setDraft({ ...draft, publish: e.target.checked })
                        }
                      />{" "}
                      Publish as an unclaimed public listing
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={busy || !draft.business_name.trim()}
                    className="rounded-lg ui-primary px-4 py-3 disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : draft.publish
                        ? "Save and publish"
                        : "Save internal draft"}
                  </button>
                  {step < 4 && (
                    <button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="rounded-lg border px-4 py-3"
                    >
                      Continue
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(blank);
                      setStep(0);
                    }}
                    className="px-3"
                  >
                    New listing
                  </button>
                </div>
              </form>
              <div className="mt-8 space-y-3">
                {data.listings
                  .filter((v) => !v.owner_id)
                  .map((v) => (
                    <article key={v.id} className="rounded-xl border p-4">
                      <h3 className="font-semibold">{v.business_name}</h3>
                      <p className="text-sm">
                        {v.approval_status === "approved"
                          ? "Public"
                          : "Internal draft"}{" "}
                        · {v.category}
                      </p>
                      <div className="mt-3 flex gap-4">
                        <button onClick={() => edit(v)} className="underline">
                          Edit
                        </button>
                        <Link className="underline" href={`/business/${v.id}`}>
                          View listing
                        </Link>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {section === "Claims" && (
            <div className="mt-5 space-y-4">
              {!data.claims.length && <p>No claims awaiting review.</p>}
              {data.claims.map((c) => (
                <article key={c.id} className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    {business(c.vendor_id)?.business_name}
                  </h3>
                  <p className="text-sm">
                    {c.status} · {c.created_at.slice(0, 10)}
                  </p>
                  <p>
                    {c.claimant_email} · {c.relationship}
                  </p>
                  <p>
                    {c.business_email} · {c.business_phone}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {c.verification_note}
                  </p>
                  {data.sources
                    .filter((s) => s.vendor_id === c.vendor_id)
                    .map((s) => (
                      <p key={s.id} className="mt-2 break-words text-sm">
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {s.source_url}
                        </a>{" "}
                        · {s.supported_fields.join(", ")}
                      </p>
                    ))}
                  {c.status === "pending" && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {["approved", "rejected"].map((status) => (
                        <button
                          disabled={busy}
                          key={status}
                          className="rounded-lg border px-4 py-2"
                          onClick={() => {
                            if (
                              confirm(
                                status === "approved"
                                  ? "Have you verified ownership? Approve this claim and grant access to the existing listing?"
                                  : "Reject this ownership claim?",
                              )
                            )
                              void act("review_claim", { id: c.id, status });
                          }}
                        >
                          {status === "approved"
                            ? "Approve verified claim"
                            : "Reject claim"}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {section === "Leads" && (
            <div className="mt-5 space-y-4">
              {!data.leads.length && <p>No concierge leads yet.</p>}
              {data.leads.map((l) => {
                const v = business(l.vendor_id);
                return (
                  <article key={l.id} className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      {v?.business_name} · {l.event_title}
                    </h3>
                    <p className="text-sm">
                      {l.event_date || "Date not set"} · {l.event_city} ·{" "}
                      {l.service_name || "General inquiry"} · {l.stage_label}{" "}
                      {l.requested_start_time} {l.requested_end_time}
                    </p>
                    <p className="mt-2 text-sm">Customer: {l.planner_email}</p>
                    <p className="text-sm">
                      Business contact: {v?.phone} {v?.email}
                    </p>
                    {v?.website_url && (
                      <a
                        className="text-sm underline"
                        href={v.website_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Business website
                      </a>
                    )}
                    <p className="mt-3 whitespace-pre-wrap">
                      {l.customer_note}
                    </p>
                    <p className="mt-3 font-medium">{leadLabel(l.status)}</p>
                    {data.notes
                      .filter((n) => n.lead_id === l.id)
                      .map((n) => (
                        <p key={n.id} className="mt-2 text-sm ui-muted">
                          {n.created_at.slice(0, 10)}: {n.note}
                        </p>
                      ))}
                    {!["converted", "closed", "withdrawn"].includes(
                      l.status,
                    ) && (
                      <>
                        <label className="mt-3 block text-sm">
                          Internal outreach note
                          <textarea
                            value={notes[l.id] ?? ""}
                            onChange={(e) =>
                              setNotes({ ...notes, [l.id]: e.target.value })
                            }
                            maxLength={4000}
                            className={field}
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            "contacted",
                            "interested",
                            "declined",
                            "unreachable",
                            "closed",
                          ].map((status) => (
                            <button
                              key={status}
                              disabled={busy}
                              className="rounded-lg border px-3 py-2 text-sm"
                              onClick={() =>
                                void act("update_lead", {
                                  id: l.id,
                                  status,
                                  note: notes[l.id] ?? "",
                                })
                              }
                            >
                              Mark {status}
                            </button>
                          ))}
                          {v?.owner_id &&
                            !["declined", "unreachable"].includes(l.status) && (
                              <button
                                disabled={busy}
                                className="rounded-lg ui-primary px-3 py-2"
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Hand this lead to the verified business using the customer's original event and note?",
                                    )
                                  )
                                    void act("handoff", { id: l.id });
                                }}
                              >
                                Hand off lead
                              </button>
                            )}
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
