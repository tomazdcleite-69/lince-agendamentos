import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isBookingDemand } from "@/lib/bookingOperations";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await getCurrentUser()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.booking_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(payload.booking_id) ||
    !isBookingDemand(payload.demand)
  ) {
    return NextResponse.json(
      { error: "Informe o agendamento e uma demanda válida." },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ demand: payload.demand })
    .eq("id", payload.booking_id)
    .select("id")
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Não foi possível salvar a demanda." },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { error: "Agendamento não encontrado." },
      { status: 404 },
    );
  return NextResponse.json({ success: true });
}
