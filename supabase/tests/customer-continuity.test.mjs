// Isolated PostgreSQL tests. No production accounts or records are created.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("cloud event persistence, guest ownership, import identity and delete/cancel are enforced by PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
 grant usage on schema auth to authenticated,anon;`);
    await db.exec(
      readFileSync("supabase/schema.sql", "utf8").replace(
        'create extension if not exists "pgcrypto";',
        "",
      ),
    );
    await db.exec(readFileSync("supabase/phase4-account-model.sql", "utf8"));
    await db.exec(`grant usage on schema public to authenticated,anon; grant all on all tables in schema public to authenticated,anon;
 insert into auth.users(id) values('${uuid(1)}'),('${uuid(2)}'),('${uuid(3)}');
 insert into public.profiles(id,user_id,email) values('${uuid(11)}','${uuid(1)}','customer@example.test'),('${uuid(12)}','${uuid(2)}','vendor@example.test'),('${uuid(13)}','${uuid(3)}','other@example.test');
 insert into public.vendor_businesses(id,owner_id,business_name,category,approval_status) values('${uuid(21)}','${uuid(12)}','Test DJ','DJ','approved');`);
    await db.exec(
      readFileSync(
        "supabase/migrations/20261019155417_customer_continuity_reconciled.sql",
        "utf8",
      ),
    );
    const as = async (n) =>
      db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${uuid(n)}',false); set role authenticated;`,
      );
    const sql = async (s, args = []) => (await db.query(s, args)).rows;
    const denied = async (s, args = []) =>
      assert.rejects(() => db.query(s, args));
    await as(1);
    const profile = {
      eventType: { value: "Wedding" },
      plannerIntent: { rawText: "Wedding" },
      planning: {
        date: "2027-05-02",
        startTime: "15:00",
        endTime: "23:00",
        guestCount: 180,
        budget: 20000,
        location: "Glendale",
      },
      stages: [
        {
          id: "ceremony",
          startTime: "15:00",
          location: "Church",
          guestCount: 80,
          budget: 3000,
          services: ["Photographer"],
        },
        {
          id: "reception",
          startTime: "18:00",
          location: "Hall",
          guestCount: 180,
          budget: 17000,
          services: ["DJ", "Florist"],
        },
      ],
      dateHint: "May",
      audience: { childrenCount: 25 },
      venueRequired: false,
    };
    const [event] = await sql(
      "insert into public.events(id,planner_id,event_type,title,source_event_id,event_profile,status) values($1,$2,$3,$4,$5,$6,$7) returning *",
      [
        uuid(41),
        uuid(11),
        "Wedding",
        "Our wedding",
        "local-wedding",
        JSON.stringify(profile),
        "planning",
      ],
    );
    assert.equal(event.guest_count, 180);
    assert.equal(event.event_profile.eventId, uuid(41));
    assert.deepEqual(event.event_profile.stages, profile.stages);
    await denied(
      "insert into public.events(planner_id,event_type,title,source_event_id) values($1,$2,$3,$4)",
      [uuid(11), "Wedding", "Duplicate", "local-wedding"],
    );
    await sql(
      "update public.events set event_profile=$1 where id=$2 and profile_revision=0",
      [
        JSON.stringify({
          ...profile,
          eventId: uuid(99),
          planning: { ...profile.planning, guestCount: 150 },
        }),
        event.id,
      ],
    );
    const [restored] = await sql("select * from public.events where id=$1", [
      event.id,
    ]);
    assert.equal(restored.profile_revision, 1);
    assert.equal(restored.guest_count, 150);
    assert.equal(restored.event_profile.planning.guestCount, 150);
    assert.equal(restored.event_profile.eventId, event.id);
    assert.deepEqual(restored.event_profile.stages, profile.stages);
    assert.equal(
      (
        await sql(
          "update public.events set title=$1 where id=$2 and profile_revision=0 returning id",
          ["stale", event.id],
        )
      ).length,
      0,
    );
    const [guest] = await sql(
      "insert into public.guests(event_id,name,plus_ones,rsvp_status) values($1,$2,1,$3) returning id",
      [event.id, "Test guest", "yes"],
    );
    await as(3);
    assert.equal(
      (await sql("select * from public.events where id=$1", [event.id])).length,
      0,
    );
    assert.equal(
      (await sql("select * from public.guests where id=$1", [guest.id])).length,
      0,
    );
    assert.equal(
      (
        await sql(
          "update public.events set event_profile=$1 where id=$2 returning id",
          [JSON.stringify(profile), event.id],
        )
      ).length,
      0,
    );
    await denied(
      "insert into public.events(planner_id,event_type,title,event_profile) values($1,$2,$3,$4)",
      [uuid(11), "Wedding", "Forged owner", JSON.stringify(profile)],
    );
    await denied("insert into public.guests(event_id,name) values($1,$2)", [
      event.id,
      "Intrusion",
    ]);
    assert.equal(
      (
        await sql("update public.guests set name=$1 where id=$2 returning id", [
          "Intrusion",
          guest.id,
        ])
      ).length,
      0,
    );
    assert.equal(
      (
        await sql("delete from public.guests where id=$1 returning id", [
          guest.id,
        ])
      ).length,
      0,
    );
    await denied("select public.manage_customer_event($1,$2)", [
      event.id,
      "delete",
    ]);
    await denied("select public.manage_customer_event($1,$2)",[event.id,"cancel"]);
    await denied("insert into public.cart_items(event_id,item_type) values($1,'vendor_service')",[event.id]);
    await denied("insert into public.quote_requests(event_id,planner_id,vendor_id) values($1,$2,$3)",[event.id,uuid(13),uuid(21)]);
    await denied("insert into public.bookings(event_id,planner_id,vendor_id,final_price,deposit_amount,balance_due) values($1,$2,$3,100,0,100)",[event.id,uuid(13),uuid(21)]);
    await as(2);
    assert.equal(
      (await sql("select * from public.events")).length,
      0,
      "Unrelated vendor cannot read customer events",
    );
    await as(1);
    await denied("update public.events set planner_id=$1 where id=$2", [
      uuid(13),
      event.id,
    ]);
    await sql(
      "update public.guests set name=$1,plus_ones=2,rsvp_status=$2 where id=$3",
      ["Updated guest", "maybe", guest.id],
    );
    assert.equal(
      (await sql("select * from public.guests where id=$1", [guest.id]))[0]
        .plus_ones,
      2,
    );
    const [q] = await sql(
      "insert into public.quote_requests(event_id,planner_id,vendor_id,status) values($1,$2,$3,$4) returning id",
      [event.id, uuid(11), uuid(21), "pending"],
    );
    await as(2);
    await sql("update public.quote_requests set status='accepted',vendor_final_price=500 where id=$1",[q.id]);
    await as(1);
    assert.equal((await sql("select status from public.quote_requests where id=$1",[q.id]))[0].status,'accepted');
    const [booking]=await sql("insert into public.bookings(event_id,planner_id,vendor_id,quote_request_id,final_price,deposit_amount,balance_due) values($1,$2,$3,$4,500,0,500) returning id",[event.id,uuid(11),uuid(21),q.id]);
    await as(3);
    assert.equal((await sql("select id from public.bookings where id=$1",[booking.id])).length,0);
    assert.equal((await sql("select id from public.quote_requests where id=$1",[q.id])).length,0);
    await as(1);
    await sql(
      "insert into public.messages(quote_request_id,sender_id,receiver_id,body) values($1,$2,$3,$4)",
      [q.id, uuid(11), uuid(12), "Preserved history"],
    );
    await denied("select public.manage_customer_event($1,$2)", [
      event.id,
      "delete",
    ]);
    await sql("select public.manage_customer_event($1,$2)", [
      event.id,
      "cancel",
    ]);
    assert.equal(
      (await sql("select * from public.events where id=$1", [event.id]))[0]
        .status,
      "cancelled",
    );
    assert.equal(
      (
        await sql("select * from public.quote_requests where event_id=$1", [
          event.id,
        ])
      ).length,
      1,
    );
    assert.equal(
      (
        await sql("select * from public.messages where quote_request_id=$1", [
          q.id,
        ])
      ).length,
      1,
    );
    assert.equal(
      (await sql("select * from public.guests where id=$1", [guest.id])).length,
      1,
    );
    await denied("update public.events set event_profile=$1 where id=$2", [
      JSON.stringify(profile),
      event.id,
    ]);
    const [draft] = await sql(
      "insert into public.events(planner_id,event_type,title,status) values($1,$2,$3,$4) returning id",
      [uuid(11), "Birthday", "Planning event", "planning"],
    );
    await sql("select public.manage_customer_event($1,$2)", [
      draft.id,
      "delete",
    ]);
    assert.equal(
      (await sql("select * from public.events where id=$1", [draft.id])).length,
      0,
    );
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false); set role anon;",
    );
    assert.equal((await sql("select * from public.events")).length, 0);
  } finally {
    await db.close();
  }
});
