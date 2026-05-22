"use client";

import { FormEvent, useMemo, useState } from "react";
import type { TestRoomSessionWithAvailability } from "@/types";

type BookingFormProps = {
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
    desired_role: "",
    id: crypto.randomUUID(),
  };
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

function formatTime(time: string) {
  return time.slice(0, 5);
}

export default function BookingForm({ sessions }: BookingFormProps) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
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

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSessionChange(nextSessionId: string) {
    setSessionId(nextSessionId);
  }

  function addCandidate() {
    if (
      selectedSession &&
      candidates.length >= Number(selectedSession.available_spots)
    ) {
      setError("A quantidade de candidatos já atingiu as vagas disponíveis.");
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
    field: "candidate_name" | "desired_role",
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

    if (!selectedSession) {
      setError("Escolha uma data disponível para continuar.");
      return;
    }

    const normalizedCandidates = candidates.map((candidate) => ({
      candidate_name: candidate.candidate_name.trim(),
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

    if (normalizedCandidates.length > selectedSession.available_spots) {
      setError(
        `A data escolhida possui apenas ${selectedSession.available_spots} vagas disponíveis.`,
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        body: JSON.stringify({
          ...form,
          candidates: normalizedCandidates,
          session_id: selectedSession.id,
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
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Datas disponíveis
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Selecione uma data e informe os dados da empresa.
        </p>
      </div>

      <fieldset className="mt-6 grid gap-3">
        <legend className="sr-only">Escolha a sessão</legend>
        {sessions.map((session) => {
          const isSelected = session.id === sessionId;

          return (
            <label
              key={session.id}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                isSelected
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="session_id"
                value={session.id}
                checked={isSelected}
                onChange={(event) => handleSessionChange(event.target.value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold capitalize text-slate-900">
                {formatDate(session.session_date)}
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                {formatTime(session.start_time)} · {session.available_spots}{" "}
                vagas disponíveis
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Empresa
          <input
            required
            name="company_name"
            value={form.company_name}
            onChange={(event) => updateField("company_name", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="Nome da empresa"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Responsável
          <input
            required
            name="contact_name"
            value={form.contact_name}
            onChange={(event) => updateField("contact_name", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="Nome do responsável"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          E-mail
          <input
            required
            type="email"
            name="contact_email"
            value={form.contact_email}
            onChange={(event) =>
              updateField("contact_email", event.target.value)
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="email@empresa.com.br"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Telefone
          <input
            name="contact_phone"
            value={form.contact_phone}
            onChange={(event) =>
              updateField("contact_phone", event.target.value)
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="(00) 00000-0000"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Observações
          <textarea
            name="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="min-h-28 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="Informe detalhes importantes para a equipe da Lince, se houver."
          />
        </label>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Candidatos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Candidatos adicionados: {candidates.length}
            </p>
          </div>
          <button
            type="button"
            onClick={addCandidate}
            disabled={
              Boolean(selectedSession) &&
              candidates.length >= (selectedSession?.available_spots ?? 0)
            }
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            + Adicionar candidato
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {candidates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
              Nenhum candidato adicionado ainda.
            </p>
          ) : null}

          {candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Candidato {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeCandidate(candidate.id)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  aria-label={`Remover candidato ${index + 1}`}
                >
                  X
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Nome do candidato
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
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="Nome completo"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Cargo pretendido
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
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="Ex.: Analista Comercial"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {isSubmitting ? "Enviando..." : "Confirmar agendamento"}
      </button>
    </form>
  );
}
