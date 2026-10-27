import test from "node:test";
import assert from "node:assert/strict";
import {
  vendorReadiness,
  confirmedMapMatch,
  inActivationQueue,
  nextActivationAction,
  inquiryReturnPath,
} from "./activation.ts";
const v = {
  id: "business",
  owner_id: "owner",
  verification_status: "verified",
  verified_at: "2026-01-01",
  approval_status: "approved",
  description: "Event services",
  service_area_city: "Los Angeles",
  vacation_mode: false,
};
test("authority and operational readiness remain distinct without mandatory photos/prices", () => {
  const services = [{ vendor_id: v.id, active: true }];
  assert.equal(vendorReadiness(v, services).ready, true);
  for (const patch of [
    { owner_id: null },
    { verified_at: null },
    { verification_status: "pending" },
    { approval_status: "pending" },
    { description: "" },
    { service_area_city: null },
    { vacation_mode: true },
  ])
    assert.equal(vendorReadiness({ ...v, ...patch }, services).ready, false);
  assert.equal(vendorReadiness(v, []).ready, false);
  assert.equal(
    vendorReadiness(v, [{ vendor_id: "other", active: true }]).ready,
    false,
  );
});
test("map confirmation never accepts illustrative or city coordinates", () => {
  const match = {
    isFallback: false,
    placeType: "address",
    coordinates: { lat: 34, lng: -118 },
  };
  assert.equal(confirmedMapMatch(match, true), true);
  assert.equal(confirmedMapMatch(match, false), false);
  for (const patch of [
    { isFallback: true },
    { placeType: "city" },
    { coordinates: { lat: NaN, lng: 0 } },
  ])
    assert.equal(confirmedMapMatch({ ...match, ...patch }, true), false);
});
test("suppression removes every actionable follow-up and claim task", () => {
  const b = {
    ...v,
    state: "interested",
    follow_up_on: "2026-01-01",
    pending_claims: 1,
    attempts: [],
    ready: true,
    suppressed: true,
  };
  for (const q of ["contact", "due", "interested", "claims", "activation"])
    assert.equal(inActivationQueue(b, q, "2026-10-27"), false);
  assert.equal(nextActivationAction(b), "Do not contact");
  assert.equal(
    nextActivationAction({ ...b, suppressed: false }),
    "Review verification evidence",
  );
  assert.equal(
    inActivationQueue({ ...b, suppressed: false }, "due", "2026-10-27"),
    true,
  );
});
test("saved event returns to exact business/service and rejects external destinations", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(
    inquiryReturnPath(`/business/${id}?serviceId=service`, "event"),
    `/business/${id}?serviceId=service&eventId=event&mode=request`,
  );
  for (const path of [
    null,
    "https://evil.example",
    "//evil.example",
    "/account",
  ])
    assert.equal(inquiryReturnPath(path, "event"), null);
});
