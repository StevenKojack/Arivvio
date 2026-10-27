import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("business acquisition drafts, publication and authorization", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated,anon;`);
    await db.exec(
      readFileSync("supabase/schema.sql", "utf8").replace(
        'create extension if not exists "pgcrypto";',
        "",
      ),
    );
    await db.exec(readFileSync("supabase/phase4-account-model.sql", "utf8"));
    await db.exec(
      "grant usage on schema public to anon,authenticated;grant all on all tables in schema public to anon,authenticated;",
    );
    const emails = [
      "owner@jungle.example",
      "random@gmail.com",
      "manager@jungle.example",
      "stevenkojack2003@gmail.com",
      "other@jungle-support.example",
      "unconfirmed@jungle.example",
    ];
    for (let n = 1; n <= 6; n++)
      await db.exec(
        `insert into auth.users values('${id(n)}','${emails[n - 1]}',${n === 6 ? "null" : "now()"},false);insert into profiles(id,user_id,email) values('${id(n + 10)}','${id(n)}','${emails[n - 1]}');`,
      );
    for (const f of [
      "20261019155417_customer_continuity_reconciled.sql",
      "20261019231733_request_conversations_and_booking.sql",
      "20261021163808_public_listing_concierge.sql",
    ])
      await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
    for (const f of [
      "20261022201835_trusted_business_intake.sql",
      "20261023022245_privacy_launch_controls.sql",
      "20261026214746_business_acquisition.sql",
      "20261027031606_vendor_activation.sql",
    ])
      await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
    const as = async (n) =>
      db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id(n)}',false);select set_config('request.jwt.claims','${JSON.stringify({ email: emails[n - 1] })}',false);set role authenticated;`,
      );
    const op = async (operation, payload = {}) =>
      (
        await db.query("select public.acquisition_operation($1,$2::jsonb) r", [
          operation,
          JSON.stringify(payload),
        ])
      ).rows[0].r;
    const business = {
      business_name: "Research fixture",
      city: "Los Angeles",
      website_url: "https://fixture.example",
      address: "1 Fixture Road",
      description: "Fictional test only",
      services: [
        { category: "DJ", event_types: [] },
        { category: "Photo Booth", event_types: [] },
      ],
      sources: [
        {
          url: "https://fixture.example/contact",
          type: "official website",
          facts: ["identity", "location", "services"],
          researched_on: "2026-01-01",
          reviewed_on: "2026-01-01",
        },
      ],
    };
    await as(2);
    await t.test(
      "normal user cannot import, publish or read queue",
      async () => {
        await assert.rejects(
          op("import", { details: business }),
          /Admin access/,
        );
        await assert.rejects(op("publish", { id: id(99) }), /Admin access/);
        assert.equal(
          (await db.query("select * from public.business_research")).rows
            .length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.business_research(import_key,details,created_by) values('x','{}',$1)",
            [id(12)],
          ),
          /permission denied/,
        );
      },
    );
    await as(4);
    await t.test(
      "validation rejects sources, ownership and invented prices",
      async () => {
        await assert.rejects(
          op("import", { details: { ...business, sources: [] } }),
          /source/i,
        );
        await assert.rejects(
          op("import", { details: { ...business, owner_id: id(11) } }),
          /Authority/,
        );
        await assert.rejects(
          op("import", { details: { ...business, price: 100 } }),
          /prices/,
        );
      },
    );
    await t.test(
      "curated research batch validates without publishing",
      async () => {
        const batch = JSON.parse(
          readFileSync("research/los-angeles-2026-10-26.json", "utf8"),
        );
        assert.equal(batch.length, 15);
        for (const details of batch) await op("preview", { details });
        assert.equal(
          (await db.query("select count(*) n from public.vendor_businesses"))
            .rows[0].n,
          0,
        );
      },
    );
    const imported = await op("import", { details: business });
    const rid = imported.draft.id;
    await t.test(
      "retry is idempotent and import does not publish or create accounts",
      async () => {
        assert.equal(
          (await op("import", { details: business })).result,
          "already_imported",
        );
        assert.equal(
          (await db.query("select count(*) n from public.vendor_businesses"))
            .rows[0].n,
          0,
        );
        await db.exec("reset role");
        assert.equal(
          (await db.query("select count(*) n from public.profiles")).rows[0].n,
          6,
        );
        await as(4);
        await assert.rejects(
          op("publish", { id: rid }),
          /Review and mark ready/,
        );
      },
    );
    await op("status", { id: rid, status: "review" });
    await op("status", { id: rid, status: "ready" });
    const published = await op("publish", { id: rid });
    await t.test(
      "publication keeps one unowned unverified identity with multiple services",
      async () => {
        const v = (
          await db.query("select * from public.vendor_businesses where id=$1", [
            published.vendor_id,
          ])
        ).rows[0];
        assert.equal(v.owner_id, null);
        assert.equal(v.verification_status, "unverified");
        assert.equal(v.approval_status, "approved");
        const services = (
          await db.query(
            "select * from public.vendor_services where vendor_id=$1",
            [v.id],
          )
        ).rows;
        assert.equal(services.length, 2);
        assert.ok(services.every((s) => s.base_price === null));
        assert.equal(
          (await op("publish", { id: rid })).result,
          "already_published",
        );
      },
    );
    await t.test(
      "different branches remain possible, identical locations cannot be published twice",
      async () => {
        const b = await op("import", {
          details: {
            ...business,
            business_name: "Changed name",
            separate_reason: "Same physical business with changed name",
          },
        });
        await op("status", { id: b.draft.id, status: "review" });
        await op("status", { id: b.draft.id, status: "ready" });
        await assert.rejects(
          op("publish", { id: b.draft.id }),
          /Existing business/,
        );
        const branch = await op("import", {
          details: {
            ...business,
            address: "2 Fixture Road",
            location_name: "Second branch",
            separate_reason:
              "Separate branch supported by official location page",
          },
        });
        await op("status", { id: branch.draft.id, status: "review" });
        await op("status", { id: branch.draft.id, status: "ready" });
        const second = await op("publish", { id: branch.draft.id });
        assert.notEqual(second.vendor_id, published.vendor_id);
      },
    );
    const activation = async (operation,payload={}) => (await db.query('select public.activation_operation($1,$2::jsonb) r',[operation,JSON.stringify(payload)])).rows[0].r;
    const vendorId=published.vendor_id;
    const map={vendor_id:vendorId,address:'1 Fixture Road',feature_id:'address.fixture',matched_address:'1 Fixture Road, Los Angeles',latitude:34.1,longitude:-118.3,confirmed:true,fixed_location:true,is_fallback:false,place_type:'address',permanent:true};
    await t.test('only Admin may read operations or confirm map coordinates',async()=>{
      await as(2);await assert.rejects(activation('list'),/Admin access/);
      await assert.rejects(activation('confirm_map',map),/Admin access/);
      await assert.rejects(db.query('select * from private.vendor_contact_attempts'),/permission denied/);
      await as(4);
    });
    await t.test('coordinate confirmation rejects city, fallback, unconfirmed, stale and invalid results',async()=>{
      for(const patch of [{confirmed:false},{is_fallback:true},{place_type:'city'},{permanent:false},{address:'old address'},{latitude:91},{longitude:181},{fixed_location:false}])await assert.rejects(activation('confirm_map',{...map,...patch}));
      await activation('confirm_map',map);
      const v=(await db.query('select * from vendor_businesses where id=$1',[vendorId])).rows[0];assert.equal(v.latitude,34.1);assert.equal(v.longitude,-118.3);assert.equal(v.owner_id,null);assert.equal(v.verification_status,'unverified');
    });
    const contact={vendor_id:vendorId,contacted_at:'2026-01-01T12:00:00Z',channel:'phone',outcome:'interested',note:'Safe fixture only. Business asked about claiming.',confirmed:true,client_key:id(901)};
    await t.test('planning and preparing copy never invent contact history',async()=>{
      await activation('plan',{vendor_id:vendorId,state:'contact_planned'});await op('outreach',{vendor_id:vendorId});
      const row=(await activation('list')).find(b=>b.id===vendorId);assert.equal(row.attempts.length,0);assert.equal(row.state,'contact_planned');assert.equal(row.ready,false);
      await assert.rejects(activation('plan',{vendor_id:vendorId,state:'contacted'}),/actual contact/);
      await assert.rejects(activation('prepare_interest',{vendor_id:vendorId,lead_id:id(999)}),/Active customer interest/);
    });
    await t.test('actual contacts require confirmation, retain actor and are retry safe',async()=>{
      await assert.rejects(activation('record_contact',{...contact,confirmed:false}),/actually occurred/);
      await assert.rejects(activation('record_contact',{...contact,contacted_at:'2999-01-01'}),/past/);
      await assert.rejects(activation('record_contact',{...contact,lead_id:id(999)}),/another business/);
      await activation('record_contact',contact);await activation('record_contact',contact);
      const row=(await activation('list')).find(b=>b.id===vendorId);assert.equal(row.attempts.length,1);assert.equal(row.attempts[0].actor_id,id(14));assert.equal(row.state,'interested');
      await assert.rejects(activation('plan',{vendor_id:vendorId,state:'not_contacted'}),/history already exists/);
    });
    await t.test('follow-up requires a date and contact records preserve previous attempts',async()=>{
      await assert.rejects(activation('plan',{vendor_id:vendorId,state:'follow_up_needed'}),/follow-up date/);
      await activation('record_contact',{...contact,client_key:id(902),outcome:'follow_up_needed',follow_up_on:'2099-01-01'});
      const row=(await activation('list')).find(b=>b.id===vendorId);assert.equal(row.attempts.length,2);assert.equal(row.follow_up_on,'2099-01-01');
    });
    await t.test("freshness and do-not-contact are enforced", async () => {
      await op("status", { id: rid, status: "needs_recheck" });
      await op("recheck", { id: rid });
      const sources = (
        await db.query(
          "select reviewed_on,reviewed_by from public.listing_sources where vendor_id=$1",
          [published.vendor_id],
        )
      ).rows;
      assert.ok(
        sources.every((s) => s.reviewed_on && s.reviewed_by === id(14)),
      );
      await op("outreach", { vendor_id: published.vendor_id });
      await db.query("select public.contact_control('set',$1::jsonb)", [
        JSON.stringify({
          vendor_id: published.vendor_id,
          suppressed: true,
          reason: "Business requested no outreach",
        }),
      ]);
      await assert.rejects(activation('record_contact',{...contact,client_key:id(903)}),/Do not contact/);
      await assert.rejects(activation('plan',{vendor_id:vendorId,state:'contact_planned'}),/Do not contact/);
      await assert.rejects(activation('prepare_interest',{vendor_id:vendorId,lead_id:id(999)}),/Do not contact/);
      const suppressed=(await activation('list')).find(b=>b.id===vendorId);assert.equal(suppressed.suppressed,true);assert.equal(suppressed.attempts.length,2);
      await assert.rejects(
        op("outreach", { vendor_id: published.vendor_id }),
        /Do not contact/,
      );
    });
    await t.test('claim milestones, vendor readiness and concierge handoff use original records',async()=>{
      const listing=async(operation,payload)=>(await db.query('select public.listing_operation($1,$2::jsonb) r',[operation,JSON.stringify(payload)])).rows[0].r;
      const trust=async(operation,payload)=>(await db.query('select public.trust_operation($1,$2::jsonb) r',[operation,JSON.stringify(payload)])).rows[0].r;
      await as(4);
      const b=await listing('save_listing',{business_name:'Activation safe fixture',city:'Pasadena',category:'Venue',description:'Event venue',website_url:'https://activation.example',source_url:'https://activation.example',supported_fields:['identity','city'],publish:true});
      await as(2);await db.query('insert into events(id,planner_id,title,event_type,status) values($1,$2,$3,$4,$5)',[id(600),id(12),'Private fixture title','Wedding','planning']);
      const lead=await listing('lead',{vendor_id:b.id,event_id:id(600),customer_note:'Private note must not appear in outreach'});
      await as(4);const interest=await activation('prepare_interest',{vendor_id:b.id,lead_id:lead.id});assert.equal(interest.event_type,'Wedding');assert.equal(interest.title,undefined);assert.equal(interest.customer_note,undefined);
      await activation('record_contact',{...contact,vendor_id:b.id,lead_id:lead.id,client_key:id(904)});
      await assert.rejects(listing('handoff',{id:lead.id}));
      await as(1);const claim=await trust('claim',{vendor_id:b.id,relationship:'Owner',location_scope:'Pasadena',authority_attested:true,adult_attested:true});
      await as(4);let row=(await activation('list')).find(r=>r.id===b.id);assert.equal(row.pending_claims,1);assert.equal(row.ready,false);
      await trust('identity',{vendor_id:b.id,website_url:'https://activation.example',source_url:'https://activation.example',note:'Official source reviewed for this safe fixture'});
      await trust('evidence',{claim_id:claim.id,method:'public_record',source_reference:'https://registry.example/fixture',location_scope:'Pasadena',note:'Safe fixture record confirms the business and authorized owner. No production vendor is created.',identity_confirmed:true,authority_confirmed:true});
      await trust('review',{claim_id:claim.id,decision:'approved'});
      row=(await activation('list')).find(r=>r.id===b.id);assert.equal(row.id,b.id);assert.equal(row.owner_id,id(11));assert.equal(row.pending_claims,0);assert.equal(row.ready,true);
      const handed=await listing('handoff',{id:lead.id});assert.ok(handed.quote_request_id);assert.equal((await listing('handoff',{id:lead.id})).quote_request_id,handed.quote_request_id);
      await as(1);const q=(await db.query('select * from quote_requests where id=$1',[handed.quote_request_id])).rows[0];assert.equal(q.event_id,id(600));assert.equal(q.vendor_id,b.id);
      assert.equal((await db.query('update vendor_businesses set description=$1 where id=$2 returning id',['Updated by authorized owner',b.id])).rows.length,1);
      await as(2);await assert.rejects(activation('record_contact',{...contact,vendor_id:b.id,client_key:id(905)}),/Admin access/);
    });
  } finally {
    await db.close();
  }
});
