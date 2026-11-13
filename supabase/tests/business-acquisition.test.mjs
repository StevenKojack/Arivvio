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
      "20261103160458_business_media.sql",
      "20261104160319_admin_profile_editor.sql",
      "20261104194822_profile_workspace.sql",
      "20261105064750_vendor_operational_calendar.sql",
      "20261113010403_vendor_service_catalog.sql",
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
    await t.test('media candidates are private, approval requires rights and normal users cannot review',async()=>{
      const media=async(operation,payload={})=>(await db.query('select public.media_operation($1,$2::jsonb) r',[operation,JSON.stringify(payload)])).rows[0].r;
      await as(4);
      const candidate=await media('candidate',{vendor_id:vendorId,image_url:'https://fixture.example/photo.jpg',source_url:'https://fixture.example/permission',media_kind:'business_photo',alt_text:'Event room',rights_basis:''});
      await as(2);assert.equal((await db.query('select * from vendor_photos where id=$1',[candidate.id])).rows.length,0);
      await assert.rejects(media('review',{id:candidate.id,status:'approved'}),/Admin/);
      await assert.rejects(media('list'),/Admin/);
      await assert.rejects(media('reorder',{vendor_id:vendorId,ids:[candidate.id]}),/editor/);
      await as(4);await assert.rejects(media('review',{id:candidate.id,status:'approved',rights_basis:'Permission documented',alt_text:'Event room'}),/confirmation/);
      await assert.rejects(media('review',{id:candidate.id,status:'approved',rights_confirmed:true,rights_basis:'',alt_text:'Event room'}),/rights basis/);
      const approved=await media('review',{id:candidate.id,status:'approved',rights_confirmed:true,rights_basis:'Fixture permission for marketplace display',alt_text:'Event room'});
      assert.equal(approved.reviewed_by,id(14));assert.ok(approved.reviewed_at);
      await as(2);assert.equal((await db.query('select * from vendor_photos where id=$1',[candidate.id])).rows.length,1);
      await as(4);await media('review',{id:candidate.id,status:'rejected',rights_basis:'Permission withdrawn',alt_text:'Event room'});
      await as(2);assert.equal((await db.query('select * from vendor_photos where id=$1',[candidate.id])).rows.length,0);
    });
    await t.test('Admin edits are scoped, persistent and reject stale data; uploads retain their role',async()=>{
      const edit=(op,body)=>db.query('select public.admin_profile_edit($1,$2::jsonb)',[op,JSON.stringify({vendor_id:vendorId,...body})]);
      const services=()=>db.query('select * from vendor_services where vendor_id=$1 order by id',[vendorId]);
      await as(4);const original=(await services()).rows;
      const prior=(await db.query('select description from vendor_businesses where id=$1',[vendorId])).rows[0];
      const patch={before:prior,changes:{description:'Admin supplied profile text.'}};
      await as(2);await assert.rejects(edit('profile',patch),/Admin access/);
      await as(4);await edit('profile',patch);await assert.rejects(edit('profile',patch),/changed/);
      const sections=[{title:'Party packages',body:'Bring socks.\nChoose your arena.'}];
      await edit('profile',{before:{profile_sections:[]},changes:{profile_sections:sections}});
      assert.deepEqual((await db.query('select profile_sections from vendor_businesses where id=$1',[vendorId])).rows[0].profile_sections,sections);
      await assert.rejects(edit('profile',{before:{profile_sections:sections},changes:{profile_sections:[{title:'',body:'Invalid'}]}}),/heading/);
      assert.deepEqual((await services()).rows,original);
      await assert.rejects(edit('profile',{changes:{owner_id:id(11)},before:{owner_id:null}}),/Invalid/);
      await edit('new_service',{id:id(987),changes:{service_name:'Private party',category:'Venue',pricing_type:'flat',base_price:125}});
      await edit('service',{id:id(987),before:{base_price:125},changes:{base_price:150}});
      assert.equal(Number((await services()).rows.find(s=>s.id===id(987)).base_price),150);
      await db.exec('reset role;create schema if not exists storage;create table if not exists storage.objects(bucket_id text,name text,owner_id text)');
      const path=vendorId+'/admin/'+id(988)+'.png';
      await db.query('insert into storage.objects values($1,$2,$3)',['vendor-photos',path,id(4)]);await as(4);
      const upload={path,url:'https://fixture.supabase.co/storage/v1/object/public/vendor-photos/'+path,kind:'logo',placement:'logo',alt:'Fixture logo',rights:'Original artwork owned by operator',rights_confirmed:true};
      await assert.rejects(edit('upload',{...upload,rights_confirmed:false}),/confirmed/);
      await edit('upload',upload);await edit('upload',upload);
      const photos=(await db.query('select * from vendor_photos where storage_path=$1',[path])).rows;
      assert.equal(photos.length,1);assert.equal(photos[0].media_kind,'logo');assert.equal(photos[0].reviewed_by,id(14));
      await edit('unpublish',{id:photos[0].id});await as(2);
      assert.equal((await db.query('select * from vendor_photos where storage_path=$1',[path])).rows.length,0);
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
      const modify=(op,body)=>db.query('select public.profile_workspace_edit($1,$2::jsonb)',[op,JSON.stringify(body)]);
      await as(2);await assert.rejects(modify('profile',{vendor_id:b.id,before:{description:'Event venue'},changes:{description:'Wrong branch'}}),/editor/);
      const candidate=await trust('candidate',{business_name:'Studio fixture',city:'Pasadena',category:'Photography',relationship:'Owner',location_scope:'Pasadena',authority_attested:true,adult_attested:true,separate_reason:'Independent fixture business in another category'});
      const draft=candidate.vendor_id;
      await modify('profile',{vendor_id:draft,before:{short_intro:null},changes:{short_intro:'Conference coverage'}});
      await assert.rejects(modify('profile',{vendor_id:draft,before:{short_intro:null},changes:{short_intro:'Overwritten'}}),/changed/);
      await modify('profile',{vendor_id:draft,before:{profile_sections:[]},changes:{profile_sections:[{title:'Editing',body:'Color correction included.'}]}});
      await modify('new_service',{vendor_id:draft,id:id(978),changes:{service_name:'Conference photography',category:'Photography',pricing_type:'flat'}});
      await modify('specialties',{vendor_id:draft,before_tags:[],tags:['Conferences']});
      await assert.rejects(modify('service',{vendor_id:draft,id:id(987),before:{base_price:150},changes:{base_price:222}}));
      await as(3);await assert.rejects(modify('profile',{vendor_id:draft,before:{short_intro:'Conference coverage'},changes:{short_intro:'Other actor'}}),/editor/);
      await as(1);const claim=await trust('claim',{vendor_id:b.id,relationship:'Owner',location_scope:'Pasadena',authority_attested:true,adult_attested:true});
      await as(4);let row=(await activation('list')).find(r=>r.id===b.id);assert.equal(row.pending_claims,1);assert.equal(row.ready,false);
      await trust('identity',{vendor_id:b.id,website_url:'https://activation.example',source_url:'https://activation.example',note:'Official source reviewed for this safe fixture'});
      await trust('evidence',{claim_id:claim.id,method:'public_record',source_reference:'https://registry.example/fixture',location_scope:'Pasadena',note:'Safe fixture record confirms the business and authorized owner. No production vendor is created.',identity_confirmed:true,authority_confirmed:true});
      await trust('review',{claim_id:claim.id,decision:'approved'});
      await as(1);await assert.rejects(modify('profile',{vendor_id:b.id,before:{business_name:'Activation safe fixture'},changes:{business_name:'Wrong identity'}}),/review/);
      await as(4);row=(await activation('list')).find(r=>r.id===b.id);assert.equal(row.id,b.id);assert.equal(row.owner_id,id(11));assert.equal(row.pending_claims,0);assert.equal(row.ready,true);
      const handed=await listing('handoff',{id:lead.id});assert.ok(handed.quote_request_id);assert.equal((await listing('handoff',{id:lead.id})).quote_request_id,handed.quote_request_id);
      await as(1);const q=(await db.query('select * from quote_requests where id=$1',[handed.quote_request_id])).rows[0];assert.equal(q.event_id,id(600));assert.equal(q.vendor_id,b.id);
      assert.equal((await db.query('update vendor_businesses set description=$1 where id=$2 returning id',['Updated by authorized owner',b.id])).rows.length,1);
      const upload=async(path,basis='Vendor attests ownership or permission to publish')=>(await db.query('insert into vendor_photos(vendor_id,image_url,storage_path,rights_basis,alt_text) values($1,$2,$3,$4,$5) returning *',[b.id,'https://fixture.supabase.co/storage/v1/object/public/vendor-photos/'+path,path,basis,'Business event room'])).rows[0];
      const photo=await upload(b.id+'/one.jpg');assert.equal(photo.media_status,'approved');assert.equal(photo.rights_attested_by,id(11));assert.ok(photo.rights_attested_at);
      await assert.rejects(upload(b.id+'/two.jpg',''),/attestation/);
      await assert.rejects(upload(id(999)+'/foreign.jpg'),/authorized upload/);
      await assert.rejects(db.query("update vendor_photos set image_url='https://other.example/stolen.jpg' where id=$1",[photo.id]),/Only photo ordering/);
      const photo2=await upload(b.id+'/two.jpg');
      const media=async(payload)=>db.query("select public.media_operation('reorder',$1::jsonb)",[JSON.stringify(payload)]);
      await assert.rejects(media({vendor_id:b.id,ids:[photo.id,photo.id]}),/complete photo list/);
      await media({vendor_id:b.id,ids:[photo2.id,photo.id]});assert.equal((await db.query('select sort_order from vendor_photos where id=$1',[photo2.id])).rows[0].sort_order,0);
      const path=b.id+'/editor/'+id(995)+'.jpg';
      await db.exec('reset role');await db.query('insert into storage.objects values($1,$2,$3)',['vendor-photos',path,id(1)]);await as(1);
      const uploadPayload={vendor_id:b.id,kind:'logo',placement:'logo',path,url:'https://fixture.supabase.co/storage/v1/object/public/vendor-photos/'+path,alt:'Business logo',rights:'This is my original logo',rights_confirmed:true};
      await modify('upload',uploadPayload);await modify('upload',uploadPayload);
      const logo=(await db.query('select * from vendor_photos where storage_path=$1',[path])).rows[0];assert.equal(logo.media_kind,'logo');assert.equal(logo.rights_attested_by,id(11));
      await modify('caption',{vendor_id:b.id,id:logo.id,before_alt:'Business logo',alt:'Original company mark'});
      await modify('unpublish',{vendor_id:b.id,id:logo.id});
      await as(3);assert.equal((await db.query('select * from vendor_photos where id=$1',[logo.id])).rows.length,0);
      await as(2);await assert.rejects(activation('record_contact',{...contact,vendor_id:b.id,client_key:id(905)}),/Admin access/);
    });
    await t.test('private operational calendar persists and isolates businesses',async()=>{
      await as(2);
      const candidate=await db.query("select public.trust_operation('candidate',$1::jsonb) r",[JSON.stringify({business_name:'Calendar fixture',city:'Pasadena',category:'Photography',relationship:'Owner',location_scope:'Pasadena',authority_attested:true,adult_attested:true,separate_reason:'Independent calendar test fixture'})]);
      const business=candidate.rows[0].r.vendor_id;
      const insert=async(n,start,end,extra={})=>db.query(`insert into vendor_calendar_events(id,vendor_id,name,date,end_date,start_time,end_time,timezone,status,client_contact) values($1,$2,'Private fixture','2026-11-05',$3,$4,$5,$6,$7,'private@example.test') returning *`,[id(n),extra.business||business,extra.end_date||'2026-11-05',start,end,extra.zone||'America/Los_Angeles',extra.status||'Confirmed']);
      const a=(await insert(7001,'09:00','10:00')).rows[0];await insert(7002,'11:00','12:00');await insert(7003,'23:00','02:00',{end_date:'2026-11-06'});
      assert.equal(a.created_by,id(12));assert.equal((await db.query('select * from vendor_calendar_events where vendor_id=$1',[business])).rows.length,3);
      for(const status of ['Hold','Tentative','Confirmed','Completed','Cancelled'])await db.query('update vendor_calendar_events set status=$1 where id=$2',[status,a.id]);
      const saved=(await db.query("update vendor_calendar_events set tasks='[{\"title\":\"Pack equipment\",\"done\":true}]' where id=$1 returning *",[a.id])).rows[0];assert.equal(saved.tasks[0].done,true);assert.equal(saved.version,7);
      assert.equal((await db.query('update vendor_calendar_events set name=$1 where id=$2 and version=1 returning *',['Stale',a.id])).rows.length,0);
      const tasks = [{ title: 'Pack equipment', done: false }, { title: 'Check access', done: false }];
      const updateTasks = (branch, version) => db.query(
        'update vendor_calendar_events set tasks=$1::jsonb where id=$2 and vendor_id=$3 and version=$4 returning *',
        [JSON.stringify(tasks), a.id, branch, version],
      );
      assert.equal((await updateTasks(id(9999), saved.version)).rows.length, 0);
      assert.equal((await updateTasks(business, saved.version - 1)).rows.length, 0);
      const reopened = (await updateTasks(business, saved.version)).rows[0];
      assert.equal(reopened.version, saved.version + 1);
      assert.equal(reopened.client_contact, 'private@example.test');
      const clientUpdate = await db.query(
        'update vendor_calendar_events set notes=$1,client_name=$2 where id=$3 and vendor_id=$4 and version=$5 returning *',
        ['Use the west entrance', 'Fixture client', a.id, business, reopened.version],
      );
      assert.deepEqual(clientUpdate.rows[0].tasks, tasks);
      const reread = (await db.query('select * from vendor_calendar_events where id=$1 and vendor_id=$2', [a.id, business])).rows[0];
      assert.deepEqual(reread.tasks, tasks);
      assert.equal(reread.notes, 'Use the west entrance');
      assert.equal(reread.client_name, 'Fixture client');
      await assert.rejects(insert(7010,'12:00','10:00'));
      await assert.rejects(insert(7011,'12:00','13:00',{zone:'Not/AZone'}));
      await assert.rejects(db.query('update vendor_calendar_events set service_id=$1 where id=$2',[id(987),a.id]));
      await assert.rejects(db.query("update vendor_calendar_events set tasks='[{\"title\":\"Bad task\"}]' where id=$1",[a.id]));
      await as(3);assert.equal((await db.query('select client_name,client_contact,notes,tasks from vendor_calendar_events')).rows.length,0);
      assert.equal((await updateTasks(business, clientUpdate.rows[0].version)).rows.length, 0);
      await assert.rejects(insert(7012,'12:00','13:00'));assert.equal((await db.query('update vendor_calendar_events set name=$1 where id=$2 returning *',['Unauthorized',a.id])).rows.length,0);await assert.rejects(db.query('delete from vendor_calendar_events where id=$1',[a.id]));
      await db.exec('reset role;set role anon');await assert.rejects(db.query('select client_contact from vendor_calendar_events'));
      await as(2);assert.equal((await db.query('select status from vendor_calendar_events where id=$1',[a.id])).rows[0].status,'Cancelled');
    });
    await t.test('private client directory persists, preserves event snapshots and rejects cross-branch links', async () => {
      await as(2);
      const candidate = name => db.query("select public.trust_operation('candidate',$1::jsonb) r", [
        JSON.stringify({ business_name: name, city: 'Pasadena', category: 'Photography',
          relationship: 'Owner', location_scope: 'Pasadena', authority_attested: true, adult_attested: true,
          separate_reason: 'Independent client directory test fixture' }),
      ]).then(result => result.rows[0].r.vendor_id);
      const branch = await candidate('Directory North Fixture');
      const other = await candidate('Directory South Fixture');
      const insertEvent = (number, vendor) => db.query(
        "insert into vendor_calendar_events(id,vendor_id,name,date,end_date,start_time,end_time,timezone,client_name,client_contact) values($1,$2,'Fixture event','2026-11-05','2026-11-05','09:00','10:00','America/Los_Angeles','Saved contact','original@example.test')",
        [id(number), vendor],
      );
      await insertEvent(7100, branch);
      await insertEvent(7101, branch);
      await insertEvent(7102, other);

      await db.exec('reset role');
      await db.exec(readFileSync('supabase/migrations/20261112124704_vendor_client_directory.sql', 'utf8'));
      await as(2);
      const insert = (vendor, name) => db.query(
        'insert into vendor_clients(vendor_id,display_name) values($1,$2) returning *', [vendor, name],
      ).then(result => result.rows[0]);
      const client = await insert(branch, '  Fixture Client  ');
      const sameName = await insert(branch, 'Fixture Client');
      const otherClient = await insert(other, 'Fixture Client');
      assert.equal(client.display_name, 'Fixture Client');
      assert.equal(client.created_by, id(12));
      assert.equal(client.email, '');
      assert.notEqual(client.id, sameName.id);
      assert.deepEqual((await db.query('select id from vendor_clients where vendor_id=$1', [other])).rows, [{ id: otherClient.id }]);

      const before = (await db.query('select client_id,client_contact,version from vendor_calendar_events where id=$1', [id(7100)])).rows[0];
      assert.deepEqual(before, { client_id: null, client_contact: 'original@example.test', version: 1 });
      const link = (event, vendor, clientId, version) => db.query(
        'update vendor_calendar_events set client_id=$1 where id=$2 and vendor_id=$3 and version=$4 returning id',
        [clientId, id(event), vendor, version],
      );
      await assert.rejects(link(7100, branch, otherClient.id, 1), /vendor_calendar_client_branch_fk/);
      assert.equal((await link(7100, branch, client.id, 1)).rows.length, 1);
      assert.equal((await link(7101, branch, client.id, 1)).rows.length, 1);
      assert.equal((await link(7100, branch, sameName.id, 1)).rows.length, 0);
      await assert.rejects(link(7102, other, client.id, 1), /vendor_calendar_client_branch_fk/);
      const updated = (await db.query(
        "update vendor_clients set email='current@example.test' where id=$1 and vendor_id=$2 and version=1 returning *",
        [client.id, branch],
      )).rows[0];
      assert.equal(updated.version, 2);
      assert.equal(updated.updated_by, id(12));
      assert.equal((await db.query(
        "update vendor_clients set email='stale@example.test' where id=$1 and vendor_id=$2 and version=1 returning id",
        [client.id, branch],
      )).rows.length, 0);
      await assert.rejects(db.query('update vendor_clients set vendor_id=$1 where id=$2', [other, client.id]), /business identity/);
      const history = (await db.query(
        'select id,client_contact from vendor_calendar_events where vendor_id=$1 and client_id=$2 order by id',
        [branch, client.id],
      )).rows;
      assert.deepEqual(history, [7100, 7101].map(n => ({ id: id(n), client_contact: 'original@example.test' })));

      await as(3);
      assert.equal((await db.query('select * from vendor_clients where id=$1', [client.id])).rows.length, 0);
      await assert.rejects(insert(branch, 'Unauthorized'));
      assert.equal((await db.query('update vendor_clients set notes=$1 where id=$2 returning id', ['Unauthorized', client.id])).rows.length, 0);
      assert.equal((await db.query('select * from vendor_calendar_events where client_id=$1', [client.id])).rows.length, 0);
      await db.exec('reset role; set role anon;');
      await assert.rejects(db.query('select * from vendor_clients'), /permission denied/);
    });
    await t.test('private operations persist without modifying quotes, bookings or communications', async () => {
      await db.exec('reset role');
      await db.exec(readFileSync('supabase/migrations/20261112185422_vendor_private_operations.sql', 'utf8'));
      const request = (await db.query('select * from quote_requests where event_id=$1', [id(600)])).rows[0];
      assert.ok(request);
      const count = async () => (await db.query(
        'select (select count(*) from messages) as messages, (select count(*) from bookings) as bookings',
      )).rows[0];
      const before = await count();
      const draft = (vendor, requestId = request.id) => db.query(
        "insert into vendor_private_operations(vendor_id,request_id,proposed_amount,draft_notes,private_notes) values($1,$2,250,'Fixture draft','Fixture notes') returning *",
        [vendor, requestId],
      );
      await as(1);
      await assert.rejects(draft(request.vendor_id, id(9981)), /row-level security/);
      const row = (await draft(request.vendor_id)).rows[0];
      assert.equal(Number(row.proposed_amount), 250);
      assert.equal(row.draft_notes, 'Fixture draft');
      assert.equal(row.version, 1);
      await assert.rejects(draft(request.vendor_id), /duplicate key/);
      const update = (notes, version) => db.query(
        'update vendor_private_operations set private_notes=$1 where vendor_id=$2 and id=$3 and version=$4 returning *',
        [notes, request.vendor_id, row.id, version],
      );
      const saved = (await update('Updated internal notes', 1)).rows[0];
      assert.equal(saved.version, 2);
      assert.equal((await update('Stale edit', 1)).rows.length, 0);
      assert.equal(saved.draft_notes, 'Fixture draft');
      assert.equal((await db.query('select private_notes from vendor_private_operations where id=$1', [row.id])).rows[0].private_notes, 'Updated internal notes');
      await as(2);
      assert.equal((await db.query('select * from vendor_private_operations')).rows.length, 0);
      assert.equal((await update('Customer cannot edit', 2)).rows.length, 0);
      await assert.rejects(draft(request.vendor_id), /row-level security/);
      await db.exec('reset role');
      assert.deepEqual(await count(), before);
      assert.deepEqual((await db.query('select * from quote_requests where id=$1', [request.id])).rows[0], request);

      const booking = (await db.query(
        "insert into bookings(id,event_id,planner_id,vendor_id,quote_request_id,final_price,booking_status,vendor_notes) values($1,$2,$3,$4,$5,400,'confirmed','Shared fixture note') returning *",
        [id(7200), request.event_id, request.planner_id, request.vendor_id, request.id],
      )).rows[0];
      const beforePrep = await count();
      await as(1);
      const tasks = [{ title: 'Prepare equipment', done: true }];
      const prep = (await db.query(
        "insert into vendor_private_operations(vendor_id,booking_id,private_notes,tasks) values($1,$2,'Private fixture note',$3::jsonb) returning *",
        [request.vendor_id, booking.id, JSON.stringify(tasks)],
      )).rows[0];
      assert.deepEqual(prep.tasks, tasks);
      const reopened = [{ title: 'Prepare equipment', done: false }];
      await db.query('update vendor_private_operations set tasks=$1::jsonb where id=$2 and version=1', [JSON.stringify(reopened), prep.id]);
      const reread = (await db.query('select * from vendor_private_operations where booking_id=$1', [booking.id])).rows[0];
      assert.deepEqual(reread.tasks, reopened);
      assert.equal(reread.private_notes, 'Private fixture note');
      await assert.rejects(db.query('update vendor_private_operations set vendor_id=$1 where id=$2', [id(9982), prep.id]), /permission denied/);
      await assert.rejects(db.query("update vendor_private_operations set tasks='[{}]' where id=$1", [prep.id]), /title and completion state/);
      await as(2);
      assert.equal((await db.query('select * from vendor_private_operations where booking_id=$1', [booking.id])).rows.length, 0);
      assert.equal((await db.query('select vendor_notes from bookings where id=$1', [booking.id])).rows[0].vendor_notes, 'Shared fixture note');
      await db.exec('reset role');
      assert.deepEqual(await count(), beforePrep);
      assert.deepEqual((await db.query('select * from bookings where id=$1', [booking.id])).rows[0], booking);
      await db.exec('set role anon');
      await assert.rejects(db.query('select * from vendor_private_operations'), /permission denied/);
    });
    await t.test('service catalog preserves package identity and enforces private checklist and public visibility boundaries', async () => {
      await db.exec('reset role');
      const source = (await db.query("select b.id as business, s.id as service from vendor_businesses b join vendor_services s on s.vendor_id=b.id where b.business_name='Activation safe fixture' limit 1")).rows[0];
      const [business, service] = [source.business, source.service];
      const counts = async () => (await db.query("select (select count(*) from quote_requests) quotes, (select count(*) from bookings) bookings, (select count(*) from messages) messages")).rows[0];
      const before = await counts();
      const original = (await db.query('select * from vendor_services where id=$1',[service])).rows[0];
      await as(1);
      const pkg = (await db.query("insert into vendor_service_packages(vendor_id,service_id,name,active,inclusions) values($1,$2,'Standard',true,array['Setup']) returning *",[business,service])).rows[0];
      const second = (await db.query("insert into vendor_service_packages(vendor_id,service_id,name,pricing_model,amount,minimum_guests) values($1,$2,'Reception','per_guest',24.50,12) returning *",[business,service])).rows[0];
      assert.notEqual(pkg.id, second.id);
      assert.equal(second.minimum_guests, 12);
      assert.equal((await db.query("update vendor_service_packages set name='Standard updated' where id=$1 and version=1 returning id,version",[pkg.id])).rows[0].id,pkg.id);
      assert.equal((await db.query("update vendor_service_packages set name='Stale' where id=$1 and version=1 returning id",[pkg.id])).rows.length,0);
      await db.query("insert into vendor_service_checklists(vendor_id,service_id,tasks) values($1,$2,array['Pack cables','Review timeline'])",[business,service]);
      assert.deepEqual((await db.query('select tasks from vendor_service_checklists where service_id=$1',[service])).rows[0].tasks,['Pack cables','Review timeline']);
      assert.equal((await db.query("update vendor_service_checklists set tasks=array['New checklist'] where service_id=$1 and version=1 returning version",[service])).rows[0].version,2);
      assert.equal((await db.query("update vendor_service_checklists set tasks=array['Stale'] where service_id=$1 and version=1 returning version",[service])).rows.length,0);
      await assert.rejects(db.query("insert into vendor_service_packages(vendor_id,service_id,name) values($1,$2,'Wrong branch')",[business,id(978)]), /foreign key/);
      await assert.rejects(db.query("insert into vendor_service_checklists(vendor_id,service_id) values($1,$2)",[business,id(978)]), /foreign key/);
      await as(2);
      assert.equal((await db.query('select * from vendor_service_checklists')).rows.length,0);
      assert.equal((await db.query('update vendor_service_packages set active=false where id=$1 returning id',[pkg.id])).rows.length,0);
      await assert.rejects(db.query("insert into vendor_service_packages(vendor_id,service_id,name) values($1,$2,'Unauthorized')",[business,service]),/row-level security/);
      const publicPackages = async () => {
        await db.exec('reset role;set role anon');
        return (await db.query('select name from vendor_service_packages where service_id=$1 order by name',[service])).rows;
      };
      assert.deepEqual(await publicPackages(),[{name:'Standard updated'}]);
      await assert.rejects(db.query('select * from vendor_service_checklists'),/permission denied/);
      await as(1);
      await db.query('update vendor_service_packages set active=false where id=$1 and version=2',[pkg.id]);
      assert.deepEqual(await publicPackages(),[]);
      await as(1);
      await db.query('update vendor_service_packages set active=true where id=$1 and version=3',[pkg.id]);
      await db.exec('reset role');
      await db.query('update vendor_services set active=false where id=$1',[service]);
      assert.deepEqual(await publicPackages(),[]);
      await db.exec('reset role');
      await db.query('update vendor_services set active=true where id=$1',[service]);
      await db.query('update vendor_businesses set vacation_mode=true where id=$1',[business]);
      assert.deepEqual(await publicPackages(),[]);
      await db.exec('reset role');
      await db.query('update vendor_businesses set vacation_mode=false where id=$1',[business]);
      assert.deepEqual((await db.query('select * from vendor_services where id=$1',[service])).rows[0], original);
      const unclaimed = (await db.query("select b.id as business,s.id as service from vendor_businesses b join vendor_services s on s.vendor_id=b.id where b.owner_id is null and b.approval_status='approved' and s.active limit 1")).rows[0];
      await db.query("insert into vendor_service_packages(vendor_id,service_id,name,active) values($1,$2,'Unclaimed test package',true)",[unclaimed.business,unclaimed.service]);
      await db.exec('set role anon');
      assert.equal((await db.query('select id from vendor_service_packages where service_id=$1',[unclaimed.service])).rows.length,0);
      await db.exec('reset role');
      await db.query("update vendor_businesses set approval_status='pending' where id=$1",[business]);
      assert.deepEqual(await publicPackages(),[]);
      await db.exec('reset role');
      await db.query("update vendor_businesses set approval_status='approved' where id=$1",[business]);
      const currentTemplate = (await db.query('select tasks from vendor_service_checklists where service_id=$1',[service])).rows[0].tasks;
      const existingTasks = [{title:'Reserve equipment',done:true}];
      const { checklistAdditions } = await import('../../lib/service-catalog/model.ts');
      const copied = [...existingTasks, ...checklistAdditions(existingTasks,currentTemplate)];
      await as(1);
      const event = (await db.query(
        "insert into vendor_calendar_events(vendor_id,name,date,end_date,start_time,end_time,timezone,status,service_id,tasks) values($1,'Catalog fixture','2026-11-25','2026-11-25','09:00','10:00','America/Los_Angeles','Confirmed',$2,$3::jsonb) returning id,version",
        [business,service,JSON.stringify(existingTasks)],
      )).rows[0];
      await db.query('update vendor_calendar_events set tasks=$1::jsonb where vendor_id=$2 and id=$3 and version=$4',[JSON.stringify(copied),business,event.id,event.version]);
      const booking = (await db.query('select * from bookings where id=$1',[id(7200)])).rows[0];
      const prep = (await db.query('select * from vendor_private_operations where vendor_id=$1 and booking_id=$2',[business,booking.id])).rows[0];
      const bookingTasks = [...prep.tasks, ...checklistAdditions(prep.tasks,currentTemplate)];
      await db.query('update vendor_private_operations set tasks=$1::jsonb where vendor_id=$2 and id=$3 and version=$4',[JSON.stringify(bookingTasks),business,prep.id,prep.version]);
      await db.query("update vendor_service_checklists set tasks=array['Changed after copying'] where service_id=$1 and version=2",[service]);
      assert.deepEqual((await db.query('select tasks from vendor_calendar_events where id=$1',[event.id])).rows[0].tasks,copied);
      assert.deepEqual((await db.query('select tasks from vendor_private_operations where id=$1',[prep.id])).rows[0].tasks,bookingTasks);
      assert.deepEqual((await db.query('select * from bookings where id=$1',[booking.id])).rows[0],booking);
      await db.exec('reset role');
      assert.deepEqual(await counts(),before);
    });
    await t.test('package cart and request snapshots enforce eligibility, ownership and history', async () => {
      await db.exec('reset role');
      await db.exec(readFileSync('supabase/migrations/20261113065732_customer_package_selection.sql', 'utf8'));
      const { business, service } = (await db.query("select b.id business,s.id service from vendor_businesses b join vendor_services s on s.vendor_id=b.id where b.business_name='Activation safe fixture' limit 1")).rows[0];
      const event = id(600);
      const pkg = async (name, active = true) => (await db.query(
        'insert into vendor_service_packages(vendor_id,service_id,name,active) values($1,$2,$3,$4) returning id',
        [business,service,name,active],
      )).rows[0].id;
      const a = await pkg('First');
      const b = await pkg('Second');
      const c = await pkg('Third');
      const inactive = await pkg('Inactive',false);
      const originalCounts = async () => (await db.query('select (select count(*) from messages) messages,(select count(*) from bookings) bookings,(select count(*) from quote_requests) requests')).rows[0];
      const before = await originalCounts();
      const originalBooking = (await db.query('select * from bookings where id=$1',[id(7200)])).rows[0];
      await as(2);
      assert.equal((await db.query("select id from vendor_service_packages where id=any($1::uuid[])",[[a,b,c,inactive]])).rows.length,3);
      const add = (packageId, vendor = business, serviceId = service) => db.query(
        "insert into cart_items(event_id,item_type,vendor_id,service_id,package_id,start_time,end_time,package_snapshot) values($1,'vendor_service',$2,$3,$4,'13:00','15:00','{\"name\":\"forged\"}') returning *",
        [event,vendor,serviceId,packageId],
      );
      await assert.rejects(add(inactive),/unavailable/);
      await assert.rejects(add(a,id(9999)),/unavailable/);
      await assert.rejects(add(a,business,id(978)),/unavailable/);
      const first = (await add(a)).rows[0];
      assert.equal(first.package_snapshot.name,'First');
      assert.equal(first.package_snapshot.amount,null);
      assert.equal(first.package_snapshot.version,undefined);
      const change = (packageId) => db.query('update cart_items set package_id=$1,package_snapshot=null where id=$2 returning *',[packageId,first.id]);
      const second = (await change(b)).rows[0];
      assert.equal(second.id,first.id);
      assert.equal(second.start_time,first.start_time);
      assert.equal(second.end_time,first.end_time);
      assert.equal((await change(null)).rows[0].package_snapshot,null);
      await change(a);
      const restored = (await db.query('select * from cart_items where id=$1',[first.id])).rows[0];
      assert.equal(restored.package_id,a);
      await as(3);
      assert.equal((await db.query('select * from cart_items where id=$1',[first.id])).rows.length,0);
      await assert.rejects(add(a),/active event you own|row-level security/);
      await db.exec('reset role');
      assert.deepEqual(await originalCounts(),before);
      const send = (snapshot, packageId = a) => db.query(
        'insert into quote_requests(event_id,planner_id,vendor_id,service_id,package_id,package_snapshot,estimated_price) values($1,$2,$3,$4,$5,$6::jsonb,999) returning *',
        [event,id(12),business,service,packageId,JSON.stringify(snapshot)],
      );
      await as(2);
      await assert.rejects(send({ ...restored.package_snapshot, name:'Fake' }),/changed/);
      await as(1);
      await db.query("update vendor_service_packages set active=false where id=$1",[a]);
      await as(2);
      await assert.rejects(send(restored.package_snapshot),/unavailable/);
      await as(1);
      await db.query("update vendor_service_packages set active=true,name='Revised' where id=$1",[a]);
      await as(2);
      await assert.rejects(send(restored.package_snapshot),/changed/);
      const reviewed = (await change(a)).rows[0].package_snapshot;
      const request = (await send(reviewed)).rows[0];
      assert.equal(request.package_id,a);
      assert.deepEqual(request.package_snapshot,reviewed);
      assert.equal(request.estimated_price,null);
      assert.equal(request.vendor_final_price,null);
      assert.equal(request.quote_revision,0);
      const serviceOnly = (await send(null,null)).rows[0];
      assert.equal(serviceOnly.package_id,null);
      assert.equal(serviceOnly.package_snapshot,null);
      assert.equal(serviceOnly.estimated_price,'999.00');
      const thread = async () => (await db.query('select public.get_quote_thread($1) r',[request.id])).rows[0].r;
      assert.deepEqual((await thread()).quote.package_snapshot,reviewed);
      await as(1);
      assert.deepEqual((await thread()).quote.package_snapshot,reviewed);
      await db.query("update vendor_service_packages set name='Changed after request',active=false where id=$1",[a]);
      assert.deepEqual((await thread()).quote.package_snapshot,reviewed);
      await as(3);
      assert.equal((await db.query('select * from quote_requests where id=$1',[request.id])).rows.length,0);
      await db.exec('reset role;set role anon');
      await assert.rejects(db.query('select * from quote_requests where id=$1',[request.id]),/permission denied/);
      await db.exec('reset role');
      await assert.rejects(db.query('update quote_requests set package_snapshot=null where id=$1',[request.id]),/cannot change/);
      assert.deepEqual((await db.query('select * from bookings where id=$1',[id(7200)])).rows[0],originalBooking);
      const after = await originalCounts();
      assert.equal(after.messages,before.messages);
      assert.equal(after.bookings,before.bookings);
      assert.equal(Number(after.requests),Number(before.requests)+2);
      // Exercise the existing acceptance function only inside the in-memory fixture.
      await db.query("update quote_requests set status='sent',vendor_final_price=450,quote_revision=1 where id=$1",[request.id]);
      await as(2);
      const accepted = (await db.query('select (public.accept_quote_and_create_booking($1,1)).*',[request.id])).rows[0];
      assert.equal(accepted.quote_request_id,request.id);
      assert.equal(Number(accepted.final_price),450);
      assert.equal(accepted.payment_status,'not_started');
      assert.equal((await thread()).booking.id,accepted.id);
      assert.deepEqual((await thread()).quote.package_snapshot,reviewed);
    });
    await t.test('private scheduling settings persist, validate and isolate business branches', async () => {
      await db.exec('reset role');
      await db.exec(readFileSync('supabase/migrations/20261113125821_vendor_scheduling.sql','utf8'));
      const {business,service} = (await db.query("select b.id business,s.id service from vendor_businesses b join vendor_services s on s.vendor_id=b.id where b.business_name='Activation safe fixture' limit 1")).rows[0];
      const before = (await db.query('select (select count(*) from messages) messages,(select count(*) from bookings) bookings,(select count(*) from quote_requests) requests')).rows[0];
      await as(1);
      const weekly = [{day:1,start:'09:00',end:'12:00'},{day:1,start:'13:00',end:'17:00'},{day:6,start:'22:00',end:'02:00'}];
      await db.query('insert into vendor_working_hours(vendor_id,timezone,weekly_hours) values($1,$2,$3::jsonb)',[business,'America/Los_Angeles',JSON.stringify(weekly)]);
      assert.deepEqual((await db.query('select weekly_hours from vendor_working_hours where vendor_id=$1',[business])).rows[0].weekly_hours,weekly);
      await assert.rejects(db.query("update vendor_working_hours set timezone='EST' where vendor_id=$1",[business]),/IANA/);
      await assert.rejects(db.query('update vendor_working_hours set weekly_hours=$2::jsonb where vendor_id=$1',[business,JSON.stringify([...weekly,{day:0,start:'01:00',end:'03:00'}])]),/overlap/);
      await db.query("update vendor_working_hours set timezone='America/New_York' where vendor_id=$1 and version=1",[business]);
      assert.equal((await db.query('update vendor_working_hours set weekly_hours=null where vendor_id=$1 and version=1 returning version',[business])).rows.length,0);
      await db.query('insert into vendor_service_scheduling(vendor_id,service_id,capacity,setup_minutes,breakdown_minutes) values($1,$2,3,90,45)',[business,service]);
      assert.equal((await db.query('select capacity from vendor_service_scheduling where vendor_id=$1',[business])).rows[0].capacity,3);
      await assert.rejects(db.query('insert into vendor_service_scheduling(vendor_id,service_id) values($1,$2)',[business,id(978)]),/foreign key/);
      await assert.rejects(db.query('update vendor_service_scheduling set capacity=0 where vendor_id=$1',[business]),/check constraint/);
      const exception = (await db.query("insert into vendor_availability(vendor_id,date,start_time,end_time,status) values($1,'2026-11-21','15:00','19:00','blocked') returning *",[business])).rows[0];
      assert.equal(exception.start_time,'15:00:00');
      assert.equal(exception.end_time,'19:00:00');
      await db.query("update vendor_availability set end_time='20:00' where vendor_id=$1 and id=$2",[business,exception.id]);
      assert.equal((await db.query('select end_time from vendor_availability where id=$1',[exception.id])).rows[0].end_time,'20:00:00');
      await as(2);
      assert.equal((await db.query('select * from vendor_working_hours where vendor_id=$1',[business])).rows.length,0);
      assert.equal((await db.query('update vendor_service_scheduling set capacity=8 where vendor_id=$1 returning capacity',[business])).rows.length,0);
      assert.equal((await db.query('delete from vendor_availability where id=$1 returning id',[exception.id])).rows.length,0);
      await db.exec('reset role;set role anon');
      await assert.rejects(db.query('select * from vendor_working_hours'),/permission denied/);
      await assert.rejects(db.query('select * from vendor_service_scheduling'),/permission denied/);
      await db.exec('reset role');
      assert.deepEqual((await db.query('select (select count(*) from messages) messages,(select count(*) from bookings) bookings,(select count(*) from quote_requests) requests')).rows[0],before);
    });
  } finally {
    await db.close();
  }
});
