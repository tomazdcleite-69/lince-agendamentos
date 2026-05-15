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
  candidates_count: string;
  notes: string;
};

const initialFormState: FormState = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  candidates_count: "1",
  notes: "",
};

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
    const nextSession = sessions.find((session) => session.id === nextSessionId);

    setSessionId(nextSessionId);

    if (!nextSession) {
      return;
    }

    setForm((current) => {
      const currentCount = Number(current.candidates_count) || 1;
      const nextCount = Math.min(currentCount, nextSession.available_spots);

      return {
        ...current,
        candidates_count: String(Math.max(1, nextCount)),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSession) {
      setError("Escolha uma data disponível para continuar.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bookings", {
        body: JSON.stringify({
          ...form,
          candidates_count: Number(form.candidates_count),
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

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Quantidade de candidatos
          <input
            required
            type="number"
            min={1}
            max={selectedSession?.available_spots ?? 1}
            name="candidates_count"
            value={form.candidates_count}
            onChange={(event) =>
              updateField("candidates_count", event.target.value)
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
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
