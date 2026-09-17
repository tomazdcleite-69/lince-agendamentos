import Link from "next/link";
import {
  AdminBookingDeleteButton,
  AdminCandidateCompletedButton,
  AdminCandidateNoShowButton,
  AdminCandidateNotesForm,
} from "@/components/AdminCandidateControls";
import AdminFilters from "@/components/AdminFilters";
import AdminSidebar from "@/components/AdminSidebar";
import {
  AdminDemandSelect,
  NewManualBookingButton,
} from "@/components/AdminBookingActions";
import { isBookingDemand } from "@/lib/bookingOperations";
import LogoutButton from "@/components/LogoutButton";
import { requireAdminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  CANDIDATE_STATUS_LABELS,
  type AssessmentModality,
  type CandidateStatus,
  type TestRoomSession,
  type BookingType,
  type BookingDemand,
} from "@/types";

export type AdminPageProps = {
  searchParams: Promise<{
    data?: string | string[];
    empresa?: string | string[];
    horario?: string | string[];
    modalidade?: string | string[];
    status?: string | string[];
    demanda?: string | string[];
  }>;
};

type AdminBookingCandidate = {
  archived_at: string | null;
  admin_notes: string | null;
  booking_id: string;
  candidate_session_id: string | null;
  candidate_name: string;
  candidate_status: CandidateStatus;
  created_at: string;
  desired_role: string;
  id: string;
  no_show_notified_at: string | null;
};

type AdminBookingWithCandidates = {
  booking_type: BookingType | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  demand: BookingDemand | null;
  requester_email: string | null;
  assessment_modality: AssessmentModality;
  booking_candidates: AdminBookingCandidate[] | null;
  company_name: string | null;
  created_at: string;
  id: string;
  notes: string | null;
  session_id: string | null;
  test_room_sessions: {
    session_date: string;
    start_time: string;
  } | null;
};

type AdminCandidateRow = AdminBookingCandidate & {
  booking: AdminBookingWithCandidates;
};

type AdminHourFilter = string | null;
type AdminSessionMap = Map<
  string,
  Pick<TestRoomSession, "id" | "session_date" | "start_time">
>;

type AdminServiceCompany = "lince" | "psicoespaco" | "espaco_lince";
const ADMIN_COMPANY_LABELS: Record<AdminServiceCompany, string> = {
  espaco_lince: "Espaço Lince",
  lince: "Lince",
  psicoespaco: "Psicoespaço",
};

function getFirstSearchParam(value: unknown) {
  const parsed = Array.isArray(value) ? value[0] : value;

  return typeof parsed === "string" ? parsed : "";
}

function normalizeAdminCompany(value: unknown): AdminServiceCompany | null {
  const parsed = getFirstSearchParam(value);

  if (
    parsed === "lince" ||
    parsed === "psicoespaco" ||
    parsed === "espaco_lince"
  ) {
    return parsed;
  }

  return null;
}

function normalizeModalityFilter(value: unknown): AssessmentModality | null {
  const parsed = getFirstSearchParam(value);

  if (parsed === "presencial" || parsed === "online") {
    return parsed;
  }

  return null;
}

function normalizeHourFilter(value: unknown): AdminHourFilter {
  const parsed = getFirstSearchParam(value);

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed) || parsed === "sem_horario") {
    return parsed;
  }

  return null;
}

function normalizeStatusFilter(value: unknown): CandidateStatus | null {
  const parsed = getFirstSearchParam(value);

  if (
    parsed === "confirmado" ||
    parsed === "realizado" ||
    parsed === "nao_compareceu" ||
    parsed === "cancelado"
  ) {
    return parsed;
  }

  return null;
}

function normalizeDateFilter(value: unknown) {
  const parsed = getFirstSearchParam(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : "";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatRequestDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "2-digit",
  }).format(new Date(date));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function getCandidateStatusLabel(status: CandidateStatus) {
  return CANDIDATE_STATUS_LABELS[status] ?? status;
}

function getLegacyCandidateDate(row: AdminCandidateRow) {
  if (row.booking.assessment_modality === "online") {
    return "Online";
  }

  return row.booking.test_room_sessions
    ? formatDate(row.booking.test_room_sessions.session_date)
    : "Não informada";
}

function getLegacyCandidateTime(row: AdminCandidateRow) {
  if (row.booking.assessment_modality === "online") {
    return "Sem horário";
  }

  return row.booking.test_room_sessions
    ? formatTime(row.booking.test_room_sessions.start_time)
    : "Não informado";
}

function getLegacyCandidateFilterHour(row: AdminCandidateRow) {
  if (row.booking.assessment_modality === "online") {
    return "sem_horario";
  }

  return row.booking.test_room_sessions
    ? formatTime(row.booking.test_room_sessions.start_time)
    : "";
}

function getEffectiveSession(
  row: AdminCandidateRow,
  sessions: AdminSessionMap,
) {
  const sessionId = row.candidate_session_id ?? row.booking.session_id;

  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId) ?? null;
  }

  return row.booking.test_room_sessions;
}

function getCandidateDateWithSession(
  row: AdminCandidateRow,
  sessions: AdminSessionMap,
) {
  if (row.booking.booking_type === "avulso")
    return row.booking.scheduled_date
      ? formatDate(row.booking.scheduled_date)
      : "Não informada";
  if (row.booking.assessment_modality === "online") {
    return (
      <span className="grid gap-0.5">
        <span className="font-semibold text-slate-900">Online</span>
        <span>{formatRequestDate(row.booking.created_at)}</span>
        <span className="text-xs font-medium text-slate-500">
          (Solicitação)
        </span>
      </span>
    );
  }

  const session = getEffectiveSession(row, sessions);

  return session
    ? formatDate(session.session_date)
    : getLegacyCandidateDate(row);
}

function getCandidateTimeWithSession(
  row: AdminCandidateRow,
  sessions: AdminSessionMap,
) {
  if (row.booking.booking_type === "avulso")
    return row.booking.scheduled_time
      ? formatTime(row.booking.scheduled_time)
      : "Não informado";
  if (row.booking.assessment_modality === "online") {
    return getLegacyCandidateTime(row);
  }

  const session = getEffectiveSession(row, sessions);

  return session ? formatTime(session.start_time) : getLegacyCandidateTime(row);
}

function getCandidateFilterHourWithSession(
  row: AdminCandidateRow,
  sessions: AdminSessionMap,
) {
  if (row.booking.booking_type === "avulso")
    return row.booking.scheduled_time?.slice(0, 5) ?? "";
  if (row.booking.assessment_modality === "online") {
    return getLegacyCandidateFilterHour(row);
  }

  const session = getEffectiveSession(row, sessions);

  return session
    ? formatTime(session.start_time)
    : getLegacyCandidateFilterHour(row);
}

function getCandidateFilterDateWithSession(
  row: AdminCandidateRow,
  sessions: AdminSessionMap,
) {
  if (row.booking.booking_type === "avulso")
    return row.booking.scheduled_date ?? "";
  if (row.booking.assessment_modality === "online") {
    return "";
  }

  const session = getEffectiveSession(row, sessions);

  return session?.session_date ?? "";
}

export default async function AdminBookingsPage({
  searchParams,
  bookingType = "principal",
}: AdminPageProps & { bookingType?: BookingType }) {
  const {
    data: dateParam,
    empresa,
    horario,
    modalidade,
    status,
    demanda,
  } = await searchParams;
  const selectedCompany = normalizeAdminCompany(empresa);
  const selectedCompanyLabel = selectedCompany
    ? ADMIN_COMPANY_LABELS[selectedCompany]
    : null;
  const dateFilter = normalizeDateFilter(dateParam);
  const modalityFilter = normalizeModalityFilter(modalidade);
  const hourFilter = normalizeHourFilter(horario);
  const statusFilter = normalizeStatusFilter(status);
  const demandParam = getFirstSearchParam(demanda);
  const demandFilter = isBookingDemand(demandParam) ? demandParam : null;
  const basePath =
    bookingType === "avulso" ? "/admin/agendamentos-avulsos" : "/admin";
  const authParams = new URLSearchParams();
  if (selectedCompany) authParams.set("empresa", selectedCompany);

  if (modalityFilter) {
    authParams.set("modalidade", modalityFilter);
  }

  if (dateFilter) {
    authParams.set("data", dateFilter);
  }

  if (hourFilter) {
    authParams.set("horario", hourFilter);
  }

  if (statusFilter) {
    authParams.set("status", statusFilter);
  }

  if (demandFilter) authParams.set("demanda", demandFilter);
  await requireAdminUser(`${basePath}?${authParams.toString()}`);

  const query = supabaseAdmin
    .from("bookings")
    .select(
      "id, session_id, booking_type, scheduled_date, scheduled_time, demand, requester_email, assessment_modality, company_name, notes, created_at, test_room_sessions(session_date, start_time), booking_candidates(id, booking_id, candidate_session_id, candidate_name, desired_role, candidate_status, admin_notes, no_show_notified_at, created_at, archived_at)",
    )
    .is("booking_candidates.archived_at", null)
    .order("created_at", { ascending: false })
    .order("id");
  if (selectedCompany) query.eq("service_company", selectedCompany);
  if (bookingType === "avulso") query.eq("booking_type", "avulso");
  else query.or("booking_type.eq.principal,booking_type.is.null");
  if (demandFilter) query.eq("demand", demandFilter);
  const data: AdminBookingWithCandidates[] = [];
  let error = null;
  for (let offset = 0; ; offset += 500) {
    const result = await query.range(offset, offset + 499);
    if (result.error) {
      error = result.error;
      break;
    }
    data.push(...(result.data as unknown as AdminBookingWithCandidates[]));
    if (result.data.length < 500) break;
  }

  const bookings =
    (data as unknown as AdminBookingWithCandidates[] | null) ?? [];
  const allCandidates = bookings
    .flatMap((booking) =>
      (booking.booking_candidates ?? [])
        .filter((candidate) => !candidate.archived_at)
        .map((candidate) => ({
          ...candidate,
          booking,
        })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sessionIds = [
    ...new Set(
      allCandidates
        .map(
          (candidate) =>
            candidate.candidate_session_id ?? candidate.booking.session_id,
        )
        .filter((sessionId): sessionId is string => Boolean(sessionId)),
    ),
  ];
  const candidateSessions: Pick<
    TestRoomSession,
    "id" | "session_date" | "start_time"
  >[] = [];

  for (let offset = 0; offset < sessionIds.length; offset += 100) {
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("test_room_sessions")
      .select("id, session_date, start_time")
      .in("id", sessionIds.slice(offset, offset + 100));

    if (sessionError) {
      error = sessionError;
      break;
    }
    candidateSessions.push(...(sessionData ?? []));
  }

  const candidateSessionById = new Map(
    candidateSessions.map((session) => [session.id, session]),
  );
  const candidates = allCandidates.filter((candidate) => {
    if (
      modalityFilter &&
      candidate.booking.assessment_modality !== modalityFilter
    ) {
      return false;
    }

    if (
      dateFilter &&
      getCandidateFilterDateWithSession(candidate, candidateSessionById) !==
        dateFilter
    ) {
      return false;
    }

    if (
      hourFilter &&
      getCandidateFilterHourWithSession(candidate, candidateSessionById) !==
        hourFilter
    ) {
      return false;
    }

    if (statusFilter && candidate.candidate_status !== statusFilter) {
      return false;
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-[#5b2396] text-white lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
      <AdminSidebar activeSection={bookingType} />

      <section className="min-w-0 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <div className="w-full max-w-none">
          <header className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-black uppercase leading-none tracking-wide text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)]">
                PAINEL ADMIN
              </h1>
              <p className="mt-3 text-xl font-semibold text-white/90 sm:text-2xl">
                {bookingType === "avulso"
                  ? "Agendamentos Avulsos"
                  : "Agendamentos Principais"}
              </p>
              {selectedCompanyLabel ? (
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                  Frente selecionada: {selectedCompanyLabel}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:justify-items-end">
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                {bookingType === "avulso" ? <NewManualBookingButton /> : null}
                <Link
                  href="/"
                  className="inline-flex w-fit items-center justify-center whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide !text-black shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#efe4ff]"
                >
                  Voltar à página
                </Link>
                <LogoutButton />
              </div>
              <AdminFilters manual={bookingType === "avulso"} />
            </div>
          </header>

          {error ? (
            <section className="rounded-[22px] border-[3px] border-black bg-red-50 p-6 text-red-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
              <h2 className="text-lg font-semibold">
                Não foi possível carregar os candidatos
              </h2>
              <p className="mt-2 text-sm">
                Verifique a conexão com o Supabase e tente novamente.
              </p>
            </section>
          ) : candidates.length === 0 ? (
            <section className="rounded-[22px] border-[3px] border-black bg-white p-6 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
              <h2 className="text-xl font-semibold text-slate-900">
                Nenhum candidato encontrado
              </h2>
              <p className="mt-2 text-slate-600">
                Nenhum agendamento encontrado para os filtros selecionados.
              </p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-[22px] border-[3px] border-black bg-white text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1930px] border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[105px]" />
                    <col className="w-[90px]" />
                    <col className="w-[180px]" />
                    <col className="w-[190px]" />
                    <col className="w-[170px]" />
                    <col className="w-[220px]" />
                    <col className="w-[250px]" />
                    <col className="w-[210px]" />
                    <col className="w-[220px]" />
                    <col className="w-[125px]" />
                    <col className="w-[210px]" />
                  </colgroup>
                  <thead className="bg-[#efe4ff] text-xs uppercase tracking-wide text-[#5b2396]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Horário</th>
                      <th className="px-4 py-3 font-semibold">
                        Empresa Solicitante
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Nome Candidato
                      </th>
                      <th className="px-4 py-3 font-semibold">Cargo</th>
                      <th className="px-4 py-3 font-semibold">
                        Observação da empresa
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Observação interna
                      </th>
                      <th className="px-4 py-3 font-semibold">Demanda</th>
                      <th className="px-4 py-3 font-semibold">
                        Responsável Solicitante
                      </th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} className="align-top">
                        <td className="px-4 py-4 text-slate-700">
                          {getCandidateDateWithSession(
                            candidate,
                            candidateSessionById,
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {getCandidateTimeWithSession(
                            candidate,
                            candidateSessionById,
                          )}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {candidate.booking.company_name || "Não informado"}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {candidate.candidate_name}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {candidate.desired_role}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <p
                            title={candidate.booking.notes?.trim() || undefined}
                            className="line-clamp-2 max-w-[220px] leading-relaxed"
                          >
                            {candidate.booking.notes?.trim() ||
                              "Sem observação"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <AdminCandidateNotesForm
                            candidateId={candidate.id}
                            initialNotes={candidate.admin_notes}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <AdminDemandSelect
                            key={`${candidate.id}-${candidate.booking.demand}`}
                            bookingId={candidate.booking.id}
                            initialDemand={candidate.booking.demand}
                          />
                        </td>
                        <td className="break-words px-4 py-4 text-slate-700">
                          {candidate.booking.requester_email || "Não informado"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-[#8b2be8]/30 bg-[#efe4ff] px-3 py-1 text-xs font-semibold text-[#5b2396]">
                            {getCandidateStatusLabel(
                              candidate.candidate_status,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="grid min-w-[190px] gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                href={`/admin/agendamentos/${candidate.booking.id}`}
                                className="font-black text-[#5b2396] underline-offset-4 hover:underline"
                              >
                                Ver
                              </Link>
                              <AdminBookingDeleteButton
                                bookingId={candidate.booking.id}
                              />
                            </div>

                            {candidate.candidate_status === "confirmado" ||
                            candidate.candidate_status === "nao_compareceu" ? (
                              <>
                                <AdminCandidateNoShowButton
                                  candidateId={candidate.id}
                                  initialNotifiedAt={
                                    candidate.no_show_notified_at
                                  }
                                  initialStatus={candidate.candidate_status}
                                />
                                <AdminCandidateCompletedButton
                                  candidateId={candidate.id}
                                  initialStatus={candidate.candidate_status}
                                />
                              </>
                            ) : null}

                            {candidate.candidate_status === "realizado" ? (
                              <AdminCandidateCompletedButton
                                candidateId={candidate.id}
                                initialStatus={candidate.candidate_status}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
