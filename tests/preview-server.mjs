// Isolated UI/integration fixture. It does not read .env or connect to Supabase.
import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createTestDatabase, applyMigration } from "./database-fixture.mjs";

const db = await createTestDatabase();
await applyMigration(db);
const session = randomUUID();
const now = new Date().toISOString().slice(0, 10);
await db.query(
  "insert into test_room_sessions(id,session_date,start_time) values ($1,$2,'13:30')",
  [session, now],
);
for (const [index, status] of [
  "confirmado",
  "nao_compareceu",
  "realizado",
  "cancelado",
].entries()) {
  const id = randomUUID();
  await db.query(
    `insert into bookings(id,session_id,assessment_modality,company_name,contact_name,contact_email,candidates_count,public_token,demand,requester_email,notes)
    values ($1,$2,$3,'Empresa Demonstração','Equipe Exemplo','contato@example.test',1,$4,'avaliacao_psicologica','solicitante@example.test','Registro fictício para validação local.')`,
    [
      id,
      index === 3 ? null : session,
      index === 3 ? "online" : "presencial",
      randomUUID(),
    ],
  );
  await db.query(
    "insert into booking_candidates(booking_id,candidate_session_id,candidate_name,desired_role,candidate_status) values ($1,$2,$3,'Analista',$4)",
    [
      id,
      index === 3 ? null : session,
      `Candidato Exemplo ${index + 1}`,
      status,
    ],
  );
}
await db.query("select create_manual_booking($1,$2)", [
  JSON.stringify({
    scheduled_date: now,
    scheduled_time: "16:17",
    demand: "recrutamento_selecao",
    service_company: "lince",
    requester_email: "demo@lincehumanizacao.com",
    company_name: "Empresa Avulsa Exemplo",
    contact_name: "Equipe Exemplo",
    contact_email: "contato@example.test",
    public_token: randomUUID(),
  }),
  JSON.stringify({
    candidate_name: "Candidata Avulsa Exemplo",
    desired_role: "Supervisora",
  }),
]);

const user = {
  id: randomUUID(),
  aud: "authenticated",
  role: "authenticated",
  email: "demo@lincehumanizacao.com",
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const access = "fixture-only-token";
const users = {
  [access]: user,
  "fixture-psico-token": { ...user, id: randomUUID(), email: "DEMO@PSICOESPACO.COM.BR" },
  "fixture-external-token": { ...user, id: randomUUID(), email: "external@example.test" },
};
await db.exec("set role service_role");
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const send = (data, status = 200) => {
    res.statusCode = status;
    res.end(
      JSON.stringify(data, (key, value) =>
        ["session_date", "scheduled_date"].includes(key) &&
        typeof value === "string"
          ? value.slice(0, 10)
          : value,
      ),
    );
  };
  try {
    const url = new URL(req.url, "http://127.0.0.1:54329");
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : {};
    const currentUser = users[req.headers.authorization?.replace("Bearer ", "")];
    if (url.pathname === "/auth/v1/user")
      return send(
        currentUser
          ? currentUser
          : { message: "Not authenticated" },
        currentUser ? 200 : 401,
      );
    if (url.pathname === "/auth/v1/token")
      return payload.email === "demo@lincehumanizacao.com" &&
        payload.password === "local-preview-only"
        ? send({
            access_token: access,
            refresh_token: access,
            expires_in: 3600,
            token_type: "bearer",
            user,
          })
        : send({ message: "Invalid fixture login" }, 400);
    if (url.pathname === "/auth/v1/logout") return send({});
    if (req.headers.authorization !== "Bearer fixture-service")
      return send({ message: "Fixture requires a server-side service key" }, 403);
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const name = url.pathname.split("/").at(-1);
      const definitions = {
        create_manual_booking: ["p_booking", "p_candidate"],
        create_principal_booking: ["p_booking", "p_candidates"],
        admin_week_report: ["p_start", "p_end"],
        archive_exported_candidates: ["p_start", "p_end", "p_candidates"],
      };
      const args = definitions[name];
      if (!args) return send({ message: "Unknown fixture RPC" }, 404);
      const result = await db.query(
        `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`,
        args.map((key) =>
          typeof payload[key] === "object"
            ? JSON.stringify(payload[key])
            : payload[key],
        ),
      );
      return send(result.rows[0].value);
    }
    const table = url.pathname.split("/").at(-1);
    if (
      ![
        "bookings",
        "booking_candidates",
        "test_room_sessions",
        "test_room_sessions_with_availability",
        "status_history",
      ].includes(table)
    )
      return send({ message: "Unknown fixture table" }, 404);
    const params = [],
      clauses = [];
    const columns = (
      await db.query(
        "select column_name from information_schema.columns where table_name=$1 and table_schema='public'",
        [table],
      )
    ).rows.map((row) => row.column_name);
    for (const [key, value] of url.searchParams) {
      if (!columns.includes(key)) continue;
      if (value === "is.null") clauses.push(`t.${key} is null`);
      else if (value.startsWith("in.(")) {
        const list = value.slice(4, -1).split(",");
        clauses.push(
          `t.${key} in (${list
            .map((item) => {
              params.push(item);
              return `$${params.length}`;
            })
            .join(",")})`,
        );
      } else {
        const [op, ...rest] = value.split(".");
        const operators = { eq: "=", gte: ">=", lte: "<=", gt: ">", lt: "<" };
        if (!operators[op]) continue;
        params.push(rest.join("."));
        clauses.push(`t.${key} ${operators[op]} $${params.length}`);
      }
    }
    if (table === "bookings" && url.searchParams.has("or"))
      clauses.push("coalesce(t.booking_type,'principal')='principal'");
    const where = clauses.length ? ` where ${clauses.join(" and ")}` : "";
    let result;
    if (req.method === "PATCH") {
      const entries = Object.entries(payload).filter(([key]) =>
        columns.includes(key),
      );
      const assignments = entries.map(([key, value]) => {
        params.push(value);
        return `${key}=$${params.length}`;
      });
      result = await db.query(
        `update ${table} t set ${assignments.join(",")}${where} returning *`,
        params,
      );
    } else if (req.method === "DELETE")
      result = await db.query(
        `delete from ${table} t${where} returning *`,
        params,
      );
    else if (req.method === "POST") {
      const records = Array.isArray(payload) ? payload : [payload];
      const rows = [];
      for (const record of records) {
        const entries = Object.entries(record).filter(([key]) =>
          columns.includes(key),
        );
        const inserted = await db.query(
          `insert into ${table}(${entries.map(([key]) => key).join(",")}) values (${entries.map((_, i) => `$${i + 1}`).join(",")}) returning *`,
          entries.map(([, value]) => value),
        );
        rows.push(...inserted.rows);
      }
      result = { rows };
    } else {
      result = await db.query(`select t.* from ${table} t${where}`, params);
      const select = url.searchParams.get("select") ?? "";
      if (table === "bookings")
        for (const row of result.rows) {
          if (select.includes("test_room_sessions("))
            row.test_room_sessions =
              (
                await db.query("select * from test_room_sessions where id=$1", [
                  row.session_id,
                ])
              ).rows[0] ?? null;
          if (select.includes("booking_candidates("))
            row.booking_candidates = (
              await db.query(
                "select * from booking_candidates where booking_id=$1",
                [row.id],
              )
            ).rows;
        }
      const offset = Number(url.searchParams.get("offset") ?? 0),
        limit = Number(url.searchParams.get("limit") ?? 1000);
      result.rows = result.rows.slice(offset, offset + limit);
    }
    if (req.headers.accept?.includes("vnd.pgrst.object"))
      return send(result.rows[0] ?? null);
    return send(result.rows);
  } catch (error) {
    send({ message: error.message, code: error.code ?? "FIXTURE_ERROR", details: error.detail }, 400);
  }
});
server.listen(54329, "127.0.0.1");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      LINCE_NOTIFICATION_EMAIL: "",
    },
  },
);
console.log(
  "Isolated fixture preview: http://127.0.0.1:3001 (demo@lincehumanizacao.com / local-preview-only). No production data.",
);
function stop() {
  child.kill();
  server.close();
  void db.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", () => {
  server.close();
  void db.close();
});
