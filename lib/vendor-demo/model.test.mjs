import test from "node:test";
import assert from "node:assert/strict";
import { seedHub, dateKey, daySchedule, scheduleWarnings } from "./model.ts";

const business = { name: "Demo", location: "Glendale", description: "Fictional", contact: "", languages: "English", specialties: "DJ" };
const makeState = () => seedHub(business, new Date(2026, 8, 16, 12));

test("seeds coherent manual and Arivvio events relative to today", () => {
  const state = makeState();
  assert.equal(state.events.length, 4);
  assert.equal(state.events[0].date, "2026-09-16");
  assert.deepEqual(new Set(state.events.map(e => e.source)), new Set(["MANUAL", "ARIVVIO"]));
  assert.equal(dateKey(new Date(2026, 11, 31)), "2026-12-31");
});
test("a manual event immediately appears in the shared day schedule", () => {
  const state = makeState();
  assert.equal(daySchedule(state, "2026-09-17").label, "Available");
  state.events.push({ ...state.events[0], id: "new", date: "2026-09-17" });
  assert.equal(daySchedule(state, "2026-09-17").label, "Scheduled");
  assert.equal(daySchedule(state, "2026-09-17").events[0].id, "new");
});
test("blocking and unblocking preserve scheduled events", () => {
  const state = makeState();
  state.blocked.push("2026-09-16");
  assert.equal(daySchedule(state, "2026-09-16").label, "Blocked");
  assert.equal(daySchedule(state, "2026-09-16").events.length, 1);
  state.blocked = state.blocked.filter(d => d !== "2026-09-16");
  assert.equal(daySchedule(state, "2026-09-16").label, "Scheduled");
});
test("overlap notices exclude self and allow adjacent events", () => {
  const state = makeState();
  assert.deepEqual(scheduleWarnings(state, state.events[0]), []);
  assert.match(scheduleWarnings(state, { ...state.events[0], id: "overlap" }).join(" "), /overlaps/);
  assert.deepEqual(scheduleWarnings(state, { ...state.events[0], id: "adjacent", start: "21:00", end: "22:00" }), []);
});
test("blocks, working hours and holds affect availability", () => {
  const state = makeState();
  assert.match(scheduleWarnings(state, { ...state.events[0], date: state.blocked[0] }).join(" "), /blocked/);
  assert.match(scheduleWarnings(state, { ...state.events[0], start: "08:00" }).join(" "), /working hours/);
  assert.match(scheduleWarnings(state, { ...state.events[3], id: "second-hold" }).join(" "), /overlaps/);
  assert.deepEqual(scheduleWarnings(state, { ...state.events[0], date: "" }), []);
});
test("JSON round trip preserves event, services and profile edits", () => {
  const state = makeState();
  state.business.contact = "demo@example.test";
  state.services[0].active = false;
  state.events[0].tasks[0].done = true;
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test("capacity counts peak overlap, not every event that touches the candidate", () => {
 const state=makeState(); const base=state.events[0];
 state.events=[{...base,id:"a",start:"11:00",end:"14:00"},{...base,id:"b",start:"18:00",end:"22:00"}];
 state.scheduling={mode:"capacity",simultaneous:2,dailyLimit:null};
 assert.deepEqual(scheduleWarnings(state,{...base,id:"c",start:"12:00",end:"20:00"}),[]);
 state.events.push({...base,id:"d",start:"12:00",end:"13:00"});
 assert.match(scheduleWarnings(state,{...base,id:"c",start:"12:00",end:"20:00"}).join(),/capacity/);
 state.scheduling.mode="manual";
 assert.deepEqual(scheduleWarnings(state,{...base,id:"c",start:"12:00",end:"20:00"}),[]);
 state.scheduling.dailyLimit=3;
 assert.match(scheduleWarnings(state,{...base,id:"c",start:"12:00",end:"20:00"}).join(),/daily event limit/);
 assert.equal(daySchedule(state,base.date).label,"Daily capacity reached");
});
