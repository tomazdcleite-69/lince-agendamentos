import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildCandidateNoShowEmail } from "@/lib/emailTemplates";
import { getEmailConfig, getResendClient } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import type { AssessmentModality } from "@/types";

export const runtime = "nodejs";

type NoShowSession = {
  session_date: string;
  start_time: string;
};

type NoShowBooking = {
  assessment_modality: AssessmentModality;
  company_name: string;
  contact_email: string;
  id: string;
  test_room_sessions: NoShowSession | NoShowSession[] | null;
};

type NoShowCandidate = {
  bookings: NoShowBooking | NoShowBooking[] | null;
  candidate_name: string;
  id: string;
  desired_role: string;
  no_show_notified_at: string | null;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
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

function getRelatedBooking(candidate: NoShowCandidate) {
  return Array.isArray(candidate.bookings)
    ? candidate.bookings[0]
    : candidate.bookings;
}

function getRelatedSession(booking: NoShowBooking) {
  return Array.isArray(booking.test_room_sessions)
    ? booking.test_room_sessions[0]
    : booking.test_room_sessions;
}

async function setNotificationTimestamp(candidateId: string, timestamp: string) {
  const { error } = await supabaseAdmin
    .from("booking_candidates")
    .update({
      no_show_notified_at: timestamp,
    })
    .eq("id", candidateId);

  return error;
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

  const { data, error } = await supabaseAdmin
    .from("booking_candidates")
    .select(
      "id, candidate_name, desired_role, no_show_notified_at, bookings(id, company_name, contact_email, assessment_modality, test_room_sessions(session_date, start_time))",
    )
    .eq("id", candidateId)
    .maybeSingle();

  const candidate = data as unknown as NoShowCandidate | null;

  if (error || !candidate) {
    return errorResponse("Candidato não encontrado.", 404);
  }

  const booking = getRelatedBooking(candidate);

  if (!booking) {
    return errorResponse("Agendamento vinculado não encontrado.", 404);
  }

  const { error: statusError } = await supabaseAdmin
    .from("booking_candidates")
    .update({
      candidate_status: "nao_compareceu",
    })
    .eq("id", candidateId);

  if (statusError) {
    return errorResponse("Não foi possível atualizar o status.", 500);
  }

  if (candidate.no_show_notified_at) {
    return NextResponse.json({
      already_notified: true,
      success: true,
    });
  }

  const { from } = getEmailConfig();
  const resend = getResendClient();

  if (!from || !resend) {
    console.error("[email] Configuração de e-mail incompleta.", {
      hasEmailFrom: Boolean(from),
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      messageType: "nao_compareceu",
    });

    return NextResponse.json({
      email_warning:
        "Status atualizado, mas o e-mail não foi enviado por configuração incompleta.",
      success: true,
    });
  }

  const session = getRelatedSession(booking);
  const noShowEmail = buildCandidateNoShowEmail({
    assessmentModality: booking.assessment_modality,
    candidateName: candidate.candidate_name,
    companyName: booking.company_name,
    desiredRole: candidate.desired_role,
    sessionDate: session?.session_date ?? null,
    startTime: session?.start_time ?? null,
  });

  try {
    const result = await resend.emails.send({
      from,
      html: noShowEmail.html,
      subject: noShowEmail.subject,
      to: booking.contact_email,
    });

    if (result.error) {
      console.error("[email] Falha retornada pelo Resend.", {
        error: normalizeEmailError(result.error),
        messageType: "nao_compareceu",
      });

      return NextResponse.json({
        email_warning:
          "Status atualizado, mas houve falha no envio do e-mail.",
        success: true,
      });
    }
  } catch (emailError) {
    console.error("[email] Erro ao enviar e-mail.", {
      error: normalizeEmailError(emailError),
      messageType: "nao_compareceu",
    });

    return NextResponse.json({
      email_warning: "Status atualizado, mas houve falha no envio do e-mail.",
      success: true,
    });
  }

  const notificationTimestamp = new Date().toISOString();
  const timestampError = await setNotificationTimestamp(
    candidateId,
    notificationTimestamp,
  );

  if (timestampError) {
    return NextResponse.json({
      email_warning:
        "Cliente notificado, mas não foi possível registrar a data da notificação.",
      success: true,
    });
  }

  return NextResponse.json({
    no_show_notified_at: notificationTimestamp,
    success: true,
  });
}
