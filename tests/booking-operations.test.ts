import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase, applyMigration } from "./database-fixture.mjs";
import {
  getReportWeek,
  getRequesterOrigin,
  getAdminServiceCompany,
  isDateKey,
} from "../lib/bookingOperations";

test("report week and requester origin", () => {
  assert.deepEqual(getReportWeek("2026-09-20"), {
    start: "2026-09-14",
    end: "2026-09-18",
  });
  assert.deepEqual(getReportWeek("2026-01-01"), {
    start: "2025-12-29",
    end: "2026-01-02",
  });
  assert.equal(isDateKey("2026-02-30"), false);
  assert.equal(getRequesterOrigin("FERNANDA@LINCEHUMANIZACAO.COM"), "Lince");
  assert.equal(getRequesterOrigin("name@psicoespaco.com.br"), "Psicoespaço");
  assert.equal(
    getRequesterOrigin("name@lincehumanizacao.com.attacker.test"),
    "Externo",
  );
  assert.equal(getRequesterOrigin(null), "Externo");
  assert.equal(getAdminServiceCompany("USER@PSICOESPACO.COM.BR"), "psicoespaco");
  assert.equal(getAdminServiceCompany("USER@LINCEHUMANIZACAO.COM"), "lince");
  assert.equal(getAdminServiceCompany("external@example.test"), null);
  assert.equal(getAdminServiceCompany("user@psicoespaco.attacker.test"), null);
});

test("migration, occupancy, transactional creation, weekly report and safe archiving", async () => {
  const db = await createTestDatabase();
  try {
    const session1 = randomUUID(),
      session2 = randomUUID(),
      historical = randomUUID();
    await db.query(
      "insert into test_room_sessions(id,session_date,start_time) values ($1,'2026-09-14','13:30'),($2,'2026-09-21','13:30')",
      [session1, session2],
    );
    await db.query(
      "insert into bookings(id,session_id,company_name,contact_name,contact_email,candidates_count,public_token) values ($1,$2,'Histórico','Equipe','old@example.test',1,'old')",
      [historical, session1],
    );
    await applyMigration(db);
    await applyMigration(db);
    const old = (
      await db.query("select * from bookings where id=$1", [historical])
    ).rows[0];
    assert.equal(old.booking_type, "principal");
    assert.equal(old.demand, null);
    assert.equal(old.requester_email, null);
    const availability = async () =>
      (
        await db.query(
          "select * from test_room_sessions_with_availability where id=$1",
          [session1],
        )
      ).rows[0];
    assert.equal(Number((await availability()).available_spots), 15);
    for (let i = 0; i < 5; i++)
      await db.query(
        "insert into booking_candidates(booking_id,candidate_name,desired_role,candidate_session_id) values ($1,$2,'Analista',$3)",
        [historical, `Principal ${i}`, i === 0 ? null : session1],
      );
    assert.equal(Number((await availability()).available_spots), 10);
    const manual = async (
      time = "13:30",
      candidate = { candidate_name: "Avulso", desired_role: "Analista" },
    ) => {
      const result = await db.query(
        "select create_manual_booking($1::jsonb,$2::jsonb) as id",
        [
          JSON.stringify({
            scheduled_date: "2026-09-14",
            scheduled_time: time,
            demand: "recrutamento_selecao",
            service_company: "lince",
            requester_email: "admin@lincehumanizacao.com",
            company_name: "Empresa",
            contact_name: "Contato",
            contact_email: "contact@example.test",
            public_token: randomUUID(),
          }),
          JSON.stringify(candidate),
        ],
      );
      return result.rows[0].id as string;
    };
    const m1 = await manual(),
      m2 = await manual();
    assert.equal(Number((await availability()).available_spots), 8);
    await manual("16:17");
    assert.equal(Number((await availability()).available_spots), 8);
    assert.equal(
      (await db.query("select count(*) from test_room_sessions")).rows[0].count,
      2,
    );
    await db.query(
      "update booking_candidates set candidate_status='cancelado' where booking_id=$1",
      [m1],
    );
    assert.equal(Number((await availability()).available_spots), 9);
    for (const status of ["realizado", "nao_compareceu", "confirmado"]) {
      await db.query(
        "update booking_candidates set candidate_status=$1 where booking_id=$2",
        [status, m2],
      );
      assert.equal(Number((await availability()).available_spots), 9);
    }
    const before = (await db.query("select count(*) from bookings")).rows[0]
      .count;
    await assert.rejects(
      manual("17:00", { candidate_name: "Incomplete" } as {
        candidate_name: string;
        desired_role: string;
      }),
    );
    assert.equal(
      (await db.query("select count(*) from bookings")).rows[0].count,
      before,
    );
    await db.query(
      "update booking_candidates set candidate_session_id=$1 where id=(select id from booking_candidates where booking_id=$2 limit 1)",
      [session2, historical],
    );
    assert.equal(Number((await availability()).available_spots), 10);
    const online = randomUUID();
    await db.query(
      "insert into bookings(id,assessment_modality,company_name,contact_name,contact_email,candidates_count,public_token,demand,created_at) values ($1,'online','Online','Contato','online@example.test',1,$2,'avaliacao_psicologica','2026-09-15 01:30:00+00')",
      [online, randomUUID()],
    );
    await db.query(
      "insert into booking_candidates(booking_id,candidate_name,desired_role) values ($1,'Online','Analista')",
      [online],
    );
    const report = async () =>
      (
        await db.query(
          "select admin_week_report('2026-09-14','2026-09-18') as report",
        )
      ).rows[0].report as {
        rows: {
          booking_id: string;
          operational_date: string;
          operational_time: string | null;
        }[];
        candidates: { candidate_id: string; booking_id: string; fingerprint: string; archivable: boolean }[];
      };
    const first = await report();
    assert.equal(
      first.rows.find((row) => row.booking_id === online)?.operational_date,
      "2026-09-14",
    );
    assert.equal(
      first.rows.find((row) => row.booking_id === online)?.operational_time,
      null,
    );
    assert.equal(
      first.candidates.find((row) => row.booking_id === historical)?.archivable,
      true,
    );
    await db.query(
      "update bookings set demand='avaliacao_psicologica' where id=$1",
      [m2],
    );
    const archive = (snapshot: typeof first.candidates) =>
      db.query(
        "select archive_exported_candidates('2026-09-14','2026-09-18',$1::jsonb)",
        [JSON.stringify(snapshot)],
      );
    await assert.rejects(
      archive(first.candidates.filter((row) => row.archivable)),
      /dados mudaram/i,
    );
    assert.equal(
      (
        await db.query(
          "select count(*) from bookings where archived_at is not null",
        )
      ).rows[0].count,
      0,
    );
    const next = await report();
    const priorAvailability = Number((await availability()).available_spots);
    await archive(next.candidates.filter((row) => row.archivable));
    assert.equal(
      Number((await availability()).available_spots),
      priorAvailability,
    );
    assert.equal(
      (
        await db.query("select archived_at from bookings where id=$1", [
          historical,
        ])
      ).rows[0].archived_at,
      null,
    );
    assert.equal((await report()).rows.length, next.rows.length);
    await db.query("delete from bookings where id=$1", [m2]);
    assert.equal(
      Number((await availability()).available_spots),
      priorAvailability + 1,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select create_manual_booking('{}','{}')"),
      /permission denied/i,
    );
    await assert.rejects(
      db.query("select admin_week_report('2026-09-14','2026-09-18')"),
      /permission denied/i,
    );
    await assert.rejects(
      db.query(
        "select archive_exported_candidates('2026-09-14','2026-09-18','[]')",
      ),
      /permission denied/i,
    );
  } finally {
    await db.close();
  }
});
