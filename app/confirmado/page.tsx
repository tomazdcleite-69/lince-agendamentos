import Image from "next/image";
import Link from "next/link";
import {
  onlineConfirmationMessage,
  presencialAddressParagraphs,
  presencialCandidateGuidelines,
  presencialConfirmationParagraphs,
} from "@/lib/assessmentMessages";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ASSESSMENT_MODALITY_LABELS,
  type AssessmentModality,
  type Booking,
} from "@/types";

type ConfirmedPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

function getToken(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function ConfirmedPage({
  searchParams,
}: ConfirmedPageProps) {
  const token = getToken((await searchParams).token);
  const { data } = token
    ? await supabaseAdmin
        .from("bookings")
        .select("id, assessment_modality, public_token")
        .eq("public_token", token)
        .maybeSingle()
    : { data: null };
  const booking = data as Pick<
    Booking,
    "assessment_modality" | "id" | "public_token"
  > | null;
  const modality: AssessmentModality =
    booking?.assessment_modality ?? "presencial";
  const isOnline = modality === "online";
  const lookupFailed = !booking;

  return (
    <main className="min-h-screen bg-[#5b2396] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center text-center">
        <div className="flex h-[72px] w-[232px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[86px] sm:w-[284px]">
          <Image
            src="/lince-logo.png"
            alt="Lince"
            width={313}
            height={109}
            priority
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mt-10 w-full rounded-[34px] bg-white p-8 text-[#1f1230] shadow-[12px_12px_0_rgba(0,0,0,0.28)] sm:p-10">
          <p className="text-sm font-black uppercase tracking-wide text-[#5b2396]">
            {lookupFailed
              ? "Solicitação"
              : ASSESSMENT_MODALITY_LABELS[modality]}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1f1230] sm:text-4xl">
            {lookupFailed
              ? "Solicitação não encontrada"
              : isOnline
                ? "Solicitação recebida"
                : "Agendamento confirmado"}
          </h1>
          {lookupFailed ? (
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Não foi possível localizar os detalhes dessa solicitação.
              Verifique o link recebido ou entre em contato com a equipe da
              Lince.
            </p>
          ) : isOnline ? (
            <p className="mt-5 text-lg leading-8 text-slate-700">
              {onlineConfirmationMessage}
            </p>
          ) : (
            <div className="mt-5 space-y-4 text-left text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              {presencialConfirmationParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <ul className="list-disc space-y-2 pl-6">
                {presencialCandidateGuidelines.map((guideline) => (
                  <li key={guideline}>{guideline}</li>
                ))}
              </ul>
              {presencialAddressParagraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === 0 ? "font-black text-[#1f1230]" : ""}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {booking ? (
              <Link
                href={`/status/${encodeURIComponent(token)}`}
                className="inline-flex items-center justify-center rounded-2xl bg-[#8b2be8] px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff]"
              >
                Acompanhar status
              </Link>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-[#5b2396] bg-white px-6 py-4 text-sm font-black uppercase tracking-wide !text-[#5b2396] transition hover:-translate-y-0.5 hover:bg-[#efe4ff]"
            >
              Voltar à página inicial
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
