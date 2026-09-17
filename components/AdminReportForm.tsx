"use client";

import { useState } from "react";
import { Archive, Download } from "lucide-react";
import AdminModal from "@/components/AdminModal";
import {
  formatOperationalDate,
  getReportWeek,
  isDateKey,
} from "@/lib/bookingOperations";

type ExportResult = {
  receipt: string;
  start: string;
  end: string;
  count: number;
  archivable: number;
};

export default function AdminReportForm({
  initialDate,
}: {
  initialDate: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [exported, setExported] = useState<ExportResult | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const week = isDateKey(date) ? getReportWeek(date) : null;

  async function download() {
    setPending(true);
    setError("");
    setMessage("");
    setExported(null);
    try {
      const response = await fetch(
        `/api/admin/reports/export?week=${encodeURIComponent(date)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível exportar.");
      const bytes = Uint8Array.from(atob(result.file), (char) =>
        char.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setExported(result);
      setMessage(`${result.count} candidato(s) exportado(s).`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível exportar.",
      );
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    if (!exported || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports/archive-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: exported.receipt }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Não foi possível arquivar.");
      setMessage(`${result.archived} candidato(s) arquivado(s).`);
      setExported(null);
      setConfirming(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível arquivar.",
      );
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="max-w-3xl rounded-[22px] border-[3px] border-black bg-white p-6 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)] sm:p-8">
      <label className="grid max-w-sm gap-2 font-semibold">
        Semana objetivo
        <input
          type="date"
          value={date}
          disabled={pending}
          onChange={(event) => {
            setDate(event.target.value);
            setExported(null);
            setMessage("");
            setError("");
          }}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-900"
        />
      </label>
      {week ? (
        <p className="mt-3 font-semibold text-[#5b2396]">
          {formatOperationalDate(week.start)} a{" "}
          {formatOperationalDate(week.end)}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-slate-600">
        Inclui principais e avulsos. Avaliações online entram pela data da
        solicitação.
      </p>
      <button
        onClick={download}
        disabled={pending || !week}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#5b2396] px-6 py-3 font-bold text-white disabled:opacity-60"
      >
        <Download className="h-5 w-5" />
        {pending && !confirming ? "Gerando..." : "EXPORTAR XLSX"}
      </button>
      {message ? (
        <p role="status" className="mt-5 font-semibold text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-5 text-red-700">
          {error}
        </p>
      ) : null}
      {exported ? (
        <div className="mt-7 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            Arquivar remove os registros da visualização operacional, mas não
            exclui os dados.
          </p>
          <button
            disabled={pending || exported.archivable === 0}
            onClick={() => setConfirming(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-[#5b2396] px-5 py-3 font-bold text-[#5b2396] disabled:opacity-50"
          >
            <Archive className="h-5 w-5" />
            ARQUIVAR SEMANA EXPORTADA
          </button>
          <p className="mt-2 text-sm text-slate-600">
            {exported.archivable} candidato(s) apto(s) para arquivamento.
          </p>
        </div>
      ) : null}
      {confirming && exported ? (
        <AdminModal
          title="Arquivar semana exportada?"
          onClose={() => setConfirming(false)}
          busy={pending}
        >
          <p>
            Tem certeza que deseja arquivar os candidatos exportados desta
            semana? Os registros não serão excluídos e continuarão disponíveis
            no banco.
          </p>
          <p className="mt-3 font-semibold">
            {formatOperationalDate(exported.start)} a{" "}
            {formatOperationalDate(exported.end)}: {exported.archivable}{" "}
            candidato(s).
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-slate-300 px-5 py-3"
            >
              Cancelar
            </button>
            <button
              disabled={pending}
              onClick={archive}
              className="rounded-xl bg-[#5b2396] px-5 py-3 font-bold text-white"
            >
              {pending ? "Arquivando..." : "Arquivar"}
            </button>
          </div>
        </AdminModal>
      ) : null}
    </section>
  );
}
