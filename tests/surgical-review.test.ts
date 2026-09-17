import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase, applyMigration } from "./database-fixture.mjs";

type Snapshot = { candidate_id: string; booking_id: string; fingerprint: string; archivable: boolean };
type Report = { candidates: Snapshot[]; rows: { candidate_id: string; candidate_archived_at: string | null }[] };

test("candidate archiving across weeks, independent fingerprints, atomic stale checks and historical reexport", async () => {
  const db = await createTestDatabase();
  try {
    await applyMigration(db);
    const booking = randomUUID(), a = randomUUID(), b = randomUUID(), s1 = randomUUID(), s2 = randomUUID();
    await db.query("insert into test_room_sessions(id,session_date,start_time) values ($1,'2026-09-14','13:30'),($2,'2026-09-23','08:30')", [s1, s2]);
    await db.query("insert into bookings(id,session_id,company_name,contact_name,contact_email,candidates_count,public_token,demand) values ($1,$2,'Shared','Team','client@example.test',2,$3,'avaliacao_psicologica')", [booking,s1,randomUUID()]);
    await db.query("insert into booking_candidates(id,booking_id,candidate_session_id,candidate_name,desired_role) values ($1,$3,$4,'A','Role'),($2,$3,$5,'B','Role')", [a,b,booking,s1,s2]);
    const report = async (start = "2026-09-14", end = "2026-09-18") => (await db.query("select admin_week_report($1,$2) r", [start,end])).rows[0].r as Report;
    const archive = (items: Snapshot[], start = "2026-09-14", end = "2026-09-18") => db.query("select archive_exported_candidates($1,$2,$3) n", [start,end,JSON.stringify(items)]);
    const first = await report();
    assert.equal(first.candidates.length, 1);
    assert.equal(first.candidates[0].candidate_id, a);
    await db.query("update booking_candidates set desired_role='New role' where id=$1", [b]);
    // A phone change is not part of the exported row and must not stale its snapshot.
    await db.query("update booking_candidates set candidate_phone='11999990000' where id=$1", [a]);
    assert.equal((await archive(first.candidates)).rows[0].n, 1);
    assert.ok((await db.query("select archived_at from booking_candidates where id=$1", [a])).rows[0].archived_at);
    assert.equal((await db.query("select archived_at from booking_candidates where id=$1", [b])).rows[0].archived_at, null);
    assert.equal((await db.query("select archived_at from bookings where id=$1", [booking])).rows[0].archived_at, null);
    assert.deepEqual((await db.query("select id from booking_candidates where booking_id=$1 and archived_at is null", [booking])).rows.map(r => r.id), [b]);
    assert.equal((await report()).rows.length, 1);
    const second = await report("2026-09-21", "2026-09-25");
    await archive(second.candidates, "2026-09-21", "2026-09-25");
    assert.ok((await db.query("select archived_at from bookings where id=$1", [booking])).rows[0].archived_at);
    assert.equal((await report("2026-09-21","2026-09-25")).rows.length, 1);

    await db.query("update booking_candidates set archived_at=null, candidate_session_id=$1 where booking_id=$2", [s1,booking]);
    for (const [statement, args] of [
      ["update bookings set demand='recrutamento_selecao' where id=$1", [booking]],
      ["update bookings set company_name='Changed company' where id=$1", [booking]],
      ["update bookings set notes='Changed shared note' where id=$1", [booking]],
      ["update bookings set requester_email='new@example.test' where id=$1", [booking]],
      ["update booking_candidates set candidate_status='realizado' where id=$1", [b]],
      ["update booking_candidates set candidate_session_id=$1 where id=$2", [s2,b]],
    ] as [string, string[]][]) {
      const snapshot = await report();
      assert.equal(snapshot.candidates.length, 2);
      await db.query(statement,args);
      await assert.rejects(archive(snapshot.candidates), /Os dados mudaram/);
      assert.equal((await db.query("select count(*) n from booking_candidates where archived_at is not null")).rows[0].n, 0);
    }
    const before = (await db.query("select available_spots from test_room_sessions_with_availability where id=$1",[s1])).rows[0].available_spots;
    await archive((await report()).candidates);
    assert.equal((await db.query("select available_spots from test_room_sessions_with_availability where id=$1",[s1])).rows[0].available_spots, before);
  } finally { await db.close(); }
});

test("no demand default; legacy null updates; INSERT and structural UPDATE invariants", async () => {
  const db = await createTestDatabase();
  try {
    const session = randomUUID(), legacy = randomUUID();
    await db.query("insert into test_room_sessions(id,session_date,start_time) values ($1,'2099-09-14','13:30')", [session]);
    await db.query("insert into bookings(id,session_id,company_name,contact_name,contact_email,candidates_count,public_token) values ($1,$2,'Legacy','Team','client@example.test',1,$3)",[legacy,session,randomUUID()]);
    await applyMigration(db);
    await applyMigration(db);
    assert.equal((await db.query("select column_default from information_schema.columns where table_name='bookings' and column_name='demand'")).rows[0].column_default,null);
    await db.query("update bookings set notes='Legacy remains valid' where id=$1",[legacy]);
    await db.query("update bookings set booking_type=null, demand=null where id=$1",[legacy]);
    assert.equal((await db.query("select demand from bookings where id=$1",[legacy])).rows[0].demand,null);
    await assert.rejects(db.query("insert into bookings(session_id,company_name,contact_name,contact_email,candidates_count,public_token) values ($1,'New','Team','a@example.test',1,$2)",[session,randomUUID()]),/Demanda/);
    await db.query("update bookings set demand='avaliacao_psicologica' where id=$1",[legacy]);
    for (const set of ["demand=null", "demand='bad'", "session_id=null", "assessment_modality='online'", "booking_type='avulso'", "scheduled_date='2099-09-14'"]) {
      await assert.rejects(db.query(`update bookings set ${set} where id=$1`,[legacy]));
    }
    await db.query("update bookings set assessment_modality='online',session_id=null where id=$1",[legacy]);
    await assert.rejects(db.query("update bookings set session_id=$1 where id=$2",[session,legacy]));
    await db.query("update bookings set booking_type='avulso',assessment_modality='presencial',scheduled_date='2099-09-14',scheduled_time='16:00' where id=$1",[legacy]);
    await assert.rejects(db.query("update bookings set scheduled_time=null where id=$1",[legacy]));
    await assert.rejects(db.query("update bookings set assessment_modality='online' where id=$1",[legacy]));
    const options = (await db.query("select reloptions from pg_class where oid='test_room_sessions_with_availability'::regclass")).rows[0].reloptions;
    assert.ok(options.includes("security_invoker=true"));
    assert.equal((await db.query("select has_table_privilege('anon','test_room_sessions_with_availability','select') ok")).rows[0].ok,true);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from admin_booking_report_rows"),/permission denied/);
    await assert.rejects(db.query("select create_principal_booking('{}','[]')"),/permission denied/);
    await db.exec("reset role");
  } finally { await db.close(); }
});

test("public reservation is atomic for all candidates and shares avulso capacity accounting", async () => {
  const db = await createTestDatabase();
  try {
    await applyMigration(db);
    const session = randomUUID();
    await db.query("insert into test_room_sessions(id,session_date,start_time) values ($1,'2099-09-14','13:30')",[session]);
    const fields = { session_id: session, assessment_modality:"presencial",demand:"avaliacao_psicologica",service_company:"lince",company_name:"Company",contact_name:"Team",contact_email:"client@example.test",requester_email:"admin@lincehumanizacao.com" };
    const principal = (count:number, invalid = false) => db.query("select create_principal_booking($1,$2) id",[JSON.stringify({...fields,public_token:randomUUID()}),JSON.stringify(Array.from({length:count}, (_,i)=>({candidate_name:`Candidate ${i}`,desired_role:invalid&&i===count-1?null:"Role"})))]);
    const manual = (time="13:30") => db.query("select create_manual_booking($1,$2) id",[JSON.stringify({...fields,scheduled_date:"2099-09-14",scheduled_time:time,public_token:randomUUID()}),JSON.stringify({candidate_name:"Manual",desired_role:"Role"})]);
    const spots = async () => (await db.query("select available_spots from test_room_sessions_with_availability where id=$1",[session])).rows[0].available_spots;
    await principal(8);
    const m = (await manual()).rows[0].id;
    assert.equal(Number(await spots()),6);
    await manual("16:00");
    assert.equal(Number(await spots()),6);
    assert.equal((await db.query("select count(*) n from test_room_sessions")).rows[0].n,1);
    await db.query("update booking_candidates set archived_at=now() where booking_id=$1",[m]);
    assert.equal(Number(await spots()),6);
    await db.query("update booking_candidates set candidate_status='cancelado' where booking_id=$1",[m]);
    assert.equal(Number(await spots()),7);
    await principal(5);
    assert.equal(Number(await spots()),2);
    const counts = async () => (await db.query("select (select count(*) from bookings) b,(select count(*) from booking_candidates) c,(select count(*) from status_history) h")).rows[0];
    const before = await counts();
    await assert.rejects(principal(3),/vagas/);
    assert.deepEqual(await counts(),before);
    await assert.rejects(principal(2,true));
    assert.deepEqual(await counts(),before);
    await principal(2);
    await assert.rejects(manual(),/vagas/);
    assert.equal(Number(await spots()),0);
  } finally { await db.close(); }
});
