import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Inter, Poppins } from "next/font/google";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import "../globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-poppins" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Admin - Ai X TradeX",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/licenses", label: "Licenças" },
  { href: "/admin/files", label: "Arquivos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/pt/login?next=/admin");
  if (!user.isAdmin) notFound();

  return (
    <html lang="pt">
      <body className={`${poppins.variable} ${inter.variable} font-body antialiased`}>
        <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/admin" className="font-display text-lg font-extrabold text-chrome">
              Ai X TradeX <span className="text-brand-accent">Admin</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-brand-ink-dim transition-colors hover:bg-brand-accent/10 hover:text-brand-accent"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/pt/account" className="rounded-full px-3 py-1.5 text-brand-ink-dim hover:text-brand-accent">
                Site ↗
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
