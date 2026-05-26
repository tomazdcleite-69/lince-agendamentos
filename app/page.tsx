import Image from "next/image";
import Link from "next/link";

type CompanyCard = {
  href: string;
  image: {
    alt: string;
    height: number;
    src: string;
    width: number;
  };
  name: string;
};

const companyCards: CompanyCard[] = [
  {
    href: "/espaco-lince",
    image: {
      alt: "Espaço Lince",
      height: 252,
      src: "/espaco-lince-logo.png",
      width: 271,
    },
    name: "Espaço Lince",
  },
  {
    href: "/agendamento/sala-testes?empresa=lince",
    image: {
      alt: "Lince",
      height: 177,
      src: "/lince-icon.png",
      width: 210,
    },
    name: "Lince",
  },
  {
    href: "/agendamento/sala-testes?empresa=psicoespaco",
    image: {
      alt: "Psicoespaço",
      height: 1440,
      src: "/psicoespaco-logo.png",
      width: 1440,
    },
    name: "Psicoespaço",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#5b2396] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center px-4 py-5 sm:px-8">
        <div className="flex h-[64px] w-[212px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[78px] sm:w-[260px]">
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

        <section className="mt-5 w-full text-center">
          <h1 className="mx-auto max-w-5xl text-[clamp(2rem,4.4vw,4rem)] font-black leading-[1.12] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
            Seja bem-vindo(a) ao Portal de
            <br />
            Agendamentos do
          </h1>

          <div className="relative left-1/2 mt-5 w-screen -translate-x-1/2 bg-white px-4 py-2 text-center sm:py-3">
            <p className="text-[clamp(2.45rem,5.2vw,4.65rem)] font-black uppercase leading-none tracking-[0.08em] text-[#5b2396]">
              ESPAÇO LINCE
            </p>
          </div>
        </section>

        <p className="mt-8 text-center text-[clamp(1.15rem,1.9vw,1.75rem)] text-white">
          Selecione a frente de serviço desejada:
        </p>

        <section className="mt-6 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
          {companyCards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-[38px] bg-white p-5 shadow-[0_10px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:shadow-[0_14px_0_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-white/40 sm:min-h-[176px] sm:rounded-[46px]"
              aria-label={`Solicitar serviço para ${card.name}`}
            >
              <Image
                src={card.image.src}
                alt={card.image.alt}
                width={card.image.width}
                height={card.image.height}
                unoptimized
                className="max-h-[86px] w-full object-contain transition group-hover:scale-[1.03] sm:max-h-[104px]"
              />
              <span className="text-center text-xl font-black text-[#5b2396] sm:text-2xl">
                {card.name}
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
