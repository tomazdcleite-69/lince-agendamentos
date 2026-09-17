import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReportWeek } from "@/lib/bookingOperations";
import {
  buildReportWorkbook,
  signReportReceipt,
  type WeekReport,
} from "@/lib/adminReports";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const date = new URL(request.url).searchParams.get("week") ?? "";
  let week;
  try {
    week = getReportWeek(date);
  } catch {
    return NextResponse.json(
      { error: "Selecione uma semana válida." },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin.rpc("admin_week_report", {
    p_start: week.start,
    p_end: week.end,
  });
  if (error || !data)
    return NextResponse.json(
      { error: "Não foi possível consultar os registros para exportação." },
      { status: 500 },
    );
  const report = data as unknown as WeekReport;
  if (!report.rows.length)
    return NextResponse.json(
      { error: "Nenhum candidato encontrado nesta semana." },
      { status: 404 },
    );
  try {
    const file = await buildReportWorkbook(report.rows);
    const eligible = report.candidates.filter((candidate) => candidate.archivable);
    return NextResponse.json(
      {
        success: true,
        file: file.toString("base64"),
        filename: `lince-agendamentos-${week.start}.xlsx`,
        receipt: signReportReceipt({
          userId: user.id,
          ...week,
          candidates: eligible,
        }),
        count: report.rows.length,
        archivable: eligible.length,
        ...week,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[report-export]",
      error instanceof Error ? error.message : "Falha ao gerar XLSX",
    );
    return NextResponse.json(
      { error: "Não foi possível gerar o relatório." },
      { status: 500 },
    );
  }
}
