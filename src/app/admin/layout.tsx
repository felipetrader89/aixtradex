import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Inter, Poppins } from "next/font/google";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import "../globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-poppins" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Admin - Ai X TradeX",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/pt/login?next=/admin");
  if (!user.isAdmin) notFound();

  const [[pending], [unmatched]] = await Promise.all([
    db().select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "pending")),
    db().select({ n: count() }).from(schema.cryptoDeposits).where(eq(schema.cryptoDeposits.status, "unmatched")),
  ]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Painel", icon: "dashboard" },
    { href: "/admin/orders", label: "Pedidos", icon: "orders", count: pending.n },
    { href: "/admin/binance", label: "Recebimentos", icon: "receipts", count: unmatched.n },
    { href: "/admin/licenses", label: "Licenças", icon: "licenses" },
    { href: "/admin/customers", label: "Clientes", icon: "customers" },
    { href: "/admin/files", label: "Arquivos do robô", icon: "files" },
    { href: "/admin/settings", label: "Configurações", icon: "settings" },
  ];

  const logout = (
    <form action={logoutAction}>
      <input type="hidden" name="locale" value="pt" />
      <button type="submit" className="text-xs text-brand-ink-dim hover:text-red-300">
        Sair
      </button>
    </form>
  );

  return (
    <html lang="pt">
      <body className={`${poppins.variable} ${inter.variable} font-body antialiased`}>
        <div className="flex min-h-screen">
          {/* Menu lateral (computador) */}
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-hairline bg-brand-bg/60 px-4 py-6 lg:flex">
            <Link href="/admin" className="mb-8 px-3 font-display text-lg font-extrabold text-chrome">
              Ai X TradeX <span className="text-brand-accent">Admin</span>
            </Link>
            <AdminNav items={nav} variant="side" />
            <div className="mt-auto flex flex-col gap-3 border-t border-brand-hairline px-3 pt-4">
              <Link href="/pt" className="text-xs text-brand-ink-dim hover:text-brand-accent">
                Ver o site ↗
              </Link>
              <p className="truncate text-xs text-brand-ink" title={user.email}>
                {user.email}
              </p>
              {logout}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Barra do topo (celular/tablet) */}
            <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/95 px-4 pt-3 backdrop-blur lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <Link href="/admin" className="font-display text-base font-extrabold text-chrome">
                  Ai X TradeX <span className="text-brand-accent">Admin</span>
                </Link>
                {logout}
              </div>
              <AdminNav items={nav} variant="top" />
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
