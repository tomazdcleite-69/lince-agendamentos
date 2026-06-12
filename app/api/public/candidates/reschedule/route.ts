import { NextResponse } from "next/server";
import { getTodayInSaoPauloDateKey } from "@/lib/scheduleGrid";
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
  const newSessionId = getString(payload, "new_session_id");

  if (!token || !candidateId || !newSessionId) {
    return errorResponse("Informe o agendamento, o candidato e a nova data.");
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, assessment_modality, status")
    .eq("public_token", token)
    .maybeSingle();

  if (bookingError) {
    return errorResponse("Não foi possível validar o agendamento.", 500);
  }

  if (!booking) {
    return errorResponse("Agendamento não encontrado.", 404);
  }

  if (booking.assessment_modality !== "presencial") {
    return errorResponse(
      "Avaliações online não possuem data presencial para reagendamento.",
      409,
    );
  }

  if (
    booking.status === "cancelado" ||
    booking.status === "realizado" ||
    booking.status === "nao_compareceu"
  ) {
    return errorResponse("Este agendamento não pode mais ser alterado.", 409);
  }

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("booking_candidates")
    .select("id, candidate_session_id, candidate_status")
    .eq("id", candidateId)
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (candidateError) {
    return errorResponse("Não foi possível validar o candidato.", 500);
  }

  if (!candidate) {
    return errorResponse("Candidato não encontrado neste agendamento.", 404);
  }

  if (candidate.candidate_status !== "confirmado") {
    return errorResponse("Esta avaliação não pode mais ser reagendada.", 409);
  }

  if (candidate.candidate_session_id === newSessionId) {
    return NextResponse.json({ success: true });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("test_room_sessions_with_availability")
    .select(
      "id, session_date, start_time, capacity, status, occupied_spots, available_spots",
    )
    .eq("id", newSessionId)
    .maybeSingle();

  if (sessionError) {
    return errorResponse("Não foi possível consultar a nova data.", 500);
  }

  if (!session) {
    return errorResponse("A nova data não foi encontrada.", 404);
  }

  if (session.session_date < getTodayInSaoPauloDateKey()) {
    return errorResponse("Não é possível reagendar para uma data passada.");
  }

  if (session.status !== "aberta") {
    return errorResponse("A nova data não está aberta para agendamento.", 409);
  }

  if (Number(session.available_spots) <= 0) {
    return errorResponse("A nova data não possui vagas disponíveis.", 409);
  }

  const { data: updatedCandidate, error: updateError } = await supabaseAdmin
    .from("booking_candidates")
    .update({
      candidate_session_id: newSessionId,
    })
    .eq("id", candidate.id)
    .eq("booking_id", booking.id)
    .eq("candidate_status", "confirmado")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return errorResponse("Não foi possível reagendar a avaliação.", 500);
  }

  if (!updatedCandidate) {
    return errorResponse("Esta avaliação já foi atualizada.", 409);
  }

  return NextResponse.json({ success: true });
}
