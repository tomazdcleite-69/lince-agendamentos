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
    <main
      className="relative min-h-screen overflow-x-hidden bg-[#251038] bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url('/home-background.png')" }}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,7,43,0.68)_0%,rgba(68,24,102,0.42)_48%,rgba(22,6,39,0.72)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-8 sm:px-8 lg:py-10">
        <div className="flex h-[64px] w-[212px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8]/90 px-5 shadow-[0_10px_28px_rgba(20,4,38,0.32),inset_0_-8px_16px_rgba(0,0,0,0.08)] ring-1 ring-white/20 backdrop-blur-sm sm:h-[78px] sm:w-[260px] sm:px-7">
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

        <section className="mt-8 w-full text-center sm:mt-10">
          <h1 className="mx-auto max-w-6xl text-[clamp(2.15rem,4.6vw,4.75rem)] font-black leading-[1.08] text-white drop-shadow-[0_4px_12px_rgba(15,2,28,0.8)]">
            Seja bem-vindo(a) ao Portal de Agendamentos de Serviços
          </h1>
        </section>

        <p className="mt-8 text-center text-[clamp(1.15rem,1.9vw,1.75rem)] font-semibold text-white drop-shadow-[0_2px_8px_rgba(15,2,28,0.9)] sm:mt-10">
          Selecione a opção desejada:
        </p>

        <section className="mt-6 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
          {companyCards.map((card) =>
            card.href ? (
              <Link
                key={card.title}
                href={card.href}
                className="group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-[38px] bg-white/95 p-6 shadow-[0_10px_0_rgba(20,4,38,0.4),0_16px_38px_rgba(20,4,38,0.28)] ring-1 ring-white/50 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_14px_0_rgba(20,4,38,0.4),0_20px_44px_rgba(20,4,38,0.3)] focus:outline-none focus:ring-4 focus:ring-white/50 sm:min-h-[176px] sm:rounded-[46px]"
                aria-label={card.title}
              >
                <ServiceCardContent card={card} />
              </Link>
            ) : (
              <button
                key={card.title}
                type="button"
                disabled
                className="flex min-h-[150px] cursor-default flex-col items-center justify-center gap-3 rounded-[38px] bg-white/95 p-6 shadow-[0_10px_0_rgba(20,4,38,0.4),0_16px_38px_rgba(20,4,38,0.28)] ring-1 ring-white/50 backdrop-blur-sm sm:min-h-[176px] sm:rounded-[46px]"
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
