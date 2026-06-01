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

  function handleMarkNoShow() {
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
        disabled={isPending || hasNotification}
        className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[4px_4px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Atualizando"
          : hasNotification
            ? "Já notificado"
            : isNoShow
              ? "Notificar novamente"
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

  function handleMarkCompleted() {
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
        disabled={isPending || isCompleted}
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
