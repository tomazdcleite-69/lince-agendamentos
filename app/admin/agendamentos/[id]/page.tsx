import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import StatusUpdateForm from "@/components/StatusUpdateForm";
import { requireAdminUser } from "@/lib/auth";
import { getServiceCompanyLabel } from "@/lib/serviceCompany";
import { supabaseAdmin } from "@/lib/supabase";
import {
  BOOKING_STATUS_LABELS,
  CANDIDATE_STATUS_LABELS,
  type BookingStatus,
  type BookingWithSession,
  type CandidateStatus,
} from "@/types";

export const dynamic = "force-dynamic";

type AdminBookingPageProps = {
  params: Promise<{
    id: string;
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

function getCandidateStatusLabel(status: CandidateStatus) {
  return CANDIDATE_STATUS_LABELS[status] ?? status;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default async function AdminBookingPage({
  params,
}: AdminBookingPageProps) {
  const { id } = await params;
  await requireAdminUser(`/admin/agendamentos/${id}`);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, session_id, company_name, contact_name, contact_email, contact_phone, candidates_count, notes, service_company, status, public_token, created_at, test_room_sessions(session_date, start_time), booking_candidates(id, booking_id, candidate_name, desired_role, candidate_phone, candidate_email, candidate_status, admin_notes, no_show_notified_at, resume_url, created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  const booking = data as unknown as BookingWithSession | null;

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-[#5b2396] px-4 py-10 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-[22px] border-[3px] border-black bg-white p-8 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
          <h1 className="text-2xl font-semibold">
            Agendamento não encontrado
          </h1>
          <p className="mt-3 text-slate-600">
            O registro pode ter sido removido ou o identificador está incorreto.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#5b2396] px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5"
          >
            Voltar ao painel
          </Link>
        </section>
      </main>
    );
  }

  const candidates = [...(booking.booking_candidates ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  return (
    <main className="min-h-screen bg-[#5b2396] px-4 py-6 text-white sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="grid gap-5 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex h-[84px] w-[240px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-5 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[104px] sm:w-[300px] sm:px-7">
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

          <div className="text-center lg:text-left">
            <p className="text-3xl font-black uppercase leading-none tracking-[0.08em] text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)]">
              PAINEL INTERNO
            </p>
            <h1 className="mt-2 text-lg font-semibold text-white/90 sm:text-2xl">
              Agendamento de {booking.company_name}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/80">
              Status atual: {getStatusLabel(booking.status)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide !text-black shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#efe4ff]"
            >
              Voltar
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="rounded-[22px] border-[3px] border-black bg-white p-6 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
          <h2 className="text-xl font-semibold">Detalhes do agendamento</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Empresa" value={booking.company_name} />
            <DetailItem
              label="Empresa do serviço"
              value={getServiceCompanyLabel(booking.service_company)}
            />
            <DetailItem
              label="Responsável pela Solicitação"
              value={booking.contact_name}
            />
            <DetailItem label="E-mail" value={booking.contact_email} />
            <DetailItem
              label="Telefone"
              value={booking.contact_phone || "Não informado"}
            />
            <DetailItem
              label="Data"
              value={
                <span className="capitalize">
                  {booking.test_room_sessions
                    ? formatDate(booking.test_room_sessions.session_date)
                    : "Não informada"}
                </span>
              }
            />
            <DetailItem
              label="Horário"
              value={
                booking.test_room_sessions
                  ? formatTime(booking.test_room_sessions.start_time)
                  : "Não informado"
              }
            />
            <DetailItem
              label="Quantidade de candidatos"
              value={booking.candidates_count}
            />
            <DetailItem label="Status" value={getStatusLabel(booking.status)} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">
                Observações
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                {booking.notes || "Sem observações."}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[22px] border-[3px] border-black bg-white p-6 text-slate-900 shadow-[0_10px_0_rgba(0,0,0,0.22)]">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Candidatos</h2>
              <p className="mt-1 text-sm text-slate-600">
                {candidates.length} candidato(s) vinculado(s) a este
                agendamento.
              </p>
            </div>
          </div>

          {candidates.length > 0 ? (
            <ul className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {candidates.map((candidate, index) => (
                <li
                  key={candidate.id}
                  className="grid gap-4 px-4 py-4 sm:grid-cols-[48px_1fr] sm:items-start"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efe4ff] text-sm font-black text-[#5b2396]">
                    {index + 1}
                  </span>
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Nome do candidato
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {candidate.candidate_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Cargo pretendido
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {candidate.desired_role}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Telefone
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {candidate.candidate_phone || "Não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        E-mail
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {candidate.candidate_email || "Não informado"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Status do candidato
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        {getCandidateStatusLabel(candidate.candidate_status)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Observação interna
                      </dt>
                      <dd className="whitespace-pre-wrap font-semibold text-slate-900">
                        {candidate.admin_notes || "Sem observação interna."}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
              Nenhum candidato vinculado a este agendamento.
            </p>
          )}
        </section>

        <StatusUpdateForm
          bookingId={booking.id}
          currentStatus={booking.status}
        />
      </div>
    </main>
  );
}
