import Image from "next/image";
import Link from "next/link";

type CompanyCard = {
  href?: string;
  subtitle?: string;
  title: string;
};

const companyCards: CompanyCard[] = [
  {
    href: "/agendamento/avaliacao-psicologica",
    title: "Avaliação Psicológica",
  },
  {
    subtitle: "(Espaço Órion)",
    title: "Salas de Reunião",
  },
  {
    subtitle: "(Espaço Constelação)",
    title: "Auditório",
  },
];

function ServiceCardContent({ card }: { card: CompanyCard }) {
  return (
    <>
      <span className="text-center text-[clamp(1.55rem,2.1vw,2.35rem)] font-black leading-tight text-[#5b2396]">
        {card.title}
      </span>
      {card.subtitle ? (
        <span className="text-center text-lg font-semibold text-[#5b2396]/80 sm:text-xl">
          {card.subtitle}
        </span>
      ) : null}
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#5b2396] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center px-4 py-5 sm:px-8">
        <div className="flex h-[64px] w-[212px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-5 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[78px] sm:w-[260px] sm:px-7">
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

        <section className="mt-10 w-full text-center">
          <h1 className="mx-auto max-w-6xl text-[clamp(2.15rem,4.6vw,4.75rem)] font-black leading-[1.08] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
            Seja bem-vindo(a) ao Portal de Agendamentos de Serviços
          </h1>
        </section>

        <p className="mt-12 text-center text-[clamp(1.15rem,1.9vw,1.75rem)] text-white">
          Selecione a opção desejada:
        </p>

        <section className="mt-6 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
          {companyCards.map((card) =>
            card.href ? (
              <Link
                key={card.title}
                href={card.href}
                className="group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-[38px] bg-white p-6 shadow-[0_10px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:shadow-[0_14px_0_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-white/40 sm:min-h-[176px] sm:rounded-[46px]"
                aria-label={card.title}
              >
                <ServiceCardContent card={card} />
              </Link>
            ) : (
              <button
                key={card.title}
                type="button"
                disabled
                className="flex min-h-[150px] cursor-default flex-col items-center justify-center gap-3 rounded-[38px] bg-white p-6 shadow-[0_10px_0_rgba(0,0,0,0.22)] sm:min-h-[176px] sm:rounded-[46px]"
              >
                <ServiceCardContent card={card} />
              </button>
            ),
          )}
        </section>
      </div>
    </main>
  );
}
