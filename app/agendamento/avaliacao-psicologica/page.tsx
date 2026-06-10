import Image from "next/image";
import Link from "next/link";

const options = [
  {
    description: "Escolha uma data e horário disponíveis para aplicação presencial.",
    href: "/agendamento/sala-testes?empresa=lince&modalidade=presencial",
    title: "Avaliação Presencial",
  },
  {
    description: "Registre os candidatos para organização da avaliação online.",
    href: "/agendamento/sala-testes?empresa=lince&modalidade=online",
    title: "Avaliação Online",
  },
];

export default function PsychologicalAssessmentPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#5b2396] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center text-center">
        <div className="flex h-[72px] w-[232px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-5 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)] sm:h-[86px] sm:w-[284px] sm:px-7">
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

        <h1 className="mt-10 max-w-4xl text-[clamp(2.2rem,5vw,4.2rem)] font-black uppercase leading-none tracking-[0.045em] text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
          Avaliação Psicológica
        </h1>
        <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-white/90">
          Selecione a modalidade desejada para continuar o agendamento.
        </p>

        <div className="mt-9 grid w-full gap-6 md:grid-cols-2">
          {options.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              className="group flex min-h-[190px] flex-col items-center justify-center rounded-[38px] bg-white p-7 text-[#1f1230] shadow-[10px_10px_0_rgba(0,0,0,0.26)] transition hover:-translate-y-1 hover:bg-[#efe4ff] hover:shadow-[14px_14px_0_rgba(0,0,0,0.26)] focus:outline-none focus:ring-4 focus:ring-white/40"
            >
              <span className="text-center text-[clamp(1.65rem,3vw,2.6rem)] font-black text-[#5b2396]">
                {option.title}
              </span>
              <span className="mt-4 max-w-sm text-center text-base font-semibold leading-7 text-slate-700">
                {option.description}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="mt-9 inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-wide !text-[#5b2396] shadow-[6px_6px_0_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#efe4ff]"
        >
          Voltar à página inicial
        </Link>
      </section>
    </main>
  );
}
