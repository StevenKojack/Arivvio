"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  activationOperation as op,
  acquisitionOperation,
} from "@/lib/repositories/acquisitionRepository";
import {
  inActivationQueue,
  nextActivationAction,
  type ActivationRow,
} from "@/lib/acquisition/activation";
import { outreachMessage } from "@/lib/acquisition/research";
import type { ListingWorkspace } from "@/lib/repositories/listingsRepository";
import { ConfirmBusinessLocation } from "./ConfirmBusinessLocation";
import { ContactPreference } from "./ContactPreference";
const label = (v: string) => v.replaceAll("_", " ");
export function VendorActivationOperations({
  workspace,
  onChanged,
}: {
  workspace: ListingWorkspace;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ActivationRow[]>([]),
    [query, setQuery] = useState(""),
    [queue, setQueue] = useState("all"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function reload() {
    setRows(await op<ActivationRow[]>("list"));
  }
  useEffect(() => {
    let live = true;
    op<ActivationRow[]>("list")
      .then((r) => {
        if (live) setRows(r);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [workspace]);
  const today = new Date().toLocaleDateString("en-CA");
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await reload();
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to complete action");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="my-6 space-y-4"
      aria-label="Vendor activation operations"
    >
      <h3 className="text-xl font-semibold">Vendor activation</h3>
      <p className="text-sm ui-muted">
        Track actual manual contact. Claims and verification stay authoritative.
        Nothing here sends a message.
      </p>
      <p className="text-sm">
        {rows.length} businesses ·{" "}
        {rows.filter((b) => b.attempts.length).length} contacted ·{" "}
        {rows.filter((b) => b.state === "interested").length} interested ·{" "}
        {rows.filter((b) => inActivationQueue(b, "due", today)).length}{" "}
        follow-ups due ·{" "}
        {workspace.claims.filter((c) => c.status === "pending").length} pending
        claims ·{" "}
        {rows.filter((b) => b.verification_status === "verified").length}{" "}
        verified · {rows.filter((b) => b.ready).length} profiles ready for
        inquiries · {workspace.leads.length} concierge leads ·{" "}
        {
          workspace.leads.filter(
            (l) => l.status === "converted" && l.quote_request_id,
          ).length
        }{" "}
        converted
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          Find business
          <input
            className="hub-input w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Next action
          <select
            className="hub-input w-full"
            value={queue}
            onChange={(e) => setQueue(e.target.value)}
          >
            <option value="all">All businesses</option>
            <option value="contact">Ready for contact</option>
            <option value="due">Follow-ups due</option>
            <option value="interested">Interested</option>
            <option value="claims">Claims awaiting verification</option>
            <option value="activation">Verified, profile incomplete</option>
          </select>
        </label>
      </div>
      {message && <p role="status">{message}</p>}
      {rows
        .filter(
          (b) =>
            `${b.business_name} ${b.location_name ?? ""} ${b.service_area_city ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            inActivationQueue(b, queue, today),
        )
        .map((b) => (
          <ActivationBusiness
            key={b.id}
            business={b}
            workspace={workspace}
            busy={busy}
            run={run}
            onChanged={() => void run(async () => {})}
          />
        ))}
    </section>
  );
}
function ActivationBusiness({
  business: b,
  workspace,
  busy,
  run,
  onChanged,
}: {
  business: ActivationRow;
  workspace: ListingWorkspace;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
  onChanged: () => void;
}) {
  const [text, setText] = useState(""),
    [leadId, setLeadId] = useState(""),
    [retryKey, setRetryKey] = useState("");
  const leads = workspace.leads.filter((l) => l.vendor_id === b.id),
    publicListing = workspace.listings.find((l) => l.id === b.id);
  async function record(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const key = retryKey || crypto.randomUUID();
    setRetryKey(key);
    await run(async () => {
      await op("record_contact", {
        ...values,
        vendor_id: b.id,
        client_key: key,
        confirmed: values.confirmed === "on",
        contacted_at: new Date(String(values.contacted_at)).toISOString(),
      });
      setRetryKey("");
      form.reset();
    });
  }
  return (
    <details className="rounded-lg border ui-border p-4">
      <summary className="cursor-pointer font-semibold">
        {b.business_name} {b.location_name ? `· ${b.location_name}` : ""} ·{" "}
        {nextActivationAction(b)}
      </summary>
      <div className="mt-4 space-y-4">
        <p>
          Contact: {label(b.state)}. Claim:{" "}
          {b.pending_claims
            ? `${b.pending_claims} pending`
            : "No pending claim"}
          . Verification: {label(b.verification_status ?? "unverified")}.{" "}
          {b.follow_up_on && `Follow-up: ${b.follow_up_on}.`}
        </p>
        {b.suppressed && (
          <p role="status" className="font-semibold">
            Do not contact. Outreach and follow-up actions are blocked.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link className="underline" href={`/business/${b.id}`}>
            Open listing
          </Link>
          <Link className="underline" href="/admin#Claims">
            Review claims
          </Link>
          {b.website_url && (
            <a
              className="underline break-all"
              href={b.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official website
            </a>
          )}
          <button
            className="hub-button"
            onClick={() =>
              void run(async () => {
                await navigator.clipboard.writeText(
                  `${location.origin}/business/${b.id}?mode=claim`,
                );
              })
            }
          >
            Copy claim link
          </button>
        </div>
        <Link className="underline" href="/admin#Leads">Review concierge leads</Link>
        <p className="text-sm">Public phone: {b.phone || "Not recorded"}</p>
        <details>
          <summary>Sources</summary>
          {workspace.sources
            .filter((s) => s.vendor_id === b.id)
            .map((s) => (
              <p key={s.id}>
                <a
                  className="underline break-all"
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.source_url}
                </a>{" "}
                · Reviewed {s.reviewed_on || "Not recorded"}
              </p>
            ))}
        </details>
        {publicListing && (
          <ConfirmBusinessLocation
            business={publicListing}
            onSaved={onChanged}
          />
        )}
        <ContactPreference vendorId={b.id} onChanged={onChanged} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            void run(async () => {
              await op("plan", { ...values, vendor_id: b.id });
            });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label>
            Contact plan
            <select name="state" className="hub-input w-full">
              <option value="contact_planned">Contact planned</option>
              <option value="follow_up_needed">Follow-up needed</option>
            </select>
          </label>
          <label>
            Follow-up date
            <input
              type="date"
              name="follow_up_on"
              className="hub-input w-full"
            />
          </label>
          <button disabled={busy || b.suppressed} className="hub-button">
            Save plan only
          </button>
        </form>
        {!b.owner_id && (
          <>
            <label className="block">
              Outreach context
              <select
                className="hub-input w-full"
                value={leadId}
                onChange={(e) => {
                  setLeadId(e.target.value);
                  setText("");
                }}
              >
                <option value="">General invitation, no customer claim</option>
                {leads
                  .filter(
                    (l) =>
                      ![
                        "withdrawn",
                        "closed",
                        "converted",
                        "declined",
                      ].includes(l.status),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      Customer interest · {l.event_city || "Location unknown"} ·{" "}
                      {l.service_name || "General inquiry"}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={busy || b.suppressed}
              className="hub-button"
              onClick={() =>
                void run(async () => {
                  await acquisitionOperation("outreach", { vendor_id: b.id });
                  const context = leadId
                    ? await op<{
                        event_type: string;
                        city: string;
                        date: string;
                      }>("prepare_interest", {
                        vendor_id: b.id,
                        lead_id: leadId,
                      })
                    : null;
                  setText(
                    (context
                      ? `A customer planning a ${context.event_type || "private event"}${context.city ? ` in ${context.city}` : ""} expressed interest in your business through ARIVVIO.\n\n`
                      : "") +
                      outreachMessage(
                        b.business_name,
                        `${location.origin}/business/${b.id}?mode=claim`,
                      ).replace(
                        context
                          ? " No customer inquiry is implied by this invitation."
                          : "__no_replacement__",
                        "",
                      ),
                  );
                })
              }
            >
              Prepare editable outreach
            </button>
            {text && (
              <>
                <label className="block">
                  Outreach message
                  <textarea
                    className="hub-input w-full"
                    rows={9}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <button
                  disabled={busy || b.suppressed}
                  className="hub-button"
                  onClick={() =>
                    void run(async () => {
                      await acquisitionOperation("outreach", {
                        vendor_id: b.id,
                      });
                      if (leadId)
                        await op("prepare_interest", {
                          vendor_id: b.id,
                          lead_id: leadId,
                        });
                      await navigator.clipboard.writeText(text);
                    })
                  }
                >
                  Copy message, sends nothing
                </button>
              </>
            )}
          </>
        )}
        <details>
          <summary>Record actual manual contact</summary>
          <form onSubmit={record} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              Contact date and time
              <input
                required
                type="datetime-local"
                name="contacted_at"
                className="hub-input w-full"
              />
            </label>
            <label>
              Channel
              <select name="channel" className="hub-input w-full">
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="in_person">In person</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Outcome
              <select name="outcome" className="hub-input w-full">
                <option value="contacted">Contacted</option>
                <option value="follow_up_needed">Follow-up needed</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not interested</option>
              </select>
            </label>
            <label>
              Follow-up date
              <input
                type="date"
                name="follow_up_on"
                className="hub-input w-full"
              />
            </label>
            <label className="sm:col-span-2">
              Related concierge lead
              <select name="lead_id" className="hub-input w-full">
                <option value="">None</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.event_title} · {label(l.status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              Internal note
              <textarea
                required
                maxLength={2000}
                name="note"
                className="hub-input w-full"
              />
            </label>
            <label className="sm:col-span-2">
              <input type="checkbox" name="confirmed" required /> I confirm this
              contact actually occurred. Copying a message does not count.
            </label>
            <button disabled={busy || b.suppressed} className="hub-button">
              Record contact
            </button>
          </form>
        </details>
        <details>
          <summary>Contact history ({b.attempts.length})</summary>
          {!b.attempts.length && <p>No contact recorded.</p>}
          {b.attempts.map((a) => (
            <article key={a.id} className="my-3 border-t ui-border pt-3">
              <p>
                {new Date(a.contacted_at).toLocaleString()} · {label(a.channel)}{" "}
                · {label(a.outcome)}
              </p>
              <p className="whitespace-pre-wrap break-words">{a.note}</p>
              <p className="text-xs ui-muted">
                Recorded by Admin {a.actor_id}{" "}
                {a.follow_up_on && `· Follow-up ${a.follow_up_on}`}
              </p>
            </article>
          ))}
        </details>
      </div>
    </details>
  );
}
