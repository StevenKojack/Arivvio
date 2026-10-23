import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const base = specifier.startsWith("@/")
        ? pathToFileURL(resolve(specifier.slice(2))).href
        : new URL(specifier, context.parentURL).href;
      for (const suffix of ["", ".ts", "/index.ts"])
        if (
          existsSync(fileURLToPath(base + suffix)) &&
          !(!suffix && !/\.[cm]?[jt]s$/.test(base))
        )
          return next(base + suffix, context);
    }
    return next(specifier, context);
  },
});
const { buildEventIntelligenceProfile: build } = await import(
  "../event-intelligence/engine.ts"
);
const { eventFields, profileFromEvent, eventGroup } = await import(
  "./profile.ts"
);
const { saveLocalEventToAccount, updateCloudEvent } = await import(
  "./events.ts"
);
const { applyPlanActions } = await import("../assistant/actions.ts");
const { activeAssistantEvent } = await import("../assistant/session.ts");
test("canonical cloud round trip retains wedding stages, audience, preferences and uncertain date", () => {
  const p = build({
    query:
      "Wedding in October for around 120 people, Armenian food, DJ and photographer",
  });
  p.eventId = "local";
  p.stages = [
    {
      id: "c",
      label: "Ceremony",
      order: 0,
      startTime: "15:00",
      location: "Church",
      guestCount: 80,
      budget: 3000,
      services: ["Photography"],
    },
    {
      id: "r",
      label: "Reception",
      order: 1,
      startTime: "18:00",
      location: "Hall",
      guestCount: 120,
      budget: 17000,
      services: ["DJ"],
    },
  ];
  p.audience.childrenCount = 25;
  const fields = eventFields(p);
  const restored = profileFromEvent({ ...fields, id: "cloud" });
  assert.deepEqual(
    restored,
    JSON.parse(JSON.stringify({ ...p, eventId: "cloud" })),
  );
  assert.equal(fields.date, null);
  assert.equal(restored.dateHint, p.dateHint);
  const proposal = applyPlanActions(restored, [
    { kind: "stage", stageId: "r", field: "startTime", value: "19:00" },
  ]);
  assert.equal(proposal.profile.stages[0].startTime, "15:00");
  assert.equal(restored.stages[1].startTime, "18:00");
});
function fakeClient(existing = null) {
  let inserts = 0;
  let updates = 0;
  let row = existing;
  const profile = { id: "owner", user_id: "user" };
  const client = {
    rpc: async (name) => {
      assert.equal(name, "complete_legal_acceptance");
      return { data: null, error: null };
    },
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    from(table) {
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        insert(value) {
          inserts++;
          row = { ...value, profile_revision: 0 };
          return chain;
        },
        update(value) {
          updates++;
          row = value;
          return chain;
        },
        single: async () => ({ data: row }),
        maybeSingle: async () => ({
          data: table === "profiles" ? profile : row,
          error: null,
        }),
      };
      return chain;
    },
  };
  return {
    client,
    get inserts() {
      return inserts;
    },
    get updates() {
      return updates;
    },
    get row() {
      return row;
    },
  };
}
test("explicit import is idempotent and never overwrites an account event", async () => {
  const p = { ...build({ query: "Birthday" }), eventId: "local-id" };
  const fake = fakeClient();
  const first = await saveLocalEventToAccount(fake.client, p);
  const second = await saveLocalEventToAccount(fake.client, {
    ...p,
    guestSize: 999,
  });
  assert.equal(first.id, second.id);
  assert.equal(fake.inserts, 1);
  assert.equal(fake.updates, 0);
  assert.deepEqual(fake.row.event_profile.stages, p.stages);
  assert.equal(fake.row.source_event_id, "local-id");
  assert.equal(p.eventId, "local-id");
});
test("anonymous users cannot upload local drafts", async () => {
  const fake = fakeClient();
  fake.client.auth.getUser = async () => ({ data: { user: null } });
  await assert.rejects(
    () =>
      saveLocalEventToAccount(fake.client, {
        ...build({ query: "Wedding" }),
        eventId: "local",
      }),
    /Sign in/,
  );
  assert.equal(fake.inserts, 0);
});
test("proposals cause no database writes, only explicit persistence does", async () => {
  const fake = fakeClient();
  const p = {
    ...build({ query: "Birthday for 100 people" }),
    eventId: "cloud",
  };
  const result = applyPlanActions(p, [
    { kind: "planning", stageId: "", field: "guestCount", value: "120" },
  ]);
  assert.equal(fake.updates, 0);
  assert.equal(p.planning.guestCount, 100);
  await updateCloudEvent(fake.client, result.profile, 0);
  assert.equal(fake.updates, 1);
  assert.equal(fake.row.guest_count, 120);
});
test("cloud event route cannot fall back to another browser event", () => {
  globalThis.window = {
    location: { search: "" },
    sessionStorage: {
      getItem: () =>
        JSON.stringify({ ...build({ query: "Birthday" }), eventId: "local" }),
    },
    localStorage: { getItem: () => null },
  };
  try {
    const active = activeAssistantEvent("/events/cloud-id");
    assert.equal(active.profile, null);
    assert.equal(active.readOnly, true);
    assert.equal(active.key, "cloud:cloud-id");
  } finally {
    delete globalThis.window;
  }
});
test("account event groups distinguish cancelled, completed, upcoming and incomplete", () => {
  assert.equal(
    eventGroup({ status: "cancelled", date: "2027-01-01" }, "2026-09-29"),
    "Cancelled",
  );
  assert.equal(
    eventGroup({ status: "planning", date: null }, "2026-09-29"),
    "Still planning",
  );
  assert.equal(
    eventGroup({ status: "planning", date: "2020-01-01" }, "2026-09-29"),
    "Past / completed",
  );
  assert.equal(
    eventGroup({ status: "planning", date: "2027-01-01" }, "2026-09-29"),
    "Current / upcoming",
  );
});

test('anniversary acceptance preserves incomplete October, approximate values, culture and services',()=>{
 const p=build({query:"My parents' 30th anniversary in October, around 100 people, Armenian food, a DJ and photographer, banquet hall around Glendale, budget around $20,000."});
 const fields=eventFields(p);const restored=profileFromEvent({...fields,id:'anniversary'});
 assert.match(restored.eventType.value,/anniversary/i);assert.equal(fields.date,null);assert.match(restored.dateHint,/October/i);
 assert.equal(restored.planning.guestCount,100);assert.equal(restored.planning.budget,20000);
 assert.equal(restored.approximateGuests,true);assert.match(JSON.stringify(restored),/Armenian/);assert.match(restored.planning.location,/Glendale/);
 assert.ok(restored.requestedServices.includes('DJ'));assert.ok(restored.requestedServices.includes('Photography'));assert.equal(restored.venueRequired,true);
});
test('stale cloud updates reject instead of overwriting',async()=>{
 const fake=fakeClient();const from=fake.client.from;fake.client.from=(table)=>{const chain=from(table);chain.maybeSingle=async()=>({data:null,error:null});return chain;};
 await assert.rejects(()=>updateCloudEvent(fake.client,{...build({query:'Wedding'}),eventId:'cloud'},4),/changed/);
});
test('reception-only assistant correction preserves ceremony and can round-trip',async()=>{
 const {previewPlanningTurn}=await import('../assistant/preview.ts');
 const p=build({query:'Wedding for 180 guests, DJ, photographer and florals, budget $20000'});
 p.stages=[{id:'c',label:'Ceremony',order:0,startTime:'15:00',location:'Church',services:['Photography']},{id:'r',label:'Reception',order:1,startTime:'18:00',location:'Banquet Hall',services:['DJ','Florals']}];
 const result=applyPlanActions(p,previewPlanningTurn('Move the reception to 7 PM.',p).actions);
 const restored=profileFromEvent({...eventFields(result.profile),id:'cloud'});
 assert.deepEqual(restored.stages[0],p.stages[0]);assert.equal(restored.stages[1].startTime,'19:00');assert.equal(restored.stages[1].location,'Banquet Hall');assert.equal(restored.planning.guestCount,180);assert.equal(restored.planning.budget,20000);
});
