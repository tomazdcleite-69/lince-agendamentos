"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function AdminModal({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="admin-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[22px] border-2 border-black bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/60 sm:p-8"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <h2 id="admin-modal-title" className="text-2xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          title="Fechar"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
