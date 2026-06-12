"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  AssessmentModality,
  TestRoomSessionWithAvailability,
} from "@/types";

type StatusCandidateActionsProps = {
  assessmentModality: AssessmentModality;
  candidateId: string;
  currentSessionId: string | null;
  sessions: TestRoomSessionWithAvailability[];
  token: string;
};

type ActionResponse = {
  error?: string;
  success?: boolean;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

async function readResponse(response: Response) {
  try {
    return (await response.json()) as ActionResponse;
  } catch {
    return {
      error: "Não foi possível concluir a solicitação.",
      success: false,
    };
  }
}

export default function StatusCandidateActions({
  assessmentModality,
  candidateId,
  currentSessionId,
  sessions,
  token,
}: StatusCandidateActionsProps) {
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const availableSessions = sessions.filter(
    (session) => session.id !== currentSessionId,
  );
  const isOnline = assessmentModality === "online";

  async function handleCancel() {
    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar a avaliação deste candidato?",
    );

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setMessage(null);

    try {
      const response = await fetch("/api/public/candidates/cancel", {
        body: JSON.stringify({
          candidate_id: candidateId,
          token,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        setMessage({
          text: result.error ?? "Não foi possível cancelar a avaliação.",
          type: "error",
        });
        return;
      }

      setMessage({
        text: "Avaliação cancelada com sucesso.",
        type: "success",
      });
      router.refresh();
    } catch {
      setMessage({
        text: "Não foi possível cancelar a avaliação. Tente novamente.",
        type: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSessionId) {
      setMessage({
        text: "Selecione uma nova data e horário.",
        type: "error",
      });
      return;
    }

    setIsRescheduling(true);
    setMessage(null);

    try {
      const response = await fetch("/api/public/candidates/reschedule", {
        body: JSON.stringify({
          candidate_id: candidateId,
          new_session_id: selectedSessionId,
          token,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        setMessage({
          text: result.error ?? "Não foi possível reagendar a avaliação.",
          type: "error",
        });
        return;
      }

      setIsPanelOpen(false);
      setMessage({
        text: "Avaliação reagendada com sucesso.",
        type: "success",
      });
      setSelectedSessionId("");
      router.refresh();
    } catch {
      setMessage({
        text: "Não foi possível reagendar a avaliação. Tente novamente.",
        type: "error",
      });
    } finally {
      setIsRescheduling(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {!isOnline ? (
          <button
            type="button"
            aria-expanded={isPanelOpen}
            onClick={() => {
              setIsPanelOpen((current) => !current);
              setMessage(null);
            }}
            className="rounded-xl bg-[#6d2ab4] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#5b2396] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCancelling || isRescheduling}
          >
            Reagendar avaliação
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border-2 border-red-600 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCancelling || isRescheduling}
        >
          {isCancelling ? "Cancelando..." : "Cancelar avaliação"}
        </button>
      </div>

      {isPanelOpen && !isOnline ? (
        <div className="mt-4 rounded-2xl border border-[#8b2be8]/25 bg-[#f7f0ff] p-4">
          <h3 className="font-black text-[#1f1230]">
            Escolha a nova data e horário
          </h3>

          {availableSessions.length > 0 ? (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {availableSessions.map((session) => {
                  const isSelected = selectedSessionId === session.id;

                  return (
                    <label
                      key={session.id}
                      className={`cursor-pointer rounded-xl border-2 bg-white p-4 transition ${
                        isSelected
                          ? "border-[#6d2ab4] ring-2 ring-[#6d2ab4]/20"
                          : "border-slate-200 hover:border-[#8b2be8]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`session-${candidateId}`}
                        value={session.id}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedSessionId(session.id);
                          setMessage(null);
                        }}
                        className="sr-only"
                      />
                      <span className="block font-black capitalize text-[#1f1230]">
                        {formatDate(session.session_date)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-slate-700">
                        {formatTime(session.start_time)} ·{" "}
                        {session.available_spots}{" "}
                        {session.available_spots === 1 ? "vaga" : "vagas"}
                      </span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleReschedule}
                disabled={!selectedSessionId || isRescheduling}
                className="mt-4 rounded-xl bg-[#1f1230] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRescheduling
                  ? "Confirmando..."
                  : "Confirmar reagendamento"}
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Nenhuma outra data está disponível no momento.
            </p>
          )}
        </div>
      ) : null}

      {message ? (
        <p
          className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
