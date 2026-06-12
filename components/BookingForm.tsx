"use client";

import { FormEvent, useMemo, useState } from "react";
import ScheduleGrid from "@/components/ScheduleGrid";
import { getTodayInSaoPauloDateKey, isSessionBookable } from "@/lib/scheduleGrid";
import type {
  AssessmentModality,
  ServiceCompany,
  TestRoomSessionWithAvailability,
} from "@/types";

type BookingFormProps = {
  assessmentModality: AssessmentModality;
  serviceCompany: ServiceCompany;
  sessions: TestRoomSessionWithAvailability[];
};

type FormState = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
};

type CandidateForm = {
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  desired_role: string;
  id: string;
};

const initialFormState: FormState = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
};

function createEmptyCandidate(): CandidateForm {
  return {
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
    desired_role: "",
    id: crypto.randomUUID(),
  };
}

export default function BookingForm({
  assessmentModality,
  serviceCompany,
  sessions,
}: BookingFormProps) {
  const today = getTodayInSaoPauloDateKey();
  const isOnline = assessmentModality === "online";
  const isPresencial = assessmentModality === "presencial";
  const initialSessionId =
    isPresencial
      ? sessions.find((session) => isSessionBookable(session, today))?.id ?? ""
      : "";

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [candidates, setCandidates] = useState<CandidateForm[]>([
    createEmptyCandidate(),
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === sessionId) ?? null,
    [sessions, sessionId],
  );
  const hasAvailableSession = useMemo(
    () =>
      isPresencial &&
      sessions.some((session) => isSessionBookable(session, today)),
    [isPresencial, sessions, today],
  );
  const selectedCapacity = selectedSession
    ? Number(selectedSession.available_spots)
    : 0;
  const isAtCapacity =
    isPresencial && (!selectedSession || candidates.length >= selectedCapacity);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSessionChange(nextSessionId: string) {
    const nextSession = sessions.find((session) => session.id === nextSessionId);

    setSessionId(nextSessionId);

    if (nextSession && candidates.length > Number(nextSession.available_spots)) {
      setError(
        `A data escolhida possui apenas ${nextSession.available_spots} vagas disponíveis.`,
      );
      return;
    }

    setError("");
  }

  function addCandidate() {
    if (isAtCapacity) {
      setError(
        selectedSession
          ? "A quantidade de candidatos já atingiu as vagas disponíveis."
          : "Escolha uma data disponível antes de adicionar candidatos.",
      );
      return;
    }

    setError("");
    setCandidates((current) => [...current, createEmptyCandidate()]);
  }

  function removeCandidate(candidateId: string) {
    setCandidates((current) =>
      current.filter((candidate) => candidate.id !== candidateId),
    );
  }

  function updateCandidate(
    candidateId: string,
    field:
      | "candidate_email"
      | "candidate_name"
      | "candidate_phone"
      | "desired_role",
    value: string,
  ) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              [field]: value,
            }
          : candidate,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPresencial && !selectedSession) {
      setError("Escolha uma data disponível para continuar.");
      return;
    }

    const normalizedCandidates = candidates.map((candidate) => ({
      candidate_name: candidate.candidate_name.trim(),
      candidate_email: candidate.candidate_email.trim().toLowerCase(),
      candidate_phone: candidate.candidate_phone.trim(),
      desired_role: candidate.desired_role.trim(),
    }));

    if (normalizedCandidates.length === 0) {
      setError("Adicione pelo menos um candidato para continuar.");
      return;
    }

    if (
      normalizedCandidates.some(
        (candidate) => !candidate.candidate_name || !candidate.desired_role,
      )
    ) {
      setError("Informe nome e cargo pretendido para todos os candidatos.");
      return;
    }

    if (
      isOnline &&
      normalizedCandidates.some((candidate) => !candidate.candidate_phone)
    ) {
      setError("Informe o telefone de todos os candidatos da avaliação online.");
      return;
    }

    if (isPresencial && normalizedCandidates.length > selectedCapacity) {
      setError(
        `A data escolhida possui apenas ${selectedCapacity} vagas disponíveis.`,
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        body: JSON.stringify({
          ...form,
          assessment_modality: assessmentModality,
          candidates: normalizedCandidates,
          service_company: serviceCompany,
          session_id: selectedSession?.id ?? null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ?? "Não foi possível registrar o agendamento.",
        );
      }

      window.location.href = `/confirmado?token=${encodeURIComponent(
        result.public_token,
      )}`;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível registrar o agendamento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-9">
      {isPresencial ? (
        <ScheduleGrid
          sessions={sessions}
          selectedSessionId={sessionId}
          onSelectSession={handleSessionChange}
        />
      ) : (
        <section className="rounded-[22px] border-[3px] border-black bg-white p-6 text-center text-[#1f1230] shadow-[0_10px_0_rgba(0,0,0,0.22)]">
          <p className="text-sm font-black uppercase tracking-wide text-[#5b2396]">
            Avaliação Online
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Não é necessário escolher data ou horário.
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Preencha os dados da empresa e dos candidatos para registrar a
            solicitação.
          </p>
        </section>
      )}

      {isPresencial && !hasAvailableSession ? (
        <p className="rounded-2xl border border-white/30 bg-white/15 px-5 py-4 text-sm font-semibold text-white">
          Nenhuma data disponível no momento. Entre em contato com a equipe da
          Lince para verificar novas datas.
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-center text-3xl font-black uppercase text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.28)]">
            Empresa
          </h2>

          <div className="mt-5 grid gap-x-12 gap-y-5 sm:grid-cols-2">
            <label className="grid gap-1 text-center text-sm font-medium text-white">
              Empresa Solicitante
              <input
                required
                name="company_name"
                value={form.company_name}
                onChange={(event) =>
                  updateField("company_name", event.target.value)
                }
                className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                placeholder="Escreva aqui"
              />
            </label>

            <label className="grid gap-1 text-center text-sm font-medium text-white">
              Responsável pela Solicitação
              <input
                required
                name="contact_name"
                value={form.contact_name}
                onChange={(event) =>
                  updateField("contact_name", event.target.value)
                }
                className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                placeholder="Escreva aqui"
              />
            </label>

            <label className="grid gap-1 text-center text-sm font-medium text-white">
              E-mail p/ envio do laudo
              <input
                required
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={(event) =>
                  updateField("contact_email", event.target.value)
                }
                className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                placeholder="Escreva aqui"
              />
            </label>

            <label className="grid gap-1 text-center text-sm font-medium text-white">
              Telefone
              <input
                name="contact_phone"
                value={form.contact_phone}
                onChange={(event) =>
                  updateField("contact_phone", event.target.value)
                }
                className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                placeholder="Escreva aqui"
              />
            </label>

            <label className="grid gap-1 text-center text-sm font-medium text-white sm:col-span-2">
              OBS
              <textarea
                name="notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-24 resize-y rounded-[34px] border-0 bg-white px-6 py-5 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                placeholder="Escreva aqui"
              />
            </label>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-center text-3xl font-black uppercase text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.28)] sm:text-left">
                Candidatos
              </h2>
              <p className="mt-1 text-center text-sm font-semibold text-white/90 sm:text-left">
                Candidatos adicionados: {candidates.length}
              </p>
            </div>

            <button
              type="button"
              onClick={addCandidate}
              disabled={isAtCapacity}
              className="rounded-2xl bg-[#8b2be8] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[10px_10px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff] disabled:cursor-not-allowed disabled:opacity-55"
            >
              + Adicionar candidato
            </button>
          </div>

          <div className="mt-5 grid gap-5">
            {candidates.length === 0 ? (
              <p className="rounded-2xl border border-white/30 bg-white/15 px-5 py-4 text-sm font-semibold text-white">
                Nenhum candidato adicionado ainda.
              </p>
            ) : null}

            {candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="rounded-[28px] border border-white/20 bg-white/10 p-4 shadow-[0_12px_0_rgba(0,0,0,0.12)]"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-wide text-white">
                    Candidato {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeCandidate(candidate.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-black text-white transition hover:bg-slate-800"
                    aria-label={`Remover candidato ${index + 1}`}
                  >
                    X
                  </button>
                </div>

                <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
                  <label className="grid gap-1 text-center text-sm font-medium text-white">
                    Nome Candidato
                    <input
                      required
                      value={candidate.candidate_name}
                      onChange={(event) =>
                        updateCandidate(
                          candidate.id,
                          "candidate_name",
                          event.target.value,
                        )
                      }
                      className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                      placeholder="Escreva aqui"
                    />
                  </label>

                  <label className="grid gap-1 text-center text-sm font-medium text-white">
                    Cargo
                    <input
                      required
                      value={candidate.desired_role}
                      onChange={(event) =>
                        updateCandidate(
                          candidate.id,
                          "desired_role",
                          event.target.value,
                        )
                      }
                      className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                      placeholder="Escreva aqui"
                    />
                  </label>

                  <label className="grid gap-1 text-center text-sm font-medium text-white">
                    Telefone do candidato{isOnline ? "" : " (opcional)"}
                    <input
                      required={isOnline}
                      value={candidate.candidate_phone}
                      onChange={(event) =>
                        updateCandidate(
                          candidate.id,
                          "candidate_phone",
                          event.target.value,
                        )
                      }
                      className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                      placeholder="Escreva aqui"
                    />
                  </label>

                  <label className="grid gap-1 text-center text-sm font-medium text-white">
                    E-mail do candidato (opcional)
                    <input
                      type="email"
                      value={candidate.candidate_email}
                      onChange={(event) =>
                        updateCandidate(
                          candidate.id,
                          "candidate_email",
                          event.target.value,
                        )
                      }
                      className="h-14 rounded-full border-0 bg-white px-6 text-center text-slate-950 shadow-inner outline-none transition placeholder:text-slate-700 focus:ring-4 focus:ring-white/40"
                      placeholder="Escreva aqui"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting || (isPresencial && !selectedSession)}
          className="rounded-2xl bg-black px-8 py-4 text-base font-black uppercase tracking-wide text-white shadow-[10px_10px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? "Enviando..." : "Confirmar agendamento"}
        </button>
      </div>
    </form>
  );
}
