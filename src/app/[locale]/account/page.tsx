import type { Metadata } from "next";
import NextLink from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { Link } from "@/i18n/navigation";
import { LicenseAccountsEditor } from "@/components/account/LicenseAccountsEditor";
import { PayOrder, RenewButton } from "@/components/account/AccountActions";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { licenseState, priceFor } from "@/lib/licensing";
import { PRODUCT } from "@/lib/plans";
import { licenseServerUrl } from "@/lib/site-config";
import { binanceConfigured } from "@/lib/binance";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

const STATE_STYLE = {
  active: "bg-brand-accent text-brand-bg",
  expired: "bg-amber-500/20 text-amber-300",
  suspended: "bg-red-500/20 text-red-300",
} as const;

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Account");
  const tPay = await getTranslations("Payment");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const usd = (value: string | number) => `$${Number(value).toFixed(Number(value) % 1 ? 2 : 0)}`;

  const licenses = await db()
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.userId, user.id))
    .orderBy(desc(schema.licenses.createdAt));
  const accounts = licenses.length
    ? await db()
        .select()
        .from(schema.licenseAccounts)
        .where(
          inArray(
            schema.licenseAccounts.licenseId,
            licenses.map((l) => l.id)
          )
        )
        .orderBy(schema.licenseAccounts.id)
    : [];
  const orders = await db()
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.userId, user.id))
    .orderBy(desc(schema.orders.createdAt));
  const hasActive = licenses.some((l) => licenseState(l) === "active");
  const versions = hasActive
    ? await db()
        .select({
          id: schema.productVersions.id,
          version: schema.productVersions.version,
          notes: schema.productVersions.notes,
          fileName: schema.productVersions.fileName,
          isCurrent: schema.productVersions.isCurrent,
          createdAt: schema.productVersions.createdAt,
        })
        .from(schema.productVersions)
        .where(eq(schema.productVersions.product, PRODUCT.slug))
        .orderBy(desc(schema.productVersions.isCurrent), desc(schema.productVersions.createdAt))
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">{t("title")}</h1>
        <p className="text-sm text-brand-ink-dim">{t("signedInAs", { email: user.email })}</p>
        <div className="flex items-center gap-4">
          {user.isAdmin && (
            <NextLink href="/admin" className="text-sm font-semibold text-brand-accent hover:underline">
              {t("admin")} →
            </NextLink>
          )}
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="text-sm text-brand-ink-dim hover:text-brand-accent">
              {t("logout")}
            </button>
          </form>
        </div>
      </header>

      {/* Licenças */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("licensesTitle")}</h2>
        {licenses.length === 0 ? (
          <GlowCard className="text-center">
            <p className="text-sm text-brand-ink-dim">{t("empty")}</p>
            <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline">
              {t("seePlans")} →
            </Link>
          </GlowCard>
        ) : (
          <div className="flex flex-col gap-4">
            {licenses.map((license) => {
              const state = licenseState(license);
              const logins = accounts.filter((a) => a.licenseId === license.id).map((a) => a.login);
              return (
                <GlowCard key={license.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-chrome">{PRODUCT.name}</p>
                      <p className="text-sm text-brand-ink-dim">{t(`plan.${license.plan}`)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATE_STYLE[state]}`}>
                      {t(`status.${state}`)}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-brand-ink-dim">{t("key")}</dt>
                      <dd className="flex items-center gap-2 font-mono font-semibold text-brand-accent">
                        {license.key}
                        <CopyButton value={license.key} label={tPay("copy")} copiedLabel={tPay("copied")} />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="sr-only">{t("lifetime")}</dt>
                      <dd className="text-brand-ink">
                        {!license.expiresAt
                          ? t("lifetime")
                          : state === "expired"
                            ? t("expiredOn", { date: date.format(license.expiresAt) })
                            : t("expires", { date: date.format(license.expiresAt) })}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-brand-hairline pt-2">
                    <p className="mx-auto mt-4 max-w-md text-xs text-brand-ink-dim">
                      {t("accountsTitle", { count: logins.length, max: license.maxAccounts })}
                    </p>
                    <LicenseAccountsEditor licenseId={license.id} max={license.maxAccounts} initial={logins} />
                  </div>
                  {license.plan === "monthly" && license.status === "active" && (
                    <div className="mt-5 border-t border-brand-hairline pt-5">
                      <RenewButton licenseId={license.id} price={usd(priceFor("monthly", license.broker))} />
                    </div>
                  )}
                </GlowCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Downloads + como ativar */}
      {licenses.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("downloadsTitle")}</h2>
          <GlowCard>
            {!hasActive ? (
              <p className="text-sm text-brand-ink-dim">{t("downloadsLocked")}</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-brand-ink-dim">{t("downloadsEmpty")}</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-brand-ink-dim">{t("downloadsBody")}</p>
                <ul className="flex flex-col gap-3">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-surface-2 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-ink">
                          {PRODUCT.name} {v.version}
                          {v.isCurrent && (
                            <span className="ml-2 rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-brand-bg">
                              {t("current")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-brand-ink-dim">
                          {date.format(v.createdAt)} · {v.fileName}
                        </p>
                        {v.notes && <p className="mt-1 whitespace-pre-line text-xs text-brand-ink-dim">{v.notes}</p>}
                      </div>
                      <a
                        href={`/api/download/${v.id}`}
                        className="rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-bg hover:brightness-110"
                      >
                        {t("download")} ↓
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-6 rounded-xl border border-brand-accent/30 p-4">
              <p className="text-sm font-semibold text-brand-ink">{t("setupTitle")}</p>
              <p className="mt-1 text-xs text-brand-ink-dim">{t("setupSteps")}</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-brand-bg px-3 py-2">
                <code className="break-all font-mono text-sm text-brand-accent">{licenseServerUrl}</code>
                <CopyButton value={licenseServerUrl} label={tPay("copy")} copiedLabel={tPay("copied")} />
              </div>
            </div>
          </GlowCard>
        </section>
      )}

      {/* Pedidos */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("ordersTitle")}</h2>
        {orders.length === 0 ? (
          <GlowCard>
            <p className="text-sm text-brand-ink-dim">{t("ordersEmpty")}</p>
          </GlowCard>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <GlowCard key={order.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-brand-ink">{order.code}</p>
                  <p className="text-xs text-brand-ink-dim">
                    {date.format(order.createdAt)} · {t(`plan.${order.plan}`)}
                    {order.licenseId && order.mt4Logins.length === 0 ? ` · ${t("renewal")}` : ""} · {usd(order.amountUsd)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    order.status === "paid"
                      ? "bg-brand-accent text-brand-bg"
                      : order.status === "pending"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-brand-surface-2 text-brand-ink-dim"
                  }`}
                >
                  {t(`orderStatus.${order.status}`)}
                </span>
                {order.status === "pending" && (
                  <PayOrder
                    code={order.code}
                    amount={usd(order.amountUsd)}
                    email={user.email}
                    exactAmount={binanceConfigured() && order.payAmount ? Number(order.payAmount).toFixed(2) : null}
                  />
                )}
              </GlowCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
