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
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Lince Humanização
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Agendamento recebido
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Sua solicitação de agendamento foi registrada com sucesso. A equipe da
          Lince poderá confirmar ou atualizar o status em breve.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {token ? (
            <Link
              href={`/status/${encodeURIComponent(token)}`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Acompanhar status
            </Link>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Fazer novo agendamento
          </Link>
        </div>
      </section>
    </main>
  );
}
