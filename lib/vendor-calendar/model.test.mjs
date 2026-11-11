import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftDate,onDay,overlap,sortEntries,wallTime,bookingEntry} from './model.ts';
const e=(id,start,end,more={})=>({id,name:id,date:'2026-11-05',end_date:'2026-11-05',start_time:start,end_time:end,status:'Confirmed',timezone:'America/Los_Angeles',source:'External Event',...more});
test('three events retain individual time ranges and agenda order',()=>{const a=e('a','09:00','10:00'),b=e('b','10:00','11:00'),c=e('c','14:00','15:00');assert.equal(overlap(a,b),false);assert.deepEqual(sortEntries([c,b,a]).map(x=>x.id),['a','b','c']);assert.equal([a,b,c].filter(x=>onDay(x,'2026-11-05')).length,3);});
test('overlap warnings ignore cancelled events and include holds',()=>{const a=e('a','09:00','11:00');assert.equal(overlap(a,e('b','10:00','12:00',{status:'Hold'})),true);assert.equal(overlap(a,e('b','10:00','12:00',{status:'cancelled'})),false);});
test('overnight events appear on both days and overlap next-day commitments',()=>{const a=e('a','23:00','02:00',{end_date:'2026-11-06'});assert.equal(onDay(a,'2026-11-06'),true);assert.equal(overlap(a,e('b','01:00','03:00',{date:'2026-11-06',end_date:'2026-11-06'})),true);assert.equal(shiftDate('2026-12-31',1),'2027-01-01');});
test('different timezones compare instants without moving stored dates',()=>{assert.equal(overlap(e('a','09:00','10:00'),e('b','12:30','13:30',{timezone:'America/New_York'})),true);assert.ok(Number.isNaN(wallTime('2026-03-08','02:30','America/Los_Angeles')));});
test('incomplete booking schedules are never invented',()=>{assert.equal(overlap(e('a','09:00','10:00'),e('b',null,null,{source:'ARIVVIO'})),false);assert.equal(sortEntries([e('undated',null,null,{date:null}),e('dated','09:00','10:00')])[1].id,'undated');});

test('ARIVVIO booking mapping preserves IDs and status without writes or inferred overnight time',()=>{
 const b={id:'original-booking',booking_status:'confirmed',vendor_notes:'Bring equipment'};
 const mapped=bookingEntry(b,{title:'Conference',date:'2026-11-05',start_time:'10:00',end_time:'11:00',city:'Pasadena'},'Photography');
 assert.equal(mapped.id,b.id);assert.equal(mapped.source,'ARIVVIO');assert.equal(mapped.status,'confirmed');assert.equal(mapped.manual,undefined);assert.equal(mapped.service,'Photography');
 assert.equal(bookingEntry(b,{title:'Overnight',date:'2026-11-05',start_time:'22:00',end_time:'02:00',city:null}).start_time,null);
});
