import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { randomUUID } from "node:crypto";

// Run only against tests/preview-server.mjs, never a live Supabase environment.
const base = "http://127.0.0.1:3001";
const fixture = "http://127.0.0.1:54329/rest/v1";
const today = new Date().toISOString().slice(0, 10);
const cookie = "lince_admin_access_token=fixture-only-token";
// The fixture enforces its fake service key, including for direct inspection by this test.
const nativeFetch = globalThis.fetch;
const fetch = (url, options = {}) => nativeFetch(url, {
  ...options,
  headers: { ...(String(url).startsWith(fixture) ? { Authorization: "Bearer fixture-service" } : {}), ...options.headers },
});
async function call(path, payload, authenticated = true) {
  const response = await fetch(base + path, {
    method: payload === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Cookie: typeof authenticated === "string" ? `lince_admin_access_token=${authenticated}` : cookie } : {}),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    redirect: "manual",
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
for (const [path, body] of [
  ["/api/admin/bookings/create-manual", {}],
  ["/api/admin/bookings/update-demand", {}],
  ["/api/admin/reports/export", undefined],
  ["/api/admin/reports/archive-week", {}],
])
  assert.equal((await call(path, body, false)).status, 401, `auth ${path}`);
for (const page of [
  "/admin",
  "/admin/agendamentos-avulsos",
  "/admin/exportar-relatorio",
]) {
  const response = await fetch(base + page, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location"), /login/);
}
assert.equal((await call("/api/admin/bookings/create-manual", {})).status, 400);
assert.equal(
  (
    await call("/api/admin/bookings/update-demand", {
      booking_id: "invalid",
      demand: "invalid",
    })
  ).status,
  400,
);
const booking = {
  company_name: "API Fixture",
  contact_name: "Fixture Contact",
  contact_email: "fixture@example.test",
  candidate_name: "API Candidate",
  desired_role: "Analista",
  scheduled_date: today,
  scheduled_time: "19:47",
  demand: "avaliacao_psicologica",
  requester_email: "spoof@example.test",
};
assert.equal(
  (
    await call("/api/admin/bookings/create-manual", {
      ...booking,
      scheduled_date: "2026-02-30",
    })
  ).status,
  400,
);
const sessionsBefore = (await (await fetch(`${fixture}/test_room_sessions`)).json()).length;
const created = await call("/api/admin/bookings/create-manual", booking);
assert.equal(created.status, 200);
const rows = await (
  await fetch(`${fixture}/bookings?id=eq.${created.body.booking_id}`)
).json();
assert.equal(rows[0].requester_email, "demo@lincehumanizacao.com");
assert.equal(rows[0].contact_email, "fixture@example.test");
assert.equal(rows[0].service_company, "lince");
assert.equal(rows[0].session_id, null);
assert.equal(rows[0].booking_type, "avulso");
const psico = await call("/api/admin/bookings/create-manual", {
  ...booking, service_company: "lince", requester_email: "spoof@lincehumanizacao.com",
}, "fixture-psico-token");
assert.equal(psico.status, 200, JSON.stringify(psico.body));
const [psicoSaved] = await (await fetch(`${fixture}/bookings?id=eq.${psico.body.booking_id}`)).json();
assert.equal(psicoSaved.requester_email, "demo@psicoespaco.com.br");
assert.equal(psicoSaved.service_company, "psicoespaco");
assert.equal(psicoSaved.contact_email, booking.contact_email);
assert.equal((await call("/api/admin/bookings/create-manual", booking, "fixture-external-token")).status, 403);
assert.equal((await call("/api/admin/bookings/create-manual", { ...booking, demand: undefined })).status, 400);
assert.equal(
  (await (await fetch(`${fixture}/test_room_sessions`)).json()).length,
  sessionsBefore,
);
const candidates = await (
  await fetch(`${fixture}/booking_candidates?booking_id=eq.${rows[0].id}`)
).json();
assert.equal(candidates[0].candidate_session_id, null);
assert.equal(
  (
    await call("/api/admin/bookings/update-demand", {
      booking_id: rows[0].id,
      demand: "recrutamento_selecao",
    })
  ).status,
  200,
);
assert.equal(
  (
    await call("/api/admin/candidates/update-notes", {
      candidate_id: candidates[0].id,
      admin_notes: "Internal test note",
    })
  ).status,
  200,
);
assert.equal(
  (
    await call("/api/admin/candidates/mark-completed", {
      candidate_id: candidates[0].id,
    })
  ).status,
  200,
);
const detail = await fetch(`${base}/admin/agendamentos/${rows[0].id}`, {
  headers: { Cookie: cookie },
});
assert.equal(detail.status, 200);
assert.match(await detail.text(), /19:47/);
const report = await call(`/api/admin/reports/export?week=${today}`);
assert.equal(report.status, 200);
assert.ok(report.body.archivable > 0);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(Buffer.from(report.body.file, "base64"));
assert.deepEqual(workbook.worksheets[0].getRow(1).values.slice(1), [
  "Data",
  "Horário",
  "Empresa",
  "Nome Candidato",
  "Cargo",
  "Observação da Empresa",
  "Status",
  "Demanda",
  "Responsável Solicitante",
  "Origem",
]);
assert.ok(workbook.worksheets[0].rowCount > 1);
assert.equal(
  (
    await call("/api/admin/reports/archive-week", {
      receipt: report.body.receipt + "bad",
    })
  ).status,
  400,
);
await call("/api/admin/bookings/update-demand", {
  booking_id: rows[0].id,
  demand: "avaliacao_psicologica",
});
assert.equal(
  (
    await call("/api/admin/reports/archive-week", {
      receipt: report.body.receipt,
    })
  ).status,
  409,
);
const fresh = await call(`/api/admin/reports/export?week=${today}`);
const availabilityBefore = await (
  await fetch(`${fixture}/test_room_sessions_with_availability`)
).json();
const archive = await call("/api/admin/reports/archive-week", {
  receipt: fresh.body.receipt,
});
assert.equal(archive.status, 200);
assert.equal(archive.body.archived, fresh.body.archivable);
assert.deepEqual(
  await (await fetch(`${fixture}/test_room_sessions_with_availability`)).json(),
  availabilityBefore,
);
assert.equal(
  (await call(`/api/admin/reports/export?week=${today}`)).body.count,
  fresh.body.count,
);
console.log(
  "PASS: authentication, manual creation, validation, requester identity, demand, notes, status, detail, XLSX, signed receipt, stale-export rejection and archiving without vacancy changes.",
);

const session = (await (await fetch(`${fixture}/test_room_sessions`)).json())[0];
const publicPayload = {
  company_name: "Public Fixture",
  contact_name: "Public Contact",
  contact_email: "public@example.test",
  service_company: "lince",
  demand: "avaliacao_psicologica",
  candidates: ["First Candidate", "Second Candidate"].map((name) => ({
    candidate_name: name,
    desired_role: "Analista",
    candidate_phone: "11999990000",
  })),
};
for (const modality of ["presencial", "online"]) {
  const result = await call("/api/bookings", {
    ...publicPayload,
    assessment_modality: modality,
    session_id: modality === "presencial" ? session.id : null,
  }, false);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const [saved] = await (await fetch(`${fixture}/bookings?id=eq.${result.body.booking_id}`)).json();
  const savedCandidates = await (await fetch(`${fixture}/booking_candidates?booking_id=eq.${saved.id}`)).json();
  assert.equal(saved.booking_type, "principal");
  assert.equal(saved.requester_email, publicPayload.contact_email);
  assert.equal(saved.demand, publicPayload.demand);
  assert.equal(savedCandidates.length, 2);
  for (const candidate of savedCandidates) {
    assert.equal(candidate.candidate_session_id, modality === "presencial" ? session.id : null);
  }
  for (const path of [`/confirmado?token=${saved.public_token}`, `/status/${saved.public_token}`]) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
  if (modality === "presencial") {
    const tomorrow = new Date(`${today}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const nextDate = tomorrow.toISOString().slice(0, 10);
    const sessions = await (await fetch(`${fixture}/test_room_sessions`)).json();
    const nextSession = sessions.find((s) => s.session_date === nextDate) ?? (await (await fetch(`${fixture}/test_room_sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_date: nextDate, start_time: "08:30" }),
    })).json())[0];
    assert.equal((await call("/api/public/candidates/reschedule", {
      token: saved.public_token,
      candidate_id: savedCandidates[0].id,
      new_session_id: nextSession.id,
    }, false)).status, 200);
    const after = await (await fetch(`${fixture}/booking_candidates?booking_id=eq.${saved.id}`)).json();
    assert.equal(after.find((c) => c.id === savedCandidates[0].id).candidate_session_id, nextSession.id);
    assert.equal(after.find((c) => c.id === savedCandidates[1].id).candidate_session_id, session.id);
  }
  assert.equal((await call("/api/public/candidates/cancel", {
    token: saved.public_token,
    candidate_id: savedCandidates[0].id,
  }, false)).status, 200);
  const afterCancel = await (await fetch(`${fixture}/booking_candidates?booking_id=eq.${saved.id}`)).json();
  assert.equal(afterCancel.find((c) => c.id === savedCandidates[0].id).candidate_status, "cancelado");
  assert.equal(afterCancel.find((c) => c.id === savedCandidates[1].id).candidate_status, "confirmado");
}
assert.equal((await call("/api/public/candidates/cancel", {
  token: rows[0].public_token,
  candidate_id: candidates[0].id,
}, false)).status, 404);
console.log("PASS: public presencial/online, multiple candidates, confirmation, status, individual rescheduling/cancellation and manual booking isolation. No email was sent.");

// A sibling in the following week must survive archiving in the rendered admin table.
async function insertFixture(table, payload) {
  const response = await fetch(`${fixture}/${table}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  assert.equal(response.status, 200);
  return (await response.json())[0];
}
const nextMonday = new Date(`${today}T12:00:00Z`);
nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7) + 14);
const followingMonday = new Date(nextMonday);
followingMonday.setUTCDate(followingMonday.getUTCDate() + 7);
const dates = [nextMonday, followingMonday].map((date) => date.toISOString().slice(0, 10));
const sessions = await (await fetch(`${fixture}/test_room_sessions`)).json();
const splitSessions = [];
for (const date of dates) splitSessions.push(sessions.find((s) => s.session_date === date && s.start_time === "13:30:00") ?? await insertFixture("test_room_sessions", { session_date: date, start_time: "13:30" }));
const split = await insertFixture("bookings", {
  session_id: splitSessions[0].id, company_name: "Split week fixture", contact_name: "Contact",
  contact_email: "split@example.test", candidates_count: 2, public_token: randomUUID(),
  demand: "avaliacao_psicologica", service_company: "lince",
});
const names = [0, 1].map((index) => `SplitWeek${index}-${randomUUID()}`);
for (let index = 0; index < 2; index++) await insertFixture("booking_candidates", {
  booking_id: split.id, candidate_session_id: splitSessions[index].id, candidate_name: names[index], desired_role: "Role",
});
const visibleAdmin = async () => {
  const response = await fetch(`${base}/admin`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  return (await response.text()).split("</table>")[0];
};
assert.ok((await visibleAdmin()).includes(names[0]));
assert.ok((await visibleAdmin()).includes(names[1]));
for (let index = 0; index < 2; index++) {
  const exported = await call(`/api/admin/reports/export?week=${dates[index]}`);
  assert.equal(exported.status, 200);
  assert.equal((await call("/api/admin/reports/archive-week", { receipt: exported.body.receipt })).status, 200);
  const html = await visibleAdmin();
  assert.ok(!html.includes(names[index]));
  if (index === 0) assert.ok(html.includes(names[1]));
  const [parent] = await (await fetch(`${fixture}/bookings?id=eq.${split.id}`)).json();
  assert.equal(Boolean(parent.archived_at), index === 1);
  const again = await call(`/api/admin/reports/export?week=${dates[index]}`);
  const xlsx = new ExcelJS.Workbook();
  await xlsx.xlsx.load(Buffer.from(again.body.file, "base64"));
  assert.ok(xlsx.worksheets[0].getColumn(4).values.includes(names[index]));
}
console.log("PASS: mixed-week siblings are archived independently, active sibling remains rendered, aggregate updates last, and XLSX reexport keeps archived candidates.");
