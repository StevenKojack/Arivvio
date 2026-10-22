"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  trustOperation,
  type AdminTrust,
} from "@/lib/repositories/businessTrustRepository";
import type { ListingWorkspace } from "@/lib/repositories/listingsRepository";
export function BusinessVerificationReview({
  workspace,
  onChanged,
}: {
  workspace: ListingWorkspace;
  onChanged: () => void;
}) {
  const [reviewTime] = useState(() => Date.now());
  const [data, setData] = useState<AdminTrust | null>(null),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    trustOperation<AdminTrust>("admin")
      .then((r) => {
        if (live) setData(r);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  async function act(op: string, payload: Record<string, string | boolean>) {
    setBusy(true);
    try {
      await trustOperation(op, payload);
      setMessage("Review saved.");
      setRevision((x) => x + 1);
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save review.");
    } finally {
      setBusy(false);
    }
  }
  function form(
    e: FormEvent<HTMLFormElement>,
    op: string,
    payload: Record<string, string | boolean>,
  ) {
    e.preventDefault();
    void act(op, {
      ...Object.fromEntries(
        Array.from(new FormData(e.currentTarget), ([k, v]) => [k, String(v)]),
      ),
      ...payload,
    });
  }
  const field = "mt-1 w-full rounded-lg border p-3 ui-surface";
  return (
    <div className="mt-5 space-y-6">
      <p>
        Review business identity and this claimant’s authority for the specific
        location separately. Domain association alone is not management
        authority.
      </p>
      {message && (
        <p role="status" className="rounded-xl ui-soft p-4">
          {message}
        </p>
      )}
      {workspace.claims.map((c) => {
        const v = workspace.listings.find((v) => v.id === c.vendor_id);
        const evidence =
          data?.evidence.filter((e) => e.claim_id === c.id) ?? [];
        const eligible = evidence.some(
          (e) =>
            e.status === "passed" &&
            e.identity_confirmed &&
            e.authority_confirmed &&
            e.reviewed_by &&
            Date.parse(e.expires_at) > reviewTime,
        );
        return (
          <article key={c.id} className="hub-card space-y-4 p-5">
            <h3 className="text-xl font-semibold">
              {v?.business_name} · {v?.location_name || v?.service_area_city}
            </h3>
            <p>
              {v?.base_address} · {v?.website_url} · {v?.phone}
            </p>
            <p>
              Business: {v?.verification_status}. Claim: {c.status}. Claimant:{" "}
              {c.claimant_email} · {c.relationship}
            </p>
            <p>Requested location: {c.location_scope}</p>
            <p>{c.verification_note}</p>
            <p className="text-sm">
              Other pending claims:{" "}
              {
                workspace.claims.filter(
                  (x) =>
                    x.vendor_id === c.vendor_id &&
                    x.id !== c.id &&
                    x.status === "pending",
                ).length
              }
            </p>
            {workspace.sources
              .filter((s) => s.vendor_id === c.vendor_id)
              .map((s) => (
                <p key={s.id} className="break-all text-sm">
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
            <details>
              <summary className="cursor-pointer font-semibold">
                Record independent business identity
              </summary>
              <form
                onSubmit={(e) =>
                  form(e, "identity", { vendor_id: c.vendor_id })
                }
                className="mt-4 space-y-3"
              >
                <label className="block">
                  Independently confirmed website
                  <input
                    name="website_url"
                    type="url"
                    defaultValue={v?.website_url ?? ""}
                    className={field}
                  />
                </label>
                <label className="block">
                  Independently sourced public phone
                  <input
                    name="phone"
                    defaultValue={v?.official_phone ?? ""}
                    className={field}
                  />
                </label>
                <label className="block">
                  Factual source URL
                  <input
                    name="source_url"
                    type="url"
                    required
                    defaultValue={v?.identity_source_url ?? ""}
                    className={field}
                  />
                </label>
                <label className="block">
                  Public registration reference, if known
                  <input name="registration_reference" className={field} />
                </label>
                <label className="block">
                  What the source establishes
                  <textarea
                    name="note"
                    required
                    minLength={10}
                    maxLength={2000}
                    className={field}
                  />
                </label>
                <button className="hub-button" disabled={busy}>
                  Save independently checked identity
                </button>
              </form>
            </details>
            {c.status === "pending" && (
              <>
                <details>
                  <summary className="cursor-pointer font-semibold">
                    Record verification evidence
                  </summary>
                  <form
                    onSubmit={(e) =>
                      form(e, "evidence", {
                        claim_id: c.id,
                        identity_confirmed: true,
                        authority_confirmed: true,
                      })
                    }
                    className="mt-4 space-y-3"
                  >
                    <label className="block">
                      Method
                      <select name="method" className={field}>
                        <option value="public_phone">
                          Public business phone callback
                        </option>
                        <option value="public_record">
                          Public record and authority review
                        </option>
                        <option value="domain_email">
                          Passed domain email plus location authority review
                        </option>
                      </select>
                    </label>
                    <label className="block">
                      Source reference or exact recorded callback number
                      <input
                        name="source_reference"
                        required
                        defaultValue={v?.official_phone ?? ""}
                        className={field}
                      />
                    </label>
                    <label className="block">
                      Authorized location
                      <input
                        name="location_scope"
                        required
                        defaultValue={
                          c.location_scope ?? v?.service_area_city ?? ""
                        }
                        className={field}
                      />
                    </label>
                    <label className="block">
                      Evidence, person/title reached, date and how authority was
                      confirmed
                      <textarea
                        name="note"
                        required
                        minLength={15}
                        maxLength={2000}
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <input required type="checkbox" /> I confirmed the
                      business identity and this account’s authority for this
                      location. A registry entry or email domain alone does not
                      establish authority.
                    </label>
                    <button disabled={busy} className="hub-button">
                      Record verified evidence
                    </button>
                  </form>
                </details>
                <form
                  onSubmit={(e) =>
                    form(e, "review", {
                      claim_id: c.id,
                      decision: "needs_more_information",
                    })
                  }
                  className="space-y-3"
                >
                  <label className="block">
                    Review note or specific next step
                    <textarea
                      name="note"
                      required
                      minLength={10}
                      maxLength={2000}
                      className={field}
                    />
                  </label>
                  <button disabled={busy} className="hub-button">
                    Request more information
                  </button>
                </form>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={busy || !eligible}
                    className="hub-primary disabled:opacity-50"
                    onClick={() =>
                      void act("review", {
                        claim_id: c.id,
                        decision: "approved",
                      })
                    }
                  >
                    Approve evidence-backed claim
                  </button>
                  <button
                    disabled={busy}
                    className="hub-button"
                    onClick={() =>
                      void act("review", {
                        claim_id: c.id,
                        decision: "rejected",
                        note: "Claim rejected after authority review. Contact ARIVVIO for details.",
                      })
                    }
                  >
                    Reject claim
                  </button>
                </div>
                {!eligible && (
                  <p className="text-sm">
                    Approval requires unexpired evidence of business identity
                    and claimant authority.
                  </p>
                )}
              </>
            )}
            {c.status !== "pending" && (
              <button
                className="hub-button"
                disabled={busy}
                onClick={() =>
                  void act("reopen", {
                    claim_id: c.id,
                    note: "Reopened for fresh identity and specific location authority evidence",
                  })
                }
              >
                Reopen verification review
              </button>
            )}
            {evidence.map((e) => (
              <p key={e.id} className="rounded-lg ui-soft p-3 text-sm">
                {e.method} · {e.status} · Authority{" "}
                {e.authority_confirmed ? "confirmed" : "awaiting review"} ·{" "}
                {e.location_scope}
                <br />
                {e.source_reference}
                <br />
                {e.note}
              </p>
            ))}
            <form
              onSubmit={(e) => form(e, "state", { vendor_id: c.vendor_id })}
              className="space-y-3"
            >
              <label className="block">
                Business control
                <select name="status" className={field}>
                  <option value="disputed">Mark disputed</option>
                  <option value="suspended">Suspend management</option>
                  <option value="needs_more_information">
                    Return to review
                  </option>
                </select>
              </label>
              <label className="block">
                Reason
                <textarea
                  name="note"
                  required
                  minLength={10}
                  maxLength={2000}
                  className={field}
                />
              </label>
              <button className="hub-button" disabled={busy}>
                Apply control
              </button>
            </form>
            {data?.memberships
              .filter(
                (m) => m.vendor_id === c.vendor_id && m.status !== "revoked",
              )
              .map((m) => (
                <div key={m.id} className="flex flex-wrap gap-3">
                  <span>
                    {m.email} · {m.role} · {m.status}
                  </span>
                  <button
                    className="hub-button"
                    disabled={busy}
                    onClick={() =>
                      void act("revoke", {
                        vendor_id: c.vendor_id,
                        id: m.id,
                        note: "Admin revoked management access",
                      })
                    }
                  >
                    Revoke member access
                  </button>
                </div>
              ))}
            <details>
              <summary>Verification audit history</summary>
              {data?.audit
                .filter((a) => a.vendor_id === c.vendor_id)
                .map((a) => (
                  <p key={a.id} className="mt-2 text-sm">
                    {a.created_at} · {a.action} · {a.note}
                  </p>
                ))}
            </details>
          </article>
        );
      })}
      {!workspace.claims.length && <p>No business claims submitted.</p>}
      <h3 className="text-xl font-semibold">Access and dispute requests</h3>
      {data?.access.map((a) => (
        <div key={a.id} className="hub-card p-4">
          {workspace.listings.find((v) => v.id === a.vendor_id)?.business_name}{" "}
          · {a.status}
          <br />
          {a.note}
          <br />
          Requesting profile: {a.profile_id}
          {a.status === "pending" && (
            <form onSubmit={(e) => form(e, "close_access", { vendor_id: a.vendor_id, id: a.id })} className="mt-3 space-y-3">
              <label className="block">Review outcome
                <textarea name="note" required minLength={10} maxLength={2000} className={field} />
              </label>
              <button className="hub-button" disabled={busy}>Close access request</button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
