import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePublicToken } from "@/lib/tokens";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Envie os dados do agendamento em JSON.");
  }

  const sessionId = getString(payload, "session_id");
  const companyName = getString(payload, "company_name");
  const contactName = getString(payload, "contact_name");
  const contactEmail = getString(payload, "contact_email").toLowerCase();
  const contactPhone = getString(payload, "contact_phone");
  const notes = getString(payload, "notes");
  const candidatesCount = Number(payload.candidates_count);

  if (!sessionId) {
    return errorResponse("Escolha uma data para agendar.");
  }

  if (!companyName) {
    return errorResponse("Informe o nome da empresa.");
  }

  if (!contactName) {
    return errorResponse("Informe o nome do responsável.");
  }

  if (!contactEmail || !emailPattern.test(contactEmail)) {
    return errorResponse("Informe um e-mail válido.");
  }

  if (!Number.isInteger(candidatesCount) || candidatesCount <= 0) {
    return errorResponse("Informe uma quantidade válida de candidatos.");
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("test_room_sessions_with_availability")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return errorResponse("Não foi possível consultar a data escolhida.", 500);
  }

  if (!session) {
    return errorResponse("A data escolhida não foi encontrada.", 404);
  }

  const availableSpots = Number(session.available_spots);

  if (session.status !== "aberta") {
    return errorResponse("A data escolhida não está aberta para agendamento.");
  }

  if (availableSpots < candidatesCount) {
    return errorResponse(
      `A data escolhida possui apenas ${availableSpots} vagas disponíveis.`,
    );
  }

  const publicToken = generatePublicToken();
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      candidates_count: candidatesCount,
      company_name: companyName,
      contact_email: contactEmail,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      notes: notes || null,
      public_token: publicToken,
      session_id: sessionId,
      status: "solicitado",
    })
    .select("id, public_token")
    .single();

  if (bookingError || !booking) {
    return errorResponse("Não foi possível criar o agendamento.", 500);
  }

  const { error: historyError } = await supabaseAdmin
    .from("status_history")
    .insert({
      booking_id: booking.id,
      changed_by: "cliente",
      new_status: "solicitado",
      note: "Agendamento criado pelo formulário público.",
      old_status: null,
    });

  if (historyError) {
    return errorResponse(
      "O agendamento foi criado, mas não foi possível registrar o histórico.",
      500,
    );
  }

  return NextResponse.json({
    booking_id: booking.id,
    public_token: booking.public_token,
    success: true,
  });
}
