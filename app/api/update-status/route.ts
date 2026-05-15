import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { BOOKING_STATUSES, type BookingStatus } from "@/types";

export const runtime = "nodejs";

const validStatuses = new Set<string>(BOOKING_STATUSES);

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
    return errorResponse("Envie os dados de atualização em JSON.");
  }

  const bookingId = getString(payload, "booking_id");
  const newStatus = getString(payload, "new_status") as BookingStatus;
  const note = getString(payload, "note");

  if (!bookingId) {
    return errorResponse("Informe o agendamento que será atualizado.");
  }

  if (!validStatuses.has(newStatus)) {
    return errorResponse("Informe um status válido.");
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return errorResponse("Não foi possível consultar o agendamento.", 500);
  }

  if (!booking) {
    return errorResponse("Agendamento não encontrado.", 404);
  }

  const oldStatus = booking.status;
  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId);

  if (updateError) {
    return errorResponse("Não foi possível atualizar o status.", 500);
  }

  const { error: historyError } = await supabaseAdmin
    .from("status_history")
    .insert({
      booking_id: bookingId,
      changed_by: "equipe_lince",
      new_status: newStatus,
      note: note || null,
      old_status: oldStatus,
    });

  if (historyError) {
    return errorResponse(
      "O status foi atualizado, mas não foi possível registrar o histórico.",
      500,
    );
  }

  return NextResponse.json({
    new_status: newStatus,
    old_status: oldStatus,
    success: true,
  });
}
