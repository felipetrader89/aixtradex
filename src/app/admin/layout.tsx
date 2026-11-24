import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Inter, Poppins } from "next/font/google";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { PanelShell, type PanelNavItem } from "@/components/panel/PanelShell";
import { MENU_COOKIE, parseMenuPosition } from "@/lib/panel";
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

  const [[pending], [unmatched], [claims], jar] = await Promise.all([
    db().select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "pending")),
    db().select({ n: count() }).from(schema.cryptoDeposits).where(eq(schema.cryptoDeposits.status, "unmatched")),
    db().select({ n: count() }).from(schema.licenseClaims).where(eq(schema.licenseClaims.status, "pending")),
    cookies(),
  ]);

  const nav: PanelNavItem[] = [
    { href: "/admin", label: "Painel", icon: "dashboard", exact: true },
    { href: "/admin/orders", label: "Pedidos", icon: "orders", count: pending.n },
    { href: "/admin/binance", label: "Recebimentos", icon: "receipts", count: unmatched.n },
    { href: "/admin/licenses", label: "Licenças", icon: "licenses" },
    { href: "/admin/accounts", label: "Contas MT4", icon: "accounts" },
    { href: "/admin/customers", label: "Clientes", icon: "customers" },
    { href: "/admin/claims", label: "Pedidos de acesso", icon: "claims", count: claims.n },
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
        <PanelShell
          brand={
            <Link href="/admin" className="font-display text-base font-extrabold text-chrome lg:text-lg">
              Ai X TradeX <span className="text-brand-accent">Admin</span>
            </Link>
          }
          items={nav}
          initialPosition={parseMenuPosition(jar.get(MENU_COOKIE)?.value)}
          switchLabels={{ title: "Posição do menu", left: "Menu à esquerda", top: "Menu no topo", right: "Menu à direita" }}
          sideFooter={
            <>
              <Link href="/pt/account" className="text-xs text-brand-ink-dim hover:text-brand-accent">
                Área do cliente ↗
              </Link>
              <Link href="/pt" className="text-xs text-brand-ink-dim hover:text-brand-accent">
                Ver o site ↗
              </Link>
              <p className="truncate text-xs text-brand-ink" title={user.email}>
                {user.email}
              </p>
              {logout}
            </>
          }
          topRight={
            <>
              <span className="hidden max-w-48 truncate text-xs text-brand-ink-dim xl:inline" title={user.email}>
                {user.email}
              </span>
              {logout}
            </>
          }
        >
          {children}
        </PanelShell>
      </body>
    </html>
  );
}
