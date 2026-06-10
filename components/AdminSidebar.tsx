import Image from "next/image";
import Link from "next/link";

type AdminServiceCompany = "lince" | "psicoespaco" | "espaco_lince";

type AdminSidebarProps = {
  activeCompany: AdminServiceCompany;
};

const sidebarItems: Array<{
  company: AdminServiceCompany;
  href: string;
  image: {
    alt: string;
    height: number;
    src: string;
    width: number;
  };
  imageContainerClassName?: string;
  imageClassName?: string;
  label: string;
  linkClassName?: string;
}> = [
  {
    company: "lince",
    href: "/admin?empresa=lince",
    image: {
      alt: "Lince",
      height: 512,
      src: "/icon.png",
      width: 512,
    },
    label: "Lince",
  },
  {
    company: "espaco_lince",
    href: "/admin?empresa=espaco_lince",
    image: {
      alt: "Espaço Lince",
      height: 793,
      src: "/espaco-lince-logo.png",
      width: 2935,
    },
    imageContainerClassName: "h-10 w-24",
    label: "Espaço Lince",
    linkClassName: "grid-cols-[96px_1fr] px-3",
  },
];

export type { AdminServiceCompany };

export default function AdminSidebar({ activeCompany }: AdminSidebarProps) {
  return (
    <aside className="bg-white text-slate-950 lg:min-h-screen lg:border-r-2 lg:border-black">
      <div className="flex h-full flex-col gap-8 px-5 py-7">
        <div className="flex justify-center border-b-2 border-black pb-7 lg:-mx-5 lg:px-5">
          <div className="flex h-[72px] w-[220px] items-center justify-center overflow-hidden rounded-full bg-[#8b2be8] px-6 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.08)]">
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

        <nav className="grid gap-6">
          {sidebarItems.map((item) => {
            const isActive = item.company === activeCompany;

            return (
              <Link
                key={item.company}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`grid min-h-[60px] items-center gap-3 rounded-full bg-[#8b2be8] py-2 text-lg font-semibold text-white shadow-[6px_6px_0_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#9d3cff] ${
                  item.linkClassName ?? "grid-cols-[54px_1fr] px-4"
                } ${
                  isActive
                    ? "ring-4 ring-[#5b2396]/25"
                    : ""
                }`}
              >
                <span
                  className={`flex items-center justify-center ${
                    item.imageContainerClassName ?? "h-12 w-12 rounded-full"
                  }`}
                >
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    width={item.image.width}
                    height={item.image.height}
                    unoptimized
                    className={`h-full w-full object-contain ${item.imageClassName ?? ""}`}
                  />
                </span>
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            disabled
            className="grid min-h-[60px] cursor-not-allowed grid-cols-[54px_1fr] items-center gap-3 rounded-full bg-[#8b2be8] px-4 py-2 text-left text-lg font-semibold text-white shadow-[6px_6px_0_rgba(0,0,0,0.18)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.16 2.16 0 1 1-3.05 3.05l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21.5a2.16 2.16 0 1 1-4.32 0v-.08a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.16 2.16 0 1 1-3.05-3.05l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H2.86a2.16 2.16 0 1 1 0-4.32h.08A1.8 1.8 0 0 0 4.6 8.48a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.16 2.16 0 1 1 7.24 3.4l.05.05a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.1-1.65V2.08a2.16 2.16 0 1 1 4.32 0v.08a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.16 2.16 0 1 1 3.05 3.05l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1h.08a2.16 2.16 0 1 1 0 4.32h-.08A1.8 1.8 0 0 0 19.4 15Z" />
              </svg>
            </span>
            <span>Configuração</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
