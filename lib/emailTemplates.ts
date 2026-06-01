import "server-only";

import {
  ASSESSMENT_MODALITY_LABELS,
  type AssessmentModality,
} from "@/types";

type BookingEmailDetails = {
  adminUrl: string;
  assessmentModality: AssessmentModality;
  candidates: Array<{
    candidateEmail: string | null;
    candidateName: string;
    candidatePhone: string | null;
    desiredRole: string;
  }>;
  candidatesCount: number;
  companyName: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string | null;
  notes: string | null;
  serviceCompanyLabel: string;
  sessionDate: string | null;
  startTime: string | null;
  statusUrl: string;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatOptionalDate(date: string | null) {
  return date ? formatDate(date) : "Não se aplica";
}

function formatOptionalTime(time: string | null) {
  return time ? time.slice(0, 5) : "Não se aplica";
}

function formatCandidates(candidates: BookingEmailDetails["candidates"]) {
  return candidates
    .map((candidate, index) => {
      const details = [
        `${index + 1}. ${candidate.candidateName} - ${candidate.desiredRole}`,
      ];

      if (candidate.candidatePhone) {
        details.push(`Telefone: ${candidate.candidatePhone}`);
      }

      if (candidate.candidateEmail) {
        details.push(`E-mail: ${candidate.candidateEmail}`);
      }

      return details.join("\n");
    })
    .join("\n");
}

function renderLayout(title: string, rows: Array<[string, string | number]>) {
  const renderedRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px; width: 180px;">${escapeHtml(
            label,
          )}</td>
          <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600; white-space: pre-line;">${escapeHtml(
            value,
          )}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <body style="margin: 0; padding: 0; background: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px;">
            <p style="margin: 0 0 12px; color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">Lince Humanização</p>
            <h1 style="margin: 0 0 20px; color: #0f172a; font-size: 24px; line-height: 1.25;">${escapeHtml(
              title,
            )}</h1>
            <table role="presentation" style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
              ${renderedRows}
            </table>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function buildCustomerBookingEmail(details: BookingEmailDetails) {
  const modalityLabel = ASSESSMENT_MODALITY_LABELS[details.assessmentModality];

  return {
    html: renderLayout("Solicitação recebida - Avaliação Psicológica Lince", [
      ["Modalidade", modalityLabel],
      ["Empresa do serviço", details.serviceCompanyLabel],
      ["Empresa solicitante", details.companyName],
      ["Responsável", details.contactName],
      ["Data", formatOptionalDate(details.sessionDate)],
      ["Horário", formatOptionalTime(details.startTime)],
      ["Quantidade de candidatos", details.candidatesCount],
      ["Candidatos", formatCandidates(details.candidates)],
      ["Status", "Confirmado"],
      ["Link público de status", details.statusUrl],
    ]),
    subject: "Solicitação recebida - Avaliação Psicológica Lince",
  };
}

export function buildLinceNotificationEmail(details: BookingEmailDetails) {
  const modalityLabel = ASSESSMENT_MODALITY_LABELS[details.assessmentModality];

  return {
    html: renderLayout("Nova solicitação de Avaliação Psicológica", [
      ["Modalidade", modalityLabel],
      ["Empresa do serviço", details.serviceCompanyLabel],
      ["Empresa solicitante", details.companyName],
      ["Responsável", details.contactName],
      ["E-mail", details.contactEmail],
      ["Telefone", details.contactPhone || "Não informado"],
      ["Data", formatOptionalDate(details.sessionDate)],
      ["Horário", formatOptionalTime(details.startTime)],
      ["Quantidade de candidatos", details.candidatesCount],
      ["Candidatos", formatCandidates(details.candidates)],
      ["Observações", details.notes || "Sem observações."],
      ["Link para o painel", details.adminUrl],
    ]),
    subject: "Nova solicitação de Avaliação Psicológica",
  };
}
