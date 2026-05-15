import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingWithSession,
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
      "id, session_id, company_name, contact_name, contact_email, contact_phone, candidates_count, notes, status, public_token, created_at, test_room_sessions(session_date, start_time)",
    )
    .eq("public_token", token)
    .maybeSingle();

  const booking = data as unknown as BookingWithSession | null;

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Agendamento não encontrado
          </h1>
          <p className="mt-3 text-slate-600">
            Verifique o link recebido ou solicite apoio à equipe da Lince.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Voltar ao agendamento
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Status do agendamento
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {getStatusLabel(booking.status)}
          </h1>
          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
            Sala de Testes
          </span>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="text-sm font-medium text-slate-500">Empresa</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {booking.company_name}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="text-sm font-medium text-slate-500">Responsável</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {booking.contact_name}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="text-sm font-medium text-slate-500">Data</dt>
            <dd className="mt-1 font-semibold capitalize text-slate-900">
              {booking.test_room_sessions
                ? formatDate(booking.test_room_sessions.session_date)
                : "Não informada"}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="text-sm font-medium text-slate-500">Horário</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {booking.test_room_sessions
                ? formatTime(booking.test_room_sessions.start_time)
                : "Não informado"}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <dt className="text-sm font-medium text-slate-500">Candidatos</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {booking.candidates_count}
            </dd>
          </div>
          {booking.notes ? (
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">
                Observações
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                {booking.notes}
              </dd>
            </div>
          ) : null}
        </dl>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Fazer novo agendamento
        </Link>
      </section>
    </main>
  );
}
