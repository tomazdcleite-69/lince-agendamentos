"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/types";

type StatusUpdateFormProps = {
  bookingId: string;
  currentStatus: BookingStatus;
};

export default function StatusUpdateForm({
  bookingId,
  currentStatus,
}: StatusUpdateFormProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState<BookingStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/update-status", {
        body: JSON.stringify({
          booking_id: bookingId,
          new_status: newStatus,
          note,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? "Não foi possível atualizar o status.");
      }

      setMessage("Status atualizado com sucesso.");
      setNote("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível atualizar o status.",
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
          Atualizar status
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Registre a mudança para acompanhamento interno da equipe.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select
            value={newStatus}
            onChange={(event) =>
              setNewStatus(event.target.value as BookingStatus)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
          >
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Observação interna
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-28 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="Motivo da alteração ou orientação para acompanhamento."
          />
        </label>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {isSubmitting ? "Salvando..." : "Salvar status"}
      </button>
    </form>
  );
}
