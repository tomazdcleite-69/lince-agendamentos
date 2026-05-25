import Image from "next/image";
import Link from "next/link";

export default function EspacoLincePage() {
  return (
    <main className="min-h-screen bg-[#5b2396] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center text-center">
        <div className="flex h-[150px] w-[180px] items-center justify-center overflow-hidden rounded-[46px] bg-white p-5 shadow-[0_12px_0_rgba(0,0,0,0.22)]">
          <Image
            src="/espaco-lince-logo.png"
            alt="Espaço Lince"
            width={271}
            height={252}
            priority
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>

        <h1 className="mt-10 text-[clamp(2.4rem,6vw,4.5rem)] font-black uppercase leading-none tracking-[0.05em] drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
          Portal Espaço Lince
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-8 text-white/90">
          Em breve, você poderá agendar salas, reuniões, workshops e outros
          serviços do Espaço Lince por aqui.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-black uppercase tracking-wide text-[#5b2396] shadow-[8px_8px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5"
        >
          Voltar
        </Link>
      </section>
    </main>
  );
}
