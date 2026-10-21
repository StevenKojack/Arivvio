import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { footerGroups, configuredLinkedInUrl } from "./links.ts";
import { searchTerm, mergeListings, claimDestination } from "./claim-search.ts";
test("every public footer destination resolves to a real route, with real accounts primary", () => {
  const links = footerGroups.flatMap(([, links]) => links);
  for (const [, href] of links)
    assert.ok(existsSync(`app${href.split("?")[0]}/page.tsx`), href);
  assert.equal(links.find(([label]) => label === "My Events")[1], "/account");
  assert.equal(
    links.find(([label]) => label === "Vendor Hub")[1],
    "/vendor/dashboard",
  );
  assert.equal(
    links.find(([label]) => label === "Claim Your Business")[1],
    "/claim-business",
  );
  assert.equal(
    links.find(([label]) => label === "Vendor Demo")[1],
    "/vendor/demo",
  );
});
test("official LinkedIn fallback is valid, invalid or explicitly empty configuration is hidden", () => {
  assert.equal(
    configuredLinkedInUrl(undefined),
    "https://www.linkedin.com/company/arivvio",
  );
  for (const value of [
    "",
    "javascript:alert(1)",
    "https://linkedin.com.evil.test/company/arivvio",
    "https://www.linkedin.com/in/person",
  ])
    assert.equal(configuredLinkedInUrl(value), null);
});
test("public UI has no obsolete preview destination", () => {
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) visit(p);
      else if (/\.(tsx?|jsx?)$/.test(p))
        assert.ok(!readFileSync(p, "utf8").includes("/?info=" + "1"), p);
    }
  }
  visit("app");
});
test("claim search neutralizes filter syntax and preserves common business names", () => {
  assert.equal(searchTerm("  Apricot & Sound  "), "Apricot & Sound");
  assert.equal(
    searchTerm("Glendale,owner_id.not.is.null"),
    "Glendale owner_id not is null".replaceAll("_", " "),
  );
  assert.equal(searchTerm("%%%***"), "");
  assert.equal(searchTerm("Հայկական DJ"), "Հայկական DJ");
  assert.ok(searchTerm("a".repeat(500)).length <= 120);
});
test("claim results reuse listing identities, deduplicate services and never offer takeover claims", () => {
  const unclaimed = {
    id: "one",
    business_name: "A",
    category: "DJ",
    service_area_city: "LA",
    owner_id: null,
  };
  const claimed = {
    ...unclaimed,
    id: "two",
    business_name: "B",
    owner_id: "owner",
  };
  assert.equal(mergeListings([unclaimed], [unclaimed, claimed]).length, 2);
  assert.equal(claimDestination(unclaimed), "/business/one?mode=claim");
  assert.equal(claimDestination(claimed), "/vendor/login");
});
