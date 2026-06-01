import { NextResponse } from "next/server";
import { normalizeAssessmentModality } from "@/lib/assessmentModality";
import {
  buildCustomerBookingEmail,
  buildLinceNotificationEmail,
} from "@/lib/emailTemplates";
import { getEmailConfig, getResendClient } from "@/lib/resend";
import { getTodayInSaoPauloDateKey } from "@/lib/scheduleGrid";
import {
  getServiceCompanyLabel,
  normalizeServiceCompany,
} from "@/lib/serviceCompany";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePublicToken } from "@/lib/tokens";
import type { AssessmentModality } from "@/types";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CandidateInput = {
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
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

function getCandidates(
  value: unknown,
  assessmentModality: AssessmentModality,
): CandidateParseResult {
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
      candidate_email: getString(candidate, "candidate_email").toLowerCase(),
      candidate_phone: getString(candidate, "candidate_phone"),
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

  if (
    assessmentModality === "online" &&
    candidates.some((candidate) => !candidate.candidate_phone)
  ) {
    return {
      error: "Informe o telefone de todos os candidatos da avaliação online.",
    };
  }

  if (
    candidates.some(
      (candidate) =>
        candidate.candidate_email &&
        !emailPattern.test(candidate.candidate_email),
    )
  ) {
    return {
      error: "Informe e-mails válidos para os candidatos.",
    };
  }

  return {
    candidates: candidates.map((candidate) => ({
      ...candidate,
      candidate_email: candidate.candidate_email || null,
      candidate_phone: candidate.candidate_phone || null,
    })),
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
  const assessmentModality = normalizeAssessmentModality(
    getString(payload, "assessment_modality"),
  );
  const parsedCandidates = getCandidates(payload.candidates, assessmentModality);
  const serviceCompany = normalizeServiceCompany(
    getString(payload, "service_company"),
  );
  const serviceCompanyLabel = getServiceCompanyLabel(serviceCompany);

  if (assessmentModality === "presencial" && !sessionId) {
    return errorResponse("Escolha uma data para agendar.");
  }

  if (assessmentModality === "online" && sessionId) {
    return errorResponse("Avaliação online não utiliza data ou horário.");
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

  const sessionResult =
    assessmentModality === "presencial"
      ? await supabaseAdmin
          .from("test_room_sessions_with_availability")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle()
      : { data: null, error: null };

  const { data: session, error: sessionError } = sessionResult;

  if (sessionError) {
    return errorResponse("Não foi possível consultar a data escolhida.", 500);
  }

  if (assessmentModality === "presencial" && !session) {
    return errorResponse("A data escolhida não foi encontrada.", 404);
  }

  const availableSpots = session ? Number(session.available_spots) : 0;
  const today = getTodayInSaoPauloDateKey();

  if (
    assessmentModality === "presencial" &&
    session &&
    session.session_date < today
  ) {
    return errorResponse("Não é possível agendar datas anteriores a hoje.");
  }

  if (
    assessmentModality === "presencial" &&
    session &&
    session.status !== "aberta"
  ) {
    return errorResponse("A data escolhida não está aberta para agendamento.");
  }

  if (assessmentModality === "presencial" && availableSpots < candidatesCount) {
    return errorResponse(
      `A data escolhida possui apenas ${availableSpots} vagas disponíveis.`,
    );
  }

  const publicToken = generatePublicToken();
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      assessment_modality: assessmentModality,
      candidates_count: candidatesCount,
      company_name: companyName,
      contact_email: contactEmail,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      notes: notes || null,
      public_token: publicToken,
      service_company: serviceCompany,
      session_id: assessmentModality === "presencial" ? sessionId : null,
      status: "confirmado",
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
        candidate_email: candidate.candidate_email,
        candidate_phone: candidate.candidate_phone,
        candidate_status: "confirmado",
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
      new_status: "confirmado",
      note:
        assessmentModality === "online"
          ? "Solicitação de avaliação online registrada pelo formulário público."
          : "Agendamento presencial confirmado pelo formulário público.",
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
      assessmentModality,
      candidatesCount,
      candidates: candidates.map((candidate) => ({
        candidateEmail: candidate.candidate_email,
        candidateName: candidate.candidate_name,
        candidatePhone: candidate.candidate_phone,
        desiredRole: candidate.desired_role,
      })),
      companyName,
      contactEmail,
      contactName,
      contactPhone: contactPhone || null,
      notes: notes || null,
      serviceCompanyLabel,
      sessionDate: session?.session_date ?? null,
      startTime: session?.start_time ?? null,
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
