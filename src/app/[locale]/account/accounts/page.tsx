import NextLink from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadAccountsWithStats, requireCustomer } from "@/lib/portal";
import { AccountStatsCard, Card, PortalHeader } from "@/components/portal/ui";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portal" });
  return { title: t("nav.accounts"), robots: { index: false, follow: false } };
}

export default async function AccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCustomer(locale);
  const t = await getTranslations("Portal");
  const ta = await getTranslations("Account");
  const { rows } = await loadAccountsWithStats(user.id);

  return (
    <div className="flex flex-col gap-5">
      <PortalHeader title={t("accounts.title")} intro={t("accounts.intro")}>
        <NextLink href={`/${locale}/account/licenses`} className="text-sm font-semibold text-brand-accent hover:underline">
          {t("accounts.manage")} →
        </NextLink>
      </PortalHeader>
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-brand-ink-dim">{t("accounts.empty")}</p>
        </Card>
      ) : (
        rows.map(({ account, license, stats, state }) => (
          <AccountStatsCard
            key={account.id}
            login={account.login}
            planLabel={ta(`plan.${license.plan}`)}
            state={state}
            stats={stats}
            lastCheckAt={account.lastCheckAt}
          />
        ))
      )}
      <p className="text-xs leading-relaxed text-brand-ink-dim">{t("stats.note")}</p>
    </div>
  );
}
