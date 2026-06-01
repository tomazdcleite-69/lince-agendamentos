import Link from "next/link";
import {
  AdminCandidateNoShowButton,
  AdminCandidateNotesForm,
} from "@/components/AdminCandidateControls";
import AdminSidebar, {
  type AdminServiceCompany,
} from "@/components/AdminSidebar";
import LogoutButton from "@/components/LogoutButton";
import { requireAdminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  CANDIDATE_STATUS_LABELS,
  type AssessmentModality,
  type CandidateStatus,
} from "@/types";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{
    empresa?: string | string[];
  }>;
};

type AdminBookingCandidate = {
  admin_notes: string | null;
  booking_id: string;
  candidate_name: string;
  candidate_status: CandidateStatus;
  created_at: string;
  desired_role: string;
  id: string;
  no_show_notified_at: string | null;
};

type AdminBookingWithCandidates = {
  assessment_modality: AssessmentModality;
  booking_candidates: AdminBookingCandidate[] | null;
  id: string;
  test_room_sessions: {
    session_date: string;
    start_time: string;
  } | null;
};

type AdminCandidateRow = AdminBookingCandidate & {
  booking: AdminBookingWithCandidates;
};

const ADMIN_COMPANY_LABELS: Record<AdminServiceCompany, string> = {
  espaco_lince: "Espaço Lince",
  lince: "Lince",
  psicoespaco: "Psicoespaço",
};

function normalizeAdminCompany(value: unknown): AdminServiceCompany {
  const parsed = Array.isArray(value) ? value[0] : value;

  if (parsed === "psicoespaco" || parsed === "espaco_lince") {
    return parsed;
  }

  return "lince";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function getCandidateStatusLabel(status: CandidateStatus) {
  return CANDIDATE_STATUS_LABELS[status] ?? status;
}

function getCandidateDate(row: AdminCandidateRow) {
  if (row.booking.assessment_modality === "online") {
    return "Online";
  }

  return row.booking.test_room_sessions
    ? formatDate(row.booking.test_room_sessions.session_date)
    : "Não informada";
}

function getCandidateTime(row: AdminCandidateRow) {
  if (row.booking.assessment_modality === "online") {
    return "Sem horário";
  }

  return row.booking.test_room_sessions
    ? formatTime(row.booking.test_room_sessions.start_time)
    : "Não informado";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { empresa } = await searchParams;
  const selectedCompany = normalizeAdminCompany(empresa);
  const selectedCompanyLabel = ADMIN_COMPANY_LABELS[selectedCompany];

  await requireAdminUser(`/admin?empresa=${selectedCompany}`);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, assessment_modality, test_room_sessions(session_date, start_time), booking_candidates(id, booking_id, candidate_name, desired_role, candidate_status, admin_notes, no_show_notified_at, created_at)",
    )
    .eq("service_company", selectedCompany)
    .order("created_at", { ascending: false });

  const bookings =
    (data as unknown as AdminBookingWithCandidates[] | null) ?? [];
  const candidates = bookings
    .flatMap((booking) =>
      (booking.booking_candidates ?? []).map((candidate) => ({
        ...candidate,
        booking,
      })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="min-h-screen bg-[#5b2396] text-white lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
      <AdminSidebar activeCompany={selectedCompany} />

      <section className="px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-black uppercase leading-none tracking-wide text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)]">
                PAINEL ADMIN
              </h1>
              <p className="mt-3 text-xl font-semibold text-white/90 sm:text-2xl">
                Agendamento de Salas de Testes
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                Frente selecionada: {selectedCompanyLabel}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/"
                className="inline-flex w-fit items-center justify-center whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide !text-black shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#efe4ff]"
              >
                Voltar à página
              </Link>
              <LogoutButton />
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
                Nenhum candidato encontrado para esta frente de serviço.
              </p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-[22px] border-[3px] border-black bg-white text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                  <thead className="bg-[#efe4ff] text-xs uppercase tracking-wide text-[#5b2396]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Horário</th>
                      <th className="px-4 py-3 font-semibold">
                        Nome Candidato
                      </th>
                      <th className="px-4 py-3 font-semibold">Cargo</th>
                      <th className="px-4 py-3 font-semibold">Observações</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} className="align-top">
                        <td className="px-4 py-4 text-slate-700">
                          {getCandidateDate(candidate)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {getCandidateTime(candidate)}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {candidate.candidate_name}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {candidate.desired_role}
                        </td>
                        <td className="px-4 py-4">
                          <AdminCandidateNotesForm
                            candidateId={candidate.id}
                            initialNotes={candidate.admin_notes}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-[#8b2be8]/30 bg-[#efe4ff] px-3 py-1 text-xs font-semibold text-[#5b2396]">
                            {getCandidateStatusLabel(
                              candidate.candidate_status,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="grid gap-3">
                            <Link
                              href={`/admin/agendamentos/${candidate.booking.id}`}
                              className="w-fit font-black text-[#5b2396] underline-offset-4 hover:underline"
                            >
                              Ver
                            </Link>
                            <AdminCandidateNoShowButton
                              candidateId={candidate.id}
                              initialNotifiedAt={
                                candidate.no_show_notified_at
                              }
                              initialStatus={candidate.candidate_status}
                            />
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
