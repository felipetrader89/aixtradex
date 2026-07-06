import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconCalendar, IconChartUp, IconRocket } from "@/components/brand/icons";
import { SpecTable } from "@/components/sections/SpecTable";
import { CompoundCalculator } from "@/components/sections/CompoundCalculator";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";

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

  const monthlyDmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(t("pulse.dmMonthly"))}`;
  const sixMonthsDmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(t("pulse.dmSixMonths"))}`;
  const annualDmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(t("pulse.dmAnnual"))}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-16 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
          {t("pulse.tag")}
        </p>
        <p className="mb-8 max-w-2xl text-brand-ink-dim">{t("pulse.description")}</p>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch">
          <GlowCard className="flex flex-col items-center gap-3 text-center">
            <p className="font-display text-lg font-bold text-brand-accent">
              {t("pulse.monthly.label")}
            </p>
            <div className="w-full rounded-lg bg-brand-surface-2 p-3">
              <p className="text-xs text-brand-ink-dim">{t("pulse.monthly.firstMonthNote")}</p>
              <p className="font-display text-2xl font-extrabold text-chrome">
                {t("pulse.monthly.firstMonthPrice")}
                <span className="text-sm font-medium text-brand-ink-dim">
                  {" "}
                  {t("pulse.monthly.period")}
                </span>
              </p>
            </div>
            <div className="w-full rounded-lg bg-brand-surface-2 p-3">
              <p className="text-xs text-brand-ink-dim">{t("pulse.monthly.regularNote")}</p>
              <p className="font-display text-2xl font-extrabold text-chrome">
                {t("pulse.monthly.regularPrice")}
                <span className="text-sm font-medium text-brand-ink-dim">
                  {" "}
                  {t("pulse.monthly.period")}
                </span>
              </p>
            </div>
            <p className="mt-1 text-xs text-brand-ink-dim">{t("pulse.monthly.explain")}</p>
          </GlowCard>

          <GlowCard className="flex flex-col items-center gap-2 text-center">
            <p className="font-display text-lg font-bold text-brand-accent">
              {t("pulse.sixMonths.label")}
            </p>
            <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-brand-bg">
              {t("pulse.sixMonths.badge")}
            </span>
            <p className="font-display text-3xl font-extrabold text-chrome">
              {t("pulse.sixMonths.price")}
              <span className="text-base font-medium text-brand-ink-dim">
                {" "}
                {t("pulse.sixMonths.period")}
              </span>
            </p>
            <p className="text-sm text-brand-ink-dim line-through">
              {t("pulse.sixMonths.originalPrice")}
            </p>
          </GlowCard>

          <GlowCard className="relative flex flex-col items-center gap-2 text-center !border-2 !border-brand-accent shadow-[0_0_40px_rgba(51,214,160,0.25)]">
            <p className="font-display text-lg font-bold text-brand-accent">
              {t("pulse.annual.label")}
            </p>
            <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-brand-bg">
              {t("pulse.annual.badge")}
            </span>
            <p className="font-display text-3xl font-extrabold text-chrome">
              {t("pulse.annual.price")}
              <span className="text-base font-medium text-brand-ink-dim">
                {" "}
                {t("pulse.annual.period")}
              </span>
            </p>
            <p className="text-sm text-brand-ink-dim line-through">
              {t("pulse.annual.originalPrice")}
            </p>
            <p className="mt-1 text-xs text-brand-ink-dim">{t("pulse.annual.note")}</p>
          </GlowCard>
        </div>

        <GlowCard className="mb-6 text-sm">
          <p className="mb-1 font-semibold text-brand-ink">{t("pulse.performanceNote")}</p>
          <p className="text-brand-ink-dim">{t("pulse.riskNote")}</p>
        </GlowCard>

        <div className="mb-10">
          <SpecTable rows={specs} />
        </div>

        <CompoundCalculator locale={locale} />

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={monthlyDmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
          >
            <IconCalendar className="h-5 w-5" />
            {t("pulse.ctaMonthly")}
          </a>
          <a
            href={sixMonthsDmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
          >
            <IconChartUp className="h-5 w-5" />
            {t("pulse.ctaSixMonths")}
          </a>
          <a
            href={annualDmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
          >
            <IconRocket className="h-5 w-5" />
            {t("pulse.ctaAnnual")}
          </a>
        </div>
      </section>
    </div>
  );
}
