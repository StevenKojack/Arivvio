import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createClient } from "@supabase/supabase-js";
const source = readFileSync(
  new URL("../repositories/claimSearchRepository.ts", import.meta.url),
  "utf8",
).replace(
  '"../public-navigation/claim-search"',
  JSON.stringify(new URL("./claim-search.ts", import.meta.url).href),
);
const { searchClaimListings } = await import(
  "data:text/javascript;base64," +
    Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
test("claim directory queries only published businesses, active services and read-only paged endpoints", async () => {
  const urls = [];
  const business = {
    id: "one",
    business_name: "Apricot",
    category: "DJ",
    service_area_city: "LA",
    owner_id: null,
  };
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, options) => {
        const url = new URL(input);
        urls.push(url);
        assert.equal(options.method, "GET");
        const services = url.pathname.endsWith("/vendor_services");
        if (services) assert.equal(url.searchParams.get("active"), "eq.true");
        else
          assert.equal(url.searchParams.get("approval_status"), "eq.approved");
        const data = services
          ? [{ vendor_id: "one" }, { vendor_id: "two" }]
          : url.searchParams.has("id")
            ? [business, { ...business, id: "two", owner_id: "owner" }]
            : [business];
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  const result = await searchClaimListings(client, "DJ");
  assert.equal(result.listings.length, 2);
  assert.equal(result.hasMore, false);
  assert.equal(urls.length, 3);
  assert.ok(
    urls[0].searchParams.get("or").includes("service_area_city.ilike."),
  );
  assert.ok(urls[1].searchParams.get("or").includes("service_name.ilike."));
  assert.equal(urls[0].searchParams.get("limit"), "21");
  assert.equal(urls[0].searchParams.get("offset"), "0");
  await searchClaimListings(client, "%%%");
  assert.equal(urls.length, 3);
});
