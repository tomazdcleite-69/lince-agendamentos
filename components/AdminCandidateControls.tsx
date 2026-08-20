"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AdminCandidateNotesFormProps = {
  candidateId: string;
  initialNotes: string | null;
};

type AdminCandidateNoShowButtonProps = {
  candidateId: string;
  initialNotifiedAt: string | null;
  initialStatus: string;
};

type AdminCandidateCompletedButtonProps = {
  candidateId: string;
  initialStatus: string;
};

type AdminBookingDeleteButtonProps = {
  bookingId: string;
};

async function postJson(
  url: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok || data.success !== true) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Não foi possível salvar.",
    );
  }

  return data;
}

export function AdminCandidateNotesForm({
  candidateId,
  initialNotes,
}: AdminCandidateNotesFormProps) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(initialNotes ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMessage("");

    startTransition(async () => {
      try {
        await postJson("/api/admin/candidates/update-notes", {
          admin_notes: adminNotes,
          candidate_id: candidateId,
        });
        setMessage("Observação salva.");
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a observação.",
        );
      }
    });
  }

  return (
    <div className="grid min-w-[220px] gap-2">
      <textarea
        value={adminNotes}
        onChange={(event) => setAdminNotes(event.target.value)}
        rows={2}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#8b2be8] focus:ring-2 focus:ring-[#8b2be8]/20"
        placeholder="Observação interna"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-full bg-[#8b2be8] px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[4px_4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Salvando" : "Salvar"}
        </button>
        {message ? (
          <span className="text-xs font-semibold text-slate-600">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AdminCandidateNoShowButton({
  candidateId,
  initialNotifiedAt,
  initialStatus,
}: AdminCandidateNoShowButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [hasNotification, setHasNotification] = useState(
    Boolean(initialNotifiedAt),
  );
  const [isPending, startTransition] = useTransition();
  const isNoShow = initialStatus === "nao_compareceu";
  const canMarkNoShow = initialStatus === "confirmado";

  function handleMarkNoShow() {
    if (!canMarkNoShow) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        const data = await postJson("/api/admin/candidates/mark-no-show", {
          candidate_id: candidateId,
        });
        const emailWarning =
          typeof data.email_warning === "string" ? data.email_warning : "";
        const alreadyNotified = data.already_notified === true;

        if (emailWarning) {
          setHasNotification(false);
          setMessage(emailWarning);
        } else if (alreadyNotified) {
          setHasNotification(true);
          setMessage("Cliente já havia sido notificado.");
        } else {
          setHasNotification(true);
          setMessage("Status atualizado e cliente notificado.");
        }

        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível marcar ausência.",
        );
      }
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleMarkNoShow}
        disabled={isPending || hasNotification || !canMarkNoShow}
        className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[4px_4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Atualizando"
          : isNoShow || hasNotification
            ? "Já notificado"
            : "Não compareceu"}
      </button>
      {message ? (
        <span className="max-w-[180px] text-xs font-semibold text-slate-600">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function AdminCandidateCompletedButton({
  candidateId,
  initialStatus,
}: AdminCandidateCompletedButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(initialStatus === "realizado");
  const [isPending, startTransition] = useTransition();
  const canMarkCompleted = initialStatus === "confirmado";

  function handleMarkCompleted() {
    if (!canMarkCompleted) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      try {
        await postJson("/api/admin/candidates/mark-completed", {
          candidate_id: candidateId,
        });
        setIsCompleted(true);
        setMessage("Status atualizado.");
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível marcar como realizado.",
        );
      }
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleMarkCompleted}
        disabled={isPending || isCompleted || !canMarkCompleted}
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[4px_4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Atualizando" : "Realizado"}
      </button>
      {message ? (
        <span className="max-w-[180px] text-xs font-semibold text-slate-600">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function AdminBookingDeleteButton({
  bookingId,
}: AdminBookingDeleteButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirmDelete() {
    setMessage("");

    startTransition(async () => {
      try {
        await postJson("/api/admin/bookings/delete", {
          booking_id: bookingId,
        });
        setIsModalOpen(false);
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o agendamento.",
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setIsModalOpen(true);
        }}
        className="rounded-full border-2 border-red-600 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-red-700 transition hover:-translate-y-0.5 hover:bg-red-50"
      >
        Excluir
      </button>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-booking-title-${bookingId}`}
        >
          <div className="w-full max-w-md rounded-[22px] border-[3px] border-black bg-white p-6 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.3)]">
            <h2
              id={`delete-booking-title-${bookingId}`}
              className="text-xl font-black text-slate-950"
            >
              Excluir agendamento?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Essa ação removerá o agendamento e os candidatos vinculados.
              Deseja continuar?
            </p>

            {message ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                {message}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="rounded-full border-2 border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPending ? "Excluindo" : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
