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

  const bookingId = getString(payload, "booking_id");

  if (!bookingId) {
    return errorResponse("Informe o agendamento.");
  }

  const { data: deletedBooking, error } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin] Erro ao excluir agendamento.", {
      bookingId,
      code: error.code,
      details: error.details,
      message: error.message,
    });

    return errorResponse("Não foi possível excluir o agendamento.", 500);
  }

  if (!deletedBooking) {
    return errorResponse("Agendamento não encontrado.", 404);
  }

  return NextResponse.json({
    booking_id: deletedBooking.id,
    success: true,
  });
}
