import BookingForm from "@/components/BookingForm";
import { supabaseAdmin } from "@/lib/supabase";
import type { TestRoomSessionWithAvailability } from "@/types";

export const dynamic = "force-dynamic";

function getTodayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());

  const partMap = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function normalizeSession(
  session: TestRoomSessionWithAvailability,
): TestRoomSessionWithAvailability {
  return {
    ...session,
    available_spots: Number(session.available_spots),
    capacity: Number(session.capacity),
    occupied_spots: Number(session.occupied_spots),
  };
}

export default async function Home() {
  const queriedView = "test_room_sessions_with_availability";

  const today = getTodayInSaoPaulo();
  const { data, error } = await supabaseAdmin
    .from(queriedView)
    .select("*")
    .eq("status", "aberta")
    .gt("available_spots", 0)
    .gte("session_date", today)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });

  const sessions = (data ?? []).map(normalizeSession);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Lince Humanização
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Agendamento de Sala de Testes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Escolha uma das datas disponíveis para agendar a participação dos
            candidatos na Sala de Testes da Lince.
          </p>
        </header>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-800">
              Não foi possível carregar as datas
            </h2>
            <p className="mt-2 text-sm text-red-700">
              Verifique a conexão com o Supabase e tente novamente.
            </p>
          </section>
        ) : sessions.length > 0 ? (
          <BookingForm sessions={sessions} />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Nenhuma data disponível no momento
            </h2>
            <p className="mt-2 text-slate-600">
              Entre em contato com a equipe da Lince para verificar novas datas.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
