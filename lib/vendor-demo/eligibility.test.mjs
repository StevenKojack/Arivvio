import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility } from "./eligibility.ts";
import { defaultRules, hydrateHub, seedHub, daySchedule } from "./model.ts";
const active = [{ id:"dj",category:"DJ",name:"DJ",details:"Demo",price:"Quote",active:true }];
test("legacy vendors with no preferences are not excluded", () => {
  assert.equal(evaluateEligibility(undefined,undefined,{eventType:"Birthday",age:13}).eligible,true);
  assert.equal(evaluateEligibility(defaultRules(),active,{eventType:"Birthday",service:"DJ",age:13}).eligible,true);
});
test("explicit event and age restrictions take priority", () => {
  const rules = {...defaultRules(),eventMode:"selected",served:["Wedding"],audience:"adults"};
  assert.equal(evaluateEligibility(rules,active,{eventType:"Birthday",age:13,service:"DJ"}).eligible,false);
  assert.equal(evaluateEligibility(rules,active,{eventType:"Wedding",age:25,service:"DJ"}).eligible,true);
  assert.equal(evaluateEligibility({...rules,excluded:["Wedding"]},active,{eventType:"Wedding",age:25}).eligible,false);
});
test("unknown age and distance stay eligible with confirmation needed", () => {
  const result = evaluateEligibility({...defaultRules(),audience:"adults",radius:25},active,{service:"DJ"});
  assert.equal(result.eligible,true); assert.equal(result.unknown.length,2);
});
test("paused services and known out-of-area plans are excluded", () => {
  assert.equal(evaluateEligibility(defaultRules(),active.map(s=>({...s,active:false})),{service:"DJ"}).eligible,false);
  assert.equal(evaluateEligibility({...defaultRules(),radius:25},active,{distanceMiles:26}).eligible,false);
});
test("hydration preserves old demo records and special hours override normal hours", () => {
  const old = seedHub({name:"Demo",location:"LA",description:"Demo",contact:"",languages:"",specialties:""},new Date(2026,8,17));
  const next=hydrateHub(old); assert.deepEqual(next.events,old.events); assert.equal(next.notices.length,3);
  next.specialHours["2026-09-21"]={enabled:true,start:"12:00",end:"18:00"};
  assert.equal(daySchedule(next,"2026-09-21").label,"Available");
  assert.equal(daySchedule(next,"2026-09-21").hours.start,"12:00");
});
