import test from "node:test";
import assert from "node:assert/strict";
import {
  parseResearch,
  researchIdentity,
  researchErrors,
  publicUrl,
  outreachMessage,
} from "./research.ts";
const valid = {
  business_name: "Fixture",
  city: "Los Angeles",
  website_url: "https://fixture.example",
  description: "Test only",
  services: [{ category: "DJ", event_types: [] }],
  sources: [
    {
      url: "https://fixture.example/contact",
      type: "official website",
      facts: ["identity", "city", "services"],
      researched_on: "2026-01-01",
      reviewed_on: "2026-01-01",
    },
  ],
};
test("research parsing has size limits and no implicit publication", () => {
  assert.deepEqual(parseResearch(JSON.stringify([valid])), [valid]);
  assert.throws(() => parseResearch("{}"));
  assert.throws(() => parseResearch(JSON.stringify(Array(51).fill(valid))));
  assert.deepEqual(researchErrors(valid, ["DJ"]), []);
});
test("sources and freshness cannot be omitted or invented", () => {
  assert.ok(
    researchErrors({ ...valid, sources: [] }, ["DJ"]).includes(
      "Missing sources.",
    ),
  );
  assert.ok(
    researchErrors(
      {
        ...valid,
        sources: [{ ...valid.sources[0], reviewed_on: "2099-01-01" }],
      },
      ["DJ"],
    ).length,
  );
  assert.ok(
    researchErrors(
      {
        ...valid,
        sources: [{ ...valid.sources[0], reviewed_on: "2026-02-30" }],
      },
      ["DJ"],
    ).length,
  );
});
test("import disallows authority, invented prices, ratings and unconfirmed coordinates", () => {
  for (const key of [
    "owner_id",
    "verification_status",
    "latitude",
    "price",
    "rating",
  ])
    assert.ok(researchErrors({ ...valid, [key]: "x" }, ["DJ"]).length);
  assert.equal(publicUrl("javascript:alert(1)"), false);
  assert.equal(publicUrl("https://user:password@fixture.example"), false);
});
test("outreach remains optional and never implies a customer lead", () => {
  const message = outreachMessage(
    "Fixture",
    "https://www.arivvio.com/business/id?mode=claim",
  );
  assert.match(message, /Claiming is optional/);
  assert.match(message, /verification is required/);
  assert.match(message, /correction or removal/);
  assert.match(message, /No customer inquiry is implied/);
});

test("identity separates branches but detects repeated rows", () => {
  assert.equal(researchIdentity(valid), researchIdentity({ ...valid }));
  assert.notEqual(
    researchIdentity({ ...valid, address: "1 Main Street" }),
    researchIdentity({ ...valid, address: "2 Main Street" }),
  );
});
