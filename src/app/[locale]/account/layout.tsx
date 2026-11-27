import NextLink from "next/link";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { loadAccountsWithStats, requireCustomer } from "@/lib/portal";
import { logoutAction } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand/LogoMark";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { PanelIconSvg, PanelShell, type PanelNavItem } from "@/components/panel/PanelShell";
import { ACCOUNT_COOKIE, MENU_COOKIE, isDemoServer, parseMenuPosition } from "@/lib/panel";
import { AccountSwitcher, type SwitchAccount } from "@/components/panel/AccountSwitcher";
import { hasLogo } from "@/lib/logo";
import { siteConfig } from "@/lib/site-config";

// Área do cliente: painel com menu (esquerda, direita ou topo - o cliente escolhe).
export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Portal");

  const [[pending], jar, { rows }] = await Promise.all([
    db()
      .select({ n: count() })
      .from(schema.orders)
      .where(and(eq(schema.orders.userId, user.id), eq(schema.orders.status, "pending"))),
    cookies(),
    loadAccountsWithStats(user.id),
  ]);

  // Contas MT4 do cliente pro seletor do topo (a escolhida fica num cookie; sem cookie = a primeira da lista).
  const switchAccounts: SwitchAccount[] = rows.map((r) => ({
    login: r.account.login,
    company: r.stats?.company ?? null,
    server: r.stats?.server ?? null,
    balance: r.stats?.balance ?? null,
    equity: r.stats?.equity ?? null,
    currency: r.stats?.currency ?? null,
    demo: isDemoServer(r.stats?.server),
    online: r.state === "running",
  }));
  const chosen = jar.get(ACCOUNT_COOKIE)?.value;
  const selected = switchAccounts.find((a) => a.login === chosen)?.login ?? switchAccounts[0]?.login;

  const base = `/${locale}/account`;
  const nav: PanelNavItem[] = [
    { href: base, label: t("nav.overview"), icon: "dashboard", exact: true },
    { href: `${base}/room`, label: t("nav.room"), icon: "room" },
    { href: `${base}/start`, label: t("nav.start"), icon: "intel" },
    { href: `${base}/accounts`, label: t("nav.accounts"), icon: "accounts" },
    { href: `${base}/licenses`, label: t("nav.licenses"), icon: "licenses" },
    { href: `${base}/orders`, label: t("nav.orders"), icon: "orders", count: pending.n },
    { href: `${base}/downloads`, label: t("nav.downloads"), icon: "downloads" },
    { href: `${base}/guide`, label: t("nav.guide"), icon: "guide" },
    { href: siteConfig.telegramDmUrl, label: t("nav.support"), icon: "support", external: true },
  ];

  const logout = (
    <form action={logoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className="text-xs text-brand-ink-dim hover:text-red-300">
        {t("logout")}
      </button>
    </form>
  );

  return (
    <PanelShell
      brand={
        <NextLink href={`/${locale}`} aria-label={siteConfig.name} className="block">
          <LogoMark variant="header" hasLogo={hasLogo()} />
        </NextLink>
      }
      items={nav}
      account={
        selected ? (
          <AccountSwitcher
            accounts={switchAccounts}
            selected={selected}
            labels={{
              demo: t("switcher.demo"),
              real: t("switcher.real"),
              choose: t("switcher.choose"),
              balance: t("switcher.balance"),
              equity: t("switcher.equity"),
              noData: t("switcher.noData"),
              online: t("switcher.online"),
              offline: t("switcher.offline"),
            }}
          />
        ) : undefined
      }
      initialPosition={parseMenuPosition(jar.get(MENU_COOKIE)?.value)}
      switchLabels={{ title: t("menu.title"), left: t("menu.left"), top: t("menu.top"), right: t("menu.right") }}
      sideFooter={
        <>
          <div className="flex items-center justify-between gap-2">
            <NextLink href={`/${locale}`} className="text-xs text-brand-ink-dim hover:text-brand-accent">
              {t("viewSite")} ↗
            </NextLink>
            <LanguageSwitcher up />
          </div>
          {user.isAdmin && (
            <NextLink href="/admin" className="text-xs font-semibold text-brand-accent hover:underline">
              {t("admin")} →
            </NextLink>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-brand-ink-dim">{t("signedInAs")}</p>
            <p className="truncate text-xs text-brand-ink" title={user.email}>
              {user.email}
            </p>
          </div>
          {logout}
        </>
      }
      topRight={
        <>
          <NextLink href={`/${locale}`} className="flex items-center gap-1 text-xs text-brand-ink-dim hover:text-brand-accent" title={t("viewSite")}>
            <PanelIconSvg name="site" className="h-4 w-4" />
            <span className="hidden sm:inline">{t("viewSite")}</span>
          </NextLink>
          {user.isAdmin && (
            <NextLink href="/admin" className="hidden text-xs font-semibold text-brand-accent hover:underline sm:inline">
              {t("admin")}
            </NextLink>
          )}
          <span className="hidden max-w-48 truncate text-xs text-brand-ink-dim xl:inline" title={user.email}>
            {user.email}
          </span>
          <LanguageSwitcher />
          {logout}
        </>
      }
    >
      {children}
    </PanelShell>
  );
}
