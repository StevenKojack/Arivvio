export type ResearchSource = {
  url: string;
  type: string;
  facts: string[];
  researched_on: string;
  reviewed_on: string;
};
export type ResearchBusiness = {
  business_name: string;
  city: string;
  location_name?: string;
  address?: string;
  website_url: string;
  phone?: string;
  email?: string;
  description: string;
  services: { category: string; event_types: string[] }[];
  sources: ResearchSource[];
  separate_reason?: string;
};
export type ResearchDraft = {
  id: string;
  details: ResearchBusiness;
  status: "research" | "review" | "ready" | "published" | "needs_recheck";
  vendor_id: string | null;
  updated_at: string;
};
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown) => typeof x === "string" && x.trim().length > 0;
export function publicUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) &&
      !!u.hostname.includes(".") &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export function researchErrors(
  value: unknown,
  categories: readonly string[],
  today = new Date().toISOString().slice(0, 10),
): string[] {
  if (!object(value)) return ["Each row must be an object."];
  const errors: string[] = [];
  for (const key of ["business_name", "city", "description"])
    if (!text(value[key])) errors.push(`${key} is required.`);
  if (!publicUrl(value.website_url))
    errors.push("Official website must be an http(s) URL without credentials.");
  if (JSON.stringify(value).length > 20000)
    errors.push("Row exceeds 20,000 characters.");
  for (const key of [
    "owner_id",
    "verified_at",
    "verification_status",
    "latitude",
    "longitude",
    "price",
    "rating",
  ])
    if (key in value) errors.push(`${key} cannot be imported.`);
  if (
    !Array.isArray(value.services) ||
    !value.services.length ||
    value.services.length > 12
  )
    errors.push("Provide 1–12 sourced services.");
  else {
    const seen = new Set();
    for (const s of value.services) {
      if (!object(s) || !categories.includes(String(s.category))) {
        errors.push("Unknown service category.");
        continue;
      }
      if (seen.has(s.category))
        errors.push("Combine repeated service categories.");
      seen.add(s.category);
      if (!Array.isArray(s.event_types) || s.event_types.some((e) => !text(e)))
        errors.push("event_types must be an array of supported event names.");
    }
  }
  if (!Array.isArray(value.sources) || !value.sources.length)
    errors.push("Missing sources.");
  else
    for (const source of value.sources) {
      if (
        !object(source) ||
        !publicUrl(source.url) ||
        !text(source.type) ||
        !Array.isArray(source.facts) ||
        !source.facts.length ||
        source.facts.some((f) => !text(f))
      ) {
        errors.push("Every source needs a URL, type and supported facts.");
        continue;
      }
      for (const k of ["researched_on", "reviewed_on"]) {
        const date = String(source[k]);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date ||
          date > today
        )
          errors.push("Source dates must be valid and not in the future.");
      }
      if (String(source.reviewed_on) < String(source.researched_on))
        errors.push("Review cannot precede research.");
    }
  return [...new Set(errors)];
}
export function parseResearch(input: string): unknown[] {
  if (input.length > 500000) throw new Error("Import is limited to 500 KB.");
  const rows: unknown = JSON.parse(input);
  if (!Array.isArray(rows) || !rows.length || rows.length > 50)
    throw new Error("Provide a JSON array of 1–50 businesses.");
  return rows;
}
export function outreachMessage(name: string, claimUrl: string): string {
  return `Hello ${name} team,\n\nARIVVIO is an event-planning marketplace in pre-beta. We prepared a free public listing for your business using factual public information. It is labeled Unclaimed Business and does not imply a partnership.\n\nClaiming is optional. If you choose to manage the listing, business authority verification is required: ${claimUrl}\n\nYou may also request a correction or removal through https://www.arivvio.com/support-project. No customer inquiry is implied by this invitation.\n\nARIVVIO`;
}

// Retry identity includes location. Shared domains alone never merge branches.
export function researchIdentity(value: ResearchBusiness): string {
  let host = "";
  try {
    host = new URL(value.website_url).hostname.replace(/^www\./, "");
  } catch {
    /* Validation reports invalid URLs. */
  }
  return [
    value.business_name,
    value.city,
    value.address ?? "",
    value.location_name ?? "",
    host,
  ]
    .map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .join("|");
}
