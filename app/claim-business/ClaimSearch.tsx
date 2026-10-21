"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { searchClaimListings } from "@/lib/repositories/claimSearchRepository";
import {
  claimDestination,
  mergeListings,
  searchTerm,
  type ClaimSearchListing,
} from "@/lib/public-navigation/claim-search";
export function ClaimSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ClaimSearchListing[]>([]);
  const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  async function search(value: string, nextPage = 0) {
    const version = ++request.current;
    const term = searchTerm(value);
    setError("");
    if (!term) {
      setBusy(false);
      setRows([]);
      setSearched(false);
      setHasMore(false);
      setError("Enter a business name, city or service to search.");
      return;
    }
    setBusy(true);
    if (!nextPage) {
      setRows([]);
      setSearched(false);
      setHasMore(false);
    }
    try {
      if (!hasSupabaseConfig())
        throw new Error(
          "Business search is unavailable right now. Please contact ARIVVIO or try again later.",
        );
      const result = await searchClaimListings(
        createBrowserSupabaseClient(),
        term,
        nextPage,
      );
      if (version !== request.current) return;
      setRows((previous) =>
        nextPage ? mergeListings(previous, result.listings) : result.listings,
      );
      setQuery(term);
      setPage(nextPage);
      setHasMore(result.hasMore);
      setSearched(true);
    } catch (e) {
      if (version === request.current)
        setError(
          e instanceof Error
            ? e.message
            : "Unable to search. Please try again.",
        );
    } finally {
      if (version === request.current) setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void search(input);
  }
  return (
    <div className="mt-8">
      <form onSubmit={submit} role="search" className="hub-card p-5 sm:p-6">
        <label htmlFor="claim-search" className="block font-semibold">
          Business name, city or service
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="claim-search"
            type="search"
            value={input}
            maxLength={120}
            onChange={(e) => setInput(e.target.value)}
            placeholder="For example, a business name or photography"
            className="min-w-0 flex-1 rounded-xl border ui-border ui-surface px-4 py-3"
          />
          <button className="hub-primary" type="submit" disabled={busy}>
            {busy ? "Searching…" : "Find my business"}
          </button>
        </div>
        <p className="mt-3 text-sm ui-muted">
          Search published business listings. Fictional Demo providers are not
          included.
        </p>
      </form>
      {error && (
        <p role="alert" className="mt-5 rounded-xl ui-soft p-4">
          {error}
        </p>
      )}
      <div aria-live="polite" aria-busy={busy}>
        {searched && (
          <h2 className="mb-5 mt-8 text-xl font-semibold">
            {rows.length
              ? `Businesses matching “${query}”`
              : `No businesses found for “${query}”`}
          </h2>
        )}
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="hub-card p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h3 className="break-words text-xl font-semibold">
                    {row.business_name}
                  </h3>
                  <p className="mt-2 text-sm ui-muted">
                    {row.category} ·{" "}
                    {row.service_area_city || "Location not confirmed"}
                  </p>
                  {row.owner_id && (
                    <p className="mt-3 text-sm ui-muted">
                      This business is already managed on ARIVVIO.
                    </p>
                  )}
                </div>
                <Link
                  href={claimDestination(row)}
                  className={
                    row.owner_id
                      ? "hub-button shrink-0"
                      : "hub-primary shrink-0"
                  }
                >
                  {row.owner_id ? "Vendor sign in" : "Claim this business"}
                </Link>
              </div>
              {row.owner_id && (
                <p className="mt-4 text-sm ui-muted">
                  Ownership doesn’t look right?{" "}
                  <Link className="underline" href="/support-project">
                    Contact ARIVVIO
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            className="hub-button mt-5"
            disabled={busy}
            onClick={() => void search(query, page + 1)}
          >
            Show more results
          </button>
        )}
      </div>
      <section className="mt-10 border-t ui-border pt-7">
        <h2 className="text-xl font-semibold">Don’t see your business?</h2>
        <p className="mt-3 text-sm leading-7 ui-muted">
          Create your business profile, or ask our team for help finding an
          existing listing. Searching never creates a listing or grants
          ownership.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/vendor/onboarding" className="hub-button">
            List your business
          </Link>
          <Link href="/support-project" className="hub-button">
            Contact ARIVVIO
          </Link>
        </div>
      </section>
    </div>
  );
}
