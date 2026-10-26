"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { allServices } from "@/app/data/marketplace";
import { acquisitionOperation as op } from "@/lib/repositories/acquisitionRepository";
import {
  parseResearch,
  researchIdentity,
  researchErrors,
  outreachMessage,
  type ResearchDraft,
  type ResearchBusiness,
} from "@/lib/acquisition/research";
import type { ListingWorkspace } from "@/lib/repositories/listingsRepository";
import type { BusinessMatch } from "@/lib/repositories/businessTrustRepository";
import { ContactPreference } from "./ContactPreference";
const field = "w-full rounded-lg border ui-border ui-surface p-3";
const button = "rounded-lg border ui-border px-3 py-2 disabled:opacity-50";
type Preview = {
  details: unknown;
  errors: string[];
  matches: BusinessMatch[];
  existing_draft?: string;
  include: boolean;
  result?: string;
};
const sample = JSON.stringify(
  [
    {
      business_name: "",
      city: "Los Angeles",
      location_name: "",
      website_url: "",
      description: "",
      services: [{ category: "DJ", event_types: [] }],
      sources: [
        {
          url: "",
          type: "official website",
          facts: ["business name", "city", "DJ services"],
          researched_on: "2026-10-26",
          reviewed_on: "2026-10-26",
        },
      ],
    },
  ],
  null,
  2,
);
export function BusinessAcquisition({
  workspace,
  onChanged,
}: {
  workspace: ListingWorkspace;
  onChanged: () => void;
}) {
  const [drafts, setDrafts] = useState<ResearchDraft[]>([]);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview[]>([]);
  const [message, setMessage] = useState("");
  const [helpersOpen, setHelpersOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [outreach, setOutreach] = useState<{ id: string; text: string } | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    op<ResearchDraft[]>("list")
      .then((r) => {
        if (live) setDrafts(r);
      })
      .catch((e) => {
        if (live) setMessage(`Research queue unavailable: ${e.message}`);
      });
    return () => {
      live = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to complete action.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setDrafts(await op<ResearchDraft[]>("list"));
    onChanged();
  }
  async function prepare() {
    const rows = parseResearch(input);
    const results: Preview[] = [];
    const identities = new Set<string>();
    for (const details of rows) {
      const errors = researchErrors(details, allServices);
      if (!errors.length) {
        const key = researchIdentity(details as ResearchBusiness);
        if (identities.has(key))
          errors.push("Duplicate business/location in this batch.");
        identities.add(key);
      }
      if (errors.length) {
        results.push({ details, errors, matches: [], include: false });
        continue;
      }
      try {
        const check = await op<{
          matches: BusinessMatch[];
          existing_draft?: string;
        }>("preview", { details });
        results.push({
          details,
          errors,
          ...check,
          include: !check.existing_draft && check.matches.length === 0,
        });
      } catch (e) {
        results.push({
          details,
          errors: [e instanceof Error ? e.message : "Preview failed"],
          matches: [],
          include: false,
        });
      }
    }
    setPreview(results);
  }
  async function importRows() {
    const results = [...preview];
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      if (!row.include || row.errors.length || row.result) continue;
      try {
        const result = await op<{ result: string }>("import", {
          details: row.details,
        });
        results[i] = { ...row, include: false, result: result.result };
      } catch (e) {
        results[i] = {
          ...row,
          result: `Rejected: ${e instanceof Error ? e.message : "Import failed"}`,
        };
      }
      setPreview([...results]);
    }
    await refresh();
    setMessage(
      "Import finished. Only rows marked imported were created. No listings were published.",
    );
  }
  const counts = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((out, x) => {
        out[x] = (out[x] ?? 0) + 1;
        return out;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
  const published = workspace.listings.filter(
    (v) => v.approval_status === "approved",
  );
  const [cutoff] = useState(() =>
    new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
  );
  const stale = published.filter(
    (v) =>
      !workspace.sources.some((s) => s.vendor_id === v.id) ||
      workspace.sources.some(
        (s) =>
          s.vendor_id === v.id && (!s.reviewed_on || s.reviewed_on < cutoff),
      ),
  );
  const visible = drafts.filter(
    (d) =>
      (status === "all" || d.status === status) &&
      `${d.details.business_name} ${d.details.city} ${d.details.services.map((s) => s.category).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="my-5 space-y-5 border-b ui-border pb-6">
      <h3 className="text-xl font-semibold">Business acquisition</h3>
      <p>
        Research → Review → Ready to publish → Published → Needs recheck. Source
        review never verifies business ownership.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="font-semibold">Real directory coverage</h4>
          <p>
            {workspace.listings.length} records · {published.length} published ·{" "}
            {published.filter((v) => !v.owner_id).length} unclaimed ·{" "}
            {
              published.filter((v) => v.verification_status === "verified")
                .length
            }{" "}
            verified
          </p>
          <p>
            {stale.length} listings need source review (missing review date or
            over 90 days).
          </p>
          <p>
            {drafts.filter((d) => !d.vendor_id).length} research drafts ·{" "}
            {workspace.claims.filter((c) => c.status === "pending").length}{" "}
            outstanding claims
          </p>
          <p>
            {
              published.filter(
                (v) => !workspace.sources.some((s) => s.vendor_id === v.id),
              ).length
            }{" "}
            missing sources ·{" "}
            {
              published.filter(
                (v) =>
                  v.category === "Venue" &&
                  (v.latitude == null || v.longitude == null),
              ).length
            }{" "}
            venues without map coordinates
          </p>
        </div>
        <div>
          <h4 className="font-semibold">Service coverage</h4>
          <p>
            {counts(
              workspace.services
                .filter((s) => published.some((v) => v.id === s.vendor_id))
                .map((s) => s.category ?? "Unknown"),
            )
              .map(([c, n]) => `${c}: ${n}`)
              .join(" · ")}
          </p>
          <h4 className="mt-2 font-semibold">Cities</h4>
          <p>
            {counts(published.map((v) => v.service_area_city ?? "Unknown"))
              .map(([c, n]) => `${c}: ${n}`)
              .join(" · ")}
          </p>
        </div>
      </div>
      <details>
        <summary className="cursor-pointer font-semibold">
          Import researched businesses (JSON)
        </summary>
        <p className="my-3">
          Up to 50 rows. Sources, original summaries and operating city are
          required. Coordinates, ownership, ratings and pricing are not
          imported. Correct rows in the JSON and preview again, or exclude them
          below.
        </p>
        <button
          className={button}
          type="button"
          onClick={() => {
            setInput(sample);
            setPreview([]);
          }}
        >
          Load format example
        </button>
        <label className="my-3 block">
          Research JSON
          <textarea
            className={`${field} mt-1 font-mono text-sm`}
            rows={10}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setPreview([]);
            }}
          />
        </label>
        <button
          className={button}
          disabled={busy || !input}
          onClick={() => run(prepare)}
        >
          Validate and check duplicates
        </button>
        {preview.length > 0 && (
          <div className="mt-3 space-y-3">
            <p>
              {preview.length} rows ·{" "}
              {
                preview.filter(
                  (r) =>
                    !r.errors.length && !r.matches.length && !r.existing_draft,
                ).length
              }{" "}
              ready · {preview.filter((r) => r.errors.length).length}{" "}
              invalid/missing sources ·{" "}
              {preview.filter((r) => r.matches.length).length} possible matches
              · {preview.filter((r) => r.existing_draft).length} previously
              imported
            </p>
            {preview.map((r, i) => (
              <div key={i} className="rounded-lg border ui-border p-3">
                <label>
                  <input
                    type="checkbox"
                    checked={r.include}
                    disabled={
                      busy ||
                      !!r.errors.length ||
                      !!r.existing_draft ||
                      !!r.result
                    }
                    onChange={(e) =>
                      setPreview((p) =>
                        p.map((x, n) =>
                          n === i ? { ...x, include: e.target.checked } : x,
                        ),
                      )
                    }
                  />{" "}
                  Row {i + 1}:{" "}
                  {(r.details as ResearchBusiness)?.business_name ??
                    "Invalid row"}
                </label>
                <p>
                  {r.errors.join(" ")}
                  {r.existing_draft && " Already imported."}
                  {r.result && ` ${r.result}`}
                </p>
                {r.matches.map((m) => (
                  <p key={m.id}>
                    Possible existing business: {m.business_name} ·{" "}
                    {m.service_area_city} · {m.base_address}. Review
                    branch/address before publication.
                  </p>
                ))}
              </div>
            ))}
            <button
              className={button}
              disabled={busy || !preview.some((r) => r.include)}
              onClick={() => run(importRows)}
            >
              Import selected as unpublished research drafts
            </button>
          </div>
        )}
      </details>
      <div className="flex flex-wrap gap-3">
        <label>
          Search business, city or service
          <input
            className={field}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Workflow
          <select
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {[
              "all",
              "research",
              "review",
              "ready",
              "published",
              "needs_recheck",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {visible.map((d) => (
        <details key={d.id} className="rounded-lg border ui-border p-3">
          <summary className="cursor-pointer">
            {d.details.business_name} · {d.details.city} ·{" "}
            {d.status.replaceAll("_", " ")}
          </summary>
          <p className="my-2">{d.details.description}</p>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const check = await op<{ matches: BusinessMatch[] }>(
                  "preview",
                  { details: d.details },
                );
                setMessage(
                  check.matches.length
                    ? check.matches
                        .map(
                          (m) =>
                            `${m.business_name}: ${m.base_address ?? m.service_area_city}. Review this location before publishing.`,
                        )
                        .join(" ")
                    : "No matching business found.",
                );
              })
            }
          >
            Check existing business matches
          </button>
          <p>{d.details.services.map((s) => s.category).join(" · ")}</p>
          <ul className="my-2">
            {d.details.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {s.type}
                </a>
                : {s.facts.join(", ")} · researched {s.researched_on} · reviewed{" "}
                {s.reviewed_on}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {!d.vendor_id && (
              <button
                className={button}
                onClick={() => {
                  setEditing(d.id);
                  setEditText(JSON.stringify(d.details, null, 2));
                }}
              >
                Edit research
              </button>
            )}
            {(["research", "review", "ready"] as string[]).includes(
              d.status,
            ) && (
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await op(d.status === "ready" ? "publish" : "status", {
                      id: d.id,
                      status: d.status === "research" ? "review" : "ready",
                    });
                    await refresh();
                    setMessage(
                      d.status === "ready"
                        ? "Published as an unclaimed business."
                        : "Workflow updated.",
                    );
                  })
                }
              >
                {d.status === "research"
                  ? "Send to review"
                  : d.status === "review"
                    ? "Mark ready to publish"
                    : "Publish unclaimed listing"}
              </button>
            )}
            {d.vendor_id && (
              <>
                <Link href={`/business/${d.vendor_id}`} className={button}>
                  View listing
                </Link>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await op("recheck", { id: d.id });
                      await refresh();
                      setMessage("Source information marked rechecked today.");
                    })
                  }
                >
                  I checked these sources today
                </button>
                {d.status === "published" && (
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await op("status", {
                          id: d.id,
                          status: "needs_recheck",
                        });
                        await refresh();
                      })
                    }
                  >
                    Needs recheck
                  </button>
                )}
              </>
            )}
          </div>
          {editing === d.id && (
            <div className="mt-3">
              <label>
                Research details
                <textarea
                  rows={12}
                  className={`${field} font-mono text-sm`}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </label>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const details = JSON.parse(editText);
                    const errors = researchErrors(details, allServices);

                    if (errors.length) throw new Error(errors.join(" "));
                    await op("save", { id: d.id, details });
                    setEditing(null);
                    await refresh();
                  })
                }
              >
                Save and return to research
              </button>
              <button className={button} onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          )}
        </details>
      ))}
      <details onToggle={(e) => setHelpersOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold">
          Manual claim and outreach helpers
        </summary>
        <p className="my-2">
          Copying sends nothing. Check contact suppression before preparing or
          using outreach. Claim links require the existing verification process.
        </p>
        {helpersOpen &&
          published
            .filter(
              (v) =>
                !v.owner_id &&
                `${v.business_name} ${v.service_area_city}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((v) => (
              <div key={v.id} className="my-3 rounded-lg border ui-border p-3">
                <h4 className="font-semibold">{v.business_name}</h4>
                <div className="my-2 flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() =>
                      run(async () => {
                        await navigator.clipboard.writeText(
                          `${location.origin}/business/${v.id}?mode=claim`,
                        );
                        setMessage("Claim link copied.");
                      })
                    }
                  >
                    Copy claim link
                  </button>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await op("outreach", { vendor_id: v.id });
                        setOutreach({
                          id: v.id,
                          text: outreachMessage(
                            v.business_name,
                            `${location.origin}/business/${v.id}?mode=claim`,
                          ),
                        });
                      })
                    }
                  >
                    Prepare outreach message
                  </button>
                  {v.website_url && (
                    <a
                      href={v.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={button}
                    >
                      Official website
                    </a>
                  )}
                </div>
                <p>
                  {workspace.leads.filter((l) => l.vendor_id === v.id).length}{" "}
                  related concierge leads. Review them in Admin → Concierge
                  before mentioning customer interest.
                </p>
                <details>
                  <summary>Sources</summary>
                  {workspace.sources
                    .filter((s) => s.vendor_id === v.id)
                    .map((s) => (
                      <p key={s.id}>
                        <a
                          className="underline"
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.source_url}
                        </a>{" "}
                        · {s.supported_fields.join(", ")}
                      </p>
                    ))}
                </details>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await op("recheck_listing", { vendor_id: v.id });
                      await refresh();
                      setMessage("Listing sources marked rechecked today.");
                    })
                  }
                >
                  I rechecked the listed sources today
                </button>
                <ContactPreference vendorId={v.id} />
                {outreach?.id === v.id && (
                  <div className="mt-3">
                    <label>
                      Editable outreach message
                      <textarea
                        rows={10}
                        className={field}
                        value={outreach.text}
                        onChange={(e) =>
                          setOutreach({ id: v.id, text: e.target.value })
                        }
                      />
                    </label>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await op("outreach", { vendor_id: v.id });
                          await navigator.clipboard.writeText(outreach.text);
                          setMessage("Outreach copied. No message was sent.");
                        })
                      }
                    >
                      Check suppression and copy message
                    </button>
                  </div>
                )}
              </div>
            ))}
      </details>
      {message && (
        <p role="status" className="rounded-lg border ui-border p-3">
          {message}
        </p>
      )}
    </div>
  );
}
