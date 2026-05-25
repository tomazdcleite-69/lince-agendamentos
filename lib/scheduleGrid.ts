import type { TestRoomSessionWithAvailability } from "@/types";

export const SCHEDULE_WEEKDAYS = [
  { label: "Segunda", offset: 0 },
  { label: "Terça", offset: 1 },
  { label: "Quarta", offset: 2 },
  { label: "Quinta", offset: 3 },
  { label: "Sexta", offset: 4 },
] as const;

export type ScheduleGridRow = {
  label: string;
  dates: string[];
};

export function getTodayInSaoPauloDateKey(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(reference);

  const partMap = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function getScheduleGridRange(today = getTodayInSaoPauloDateKey()) {
  const date = new Date(`${today}T00:00:00Z`);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const startDate = addDays(today, mondayOffset);

  return {
    endDate: addDays(startDate, 11),
    startDate,
  };
}

export function buildScheduleGridRows(today = getTodayInSaoPauloDateKey()) {
  const { startDate } = getScheduleGridRange(today);

  return [
    {
      dates: SCHEDULE_WEEKDAYS.map((weekday) =>
        addDays(startDate, weekday.offset),
      ),
      label: "Semana atual",
    },
    {
      dates: SCHEDULE_WEEKDAYS.map((weekday) =>
        addDays(startDate, 7 + weekday.offset),
      ),
      label: "Próxima semana",
    },
  ] satisfies ScheduleGridRow[];
}

export function getDayOfMonth(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDate();
}

export function formatScheduleMonth(today = getTodayInSaoPauloDateKey()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(new Date(`${today}T00:00:00Z`));

  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${month} ${year}`.trim().toUpperCase();
}

export function formatScheduleTime(time: string) {
  return time.slice(0, 5);
}

export function isSessionBookable(
  session: TestRoomSessionWithAvailability,
  today = getTodayInSaoPauloDateKey(),
) {
  return (
    session.session_date > today &&
    session.status === "aberta" &&
    Number(session.available_spots) > 0
  );
}
