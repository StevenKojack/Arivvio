"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { trustOperation } from "@/lib/repositories/businessTrustRepository";
export function AccessRequest({ vendorId }: { vendorId: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await trustOperation("access", {
        vendor_id: vendorId,
        note: String(new FormData(e.currentTarget).get("note") ?? ""),
      });
      setMessage(
        "Access request submitted for review. No ownership or management access has changed.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mt-4">
      <summary className="cursor-pointer underline">
        I believe I should have access
      </summary>
      <p className="mt-3 text-sm">
        Ask the owner to invite your confirmed account email, or send ARIVVIO an
        access or ownership dispute request.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block">
          Your role, location and reason for access
          <textarea
            name="note"
            minLength={10}
            maxLength={2000}
            required
            className="mt-1 w-full rounded-xl border p-3 ui-surface"
          />
        </label>
        <button disabled={busy} className="hub-button">
          Submit access request
        </button>
        <Link
          className="ml-3 underline"
          href={`/auth/login?next=${encodeURIComponent(`/business/${vendorId}?mode=claim`)}`}
        >
          Sign in
        </Link>
      </form>
      {message && (
        <p role="status" className="mt-3">
          {message}
        </p>
      )}
    </details>
  );
}
