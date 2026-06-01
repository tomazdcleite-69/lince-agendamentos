import Image from "next/image";
import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import { normalizeAssessmentModality } from "@/lib/assessmentModality";
import {
  getScheduleGridRange,
  getTodayInSaoPauloDateKey,
} from "@/lib/scheduleGrid";
import {
  getServiceCompanyLogo,
  getServiceCompanyPortalName,
  normalizeServiceCompany,
} from "@/lib/serviceCompany";
import { supabaseAdmin } from "@/lib/supabase";
import type { TestRoomSessionWithAvailability } from "@/types";

export const dynamic = "force-dynamic";

type SalaTestesPageProps = {
  searchParams: Promise<{
    empresa?: string | string[];
    modalidade?: string | string[];
  }>;
};

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

export default async function SalaTestesPage({
  searchParams,
}: SalaTestesPageProps) {
  const { empresa, modalidade } = await searchParams;
  const serviceCompany = normalizeServiceCompany(empresa);
  const assessmentModality = normalizeAssessmentModality(modalidade);
  const serviceCompanyName = getServiceCompanyPortalName(serviceCompany);
  const serviceCompanyLogo = getServiceCompanyLogo(serviceCompany);
  const serviceCompanyLogoSize =
    serviceCompany === "psicoespaco"
      ? { height: 1440, width: 1440 }
      : { height: 109, width: 313 };
  const today = getTodayInSaoPauloDateKey();
  const { endDate, startDate } = getScheduleGridRange(today);

  const { data, error } =
    assessmentModality === "presencial"
      ? await supabaseAdmin
          .from("test_room_sessions_with_availability")
          .select("*")
          .gte("session_date", startDate)
          .lte("session_date", endDate)
          .order("session_date", { ascending: true })
          .order("start_time", { ascending: true })
      : { data: [], error: null };

  const sessions = (data ?? []).map(normalizeSession);
  const subtitle =
    assessmentModality === "online"
      ? "Avaliação Online - Lince"
      : "Aplicação de Testes - Lince";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#5b2396] px-4 py-5 text-white sm:px-7 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1700px] gap-8">
        <header className="grid gap-5 lg:grid-cols-[minmax(250px,313px)_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex h-[91px] w-[260px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[109px] sm:w-[313px]">
            <Image
              src={serviceCompanyLogo}
              alt={serviceCompanyName}
              width={serviceCompanyLogoSize.width}
              height={serviceCompanyLogoSize.height}
              priority
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 text-center">
            <h1 className="whitespace-nowrap text-[clamp(1.3rem,2.55vw,3rem)] font-black uppercase leading-none tracking-[0.045em] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
              AGENDA AVALIAÇÕES PSICOLÓGICAS
            </h1>
            <p className="mt-2 text-base font-semibold text-white/90 sm:text-lg">
              {subtitle}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit items-center justify-center justify-self-center whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-wide !text-black shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#efe4ff] lg:justify-self-end"
          >
            Voltar à página inicial
          </Link>
        </header>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            <h2 className="text-lg font-semibold">
              Não foi possível carregar as datas
            </h2>
            <p className="mt-2 text-sm">
              Verifique a conexão com o Supabase e tente novamente.
            </p>
          </section>
        ) : (
          <BookingForm
            assessmentModality={assessmentModality}
            serviceCompany={serviceCompany}
            sessions={sessions}
          />
        )}
      </div>
    </main>
  );
}
