"use client";

import {
  buildScheduleGridRows,
  formatScheduleMonth,
  formatScheduleTime,
  getDayOfMonth,
  getTodayInSaoPauloDateKey,
  isSessionBookable,
  SCHEDULE_WEEKDAYS,
} from "@/lib/scheduleGrid";
import type { TestRoomSessionWithAvailability } from "@/types";

type ScheduleGridProps = {
  onSelectSession: (sessionId: string) => void;
  selectedSessionId: string;
  sessions: TestRoomSessionWithAvailability[];
};

export default function ScheduleGrid({
  onSelectSession,
  selectedSessionId,
  sessions,
}: ScheduleGridProps) {
  const today = getTodayInSaoPauloDateKey();
  const rows = buildScheduleGridRows(today);
  const monthLabel = formatScheduleMonth(today);
  const sessionsByDate = new Map<string, TestRoomSessionWithAvailability[]>();

  for (const session of sessions) {
    const current = sessionsByDate.get(session.session_date) ?? [];
    current.push(session);
    sessionsByDate.set(session.session_date, current);
  }

  for (const sessionList of sessionsByDate.values()) {
    sessionList.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <section className="overflow-hidden rounded-[22px] border-[3px] border-black bg-white text-black shadow-[0_10px_0_rgba(0,0,0,0.22)]">
      <h2 className="border-b-2 border-black px-4 py-2 text-center text-lg font-semibold uppercase sm:text-2xl">
        {monthLabel}
      </h2>

      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[170px_repeat(5,minmax(110px,1fr))] border-b-2 border-black">
            <div className="border-r-2 border-black" />
            {SCHEDULE_WEEKDAYS.map((weekday) => (
              <div
                key={weekday.label}
                className="border-r-2 border-black px-3 py-2 text-center text-xl font-semibold uppercase last:border-r-0"
              >
                {weekday.label}
              </div>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div
              key={row.label}
              className={`grid grid-cols-[170px_repeat(5,minmax(110px,1fr))] ${
                rowIndex === 0 ? "border-b-2 border-black" : ""
              }`}
            >
              <div className="flex min-h-[84px] items-center justify-center border-r-2 border-black px-4 text-center text-xl font-semibold uppercase leading-tight">
                {row.label}
              </div>

              {row.dates.map((dateKey) => {
                const sessionList = sessionsByDate.get(dateKey) ?? [];
                const bookableSession = sessionList.find((session) =>
                  isSessionBookable(session, today),
                );
                const displaySession = bookableSession ?? sessionList[0];
                const isSelected = bookableSession?.id === selectedSessionId;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!bookableSession}
                    onClick={() => {
                      if (bookableSession) {
                        onSelectSession(bookableSession.id);
                      }
                    }}
                    className={`relative min-h-[84px] border-r-2 border-black px-3 py-2 text-left transition last:border-r-0 ${
                      isSelected
                        ? "bg-[#efe4ff] shadow-[inset_0_0_0_5px_#8b2be8]"
                        : bookableSession
                          ? "bg-white hover:bg-[#f5efff]"
                          : "bg-white"
                    } ${
                      bookableSession
                        ? "cursor-pointer"
                        : "cursor-not-allowed text-black"
                    }`}
                    aria-label={
                      bookableSession
                        ? `Selecionar ${dateKey}, ${formatScheduleTime(
                            bookableSession.start_time,
                          )}, ${bookableSession.available_spots} vagas`
                        : `${dateKey} indisponível`
                    }
                  >
                    <span className="absolute left-3 top-2 block text-2xl leading-none">
                      {getDayOfMonth(dateKey)}
                    </span>

                    {bookableSession ? (
                      <span className="absolute inset-0 flex flex-col items-center justify-center px-3 pt-4 text-center">
                        <span className="text-2xl font-semibold">
                          {formatScheduleTime(bookableSession.start_time)}
                        </span>
                        <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#5c2498]">
                          {bookableSession.available_spots} vagas
                        </span>
                      </span>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff343d] text-4xl font-black leading-none text-white">
                          X
                        </span>
                      </span>
                    )}

                    {!bookableSession && displaySession?.status === "aberta" ? (
                      <span className="sr-only">Data indisponível</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
