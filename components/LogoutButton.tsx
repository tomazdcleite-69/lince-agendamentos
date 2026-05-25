"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="inline-flex w-fit items-center justify-center rounded-2xl bg-[#8b2be8] px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? "Saindo..." : "Sair"}
    </button>
  );
}
