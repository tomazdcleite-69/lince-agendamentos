import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  FileSpreadsheet,
  Settings,
} from "lucide-react";

export type AdminSection = "principal" | "avulso" | "relatorio";
const items = [
  {
    section: "principal",
    href: "/admin",
    label: "Agendamentos Principais",
    icon: CalendarDays,
  },
  {
    section: "avulso",
    href: "/admin/agendamentos-avulsos",
    label: "Agendamentos Avulsos",
    icon: CalendarPlus,
  },
  {
    section: "relatorio",
    href: "/admin/exportar-relatorio",
    label: "Exportar Relatório",
    icon: FileSpreadsheet,
  },
] as const;

export default function AdminSidebar({
  activeSection,
}: {
  activeSection: AdminSection;
}) {
  return (
    <aside className="bg-white text-slate-950 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r-2 lg:border-black">
      <div className="flex flex-col gap-8 px-5 py-7">
        <div className="flex justify-center border-b-2 border-black pb-7 lg:-mx-5 lg:px-5">
          <div className="flex h-[72px] w-full max-w-[220px] items-center justify-center rounded-full bg-[#8b2be8] px-6">
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
        </div>
        <nav
          aria-label="Painel administrativo"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"
        >
          {items.map(({ section, href, label, icon: Icon }) => (
            <Link
              key={section}
              href={href}
              aria-current={section === activeSection ? "page" : undefined}
              className={`flex min-h-[68px] items-center gap-3 rounded-[28px] bg-[#8b2be8] px-4 py-3 text-base font-semibold text-white shadow-[6px_6px_0_rgba(0,0,0,0.22)] transition hover:bg-[#9d3cff] ${section === activeSection ? "ring-4 ring-[#5b2396]/30" : ""}`}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          <button
            disabled
            title="Em breve"
            className="flex min-h-[68px] cursor-not-allowed items-center gap-3 rounded-[28px] bg-[#8b2be8] px-4 py-3 text-left text-base font-semibold text-white shadow-[6px_6px_0_rgba(0,0,0,0.18)]"
          >
            <Settings className="h-6 w-6 shrink-0" aria-hidden="true" />
            Configuração
          </button>
        </nav>
      </div>
    </aside>
  );
}
