import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { Link } from "@/i18n/navigation";
import { CopyButton } from "@/components/ui/CopyButton";
import { siteConfig, paymentAddresses } from "@/lib/site-config";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
};

const PLAN_KEYS = [
  "monthly",
  "sixMonths",
  "annual",
  "licenseMonthly",
  "licenseSixMonths",
  "licenseAnnual",
] as const;
type PlanKey = (typeof PLAN_KEYS)[number];

const PLAN_PATH: Record<PlanKey, string> = {
  monthly: "pulse.monthly",
  sixMonths: "pulse.sixMonths",
  annual: "pulse.annual",
  licenseMonthly: "license.oneMonth",
  licenseSixMonths: "license.sixMonths",
  licenseAnnual: "license.oneYear",
};

function isPlanKey(value: string | undefined): value is PlanKey {
  return PLAN_KEYS.includes(value as PlanKey);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Payment" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function PaymentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Payment");
  const tProducts = await getTranslations("Products");

  const planKey = isPlanKey(plan) ? plan : undefined;
  const planPath = planKey ? PLAN_PATH[planKey] : undefined;
  const planLabel = planPath ? tProducts(`${planPath}.label`) : undefined;

  const methods = [
    { key: "binancePay", value: paymentAddresses.binancePayId },
    { key: "btc", value: paymentAddresses.btc },
    { key: "usdtTrc20", value: paymentAddresses.usdtTrc20 },
    { key: "usdtErc20", value: paymentAddresses.usdtErc20 },
    { key: "usdtBep20", value: paymentAddresses.usdtBep20 },
    { key: "usdc", value: paymentAddresses.usdc },
    { key: "ltc", value: paymentAddresses.ltc },
    { key: "eth", value: paymentAddresses.eth },
  ] as const;

  const dmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(
    t("dmMessage", { plan: planLabel ?? t("title") })
  )}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      {planKey && (
        <GlowCard className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            {t("planLabel")}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-chrome">{planLabel}</p>
          {planPath && (
            <p className="mt-2 font-display text-2xl font-extrabold text-chrome">
              {tProducts(`${planPath}.price`)}
              <span className="text-sm font-medium text-brand-ink-dim">
                {" "}
                {tProducts(`${planPath}.period`)}
              </span>
            </p>
          )}
        </GlowCard>
      )}

      <GlowCard className="mb-8 text-sm text-brand-ink-dim">
        <p>⚠️ {t("warning")}</p>
      </GlowCard>

      <div className="mb-10 flex flex-col gap-4">
        {methods.map(({ key, value }) => (
          <GlowCard key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-base font-bold text-chrome">
                {t(`methods.${key}.label`)}
              </p>
              <p className="text-xs text-brand-ink-dim">{t(`methods.${key}.network`)}</p>
              <p className="mt-1 break-all font-mono text-xs text-brand-ink">{value}</p>
            </div>
            <CopyButton value={value} label={t("copy")} copiedLabel={t("copied")} />
          </GlowCard>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <a
          href={dmHref}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
        >
          {t("ctaTelegram")}
        </a>
        <Link href="/products" className="text-sm text-brand-ink-dim hover:text-brand-accent">
          {t("backToPlans")}
        </Link>
      </div>
    </div>
  );
}
