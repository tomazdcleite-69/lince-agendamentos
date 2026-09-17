import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readReportReceipt } from "@/lib/adminReports";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (typeof payload?.receipt !== "string")
    return NextResponse.json(
      { error: "Exporte o relatório antes de arquivar." },
      { status: 400 },
    );
  let receipt;
  try {
    receipt = readReportReceipt(payload.receipt, user.id);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Exportação inválida.",
      },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin.rpc("archive_exported_candidates", {
    p_start: receipt.start,
    p_end: receipt.end,
    p_candidates: receipt.candidates,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001"
            ? "Os dados mudaram. Exporte a semana novamente."
            : "Não foi possível arquivar a semana.",
      },
      { status: error.code === "P0001" ? 409 : 500 },
    );
  return NextResponse.json({ success: true, archived: data });
}
