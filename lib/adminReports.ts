import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import {
  BOOKING_DEMAND_LABELS,
  CANDIDATE_STATUS_LABELS,
  type BookingDemand,
  type CandidateStatus,
} from "@/types";
import {
  formatOperationalDate,
  getRequesterOrigin,
} from "@/lib/bookingOperations";

export type ReportRow = {
  booking_id: string;
  candidate_id: string;
  operational_date: string;
  operational_time: string | null;
  company_name: string;
  candidate_name: string;
  desired_role: string;
  notes: string | null;
  candidate_status: CandidateStatus;
  demand: BookingDemand | null;
  requester_email: string | null;
  booking_type: string;
  assessment_modality: string;
  archived_at: string | null;
  candidate_archived_at: string | null;
};
export type ReportSnapshot = {
  candidate_id: string;
  booking_id: string;
  fingerprint: string;
  archivable: boolean;
};
export type WeekReport = { rows: ReportRow[]; candidates: ReportSnapshot[] };
type Receipt = {
  userId: string;
  start: string;
  end: string;
  expires: number;
  candidates: ReportSnapshot[];
};

function signature(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Configuração do servidor indisponível.");
  return createHmac("sha256", key).update(`lince-report-v2:${value}`).digest();
}

export function signReportReceipt(receipt: Omit<Receipt, "expires">) {
  const body = Buffer.from(
    JSON.stringify({ ...receipt, expires: Date.now() + 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

export function readReportReceipt(token: string, userId: string): Receipt {
  const [body, signed, extra] = token.split(".");
  if (!body || !signed || extra)
    throw new Error("Exportação inválida. Exporte novamente.");
  const actual = Buffer.from(signed, "base64url");
  const expected = signature(body);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("Exportação inválida. Exporte novamente.");
  const value = JSON.parse(
    Buffer.from(body, "base64url").toString(),
  ) as Receipt;
  if (value.userId !== userId || value.expires < Date.now())
    throw new Error(
      "A exportação expirou. Exporte novamente antes de arquivar.",
    );
  return value;
}

export async function buildReportWorkbook(rows: ReportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lince";
  const sheet = workbook.addWorksheet("Agendamentos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Data", key: "date", width: 16 },
    { header: "Horário", key: "time", width: 14 },
    { header: "Empresa", key: "company", width: 30 },
    { header: "Nome Candidato", key: "candidate", width: 32 },
    { header: "Cargo", key: "role", width: 26 },
    { header: "Observação da Empresa", key: "notes", width: 48 },
    { header: "Status", key: "status", width: 21 },
    { header: "Demanda", key: "demand", width: 28 },
    { header: "Responsável Solicitante", key: "requester", width: 40 },
    { header: "Origem", key: "origin", width: 18 },
  ];
  for (const row of rows) {
    // Plain string cells are intentional: user input must never become an Excel formula.
    sheet.addRow({
      date: formatOperationalDate(row.operational_date),
      time: row.operational_time?.slice(0, 5) ?? "Online",
      company: row.company_name,
      candidate: row.candidate_name,
      role: row.desired_role,
      notes: row.notes ?? "",
      status:
        CANDIDATE_STATUS_LABELS[row.candidate_status] ?? row.candidate_status,
      demand: row.demand ? BOOKING_DEMAND_LABELS[row.demand] : "Não informado",
      requester: row.requester_email ?? "Não informado",
      origin: getRequesterOrigin(row.requester_email),
    });
  }
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5B2396" },
  };
  sheet.getRow(1).height = 30;
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  sheet.autoFilter = { from: "A1", to: "J1" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
