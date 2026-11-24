import { getTranslations, setRequestLocale } from "next-intl/server";
import NextLink from "next/link";
import { CopyButton } from "@/components/ui/CopyButton";
import { LicenseAccountsEditor } from "@/components/account/LicenseAccountsEditor";
import { RenewButton } from "@/components/account/AccountActions";
import { Card, PortalHeader } from "@/components/portal/ui";
import { licenseState, priceFor, swapsLeft } from "@/lib/licensing";
import { loadLicenses, requireCustomer } from "@/lib/portal";
import { PRODUCT } from "@/lib/plans";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("nav.licenses"), robots: { index: false, follow: false } };
}

const STATE_STYLE = {
  active: "bg-brand-accent text-brand-bg",
  expired: "bg-amber-500/20 text-amber-300",
  suspended: "bg-red-500/20 text-red-300",
} as const;

export default async function LicensesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Account");
  const tp = await getTranslations("Portal");
  const tPay = await getTranslations("Payment");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const { licenses, accounts } = await loadLicenses(user.id);

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={tp("licenses.title")} intro={tp("licenses.intro")} />
      {licenses.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-brand-ink-dim">{t("empty")}</p>
          <NextLink href={`/${locale}/products`} className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline">
            {t("seePlans")} →
          </NextLink>
        </Card>
      ) : (
        licenses.map((license) => {
          const state = licenseState(license);
          const logins = accounts.filter((a) => a.licenseId === license.id).map((a) => a.login);
          return (
            <Card key={license.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-chrome">{PRODUCT.name}</p>
                  <p className="text-sm text-brand-ink-dim">{t(`plan.${license.plan}`)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATE_STYLE[state]}`}>{t(`status.${state}`)}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-brand-surface-2 p-3">
                  <dt className="text-xs text-brand-ink-dim">{t("key")}</dt>
                  <dd className="mt-1 flex items-center justify-between gap-2 font-mono font-semibold text-brand-accent">
                    {license.key}
                    <CopyButton value={license.key} label={tPay("copy")} copiedLabel={tPay("copied")} />
                  </dd>
                </div>
                <div className="rounded-xl bg-brand-surface-2 p-3">
                  <dt className="text-xs text-brand-ink-dim">{tp("licenses.validity")}</dt>
                  <dd className="mt-1 font-semibold text-brand-ink">
                    {!license.expiresAt
                      ? t("lifetime")
                      : state === "expired"
                        ? t("expiredOn", { date: date.format(license.expiresAt) })
                        : t("expires", { date: date.format(license.expiresAt) })}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-brand-hairline pt-1">
                <p className="mx-auto mt-4 max-w-md text-xs text-brand-ink-dim">
                  {t("accountsTitle", { count: logins.length, max: license.maxAccounts })}
                </p>
                <LicenseAccountsEditor
                  licenseId={license.id}
                  max={license.maxAccounts}
                  initial={logins}
                  swapsLeft={swapsLeft(license)}
                  supportUrl={siteConfig.telegramDmUrl}
                />
              </div>
              {license.plan === "monthly" && license.status === "active" && (
                <div className="mt-5 border-t border-brand-hairline pt-5">
                  <RenewButton licenseId={license.id} price={`$${priceFor("monthly", license.broker)}`} />
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
