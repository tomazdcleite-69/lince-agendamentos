"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EXIT_ANIMATION_DURATION = 450;

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
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    for (const destination of [...options.map((option) => option.href), "/"]) {
      router.prefetch(destination);
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [router]);

  function startExitAnimation(destination: string) {
    if (isExiting) {
      return;
    }

    setIsExiting(true);

    navigationTimeoutRef.current = setTimeout(() => {
      try {
        router.push(destination);

        window.setTimeout(() => {
          if (
            window.location.pathname ===
            "/agendamento/avaliacao-psicologica"
          ) {
            window.location.assign(destination);
          }
        }, 1200);
      } catch {
        window.location.assign(destination);
      }
    }, EXIT_ANIMATION_DURATION);
  }

  function handleNavigation(
    event: { preventDefault: () => void },
    destination: string,
  ) {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    event.preventDefault();
    startExitAnimation(destination);
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[#251038] bg-cover bg-center bg-no-repeat px-4 py-8 text-white sm:px-8"
      style={{ backgroundImage: "url('/home-background.png')" }}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,7,43,0.68)_0%,rgba(68,24,102,0.42)_48%,rgba(22,6,39,0.72)_100%)]"
        aria-hidden="true"
      />

      <section
        className={`relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center text-center transition-[opacity,transform] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform motion-reduce:transition-none ${
          isExiting
            ? "pointer-events-none -translate-x-20 opacity-0"
            : "translate-x-0 opacity-100"
        }`}
        aria-busy={isExiting}
      >
        <div className="flex h-[72px] w-[232px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8]/90 px-5 shadow-[0_10px_28px_rgba(20,4,38,0.32),inset_0_-8px_16px_rgba(0,0,0,0.08)] ring-1 ring-white/20 backdrop-blur-sm sm:h-[86px] sm:w-[284px] sm:px-7">
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

        <h1 className="mt-10 max-w-4xl text-[clamp(2.2rem,5vw,4.2rem)] font-black uppercase leading-none tracking-[0.045em] text-white drop-shadow-[0_4px_12px_rgba(15,2,28,0.8)]">
          Avaliação Psicológica
        </h1>
        <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-white drop-shadow-[0_2px_8px_rgba(15,2,28,0.9)]">
          Selecione a modalidade desejada para continuar o agendamento.
        </p>

        <div className="mt-9 grid w-full gap-6 md:grid-cols-2">
          {options.map((option) => (
            <Link
              key={option.title}
              href={option.href}
              onNavigate={(event) => handleNavigation(event, option.href)}
              className="group flex min-h-[190px] flex-col items-center justify-center rounded-[38px] bg-white/95 p-7 text-[#1f1230] shadow-[10px_10px_0_rgba(20,4,38,0.4),0_16px_38px_rgba(20,4,38,0.28)] ring-1 ring-white/50 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-[14px_14px_0_rgba(20,4,38,0.4),0_20px_44px_rgba(20,4,38,0.3)] focus:outline-none focus:ring-4 focus:ring-white/50"
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
          onNavigate={(event) => handleNavigation(event, "/")}
          className="mt-9 inline-flex items-center justify-center rounded-2xl bg-white/95 px-6 py-4 text-sm font-black uppercase tracking-wide !text-[#5b2396] shadow-[6px_6px_0_rgba(20,4,38,0.4),0_12px_24px_rgba(20,4,38,0.2)] ring-1 ring-white/50 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white"
        >
          Voltar à página inicial
        </Link>
      </section>
    </main>
  );
}
