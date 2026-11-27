import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { SpecTable } from "@/components/sections/SpecTable";
import { PageHeader } from "@/components/sections/PageHeader";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { StepList, type Step } from "@/components/sections/StepList";
import { RiskPrinciples, type RiskItem } from "@/components/sections/RiskPrinciples";
import { RiskNotice } from "@/components/sections/RiskNotice";
import { CheckList } from "@/components/sections/CheckList";
import { Button } from "@/components/ui/Button";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.howItWorks" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/how-it-works", locale: l })])
      ),
    },
  };
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HowItWorks");
  const tRisk = await getTranslations("Risk");
  const steps = t.raw("flow.steps") as Step[];
  const portalItems = t.raw("portal.items") as string[];
  const riskItems = tRisk.raw("items") as RiskItem[];

  const specs = [
    { label: t("specs.platform"), value: t("specs.platformValue") },
    { label: t("specs.chart"), value: t("specs.chartValue") },
    { label: t("specs.accountType"), value: t("specs.accountTypeValue") },
    { label: t("specs.spread"), value: t("specs.spreadValue") },
    { label: t("specs.operation"), value: t("specs.operationValue") },
    { label: t("specs.dashboard"), value: t("specs.dashboardValue") },
    { label: t("specs.languages"), value: t("specs.languagesValue") },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <section className="mb-20">
          <SectionHeading eyebrow={t("flow.eyebrow")} title={t("flow.heading")} />
          <StepList steps={steps} />
        </section>

        <section className="mb-20">
          <SectionHeading eyebrow={tRisk("eyebrow")} title={tRisk("title")} intro={tRisk("intro")} />
          <RiskPrinciples items={riskItems} />
          <p className="mt-6 text-center text-sm text-brand-ink-dim">{tRisk("footnote")}</p>
        </section>

        <section className="mb-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GlowCard>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              {t("portal.eyebrow")}
            </p>
            <h2 className="mt-2 font-display text-lg font-bold uppercase text-chrome">{t("portal.heading")}</h2>
            <p className="mb-5 mt-2 text-sm text-brand-ink-dim">{t("portal.intro")}</p>
            <CheckList items={portalItems} />
          </GlowCard>
          <GlowCard>
            <h2 className="mb-5 font-display text-lg font-bold uppercase text-chrome">{t("specs.heading")}</h2>
            <SpecTable rows={specs} bare />
          </GlowCard>
        </section>

        <div className="mb-14">
          <RiskNotice title={tRisk("noticeTitle")} body={tRisk("noticeBody")} />
        </div>

        <GlowCard className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-bold uppercase text-chrome">{t("cta.title")}</h2>
          <p className="max-w-md text-brand-ink-dim">{t("cta.body")}</p>
          <Button href="/products">{t("cta.button")}</Button>
        </GlowCard>
      </div>
    </>
  );
}
