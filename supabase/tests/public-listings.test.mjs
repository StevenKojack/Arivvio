import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("public listings, claims, concierge handoff and isolation", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated,anon;`);
    await db.exec(
      readFileSync("supabase/schema.sql", "utf8").replace(
        'create extension if not exists "pgcrypto";',
        "",
      ),
    );
    await db.exec(readFileSync("supabase/phase4-account-model.sql", "utf8"));
    await db.exec(`grant usage on schema public to anon,authenticated; grant all on all tables in schema public to anon,authenticated;
 insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}');
 insert into public.profiles(id,user_id,email) values('${id(11)}','${id(1)}','planner@test.invalid'),('${id(12)}','${id(2)}','vendor@test.invalid'),('${id(13)}','${id(3)}','other@test.invalid'),('${id(14)}','${id(4)}','admin@test.invalid');`);
    for (const f of [
      "20261019155417_customer_continuity_reconciled.sql",
      "20261019231733_request_conversations_and_booking.sql",
      "20261021163808_public_listing_concierge.sql",
    ])
      await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
    const as = async (n) =>
      db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id(n)}',false);select set_config('request.jwt.claims','${JSON.stringify({ email: n === 4 ? "stevenkojack2003@gmail.com" : "test@example.invalid" })}',false);set role authenticated;`,
      );
    const op = async (operation, payload = {}) =>
      (
        await db.query("select public.listing_operation($1,$2::jsonb) result", [
          operation,
          JSON.stringify(payload),
        ])
      ).rows[0].result;
    await as(4);
    const v = await op("save_listing", {
      business_name: "Fixture DJ",
      category: "DJ",
      city: "Glendale",
      description: "Fixture only",
      source_url: "https://example.invalid",
      supported_fields: ["business_name", "category"],
      publish: true,
    });
    assert.equal(v.owner_id, null);
    const service = (
      await db.query("select id from vendor_services where vendor_id=$1", [
        v.id,
      ])
    ).rows[0].id;
    const draft = await op("save_listing", {
      business_name: "Internal fixture",
      category: "DJ",
    });
    await t.test(
      "admin workspace retains factual sources and draft publication requires provenance",
      async () => {
        const workspace = await op("admin");
        assert.equal(workspace.sources.length, 1);
        assert.equal(workspace.services.length, 2);
        await assert.rejects(() =>
          op("save_listing", {
            id: draft.id,
            business_name: "Internal fixture",
            category: "DJ",
            publish: true,
          }),
        );
      },
    );
    await as(1);
    await db.exec(
      `insert into public.events(id,planner_id,title,event_type,status) values('${id(41)}','${id(11)}','Wedding','Wedding','planning')`,
    );
    const payload = {
      vendor_id: v.id,
      event_id: id(41),
      service_id: service,
      customer_note: "Armenian music for reception",
      stage_label: "Reception",
      start_time: "18:00",
      end_time: "23:00",
    };
    const l = await op("lead", payload);
    await t.test(
      "retry creates exactly one lead and no premature request",
      async () => {
        assert.equal((await op("lead", payload)).id, l.id);
        assert.equal(
          (await db.query("select count(*)::int n from quote_requests")).rows[0]
            .n,
          0,
        );
      },
    );
    await t.test(
      "invalid services, unpublished listings and direct requests are rejected",
      async () => {
        await assert.rejects(() =>
          op("lead", { ...payload, service_id: id(999) }),
        );
        await assert.rejects(() =>
          op("lead", { ...payload, vendor_id: draft.id, service_id: null }),
        );
        await assert.rejects(() =>
          db.query(
            "insert into quote_requests(event_id,planner_id,vendor_id) values($1,$2,$3)",
            [id(41), id(11), v.id],
          ),
        );
      },
    );
    await t.test(
      "planner cannot operate outreach or approve claims",
      async () => {
        await assert.rejects(() =>
          op("update_lead", { id: l.id, status: "contacted" }),
        );
        await assert.rejects(() =>
          op("save_listing", { business_name: "fake", category: "DJ" }),
        );
        await assert.rejects(() =>
          db.query("update concierge_leads set status=$1 where id=$2", [
            "converted",
            l.id,
          ]),
        );
      },
    );
    await t.test(
      "events with concierge history cannot be deleted",
      async () => {
        await assert.rejects(() =>
          db.query("delete from events where id=$1", [id(41)]),
        );
      },
    );
    await as(3);
    await t.test(
      "other planner cannot read, withdraw or submit for another event",
      async () => {
        assert.equal(
          (await db.query("select * from concierge_leads")).rows.length,
          0,
        );
        await assert.rejects(() => op("lead", payload));
        await assert.rejects(() => op("withdraw", { id: l.id }));
      },
    );
    const other = await op("claim", {
      vendor_id: v.id,
      relationship: "Other claimant",
      business_phone: "555",
    });
    await as(2);
    const c = await op("claim", {
      vendor_id: v.id,
      relationship: "Owner",
      business_email: "owner@example.invalid",
    });
    await t.test("pending claim grants no editing or approval", async () => {
      assert.equal(
        (
          await op("claim", {
            vendor_id: v.id,
            relationship: "Owner",
            business_phone: "555",
          })
        ).id,
        c.id,
      );
      await assert.rejects(() =>
        op("review_claim", { id: c.id, status: "approved" }),
      );
      await db.query(
        "update vendor_businesses set description='takeover' where id=$1",
        [v.id],
      );
      assert.notEqual(
        (
          await db.query(
            "select description from vendor_businesses where id=$1",
            [v.id],
          )
        ).rows[0].description,
        "takeover",
      );
      await assert.rejects(() =>
        db.query(
          "update vendor_claim_requests set status='approved' where id=$1",
          [c.id],
        ),
      );
    });
    await t.test("existing vendor self-onboarding still works", async () => {
      await db.query(
        "insert into vendor_businesses(owner_id,business_name,category,approval_status) values($1,'Owned fixture','DJ','approved')",
        [id(12)],
      );
      await assert.rejects(() =>
        db.query(
          "insert into vendor_businesses(owner_id,business_name,category) values(null,'No owner','DJ')",
        ),
      );
    });
    await as(4);
    await op("update_lead", {
      id: l.id,
      status: "contacted",
      note: "Private outreach note",
    });
    await op("review_claim", { id: c.id, status: "approved" });
    await t.test(
      "claim preserves listing, services and sources and closes competing claim",
      async () => {
        const b = (
          await db.query("select * from vendor_businesses where id=$1", [v.id])
        ).rows[0];
        assert.equal(b.owner_id, id(12));
        assert.ok(b.claimed_at);
        assert.equal(
          (
            await db.query(
              "select id from vendor_services where vendor_id=$1",
              [v.id],
            )
          ).rows[0].id,
          service,
        );
        assert.equal(
          (
            await db.query(
              "select status from vendor_claim_requests where id=$1",
              [other.id],
            )
          ).rows[0].status,
          "rejected",
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int n from listing_sources where vendor_id=$1",
              [v.id],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    const handoff = await op("handoff", { id: l.id });
    await t.test(
      "handoff is idempotent and retains original intent without messages",
      async () => {
        assert.equal(
          (await op("handoff", { id: l.id })).quote_request_id,
          handoff.quote_request_id,
        );
        await db.exec("reset role");
        const q = (
          await db.query("select * from quote_requests where id=$1", [
            handoff.quote_request_id,
          ])
        ).rows[0];
        assert.equal(q.planner_id, id(11));
        assert.equal(q.event_id, id(41));
        assert.equal(q.message, payload.customer_note);
        assert.equal(q.request_context.requested_stage, "Reception");
        assert.equal(
          (await db.query("select count(*)::int n from messages")).rows[0].n,
          0,
        );
      },
    );
    await as(1);
    await t.test(
      "outreach notes stay private and converted lead opens real conversation",
      async () => {
        assert.equal(
          (await db.query("select * from concierge_outreach_notes")).rows
            .length,
          0,
        );
        assert.equal((await op("mine")).leads[0].status, "converted");
      },
    );
    await as(2);
    await t.test(
      "verified owner can edit but cannot transfer ownership",
      async () => {
        await db.query(
          "update vendor_businesses set description='Owner updated' where id=$1",
          [v.id],
        );
        assert.equal(
          (
            await db.query(
              "select description from vendor_businesses where id=$1",
              [v.id],
            )
          ).rows[0].description,
          "Owner updated",
        );
        await assert.rejects(() =>
          db.query("update vendor_businesses set owner_id=$1 where id=$2", [
            id(13),
            v.id,
          ]),
        );
      },
    );
    await t.test(
      "normal quote and booking continue from handed off request",
      async () => {
        await db.query(
          "select public.send_vendor_quote($1,1200,'Reception package',0)",
          [handoff.quote_request_id],
        );
        await as(1);
        const b = (
          await db.query(
            "select (public.accept_quote_and_create_booking($1,1)).id id",
            [handoff.quote_request_id],
          )
        ).rows[0].id;
        assert.ok(b);
        assert.equal(
          (
            await db.query(
              "select (public.accept_quote_and_create_booking($1,1)).id id",
              [handoff.quote_request_id],
            )
          ).rows[0].id,
          b,
        );
      },
    );
    await as(3);
    await assert.rejects(() =>
      op("claim", {
        vendor_id: v.id,
        relationship: "Owner",
        business_phone: "555",
      }),
    );
    await db.exec("reset role;set role anon");
    await t.test(
      "signed-out visitors see public businesses but no claims or private leads",
      async () => {
        assert.equal(
          (
            await db.query("select id from vendor_businesses where id=$1", [
              v.id,
            ])
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await db.query("select id from vendor_businesses where id=$1", [
              draft.id,
            ])
          ).rows.length,
          0,
        );
        await assert.rejects(() => op("mine"));
        await assert.rejects(() => db.query("select * from concierge_leads"));
      },
    );
  } finally {
    await db.close();
  }
});
