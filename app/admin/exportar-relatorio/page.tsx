import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import AdminReportForm from "@/components/AdminReportForm";
import LogoutButton from "@/components/LogoutButton";
import { requireAdminUser } from "@/lib/auth";
import { getTodayInSaoPauloDateKey } from "@/lib/scheduleGrid";

export const dynamic = "force-dynamic";
export default async function ExportReportPage() {
  await requireAdminUser("/admin/exportar-relatorio");
  return (
    <main className="min-h-screen bg-[#5b2396] text-white lg:grid lg:grid-cols-[255px_minmax(0,1fr)]">
      <AdminSidebar activeSection="relatorio" />
      <section className="min-w-0 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <h1 className="text-3xl font-black sm:text-4xl">
            Exportar Relatório
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase text-black! shadow-[6px_6px_0_rgba(0,0,0,0.32)]"
            >
              Voltar à página
            </Link>
            <LogoutButton />
          </div>
        </header>
        <AdminReportForm initialDate={getTodayInSaoPauloDateKey()} />
      </section>
    </main>
  );
}
