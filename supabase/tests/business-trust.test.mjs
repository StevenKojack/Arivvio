import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("trusted business intake, evidence and membership security", async (t) => {
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
    const as = async (n) =>
      db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id(n)}',false);select set_config('request.jwt.claims','${JSON.stringify({ email: emails[n - 1] })}',false);set role authenticated;`,
      );
    const op = async (operation, payload = {}) =>
      (
        await db.query("select public.trust_operation($1,$2::jsonb) r", [
          operation,
          JSON.stringify(payload),
        ])
      ).rows[0].r;
    const listing = async (operation, payload = {}) =>
      (
        await db.query("select public.listing_operation($1,$2::jsonb) r", [
          operation,
          JSON.stringify(payload),
        ])
      ).rows[0].r;
    await as(4);
    await db.exec(
      `reset role;insert into vendor_businesses(id,owner_id,business_name,category,approval_status) values('${id(99)}','${id(11)}','Legacy fixture','DJ','approved');`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261021180518_trusted_business_intake.sql",
        "utf8",
      ),
    );
    await t.test(
      "legacy backfill retains primary owner without verified badge",
      async () => {
        let r = (
          await db.query(
            `select verification_status,verified_at from vendor_businesses where id='${id(99)}'`,
          )
        ).rows[0];
        assert.equal(r.verification_status, "legacy_review");
        assert.equal(r.verified_at, null);
        assert.equal(
          (await db.query("select role from vendor_business_memberships"))
            .rows[0].role,
          "owner",
        );
      },
    );
    await as(4);
    const v = await listing("save_listing", {
      business_name: "Jungle fixture",
      category: "Venue",
      city: "Valencia",
      address: "123 Fixture Way",
      website_url: "https://www.jungle.example/location",
      phone: "(818) 555-1234",
      source_url: "https://jungle.example/location",
      supported_fields: ["name", "city"],
      publish: true,
      location_name: "Valencia",
    });
    await op("identity", {
      vendor_id: v.id,
      website_url: "https://WWW.Jungle.example/location",
      phone: "818-555-1234",
      source_url: "https://jungle.example/location",
      note: "Official location website independently reviewed.",
    });
    await as(2);
    const claim = await listing("claim", {
      vendor_id: v.id,
      relationship: "Owner",
      location_scope: "Valencia",
      business_email: "random@gmail.com",
    });
    await t.test(
      "claimant has zero authority and cannot approve or write evidence",
      async () => {
        await assert.rejects(() =>
          op("review", { claim_id: claim.id, decision: "approved" }),
        );
        assert.equal(
          (
            await db.query(
              "update vendor_businesses set description=$1 where id=$2 returning id",
              ["stolen", v.id],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(() =>
          db.query(
            "insert into vendor_business_memberships(vendor_id,profile_id,email,role,status) values($1,$2,$3,$4,$5)",
            [v.id, id(12), "random@gmail.com", "owner", "active"],
          ),
        );
        assert.equal(
          (await op("domain_email", { claim_id: claim.id })).status,
          "failed",
        );
      },
    );
    await as(4);
    await t.test("no claim approval without valid evidence", async () => {
      await assert.rejects(() =>
        listing("review_claim", { id: claim.id, status: "approved" }),
      );
      assert.equal(
        (
          await db.query(
            "update vendor_businesses set verification_status=$1,verified_at=now() where id=$2 returning id",
            ["verified", v.id],
          )
        ).rows.length,
        0,
      );
    });
    await as(1);
    const real = await op("claim", {
      vendor_id: v.id,
      relationship: "General manager",
      location_scope: "Valencia",
    });
    await t.test(
      "exact independently sourced confirmed domain passes association only",
      async () => {
        const e = await op("domain_email", { claim_id: real.id });
        assert.equal(e.status, "passed");
        assert.equal(e.authority_confirmed, false);
      },
    );
    await as(5);
    const lookalike = await op("claim", {
      vendor_id: v.id,
      relationship: "Owner",
      location_scope: "Valencia",
    });
    await t.test("lookalike domain fails", async () =>
      assert.equal(
        (await op("domain_email", { claim_id: lookalike.id })).status,
        "failed",
      ),
    );
    await as(6);
    await t.test("unconfirmed email cannot advance claim", async () =>
      assert.rejects(() =>
        op("claim", {
          vendor_id: v.id,
          relationship: "Owner",
          location_scope: "Valencia",
        }),
      ),
    );
    await as(4);
    await t.test(
      "manual evidence needs independent public phone and explicit authority",
      async () => {
        await assert.rejects(() =>
          op("evidence", {
            claim_id: real.id,
            method: "public_phone",
            source_reference: "attacker number",
            location_scope: "Valencia",
            note: "Spoke with location general manager",
            identity_confirmed: true,
            authority_confirmed: true,
          }),
        );
        await op("evidence", {
          claim_id: real.id,
          method: "public_phone",
          source_reference: "818-555-1234",
          location_scope: "Valencia only",
          note: "Callback completed with location owner, who authorized this account as general manager.",
          identity_confirmed: true,
          authority_confirmed: true,
        });
      },
    );
    await t.test("expired evidence cannot approve", async () => {
      await db.exec(
        "reset role;update business_verification_evidence set expires_at=now()-interval '1 day';",
      );
      await as(4);
      await assert.rejects(() =>
        op("review", { claim_id: real.id, decision: "approved" }),
      );
    });
    await op("evidence", {
      claim_id: real.id,
      method: "public_phone",
      source_reference: "818-555-1234",
      location_scope: "Valencia only",
      note: "Callback repeated with owner confirming authority for this specific location.",
      identity_confirmed: true,
      authority_confirmed: true,
    });
    await op("review", { claim_id: real.id, decision: "approved" });
    await t.test(
      "approval preserves UUID and closes competing claims",
      async () => {
        const r = (
          await db.query("select * from vendor_businesses where id=$1", [v.id])
        ).rows[0];
        assert.equal(r.owner_id, id(11));
        assert.equal(r.verification_status, "verified");
        assert.equal(
          (
            await db.query(
              "select status from vendor_claim_requests where id=$1",
              [claim.id],
            )
          ).rows[0].status,
          "rejected",
        );
      },
    );
    await as(2);
    await t.test("verified business rejects takeover", async () =>
      assert.rejects(() =>
        op("claim", {
          vendor_id: v.id,
          relationship: "Owner",
          location_scope: "Valencia",
        }),
      ),
    );
    await t.test("direct auto-approved inserts denied", async () =>
      assert.rejects(() =>
        db.query(
          "insert into vendor_businesses(owner_id,business_name,category,approval_status) values($1,$2,$3,$4)",
          [id(12), "Disney Event Services", "DJ", "approved"],
        ),
      ),
    );
    const candidate = await op("candidate", {
      business_name: "Premier Events",
      category: "DJ",
      city: "Los Angeles",
      relationship: "Owner",
      location_scope: "Los Angeles",
      website_url: "https://premier.example",
      phone: "5551111234",
    });
    await t.test(
      "candidate stays private and ownerless, editable by applicant",
      async () => {
        const b = (
          await db.query("select * from vendor_businesses where id=$1", [
            candidate.vendor_id,
          ])
        ).rows[0];
        assert.equal(b.owner_id, null);
        assert.equal(b.approval_status, "pending");
        assert.equal(b.verification_status, "pending");
        await db.query(
          "update vendor_businesses set description=$1 where id=$2",
          ["Draft description", b.id],
        );
        await assert.rejects(() =>
          db.query(
            "update vendor_businesses set approval_status=$1 where id=$2",
            ["approved", b.id],
          ),
        );
      },
    );
    await as(4);
    const separate = await listing("save_listing", {
      business_name: "Premier Events",
      city: "Dallas",
      category: "DJ",
      source_url: "https://dallas.example",
      supported_fields: ["name", "city"],
      publish: true,
    });
    await t.test(
      "same names coexist with separate UUIDs and cities",
      async () => assert.notEqual(separate.id, candidate.vendor_id),
    );
    await as(2);
    await t.test(
      "duplicate domain and phone returns matches instead of silently creating",
      async () => {
        const r = await op("candidate", {
          business_name: "Jungle LLC",
          city: "Valencia",
          category: "Venue",
          website_url: "https://jungle.example",
          phone: "8185551234",
          relationship: "Owner",
          location_scope: "Valencia",
        });
        assert.equal(r.review_required, true);
        assert.ok(r.matches.some((m) => m.id === v.id && m.score >= 120));
      },
    );
    await db.exec(
      `insert into events(id,planner_id,title,event_type,status) values('${id(40)}','${id(12)}','Fixture event','Birthday','planning');`,
    );
    await t.test(
      "unverified direct requests rejected, verified request works",
      async () => {
        await assert.rejects(() =>
          db.query(
            "insert into quote_requests(event_id,planner_id,vendor_id) values($1,$2,$3)",
            [id(40), id(12), candidate.vendor_id],
          ),
        );
      },
    );
    const q = (
      await db.query(
        "insert into quote_requests(event_id,planner_id,vendor_id) values($1,$2,$3) returning id",
        [id(40), id(12), v.id],
      )
    ).rows[0];
    await as(1);
    await op("invite", {
      vendor_id: v.id,
      email: "manager@jungle.example",
      role: "manager",
    });
    let m = (await op("mine")).memberships.find((m) => m.role === "manager");
    await as(2);
    await t.test("wrong email cannot accept invitation", async () =>
      assert.rejects(() => op("accept_invite", { id: m.id })),
    );
    await as(3);
    await op("accept_invite", { id: m.id });
    await t.test(
      "manager can operate but cannot promote, invite or change ownership",
      async () => {
        await db.query(
          "update vendor_businesses set description=$1 where id=$2",
          ["Managed description", v.id],
        );
        await db.query("select public.send_vendor_quote($1,100,$2,0)", [
          q.id,
          "Fixture quote",
        ]);
        await assert.rejects(() =>
          op("invite", {
            vendor_id: v.id,
            email: "other@example.com",
            role: "admin",
          }),
        );
        await assert.rejects(() =>
          db.query("update vendor_businesses set owner_id=$1 where id=$2", [
            id(13),
            v.id,
          ]),
        );
        await assert.rejects(() =>
          db.query(
            "update vendor_business_memberships set role=$1 where id=$2",
            ["owner", m.id],
          ),
        );
      },
    );
    await as(1);
    await op("revoke", { vendor_id: v.id, id: m.id });
    await as(3);
    await t.test(
      "revocation immediately removes operations and message access",
      async () => {
        assert.equal(
          (
            await db.query(
              "update vendor_businesses set description=$1 where id=$2 returning id",
              ["stolen", v.id],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(() =>
          db.query("select public.send_quote_message($1,$2)", [
            q.id,
            "unauthorized",
          ]),
        );
        assert.equal(
          (await db.query("select * from quote_requests where id=$1", [q.id]))
            .rows.length,
          0,
        );
      },
    );
    await as(2);
    await db.query("select public.accept_quote_and_create_booking($1,1)", [
      q.id,
    ]);
    await as(4);
    await op("state", {
      vendor_id: v.id,
      status: "suspended",
      note: "Fixture compromise investigation",
    });
    await as(1);
    await t.test(
      "suspension blocks owner access without deleting customer history",
      async () => {
        assert.equal(
          (
            await db.query(
              "update vendor_businesses set description=$1 where id=$2 returning id",
              ["stolen", v.id],
            )
          ).rows.length,
          0,
        );
        await assert.rejects(() =>
          db.query("select public.send_quote_message($1,$2)", [
            q.id,
            "unauthorized",
          ]),
        );
      },
    );
    await as(2);
    assert.equal((await db.query("select * from bookings")).rows.length, 1);
    await t.test("concierge remains available only for unclaimed businesses",async()=>{
      const lead=await listing('lead',{vendor_id:separate.id,event_id:id(40),customer_note:'Fixture concierge interest'});
      assert.equal(lead.status,'new');
      await as(4);await assert.rejects(()=>listing('handoff',{id:lead.id}));
      await as(3);const c2=await op('claim',{vendor_id:separate.id,relationship:'Owner',location_scope:'Dallas'});
      await as(4);await op('identity',{vendor_id:separate.id,website_url:'https://dallas.example',source_url:'https://dallas.example',note:'Official Dallas location independently recorded'});
      await op('evidence',{claim_id:c2.id,method:'public_record',source_reference:'https://registry.example/fixture',location_scope:'Dallas only',note:'Public record establishes business existence. Separately confirmed this account authority with the listed owner.',identity_confirmed:true,authority_confirmed:true});
      await op('review',{claim_id:c2.id,decision:'approved'});
      const handed=await listing('handoff',{id:lead.id});assert.ok(handed.quote_request_id);
      assert.equal((await listing('handoff',{id:lead.id})).quote_request_id,handed.quote_request_id);
    });
    await t.test("dispute recovery requires fresh proof",async()=>{
      await as(4);await op('reopen',{claim_id:real.id,note:'New authority review following compromise investigation'});
      await assert.rejects(()=>op('review',{claim_id:real.id,decision:'approved'}));
      await op('evidence',{claim_id:real.id,method:'public_phone',source_reference:'818-555-1234',location_scope:'Valencia only',note:'Fresh callback with location owner reconfirmed this exact account and resolved the dispute.',identity_confirmed:true,authority_confirmed:true});
      await op('review',{claim_id:real.id,decision:'approved'});
      await as(1);assert.equal((await op('mine')).businesses.find(b=>b.id===v.id).verification_status,'verified');
    });
    await t.test("anonymous directory matches never expose private candidates or evidence",async()=>{
      await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);select set_config('request.jwt.claims','{}',false);set role anon;");
      const result=(await db.query("select public.business_matches($1::jsonb) r",[JSON.stringify({business_name:'Premier Events'})])).rows[0].r;
      assert.ok(result.some(b=>b.id===separate.id));assert.ok(!result.some(b=>b.id===candidate.vendor_id));
      await assert.rejects(()=>db.query('select * from business_verification_evidence'));
      await assert.rejects(()=>op('mine'));
    });
    await t.test("pilot migration stores sourced unclaimed identities without pricing or availability",async()=>{
      await db.exec('reset role');
      await db.exec(readFileSync('supabase/migrations/20261021232809_local_business_pilot.sql','utf8'));
      const rows=(await db.query("select b.owner_id,b.verification_status,b.verified_at,s.base_price,s.hourly_rate from vendor_businesses b join vendor_services s on s.vendor_id=b.id where b.business_name in ('Scooter''s Jungle','The Ebell of Los Angeles','NOOR')")).rows;
      assert.equal(rows.length,3);assert.ok(rows.every(r=>r.owner_id===null&&r.verification_status==='unverified'&&r.verified_at===null&&r.base_price===null&&r.hourly_rate===null));
    });
  } finally {
    await db.close();
  }
});
