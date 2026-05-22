import { NextResponse } from "next/server";
import {
  buildCustomerBookingEmail,
  buildLinceNotificationEmail,
} from "@/lib/emailTemplates";
import { getEmailConfig, getResendClient } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePublicToken } from "@/lib/tokens";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CandidateInput = {
  candidate_name: string;
  desired_role: string;
};

type CandidateParseResult =
  | {
      candidates: CandidateInput[];
      error?: never;
    }
  | {
      candidates?: never;
      error: string;
    };

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function getCandidates(value: unknown): CandidateParseResult {
  if (!Array.isArray(value)) {
    return {
      error: "Informe a lista de candidatos.",
    };
  }

  if (value.length === 0) {
    return {
      error: "Adicione pelo menos um candidato para continuar.",
    };
  }

  const candidates = value.map((item) => {
    const candidate =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};

    return {
      candidate_name: getString(candidate, "candidate_name"),
      desired_role: getString(candidate, "desired_role"),
    };
  });

  if (
    candidates.some(
      (candidate) => !candidate.candidate_name || !candidate.desired_role,
    )
  ) {
    return {
      error: "Informe nome e cargo pretendido para todos os candidatos.",
    };
  }

  return {
    candidates,
  };
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

function getBaseUrl(request: Request) {
  return request.headers.get("origin") ?? new URL(request.url).origin;
}

function normalizeEmailError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    return {
      message: typeof value.message === "string" ? value.message : undefined,
      name: typeof value.name === "string" ? value.name : undefined,
      statusCode:
        typeof value.statusCode === "number" ? value.statusCode : undefined,
    };
  }

  return {
    message: "Erro desconhecido ao enviar e-mail.",
  };
}

async function sendBookingEmail(
  label: string,
  payload: {
    from: string;
    html: string;
    subject: string;
    to: string | string[];
  },
) {
  const resend = getResendClient();

  if (!resend) {
    console.error("[email] Resend não configurado para envio.", {
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      messageType: label,
    });
    return;
  }

  try {
    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error("[email] Falha retornada pelo Resend.", {
        error: normalizeEmailError(result.error),
        messageType: label,
      });
    }
  } catch (emailError) {
    console.error("[email] Erro ao enviar e-mail.", {
      error: normalizeEmailError(emailError),
      messageType: label,
    });
  }
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
  const parsedCandidates = getCandidates(payload.candidates);

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

  if (parsedCandidates.error || !parsedCandidates.candidates) {
    return errorResponse(parsedCandidates.error ?? "Informe os candidatos.");
  }

  const candidates: CandidateInput[] = parsedCandidates.candidates;
  const candidatesCount = candidates.length;

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

  const { error: candidatesError } = await supabaseAdmin
    .from("booking_candidates")
    .insert(
      candidates.map((candidate) => ({
        booking_id: booking.id,
        candidate_name: candidate.candidate_name,
        desired_role: candidate.desired_role,
      })),
    );

  if (candidatesError) {
    await supabaseAdmin.from("bookings").delete().eq("id", booking.id);

    return errorResponse(
      "Não foi possível registrar os candidatos do agendamento.",
      500,
    );
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

  const { from, linceNotificationEmails } = getEmailConfig();

  if (!from || linceNotificationEmails.length === 0) {
    console.error("[email] Configuração de e-mail incompleta.", {
      hasEmailFrom: Boolean(from),
      hasLinceNotificationEmail: linceNotificationEmails.length > 0,
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
    });
  } else {
    const baseUrl = getBaseUrl(request);
    const emailDetails = {
      adminUrl: `${baseUrl}/admin`,
      candidatesCount,
      candidates: candidates.map((candidate) => ({
        candidateName: candidate.candidate_name,
        desiredRole: candidate.desired_role,
      })),
      companyName,
      contactEmail,
      contactName,
      contactPhone: contactPhone || null,
      notes: notes || null,
      sessionDate: session.session_date,
      startTime: session.start_time,
      statusUrl: `${baseUrl}/status/${booking.public_token}`,
    };
    const customerEmail = buildCustomerBookingEmail(emailDetails);
    const linceEmail = buildLinceNotificationEmail(emailDetails);

    await Promise.all([
      sendBookingEmail("cliente", {
        from,
        html: customerEmail.html,
        subject: customerEmail.subject,
        to: contactEmail,
      }),
      sendBookingEmail("equipe_lince", {
        from,
        html: linceEmail.html,
        subject: linceEmail.subject,
        to: linceNotificationEmails,
      }),
    ]);
  }

  return NextResponse.json({
    booking_id: booking.id,
    public_token: booking.public_token,
    success: true,
  });
}
