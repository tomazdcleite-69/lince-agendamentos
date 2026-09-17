// Real, isolated PostgreSQL with two independent connections. No .env or production URL.
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { BASE_SCHEMA } from "./database-fixture.mjs";

if (!process.env.LINCE_TEST_PG_MODULE) throw new Error("Set LINCE_TEST_PG_MODULE to the local embedded-postgres module path.");
const { default: EmbeddedPostgres } = await import(pathToFileURL(process.env.LINCE_TEST_PG_MODULE).href);
const databaseDir = await mkdtemp(join(tmpdir(), "lince-concurrency-"));
const server = new EmbeddedPostgres({
  databaseDir, user: "postgres", password: randomUUID(), port: 65433,
  persistent: true, createPostgresUser: false,
  postgresFlags: ["-h", "127.0.0.1", "-c", "max_connections=10"],
  onLog: () => {}, onError: () => {},
});
const clients = [];
try {
  await server.initialise();
  await server.start();
  for (let i = 0; i < 3; i++) {
    const client = server.getPgClient();
    await client.connect();
    await client.query("set statement_timeout='15s'");
    clients.push(client);
  }
  const [setup, first, second] = clients;
  await setup.query(BASE_SCHEMA);
  const sql = await readFile(new URL("../supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql",import.meta.url),"utf8");
  await setup.query(sql);
  await setup.query(sql);
  for (const winner of ["principal", "avulso"]) {
    const date = winner === "principal" ? "2099-09-14" : "2099-09-15";
    const id = randomUUID();
    await setup.query("insert into test_room_sessions(id,session_date,start_time) values ($1,$2,'13:30')",[id,date]);
    const fields = {session_id:id,assessment_modality:"presencial",scheduled_date:date,scheduled_time:"13:30",demand:"avaliacao_psicologica",service_company:"lince",requester_email:"admin@lincehumanizacao.com",company_name:"Fixture",contact_name:"Fixture",contact_email:"client@example.test"};
    const reserve = (client, type, count=1) => client.query(
      type === "principal" ? "select create_principal_booking($1,$2)" : "select create_manual_booking($1,$2)",
      [JSON.stringify({...fields,public_token:randomUUID()}),JSON.stringify(type === "principal" ? Array.from({length:count},()=>({candidate_name:"Concurrent",desired_role:"Role"})) : {candidate_name:"Manual",desired_role:"Role"})],
    );
    await reserve(setup,"principal",14);
    await first.query("begin");
    await reserve(first,winner);
    await second.query("begin");
    const pid = (await second.query("select pg_backend_pid() pid")).rows[0].pid;
    // Attach rejection handler immediately, then prove the competing connection waits on the row lock.
    const pending = reserve(second,winner === "principal" ? "avulso" : "principal").then(() => ({ok:true}), error => ({ok:false,error}));
    let blocked = false;
    for (let attempt=0; attempt<50; attempt++) {
      const state = (await setup.query("select wait_event_type from pg_stat_activity where pid=$1",[pid])).rows[0];
      if (state?.wait_event_type === "Lock") { blocked=true; break; }
      await sleep(50);
    }
    assert.equal(blocked,true,"the competing transaction must wait on a PostgreSQL lock");
    await first.query("commit");
    const loser = await pending;
    assert.equal(loser.ok,false);
    assert.equal(loser.error.code,"P0001");
    await second.query("rollback");
    const occupancy = (await setup.query("select * from test_room_sessions_with_availability where id=$1",[id])).rows[0];
    assert.equal(Number(occupancy.occupied_spots),15);
    assert.equal(Number(occupancy.available_spots),0);
    console.log(`PASS: ${winner} wins; competitor waits and rejects; occupancy 15/15.`);
  }
  assert.equal(Number((await setup.query("select count(*) n from bookings")).rows[0].n),4);
  console.log("PASS: both race orders tested with real PostgreSQL connections; no partial booking.");
} finally {
  for (const client of clients) await client.end();
  // pg_ctl stops only this disposable cluster; embedded-postgres uses taskkill on Windows.
  if (process.platform === "win32") {
    const binary = resolve(dirname(process.env.LINCE_TEST_PG_MODULE), "../../@embedded-postgres/windows-x64/native/bin/pg_ctl.exe");
    await promisify(execFile)(binary, ["-D", databaseDir, "-m", "fast", "-w", "stop"], { windowsHide: true });
  } else {
    await server.stop();
  }
  console.log(`Local test cluster stopped. Disposable files retained at ${databaseDir}`);
}
