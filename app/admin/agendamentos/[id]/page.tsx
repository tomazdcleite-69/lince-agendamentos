import Link from "next/link";
import StatusUpdateForm from "@/components/StatusUpdateForm";
import LogoutButton from "@/components/LogoutButton";
import { requireAdminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingWithSession,
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
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
      "id, session_id, company_name, contact_name, contact_email, contact_phone, candidates_count, notes, status, public_token, created_at, test_room_sessions(session_date, start_time)",
    )
    .eq("id", id)
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
            O registro pode ter sido removido ou o identificador está incorreto.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Voltar ao painel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Voltar ao painel
            </Link>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              {booking.company_name}
            </h1>
            <p className="mt-2 text-slate-600">
              Status atual:{" "}
              <span className="font-semibold text-slate-900">
                {getStatusLabel(booking.status)}
              </span>
            </p>
          </div>
          <LogoutButton />
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Detalhes do agendamento
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Empresa" value={booking.company_name} />
            <DetailItem label="Responsável" value={booking.contact_name} />
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
            <DetailItem
              label="Status"
              value={getStatusLabel(booking.status)}
            />
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">
                Observações
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                {booking.notes || "Sem observações."}
              </dd>
            </div>
          </dl>
        </section>

        <StatusUpdateForm
          bookingId={booking.id}
          currentStatus={booking.status}
        />
      </div>
    </main>
  );
}
