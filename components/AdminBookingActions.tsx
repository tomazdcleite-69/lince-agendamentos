"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AdminModal from "@/components/AdminModal";
import { BOOKING_DEMAND_LABELS, type BookingDemand } from "@/types";
import { getTodayInSaoPauloDateKey } from "@/lib/scheduleGrid";

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200";

async function post(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.error ?? "Não foi possível salvar.");
  return result;
}

export function AdminDemandSelect({
  bookingId,
  initialDemand,
}: {
  bookingId: string;
  initialDemand: BookingDemand | null;
}) {
  const router = useRouter();
  const [demand, setDemand] = useState(initialDemand ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function save(value: string) {
    setError("");
    startTransition(async () => {
      try {
        await post("/api/admin/bookings/update-demand", {
          booking_id: bookingId,
          demand: value,
        });
        setDemand(value);
        router.refresh();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }
  return (
    <div className="grid gap-2">
      <select
        aria-label="Demanda"
        value={demand}
        disabled={pending}
        onChange={(event) => save(event.target.value)}
        className={`${inputClass} text-sm disabled:opacity-60`}
      >
        <option value="" disabled>
          Não informado
        </option>
        {Object.entries(BOOKING_DEMAND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {pending ? (
        <span role="status" className="text-xs">
          Salvando...
        </span>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function NewManualBookingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b2be8] px-5 py-3 text-sm font-black text-white shadow-[6px_6px_0_rgba(0,0,0,0.32)]"
      >
        <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
        Novo Agendamento
      </button>
      {open ? <ManualBookingForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ManualBookingForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    try {
      await post("/api/admin/bookings/create-manual", data);
      router.refresh();
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o agendamento.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AdminModal
      title="Novo Agendamento Avulso"
      onClose={onClose}
      busy={pending}
    >
      <form onSubmit={submit} className="grid gap-5">
        <fieldset
          disabled={pending}
          className="grid min-w-0 gap-4 sm:grid-cols-2"
        >
          {[
            ["company_name", "Empresa Solicitante", "text", true],
            ["contact_name", "Responsável pela Solicitação", "text", true],
            ["contact_email", "E-mail", "email", true],
            ["contact_phone", "Telefone", "tel", false],
          ].map(([name, label, type, required]) => (
            <label
              key={String(name)}
              className="grid gap-1 text-sm font-semibold"
            >
              {label}
              <input
                name={String(name)}
                type={String(type)}
                required={Boolean(required)}
                maxLength={254}
                className={inputClass}
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
            Demanda
            <select
              name="demand"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Selecione
              </option>
              {Object.entries(BOOKING_DEMAND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Data
            <input
              name="scheduled_date"
              type="date"
              min={getTodayInSaoPauloDateKey()}
              required
              className={inputClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Horário
            <input
              name="scheduled_time"
              type="time"
              required
              className={inputClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Nome do candidato
            <input
              name="candidate_name"
              required
              maxLength={254}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Cargo
            <input
              name="desired_role"
              required
              maxLength={254}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
            Observação da empresa
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              className={inputClass}
            />
          </label>
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
          >
            Cancelar
          </button>
          <button
            disabled={pending}
            className="rounded-xl bg-[#5b2396] px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Criar agendamento"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
