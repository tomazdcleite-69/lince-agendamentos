import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { requireAdminUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  type BookingWithSession,
} from "@/types";

export const dynamic = "force-dynamic";

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

function getStatusLabel(status: BookingStatus) {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

export default async function AdminPage() {
  await requireAdminUser("/admin");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, session_id, company_name, contact_name, contact_email, contact_phone, candidates_count, notes, status, public_token, created_at, test_room_sessions(session_date, start_time)",
    )
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingWithSession[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Painel interno
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Agendamentos da Sala de Testes
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
            >
              Página pública
            </Link>
            <LogoutButton />
          </div>
        </header>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-800">
              Não foi possível carregar os agendamentos
            </h2>
            <p className="mt-2 text-sm text-red-700">
              Verifique a conexão com o Supabase e tente novamente.
            </p>
          </section>
        ) : bookings.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Nenhum agendamento registrado
            </h2>
            <p className="mt-2 text-slate-600">
              As solicitações enviadas pelo formulário público aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Horário</th>
                    <th className="px-4 py-3 font-semibold">Empresa</th>
                    <th className="px-4 py-3 font-semibold">Responsável</th>
                    <th className="px-4 py-3 font-semibold">Candidatos</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-4 text-slate-700">
                        {booking.test_room_sessions
                          ? formatDate(booking.test_room_sessions.session_date)
                          : "Não informada"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {booking.test_room_sessions
                          ? formatTime(booking.test_room_sessions.start_time)
                          : "Não informado"}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {booking.company_name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {booking.contact_name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {booking.candidates_count}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {getStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/agendamentos/${booking.id}`}
                          className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
