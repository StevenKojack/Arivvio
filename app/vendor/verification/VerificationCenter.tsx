"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  trustOperation,
  type TrustWorkspace,
} from "@/lib/repositories/businessTrustRepository";
export function VerificationCenter() {
  const [data, setData] = useState<TrustWorkspace | null>(null),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    trustOperation<TrustWorkspace>("mine")
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
  async function act(op: string, payload: Record<string, string>) {
    setBusy(true);
    try {
      await trustOperation(op, payload);
      setMessage(
        "Saved. Your verification and team access status is shown below.",
      );
      setRevision((x) => x + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  function invite(e: FormEvent<HTMLFormElement>, vendor_id: string) {
    e.preventDefault();
    void act("invite", {
      vendor_id,
      ...Object.fromEntries(new FormData(e.currentTarget)),
    } as Record<string, string>);
  }
  return (
    <div className="mt-6 space-y-6">
      <p>
        Verify your authority for each business location. Account sign-in alone
        does not verify a business. Verification does not endorse service
        quality.
      </p>
      {message && (
        <p role="status" className="rounded-xl ui-soft p-4">
          {message}
        </p>
      )}
      {!data ? (
        <Link
          href="/auth/login?next=/vendor/verification"
          className="hub-button"
        >
          Sign in to continue
        </Link>
      ) : (
        <>
          {!data.claims.length && (
            <p>
              No business applications yet.{" "}
              <Link href="/vendor/onboarding" className="underline">
                Find your business
              </Link>
            </p>
          )}
          {data.claims.map((c) => (
            <section key={c.id} className="hub-card space-y-4 p-5">
              <h2 className="text-xl font-semibold">{c.business_name}</h2>
              <p>
                {c.status === "approved"
                  ? "Your business authority has been verified."
                  : c.status === "rejected"
                    ? "Application declined. Contact ARIVVIO if you need to discuss this decision."
                    : "Verification pending. We are reviewing your information."}
              </p>
              <p className="text-sm ui-muted">
                Location: {c.location_scope} · Role: {c.relationship}
              </p>
              {c.review_message && (
                <p className="rounded-lg ui-soft p-3">
                  Next step: {c.review_message}
                </p>
              )}
              {c.status === "pending" && (
                <>
                  <h3 className="font-semibold">Choose a verification path</h3>
                  <p className="text-sm">
                    Official-domain email: use a confirmed account email on the
                    independently recorded business domain. Our team must still
                    confirm your authority for this location.
                  </p>
                  <p className="text-sm">
                    Official domain:{" "}
                    {c.official_domain ||
                      "Awaiting independent ARIVVIO source review"}
                  </p>
                  <button
                    disabled={busy || !c.official_domain}
                    className="hub-button"
                    onClick={() => void act("domain_email", { claim_id: c.id })}
                  >
                    Check my account email
                  </button>
                  <p className="text-sm">
                    For Gmail or other personal email accounts, ARIVVIO can call
                    the independently sourced public business number or review
                    public records and your authority. No document upload
                    required.
                  </p>
                  <Link className="underline" href="/support-project">
                    Arrange manual verification or provide more information
                  </Link>
                </>
              )}
              {data.evidence
                .filter((e) => e.claim_id === c.id)
                .map((e) => (
                  <p key={e.id} className="text-sm">
                    {e.method.replaceAll("_", " ")}: {e.status}.{" "}
                    {e.authority_confirmed
                      ? "Location authority reviewed."
                      : "Location authority still requires review."}
                  </p>
                ))}
            </section>
          ))}
          {data.businesses.map((b) => (
            <section key={b.id} className="hub-card space-y-4 p-5">
              <h2 className="text-xl font-semibold">
                {b.business_name} · Team access
              </h2>
              <p>
                {b.verification_status?.replaceAll("_", " ") || "Unverified"}
              </p>
              <Link className="underline" href="/vendor/dashboard">
                Continue business profile
              </Link>
              {b.verification_status === "verified" && data.memberships.some(m=>m.vendor_id===b.id&&m.profile_id===data.actor_id&&m.status==="active"&&["owner","admin"].includes(m.role)) && (
                <form
                  onSubmit={(e) => invite(e, b.id)}
                  className="flex flex-wrap gap-3"
                >
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      name="email"
                      className="block rounded-lg border p-3 ui-surface"
                    />
                  </label>
                  <label>
                    Role
                    <select
                      name="role"
                      className="block rounded-lg border p-3 ui-surface"
                    >
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button className="hub-button" disabled={busy}>
                    Invite team member
                  </button>
                  <p className="w-full text-sm ui-muted">
                    Only verified owners and admins can invite. The invited
                    person signs in with that exact confirmed email and accepts
                    here. Invitations expire after seven days. No email is sent
                    automatically.
                  </p>
                </form>
              )}
              {data.memberships
                .filter((m) => m.vendor_id === b.id)
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-3 text-sm"
                  >
                    <span>
                      {m.email} · {m.role} · {m.status}
                    </span>
                    {m.role !== "owner" && m.status !== "revoked" && (
                      <button
                        className="hub-button"
                        disabled={busy}
                        onClick={() =>
                          void act("revoke", { vendor_id: b.id, id: m.id })
                        }
                      >
                        Revoke access
                      </button>
                    )}
                  </div>
                ))}
            </section>
          ))}
          {data.memberships
            .filter((m) => m.status === "invited")
            .map((m) => (
              <section key={m.id} className="hub-card p-5">
                <p>
                  Invitation for {m.email} as {m.role}
                </p>
                <button
                  disabled={busy}
                  className="hub-primary mt-3"
                  onClick={() => void act("accept_invite", { id: m.id })}
                >
                  Accept invitation with this account
                </button>
              </section>
            ))}
        </>
      )}
    </div>
  );
}
