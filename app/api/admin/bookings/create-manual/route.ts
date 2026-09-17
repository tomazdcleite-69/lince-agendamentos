import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdminServiceCompany,
  isBookingDemand,
  isDateKey,
} from "@/lib/bookingOperations";
import { getTodayInSaoPauloDateKey } from "@/lib/scheduleGrid";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePublicToken } from "@/lib/tokens";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const requesterEmail = user.email?.trim().toLowerCase() ?? "";
  const serviceCompany = getAdminServiceCompany(requesterEmail);
  if (!serviceCompany)
    return NextResponse.json(
      {
        error:
          "O e-mail da conta administrativa não possui uma unidade de serviço reconhecida. Contate a administração.",
      },
      { status: 403 },
    );
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return NextResponse.json(
      { error: "Envie os dados em JSON." },
      { status: 400 },
    );
  const text = (key: string) =>
    typeof payload[key] === "string" ? payload[key].trim() : "";
  const fields = Object.fromEntries(
    [
      "company_name",
      "contact_name",
      "contact_email",
      "contact_phone",
      "demand",
      "scheduled_date",
      "scheduled_time",
      "candidate_name",
      "desired_role",
      "notes",
    ].map((key) => [key, text(key)]),
  );
  if (
    ["company_name", "contact_name", "candidate_name", "desired_role"].some(
      (key) => !fields[key] || fields[key].length > 254,
    ) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contact_email) ||
    fields.contact_email.length > 254 ||
    !isBookingDemand(fields.demand) ||
    !isDateKey(fields.scheduled_date) ||
    fields.scheduled_date < getTodayInSaoPauloDateKey() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.scheduled_time) ||
    fields.notes.length > 5000 ||
    fields.contact_phone.length > 254
  ) {
    return NextResponse.json(
      {
        error:
          "Preencha os campos obrigatórios, a demanda, uma data atual ou futura e um horário válido.",
      },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin.rpc("create_manual_booking", {
    p_booking: {
      ...fields,
      contact_email: fields.contact_email.toLowerCase(),
      requester_email: requesterEmail,
      service_company: serviceCompany,
      public_token: generatePublicToken(),
    },
    p_candidate: {
      candidate_name: fields.candidate_name,
      desired_role: fields.desired_role,
    },
  });
  if (error) {
    console.error("[create-manual]", error.code);
    return NextResponse.json(
      {
        error:
          error.code === "P0001"
            ? "A sessão correspondente não possui vagas disponíveis."
            : "Não foi possível criar o agendamento avulso.",
      },
      { status: error.code === "P0001" ? 409 : 500 },
    );
  }
  return NextResponse.json({ success: true, booking_id: data });
}
