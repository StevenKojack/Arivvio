import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('secured request, conversation and booking lifecycle',async t=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated,anon;`);
 await db.exec(readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists "pgcrypto";',''));
 await db.exec(readFileSync('supabase/phase4-account-model.sql','utf8'));
 await db.exec(`grant usage on schema public to anon,authenticated; grant all on all tables in schema public to anon,authenticated;
 insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}');
 insert into public.profiles(id,user_id,email) values('${id(11)}','${id(1)}','planner@test.invalid'),('${id(12)}','${id(2)}','vendor@test.invalid'),('${id(13)}','${id(3)}','plannerb@test.invalid'),('${id(14)}','${id(4)}','vendorb@test.invalid');
 insert into public.vendor_businesses(id,owner_id,business_name,category,approval_status) values('${id(21)}','${id(12)}','DJ One','DJ','approved'),('${id(22)}','${id(14)}','Photo Two','Photography','approved');
 insert into public.vendor_services(id,vendor_id,service_name,category,pricing_type,active) values('${id(31)}','${id(21)}','DJ package','DJ','flat',true),('${id(32)}','${id(22)}','Photo package','Photography','flat',true);
 insert into public.venues(id,owner_id,name,address,city,approval_status) values('${id(23)}','${id(14)}','Claimed hall','Test street','Glendale','approved'),('${id(24)}',null,'Unclaimed hall','Test street','Glendale','approved');`);
 await db.exec(readFileSync('supabase/migrations/20261019155417_customer_continuity_reconciled.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261019231733_request_conversations_and_booking.sql','utf8'));
 const as=async n=>db.exec(`reset role; select set_config('request.jwt.claims','{}',false); select set_config('request.jwt.claim.sub','${id(n)}',false); set role authenticated;`);
 const sql=async(s,a=[])=>(await db.query(s,a)).rows;
 const rpc=async(name,args)=>{const [r]=await sql(`select to_jsonb(public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})) as result`,args);return r.result;};
 const denied=async(s,a=[])=>assert.rejects(()=>db.query(s,a));
 await as(1);
 await sql(`insert into public.events(id,planner_id,event_type,title,status,date,city,address,event_profile) values($1,$2,'Wedding','Our wedding','planning','2027-05-01','Glendale','Private home address',$3)`,[id(41),id(11),JSON.stringify({privateNotes:'never share',stages:[{label:'Reception',startTime:'18:00',endTime:'22:00',services:['DJ'],location:'private address'},{label:'Private morning',services:['Photography']}],dateHint:'May'})]);
 const request=async(n,v=21,s=31,venue=null)=>{const [q]=await sql(`insert into public.quote_requests(id,event_id,planner_id,vendor_id,service_id,venue_id,guest_count,requested_start_time,requested_end_time,message,estimated_price) values($1,$2,$3,$4,$5,$6,100,'18:00','22:00','  Setup included?  ',1500) returning *`,[id(n),id(41),id(11),v?id(v):null,s?id(s):null,venue?id(venue):null]); return q;};
 let quote=await request(51); await request(52,22,32); await request(53,null,null,23);
 await t.test('new request snapshots only relevant structured context and blocks unclaimed provider',async()=>{
 assert.equal(quote.message,'Setup included?');assert.equal(quote.status,'pending');assert.equal(quote.vendor_final_price,null);
 assert.deepEqual(quote.request_context.stages,[{label:'Reception',start_time:'18:00',end_time:'22:00'}]);
 assert.ok(!JSON.stringify(quote.request_context).includes('private')); assert.equal(quote.request_context.city,'Glendale');
 await assert.rejects(()=>request(54,null,null,24));
 await denied(`insert into public.quote_requests(event_id,planner_id,vendor_id,status,vendor_final_price) values($1,$2,$3,'sent',1)`,[id(41),id(11),id(21)]);
 });
 await t.test('planners cannot forge messages, change prices, create bookings or access other threads',async()=>{
 await denied('update public.quote_requests set vendor_final_price=1 where id=$1',[id(51)]);
 await denied('delete from public.quote_requests where id=$1',[id(51)]);
 await denied('insert into public.messages(quote_request_id,sender_id,receiver_id,body) values($1,$2,$3,$4)',[id(51),id(11),id(14),'Forged']);
 await denied('insert into public.bookings(event_id,planner_id,final_price) values($1,$2,1)',[id(41),id(11)]);
 await as(3);assert.equal((await sql('select * from public.quote_requests')).length,0);
 await assert.rejects(()=>rpc('get_quote_thread',[id(51)]));await assert.rejects(()=>rpc('send_quote_message',[id(51),'Attack']));
 await assert.rejects(()=>rpc('accept_quote_and_create_booking',[id(51),0]));await as(1);
 });
 await t.test('messages derive participants, validate input and persist as plain text',async()=>{
 for(const body of ['', '  ', 'x'.repeat(4001)]) await assert.rejects(()=>rpc('send_quote_message',[id(51),body]));
 const m=await rpc('send_quote_message',[id(51),'  Does setup include <script>alert(1)</script>?\nThank you.  ']);
 assert.equal(m.sender_id,id(11));assert.equal(m.receiver_id,id(12));assert.equal(m.quote_request_id,id(51));assert.ok(m.body.includes('<script>'));
 await as(2);const thread=await rpc('get_quote_thread',[id(51)]);assert.equal(thread.messages.length,1);assert.equal(thread.viewer_role,'vendor');
 assert.equal((await sql('select * from public.events')).length,0);assert.ok(!JSON.stringify(thread.context).includes('Private'));
 await rpc('send_quote_message',[id(51),'Thanks for reaching out. I am available that evening.']);
 await as(1);assert.equal((await rpc('get_quote_thread',[id(51)])).messages.length,2);
 });
 await t.test('vendor send and revision enforce role, price and current version',async()=>{
 await assert.rejects(()=>rpc('send_vendor_quote',[id(51),1800,'',0]));
 await as(2);
 for(const price of [null,0,-1,1.001,'NaN'])await assert.rejects(()=>rpc('send_vendor_quote',[id(51),price,'',0]));
 quote=await rpc('send_vendor_quote',[id(51),1800,'Setup included',0]);assert.equal(quote.status,'sent');assert.equal(quote.vendor_final_price,1800);
 quote=await rpc('send_vendor_quote',[id(51),2050,'Includes uplighting',1]);assert.equal(quote.quote_revision,2);
 await assert.rejects(()=>rpc('send_vendor_quote',[id(51),1700,'Stale',1]));
 await denied('update public.quote_requests set event_id=$1 where id=$2',[id(99),id(51)]);
 await as(4);assert.equal((await sql('select * from public.quote_requests where id=$1',[id(51)])).length,0);assert.equal((await sql('select * from public.messages where quote_request_id=$1',[id(51)])).length,0);
 await assert.rejects(()=>rpc('send_vendor_quote',[id(51),1,'',2]));await assert.rejects(()=>rpc('send_quote_message',[id(51),'Attack']));
 await as(1);await assert.rejects(()=>rpc('accept_quote_and_create_booking',[id(51),1]));
 });
 let booking;
 await t.test('acceptance creates one shared booking, retains conversation and preserves event state',async()=>{
 const results=await Promise.all([rpc('accept_quote_and_create_booking',[id(51),2]),rpc('accept_quote_and_create_booking',[id(51),2])]);
 booking=results[0];assert.equal(results[1].id,booking.id);assert.equal(booking.final_price,2050);assert.equal(booking.deposit_amount,0);assert.equal(booking.payment_status,'not_started');
 assert.equal((await sql('select * from public.bookings where quote_request_id=$1',[id(51)])).length,1);
 assert.equal((await sql('select status from public.events where id=$1',[id(41)]))[0].status,'planning');
 assert.equal((await sql('select status from public.quote_requests where id=$1',[id(52)]))[0].status,'pending');
 await rpc('send_quote_message',[id(51),'See you then.']);
 await as(2);const thread=await rpc('get_quote_thread',[id(51)]);assert.equal(thread.booking.id,booking.id);assert.equal(thread.quote.status,'accepted');assert.equal(thread.messages.at(-1).body,'See you then.');
 await assert.rejects(()=>rpc('send_vendor_quote',[id(51),3000,'',3]));await assert.rejects(()=>rpc('decline_quote',[id(51),'']));
 const inbox=await rpc('get_request_inbox',['vendor']);assert.equal(inbox[0].booking_id,booking.id);
 await rpc('save_booking_note',[booking.id,'Vendor schedule note']);await as(1);await rpc('save_booking_note',[booking.id,'Customer note']);
 assert.equal((await sql('select vendor_notes from public.bookings where id=$1',[booking.id]))[0].vendor_notes,'Vendor schedule note');
 await assert.rejects(()=>rpc('withdraw_quote_request',[id(51)]));
 });
 await t.test('withdrawal and decline preserve closed history and isolate providers',async()=>{
 await rpc('withdraw_quote_request',[id(52)]);await as(4);await assert.rejects(()=>rpc('send_vendor_quote',[id(52),500,'',1]));await assert.rejects(()=>rpc('send_quote_message',[id(52),'Late']));
 const declined=await rpc('decline_quote',[id(53),'Unavailable that evening']);assert.equal(declined.status,'declined');
 await as(1);const thread=await rpc('get_quote_thread',[id(53)]);assert.ok(thread.messages[0].body.includes('Unavailable'));assert.equal(thread.read_only,true);
 assert.equal((await rpc('get_quote_thread',[id(52)])).messages.length,1);
 });
 await t.test('legacy accepted and countered offers remain actionable',async()=>{
 await request(55); await request(56);
 await db.exec(`reset role; update public.quote_requests set status='accepted' where id='${id(55)}'; update public.quote_requests set status='countered',vendor_final_price=2200 where id='${id(56)}';`);await as(1);
 assert.equal((await rpc('accept_quote_and_create_booking',[id(55),0])).final_price,1500);
 assert.equal((await rpc('accept_quote_and_create_booking',[id(56),0])).final_price,2200);
 });
 await t.test('a failure during acceptance rolls back booking and quote together',async()=>{
 await request(57);await as(2);await rpc('send_vendor_quote',[id(57),700,'',0]);
 await db.exec(`reset role; create function public.test_reject_accept() returns trigger language plpgsql as $$begin if new.id='${id(57)}' and new.status='accepted' then raise exception 'injected failure'; end if; return new; end$$; create trigger test_failure before update on public.quote_requests for each row execute function public.test_reject_accept();`);
 await as(1);await assert.rejects(()=>rpc('accept_quote_and_create_booking',[id(57),1]));assert.equal((await sql('select * from public.bookings where quote_request_id=$1',[id(57)])).length,0);assert.equal((await sql('select status from public.quote_requests where id=$1',[id(57)]))[0].status,'sent');
 });
 await t.test('anonymous and anonymous-auth sessions cannot read or mutate requests',async()=>{
 await db.exec(`reset role; set role anon;`);for(const table of ['messages','bookings','quote_requests'])await denied(`select * from public.${table}`);
 await assert.rejects(()=>rpc('send_quote_message',[id(51),'Attack']));await assert.rejects(()=>rpc('accept_quote_and_create_booking',[id(51),3]));
 await as(1);await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);assert.equal((await sql('select * from public.messages')).length,0);await assert.rejects(()=>rpc('send_quote_message',[id(51),'Attack']));
 });
 } finally {await db.close();}
});
