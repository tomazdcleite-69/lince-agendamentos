import { NextResponse } from "next/server";
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
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Envie os dados em JSON.");
  }

  const token = getString(payload, "token");
  const candidateId = getString(payload, "candidate_id");

  if (!token || !candidateId) {
    return errorResponse("Informe o agendamento e o candidato.");
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();

  if (bookingError) {
    return errorResponse("Não foi possível validar o agendamento.", 500);
  }

  if (!booking) {
    return errorResponse("Agendamento não encontrado.", 404);
  }

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("booking_candidates")
    .select("id, candidate_status")
    .eq("id", candidateId)
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (candidateError) {
    return errorResponse("Não foi possível validar o candidato.", 500);
  }

  if (!candidate) {
    return errorResponse("Candidato não encontrado neste agendamento.", 404);
  }

  if (
    booking.status === "cancelado" ||
    booking.status === "realizado" ||
    booking.status === "nao_compareceu" ||
    candidate.candidate_status !== "confirmado"
  ) {
    return errorResponse("Esta avaliação não pode mais ser cancelada.", 409);
  }

  const { data: updatedCandidate, error: updateError } = await supabaseAdmin
    .from("booking_candidates")
    .update({
      cancelled_at: new Date().toISOString(),
      candidate_status: "cancelado",
    })
    .eq("id", candidate.id)
    .eq("booking_id", booking.id)
    .eq("candidate_status", "confirmado")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return errorResponse("Não foi possível cancelar a avaliação.", 500);
  }

  if (!updatedCandidate) {
    return errorResponse("Esta avaliação já foi atualizada.", 409);
  }

  return NextResponse.json({ success: true });
}
