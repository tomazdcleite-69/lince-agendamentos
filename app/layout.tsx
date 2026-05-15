import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lince Agendamentos",
  description: "Agendamento de Sala de Testes da Lince",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
