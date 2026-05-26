import Image from "next/image";
import Link from "next/link";

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
            Solicitação registrada
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1f1230] sm:text-4xl">
            Agendamento recebido
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            A sua solicitação foi registrada com sucesso. Em breve a equipe da
            Lince enviará uma confirmação de sua solicitação.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {token ? (
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
