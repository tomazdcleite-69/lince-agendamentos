import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Não autorizado.", 401);
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Envie os dados em JSON.");
  }

  const candidateId = getString(payload, "candidate_id");

  if (!candidateId) {
    return errorResponse("Informe o candidato.");
  }

  const { error } = await supabaseAdmin
    .from("booking_candidates")
    .update({
      candidate_status: "realizado",
    })
    .eq("id", candidateId);

  if (error) {
    return errorResponse("Não foi possível marcar o candidato como realizado.", 500);
  }

  return NextResponse.json({ success: true });
}
