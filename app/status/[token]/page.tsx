import Image from "next/image";
import Link from "next/link";
import StatusCandidateActions from "@/components/StatusCandidateActions";
import {
  getScheduleGridRange,
  getTodayInSaoPauloDateKey,
} from "@/lib/scheduleGrid";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ASSESSMENT_MODALITY_LABELS,
  BOOKING_STATUS_LABELS,
  CANDIDATE_STATUS_LABELS,
  type BookingStatus,
  type BookingWithSession,
  type TestRoomSession,
  type TestRoomSessionWithAvailability,
} from "@/types";

export const dynamic = "force-dynamic";

type StatusPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function getStatusLabel(status: BookingStatus) {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { token } = await params;
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, session_id, assessment_modality, company_name, contact_name, contact_email, contact_phone, candidates_count, notes, status, public_token, created_at, test_room_sessions(session_date, start_time), booking_candidates(id, booking_id, candidate_session_id, candidate_name, desired_role, candidate_status, cancelled_at, rescheduled_at, created_at)",
    )
    .eq("public_token", token)
    .maybeSingle();

  const booking = data as unknown as BookingWithSession | null;
  const candidates = [...(booking?.booking_candidates ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const isOnline = booking?.assessment_modality === "online";
  const sessionIds = booking
    ? [
        ...new Set(
          candidates
            .map(
              (candidate) => candidate.candidate_session_id ?? booking.session_id,
            )
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
        ),
      ]
    : [];
  let candidateSessions: Pick<
    TestRoomSession,
    "id" | "session_date" | "start_time"
  >[] = [];
  let availableSessions: TestRoomSessionWithAvailability[] = [];

  if (sessionIds.length > 0) {
    const { data: sessionData } = await supabaseAdmin
      .from("test_room_sessions")
      .select("id, session_date, start_time")
      .in("id", sessionIds);

    candidateSessions = sessionData ?? [];
  }

  if (
    booking?.assessment_modality === "presencial" &&
    candidates.some((candidate) => candidate.candidate_status === "confirmado")
  ) {
    const today = getTodayInSaoPauloDateKey();
    const { endDate } = getScheduleGridRange(today);
    const { data: sessionData } = await supabaseAdmin
      .from("test_room_sessions_with_availability")
      .select(
        "id, session_date, start_time, capacity, status, occupied_spots, available_spots",
      )
      .gte("session_date", today)
      .lte("session_date", endDate)
      .eq("status", "aberta")
      .gt("available_spots", 0)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });

    availableSessions = (sessionData ?? []).map((session) => ({
      ...session,
      available_spots: Number(session.available_spots),
      capacity: Number(session.capacity),
      occupied_spots: Number(session.occupied_spots),
    }));
  }

  const candidateSessionById = new Map(
    candidateSessions.map((session) => [session.id, session]),
  );
  const bookingAllowsCandidateActions =
    booking &&
    !["cancelado", "realizado", "nao_compareceu"].includes(booking.status);

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#5b2396] px-4 py-8 text-white sm:px-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center text-center">
          <div className="flex h-[72px] w-[232px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-5 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[86px] sm:w-[284px] sm:px-7">
            <Image
              src="/lince-logo-white.png"
              alt="Lince"
              width={2200}
              height={398}
              priority
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>

          <div className="mt-10 w-full rounded-[34px] bg-white p-8 text-[#1f1230] shadow-[12px_12px_0_rgba(0,0,0,0.28)] sm:p-10">
            <h1 className="text-3xl font-black text-[#1f1230]">
              Agendamento não encontrado
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Verifique o link recebido ou solicite apoio à equipe da Lince.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#8b2be8] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff]"
            >
              Voltar à página inicial
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#5b2396] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="flex justify-center">
          <div className="flex h-[72px] w-[232px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-5 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[86px] sm:w-[284px] sm:px-7">
            <Image
              src="/lince-logo-white.png"
              alt="Lince"
              width={2200}
              height={398}
              priority
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="mt-8 rounded-[34px] bg-white p-6 text-[#1f1230] shadow-[12px_12px_0_rgba(0,0,0,0.28)] sm:p-8">
          <p className="text-sm font-black uppercase tracking-wide text-[#5b2396]">
            Status da solicitação
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-black tracking-tight text-[#1f1230]">
              {getStatusLabel(booking.status)}
            </h1>
            <span className="w-fit rounded-full border border-[#8b2be8]/30 bg-[#efe4ff] px-4 py-2 text-sm font-black text-[#5b2396]">
              Aplicação de Testes
            </span>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Modalidade
              </dt>
              <dd className="mt-1 font-black text-[#1f1230]">
                {ASSESSMENT_MODALITY_LABELS[booking.assessment_modality]}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Empresa solicitante
              </dt>
              <dd className="mt-1 font-black text-[#1f1230]">
                {booking.company_name}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="text-sm font-semibold text-slate-500">
                Responsável pela Solicitação
              </dt>
              <dd className="mt-1 font-black text-[#1f1230]">
                {booking.contact_name}
              </dd>
            </div>
            {isOnline ? (
              <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <dt className="text-sm font-semibold text-slate-500">
                  Data e horário
                </dt>
                <dd className="mt-1 font-black text-[#1f1230]">
                  Avaliação Online, sem data ou horário presencial
                </dd>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Data
                  </dt>
                  <dd className="mt-1 font-black capitalize text-[#1f1230]">
                    {booking.test_room_sessions
                      ? formatDate(booking.test_room_sessions.session_date)
                      : "Não informada"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Horário
                  </dt>
                  <dd className="mt-1 font-black text-[#1f1230]">
                    {booking.test_room_sessions
                      ? formatTime(booking.test_room_sessions.start_time)
                      : "Não informado"}
                  </dd>
                </div>
              </>
            )}
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <dt className="text-sm font-semibold text-slate-500">
                Candidatos
              </dt>
              <dd className="mt-3">
                {candidates.length > 0 ? (
                  <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
                    {candidates.map((candidate, index) => (
                      <li
                        key={candidate.id}
                        className="px-4 py-4"
                      >
                        <div className="grid gap-3 lg:grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_0.9fr] lg:items-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efe4ff] text-sm font-black text-[#5b2396]">
                            {index + 1}
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Nome
                            </span>
                            <span className="font-black text-[#1f1230]">
                              {candidate.candidate_name}
                            </span>
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Cargo
                            </span>
                            <span className="font-black text-[#1f1230]">
                              {candidate.desired_role}
                            </span>
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Data
                            </span>
                            <span className="font-black capitalize text-[#1f1230]">
                              {(() => {
                                const sessionId =
                                  candidate.candidate_session_id ??
                                  booking.session_id;
                                const session = sessionId
                                  ? candidateSessionById.get(sessionId)
                                  : null;

                                return session
                                  ? formatDate(session.session_date)
                                  : isOnline
                                    ? "Avaliação online"
                                    : "Não informada";
                              })()}
                            </span>
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Horário
                            </span>
                            <span className="font-black text-[#1f1230]">
                              {(() => {
                                const sessionId =
                                  candidate.candidate_session_id ??
                                  booking.session_id;
                                const session = sessionId
                                  ? candidateSessionById.get(sessionId)
                                  : null;

                                return session
                                  ? formatTime(session.start_time)
                                  : isOnline
                                    ? "Não se aplica"
                                    : "Não informado";
                              })()}
                            </span>
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Status
                            </span>
                            <span className="font-black text-[#1f1230]">
                              {
                                CANDIDATE_STATUS_LABELS[
                                  candidate.candidate_status
                                ]
                              }
                            </span>
                          </span>
                        </div>

                        {bookingAllowsCandidateActions &&
                        candidate.candidate_status === "confirmado" ? (
                          <StatusCandidateActions
                            assessmentModality={booking.assessment_modality}
                            candidateId={candidate.id}
                            currentSessionId={
                              candidate.candidate_session_id ??
                              booking.session_id
                            }
                            sessions={availableSessions}
                            token={token}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="font-black text-[#1f1230]">
                    {booking.candidates_count}
                  </span>
                )}
              </dd>
            </div>
            {booking.notes ? (
              <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
                <dt className="text-sm font-semibold text-slate-500">
                  Observações
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-[#1f1230]">
                  {booking.notes}
                </dd>
              </div>
            ) : null}
          </dl>

          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#8b2be8] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff]"
          >
            Voltar à página inicial
          </Link>
        </div>
      </section>
    </main>
  );
}
