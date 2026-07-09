import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SpecTable } from "@/components/sections/SpecTable";
import { CompoundCalculator } from "@/components/sections/CompoundCalculator";
import { ProductsTabs } from "@/components/sections/ProductsTabs";
import { getPathname } from "@/i18n/navigation";
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

  const managed = {
    tag: t("pulse.tag"),
    description: t("pulse.description"),
    performanceNote: t("pulse.performanceNote"),
    riskNote: t("pulse.riskNote"),
    plans: [
      {
        label: t("pulse.monthly.label"),
        price: t("pulse.monthly.price"),
        period: t("pulse.monthly.period"),
        note: t("pulse.monthly.explain"),
        ctaLabel: t("pulse.ctaMonthly"),
        ctaHref: "/payment?plan=monthly",
      },
      {
        label: t("pulse.sixMonths.label"),
        price: t("pulse.sixMonths.price"),
        period: t("pulse.sixMonths.period"),
        originalPrice: t("pulse.sixMonths.originalPrice"),
        badge: t("pulse.sixMonths.badge"),
        ctaLabel: t("pulse.ctaSixMonths"),
        ctaHref: "/payment?plan=sixMonths",
      },
      {
        label: t("pulse.annual.label"),
        price: t("pulse.annual.price"),
        period: t("pulse.annual.period"),
        originalPrice: t("pulse.annual.originalPrice"),
        badge: t("pulse.annual.badge"),
        note: t("pulse.annual.note"),
        ctaLabel: t("pulse.ctaAnnual"),
        ctaHref: "/payment?plan=annual",
        highlight: true,
      },
    ],
  };

  const license = {
    tag: t("license.tag"),
    description: t("license.description"),
    requirementsNote: t("license.requirementsNote"),
    plans: [
      {
        label: t("license.oneMonth.label"),
        price: t("license.oneMonth.price"),
        period: t("license.oneMonth.period"),
        ctaLabel: t("license.ctaOneMonth"),
        ctaHref: "/payment?plan=licenseMonthly",
      },
      {
        label: t("license.sixMonths.label"),
        price: t("license.sixMonths.price"),
        period: t("license.sixMonths.period"),
        ctaLabel: t("license.ctaSixMonths"),
        ctaHref: "/payment?plan=licenseSixMonths",
      },
      {
        label: t("license.oneYear.label"),
        price: t("license.oneYear.price"),
        period: t("license.oneYear.period"),
        ctaLabel: t("license.ctaOneYear"),
        ctaHref: "/payment?plan=licenseAnnual",
        highlight: true,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      <ProductsTabs
        tabs={{ managed: t("tabs.managed"), license: t("tabs.license") }}
        managed={managed}
        license={license}
      />

      <div className="my-10">
        <SpecTable rows={specs} />
      </div>

      <CompoundCalculator locale={locale} />
    </div>
  );
}
