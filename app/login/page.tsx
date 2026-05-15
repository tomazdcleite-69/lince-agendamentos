import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string | string[];
  }>;
};

function getRedirectTo(value: string | string[] | undefined) {
  const redirectTo = Array.isArray(value) ? value[0] : value;

  if (!redirectTo || !redirectTo.startsWith("/admin")) {
    return "/admin";
  }

  return redirectTo;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo = getRedirectTo((await searchParams).redirectTo);
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Lince Humanização
        </p>
        <LoginForm redirectTo={redirectTo} />
        <Link
          href="/"
          className="mt-5 inline-flex text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          Voltar para a página pública
        </Link>
      </div>
    </main>
  );
}
