import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DAY_MS, loadAccountsWithStats, loadOrders, requireCustomer } from "@/lib/portal";
import { PRODUCT } from "@/lib/plans";
import { Card, CardTitle, PortalHeader, StateBadge, resultTone } from "@/components/portal/ui";
import { plansFor, todayFor } from "@/lib/plan";
import { TodayCard } from "@/components/plan/TodayCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const link = "text-sm font-semibold text-brand-accent hover:underline";

export default async function AccountOverview({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Portal");
  const base = `/${locale}/account`;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: string | number, cur?: string | null, signed = false) => {
    const n = Number(v);
    return `${n < 0 ? "-" : signed && n > 0 ? "+" : ""}${nf.format(Math.abs(n))}${cur ? ` ${cur}` : ""}`;
  };

  const [{ licenses, rows }, orders] = await Promise.all([loadAccountsWithStats(user.id), loadOrders(user.id)]);
  const now = new Date().getTime();
  const active = licenses.filter((l) => !l.expiresAt || l.expiresAt.getTime() > now).filter((l) => l.status === "active");
  const nextExpiry = active
    .map((l) => l.expiresAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const running = rows.filter((r) => r.state === "running").length;
  // Assistente: contas com plano ativo mostram o painel "Hoje"; as outras, o convite pra começar
  const plans = await plansFor(
    PRODUCT.slug,
    rows.map((r) => r.account.login)
  );
  const planned = await Promise.all(
    rows
      .filter((r) => plans.get(r.account.login)?.status === "active")
      .map(async (r) => {
        const plan = plans.get(r.account.login)!;
        return { r, plan, today: await todayFor(PRODUCT.slug, r.account.login, plan, r.stats) };
      })
  );
  const unplanned = rows.filter((r) => plans.get(r.account.login)?.status !== "active");
  const inProgress = unplanned.find((r) => plans.has(r.account.login));
  const startLogin = (inProgress ?? unplanned[0])?.account.login;
  const pending = orders.filter((o) => o.status === "pending");

  // Alertas: o que o cliente precisa fazer agora.
  const alerts: { tone: "warn" | "bad" | "info"; text: string; href: string; cta: string }[] = [];
  for (const l of licenses) {
    if (l.status === "suspended" || !l.expiresAt) continue;
    const days = Math.ceil((l.expiresAt.getTime() - now) / DAY_MS);
    if (days <= 0) alerts.push({ tone: "bad", text: t("overview.alerts.expired", { date: date.format(l.expiresAt) }), href: `${base}/licenses`, cta: t("overview.actions.renew") });
    else if (days <= 5) alerts.push({ tone: "warn", text: t("overview.alerts.expiring", { days, date: date.format(l.expiresAt) }), href: `${base}/licenses`, cta: t("overview.actions.renew") });
  }
  for (const o of pending) alerts.push({ tone: "warn", text: t("overview.alerts.pending", { code: o.code }), href: `${base}/orders`, cta: t("overview.actions.pay") });
  for (const r of rows.filter((r) => r.state === "autotradingOff"))
    alerts.push({ tone: "warn", text: t("overview.alerts.autotradingOff", { login: r.account.login }), href: `${base}/guide`, cta: t("overview.actions.guide") });
  for (const r of rows.filter((r) => r.state === "inactive" && r.licenseState === "active"))
    alerts.push({ tone: "bad", text: t("overview.alerts.inactive", { login: r.account.login }), href: `${base}/accounts`, cta: t("overview.actions.seeAccounts") });
  if (rows.length && rows.every((r) => r.state === "waiting"))
    alerts.push({ tone: "info", text: t("overview.alerts.waiting"), href: `${base}/downloads`, cta: t("overview.actions.download") });
  const freeSlots = active.reduce((sum, l) => sum + l.maxAccounts - rows.filter((r) => r.license.id === l.id).length, 0);
  if (freeSlots > 0) alerts.push({ tone: "info", text: t("overview.alerts.emptySlot", { count: freeSlots }), href: `${base}/licenses`, cta: t("overview.actions.addAccount") });

  const ALERT_STYLE = {
    bad: "border-red-400/40 bg-red-500/10",
    warn: "border-amber-400/40 bg-amber-400/10",
    info: "border-brand-accent/30 bg-brand-accent/5",
  } as const;

  const kpis: { label: string; value: string; small?: boolean }[] = [
    { label: t("overview.kpis.activeLicenses"), value: String(active.length) },
    { label: t("overview.kpis.accounts"), value: String(rows.length) },
    { label: t("overview.kpis.running"), value: `${running}/${rows.length}` },
    {
      label: t("overview.kpis.nextExpiry"),
      value: nextExpiry ? date.format(nextExpiry) : active.length ? t("overview.kpis.lifetime") : "-",
      small: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PortalHeader title={user.name ? t("overview.title", { name: user.name.split(" ")[0] }) : t("overview.titleNoName")} intro={t("overview.intro", { product: PRODUCT.name })} />

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="!p-4">
            <p className="text-xs text-brand-ink-dim">{k.label}</p>
            <p className={`mt-1 font-display font-extrabold text-chrome ${k.small ? "text-lg leading-8" : "text-2xl"}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {alerts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <li key={i} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm text-brand-ink ${ALERT_STYLE[a.tone]}`}>
              <span>{a.text}</span>
              <NextLink href={a.href} className={link}>
                {a.cta} →
              </NextLink>
            </li>
          ))}
        </ul>
      )}

      {startLogin && (
        <Card className="border-brand-accent/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("overview.plan.kicker")}</p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-chrome">{t("overview.plan.title")}</h2>
              <p className="mt-1 text-sm text-brand-ink-dim">{t("overview.plan.text")}</p>
              <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-ink">
                {(["account", "mode", "goal", "analyze", "review"] as const).map((k, i) => (
                  <li key={k}>
                    <span className="font-mono text-brand-accent">{i + 1}.</span> {t(`overview.plan.steps.${k}`)}
                  </li>
                ))}
              </ol>
            </div>
            <NextLink
              href={`${base}/start?login=${startLogin}`}
              className="rounded-xl bg-brand-accent px-5 py-3 text-sm font-bold text-brand-bg transition hover:brightness-110"
            >
              {inProgress ? t("overview.plan.continue") : t("overview.plan.start")} →
            </NextLink>
          </div>
        </Card>
      )}

      {planned.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {planned.map(({ r, plan, today }) => (
            <TodayCard
              key={r.account.login}
              login={r.account.login}
              company={r.stats?.company ?? null}
              mode={plan.mode}
              today={today}
              href={`${base}/start?login=${r.account.login}`}
            />
          ))}
        </div>
      )}

      {licenses.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-brand-ink-dim">{t("overview.noLicense")}</p>
          <NextLink href={`/${locale}/products`} className={`${link} mt-4 inline-block`}>
            {t("overview.actions.seePlans")} →
          </NextLink>
          <p className="mt-5 border-t border-brand-hairline pt-4 text-xs text-brand-ink-dim">
            {t("overview.oldClient")}{" "}
            <NextLink href={`/${locale}/claim`} className="font-semibold text-brand-accent hover:underline">
              {t("overview.oldClientCta")} →
            </NextLink>
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t("overview.accountsTitle")}</CardTitle>
            <NextLink href={`${base}/accounts`} className="mb-4 text-xs font-semibold text-brand-accent hover:underline">
              {t("overview.seeAll")} →
            </NextLink>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-brand-ink-dim">{t("accounts.empty")}</p>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-brand-ink-dim">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">{t("overview.table.account")}</th>
                    <th className="pb-2 pr-3 font-medium">{t("overview.table.status")}</th>
                    <th className="pb-2 pr-3 text-right font-medium">{t("overview.table.balance")}</th>
                    <th className="pb-2 pr-3 text-right font-medium">{t("overview.table.floating")}</th>
                    <th className="pb-2 text-right font-medium">{t("overview.table.today")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ account, stats, state }) => (
                    <tr key={account.id} className="border-t border-brand-hairline">
                      <td className="py-2.5 pr-3">
                        <p className="font-mono font-semibold text-brand-ink">{account.login}</p>
                        <p className="text-[11px] text-brand-ink-dim">{stats?.company ?? "-"}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <StateBadge state={state} />
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono text-brand-ink">{stats ? money(stats.balance, stats.currency) : "-"}</td>
                      <td className={`py-2.5 pr-3 text-right font-mono ${stats ? resultTone(stats.floating) : ""}`}>
                        {stats ? `${money(stats.floating, null, true)} (${stats.openOrders})` : "-"}
                      </td>
                      <td className={`py-2.5 text-right font-mono ${stats ? resultTone(stats.resultToday) : ""}`}>
                        {stats ? money(stats.resultToday, null, true) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
