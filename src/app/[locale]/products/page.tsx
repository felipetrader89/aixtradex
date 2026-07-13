import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconCalendar, IconChartUp, IconRocket } from "@/components/brand/icons";
import { SpecTable } from "@/components/sections/SpecTable";
import { PricingCard } from "@/components/sections/PricingCard";
import { CompoundCalculator } from "@/components/sections/CompoundCalculator";
import { Link, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.products" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/products", locale: l })])
      ),
    },
  };
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Products");

  const specs = [
    { label: t("pulse.specs.platform"), value: t("pulse.specs.platformValue") },
    { label: t("pulse.specs.accountType"), value: t("pulse.specs.accountTypeValue") },
    { label: t("pulse.specs.leverage"), value: t("pulse.specs.leverageValue") },
    { label: t("pulse.specs.deposit"), value: t("pulse.specs.depositValue") },
    { label: t("pulse.specs.operation"), value: t("pulse.specs.operationValue") },
    { label: t("pulse.specs.interest"), value: t("pulse.specs.interestValue") },
    { label: t("pulse.specs.term"), value: t("pulse.specs.termValue") },
  ];

  const plans = [
    {
      label: t("license.oneMonth.label"),
      price: t("license.oneMonth.price"),
      period: t("license.oneMonth.period"),
      originalPrice: t("license.oneMonth.originalPrice"),
      badge: t("license.oneMonth.badge"),
      ctaLabel: t("license.ctaOneMonth"),
      ctaHref: "/payment?plan=licenseMonthly",
      Icon: IconCalendar,
    },
    {
      label: t("license.sixMonths.label"),
      price: t("license.sixMonths.price"),
      period: t("license.sixMonths.period"),
      originalPrice: t("license.sixMonths.originalPrice"),
      badge: t("license.sixMonths.badge"),
      ctaLabel: t("license.ctaSixMonths"),
      ctaHref: "/payment?plan=licenseSixMonths",
      Icon: IconChartUp,
    },
    {
      label: t("license.oneYear.label"),
      price: t("license.oneYear.price"),
      period: t("license.oneYear.period"),
      originalPrice: t("license.oneYear.originalPrice"),
      badge: t("license.oneYear.badge"),
      ctaLabel: t("license.ctaOneYear"),
      ctaHref: "/payment?plan=licenseAnnual",
      Icon: IconRocket,
      highlight: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
          {t("license.tag")}
        </p>
        <p className="mb-8 max-w-2xl text-brand-ink-dim">{t("license.description")}</p>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch">
          {plans.map(({ label, price, period, originalPrice, badge, ctaLabel, ctaHref, Icon, highlight }) => (
            <div key={label} className="flex flex-col gap-4">
              <PricingCard
                label={label}
                price={price}
                period={period}
                originalPrice={originalPrice}
                badge={badge}
                className={highlight ? "!border-2 !border-brand-accent shadow-[0_0_40px_rgba(51,214,160,0.25)]" : ""}
              />
              <Link
                href={ctaHref}
                className="cta-neon flex items-center justify-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
              >
                <Icon className="h-5 w-5" />
                {ctaLabel}
              </Link>
            </div>
          ))}
        </div>

        <GlowCard className="mb-6 text-sm">
          <p className="text-brand-ink-dim">{t("license.requirementsNote")}</p>
        </GlowCard>

        <div className="mb-10">
          <SpecTable rows={specs} />
        </div>

        <CompoundCalculator locale={locale} />
      </section>
    </div>
  );
}
