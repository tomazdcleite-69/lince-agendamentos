"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const modalityOptions = [
  { label: "Todos", value: "" },
  { label: "Presencial", value: "presencial" },
  { label: "Online", value: "online" },
];

const hourOptions = [
  { label: "Todos", value: "" },
  { label: "08:30", value: "08:30" },
  { label: "13:30", value: "13:30" },
  { label: "Sem horário", value: "sem_horario" },
];

const statusOptions = [
  { label: "Todos", value: "" },
  { label: "Confirmado", value: "confirmado" },
  { label: "Realizado", value: "realizado" },
  { label: "Não compareceu", value: "nao_compareceu" },
  { label: "Cancelado", value: "cancelado" },
];

function FilterSelect({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#8b2be8] focus:ring-2 focus:ring-[#8b2be8]/20"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminFilters() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const modality = searchParams.get("modalidade") ?? "";
  const hour = searchParams.get("horario") ?? "";
  const status = searchParams.get("status") ?? "";
  const activeFilters = [modality, hour, status].filter(Boolean).length;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modalidade");
    params.delete("horario");
    params.delete("status");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
    setIsOpen(false);
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#efe4ff] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#5b2396] shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-white sm:w-auto"
        aria-expanded={isOpen}
      >
        {activeFilters > 0 ? "Filtros ativos" : "Filtros"}
        {activeFilters > 0 ? (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#5b2396] px-2 text-xs text-white">
            {activeFilters}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-3 rounded-[22px] border-2 border-black bg-white p-4 text-slate-900 shadow-[8px_8px_0_rgba(0,0,0,0.28)] sm:left-auto sm:w-[340px]">
          <div className="grid gap-4">
            <FilterSelect
              label="Modalidade"
              name="modalidade"
              options={modalityOptions}
              value={modality}
              onChange={(value) => updateFilter("modalidade", value)}
            />
            <FilterSelect
              label="Horário"
              name="horario"
              options={hourOptions}
              value={hour}
              onChange={(value) => updateFilter("horario", value)}
            />
            <FilterSelect
              label="Status"
              name="status"
              options={statusOptions}
              value={status}
              onChange={(value) => updateFilter("status", value)}
            />

            <button
              type="button"
              onClick={clearFilters}
              className="mt-1 rounded-full border-2 border-[#5b2396] bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-[#5b2396] transition hover:bg-[#efe4ff]"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
