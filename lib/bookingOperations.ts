import {
  BOOKING_DEMAND_LABELS,
  type BookingDemand,
  type ServiceCompany,
} from "@/types";

export function isBookingDemand(value: unknown): value is BookingDemand {
  return (
    typeof value === "string" && Object.hasOwn(BOOKING_DEMAND_LABELS, value)
  );
}

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function getReportWeek(value: string) {
  if (!isDateKey(value)) throw new Error("Selecione uma data válida.");
  const start = new Date(`${value}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function formatOperationalDate(value: string) {
  return value.split("-").reverse().join("/");
}

export function getRequesterOrigin(email: string | null) {
  const domain = email?.trim().toLowerCase().split("@")[1] ?? "";
  if (
    domain === "lincehumanizacao.com" ||
    domain.endsWith(".lincehumanizacao.com")
  )
    return "Lince";
  if (domain === "psicoespaco.com.br" || domain === "psicoespaco.com")
    return "Psicoespaço";
  return "Externo";
}

export function getAdminServiceCompany(
  email: string | null,
): ServiceCompany | null {
  const origin = getRequesterOrigin(email);
  if (origin === "Lince") return "lince";
  if (origin === "Psicoespaço") return "psicoespaco";
  return null;
}
