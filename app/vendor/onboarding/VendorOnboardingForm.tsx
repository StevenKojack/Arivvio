"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ClaimSearch } from "@/app/claim-business/ClaimSearch";
import {
  trustOperation,
  type BusinessMatch,
} from "@/lib/repositories/businessTrustRepository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import { AuthorityFields } from "../verification/AuthorityFields";
export function VendorOnboardingForm() {
  const [creating, setCreating] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [matches, setMatches] = useState<BusinessMatch[]>([]);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    try {
      const client = createBrowserSupabaseClient();
      const { data } = await client.auth.getUser();
      if (!data.user) {
        router.push("/auth/login?next=/vendor/onboarding");
        return;
      }
      await ensureCurrentProfile(client, data.user);
      const r = await trustOperation<{
        matches?: BusinessMatch[];
        vendor_id?: string;
      }>("candidate", values);
      if (r.matches) {
        setMatches(r.matches);
        setMessage(
          "We found businesses that may match yours. Choose the correct listing, or explain why yours is separate.",
        );
        return;
      }
      router.push("/vendor/verification");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to save application.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <ClaimSearch />
      {!creating ? (
        <button className="hub-primary mt-6" onClick={() => setCreating(true)}>
          None of these are my business. Create a new business
        </button>
      ) : (
        <form className="hub-card mt-8 space-y-5 p-6" onSubmit={submit}>
          <h2 className="text-2xl font-semibold">
            Create a business candidate
          </h2>
          <p className="text-sm ui-muted">
            Your draft stays private until ARIVVIO confirms the business and
            your authority. You can finish your profile while review is pending.
            Do not submit personal IDs or financial documents.
          </p>
          {Object.entries({
            business_name: "Business name",
            location_name: "Specific location or branch",
            city: "City",
            address: "Public business address",
            postal_code: "Postal code",
            category: "Category or service",
            website_url: "Official website",
            phone: "Public business phone",
          }).map(([key, label]) => (
            <label key={key} className="block">
              {label}
              <input
                name={key}
                required={["business_name", "city", "category"].includes(key)}
                maxLength={300}
                type={key === "website_url" ? "url" : "text"}
                className="mt-1 w-full rounded-xl border p-3 ui-surface"
              />
            </label>
          ))}
          <label className="block">
            Business description
            <textarea
              name="description"
              maxLength={2000}
              className="mt-1 w-full rounded-xl border p-3 ui-surface"
            />
          </label>
          <AuthorityFields />
          {matches.length > 0 && (
            <div className="space-y-4 rounded-xl ui-soft p-4">
              <h3 className="font-semibold">Possible existing matches</h3>
              {matches.map((m) => (
                <p key={m.id}>
                  {m.business_name} · {m.service_area_city} · {m.base_address} ·{" "}
                  {m.website_url}
                  <br />
                  <Link
                    className="underline"
                    href={
                      m.owner_id
                        ? "/vendor/login"
                        : `/business/${m.id}?mode=claim`
                    }
                  >
                    {m.owner_id
                      ? "Already managed. Vendor sign in"
                      : "This is my business. Claim existing listing"}
                  </Link>
                </p>
              ))}
              <label className="block">
                None of these are my business. Explain the separate business or
                location.
                <textarea
                  required
                  minLength={10}
                  name="separate_reason"
                  maxLength={2000}
                  className="mt-1 w-full rounded-xl border p-3 ui-surface"
                />
              </label>
            </div>
          )}
          <button className="hub-primary" disabled={busy}>
            {busy ? "Saving…" : "Save candidate and continue verification"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-5 rounded-xl ui-soft p-4">
          {message}
        </p>
      )}
    </div>
  );
}
