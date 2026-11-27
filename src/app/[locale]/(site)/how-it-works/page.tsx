import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconClock, IconShield, IconSpark, IconTarget } from "@/components/brand/icons";
import { SpecTable } from "@/components/sections/SpecTable";
import { PageHeader } from "@/components/sections/PageHeader";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { StepList, type Step } from "@/components/sections/StepList";
import { ProfilesSection } from "@/components/sections/ProfilesSection";
import { RiskNotice } from "@/components/sections/RiskNotice";
import { Button } from "@/components/ui/Button";

type Props = { params: Promise<{ locale: string }> };

const DAY_ICONS = [IconClock, IconShield, IconTarget, IconSpark];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/how-it-works", namespace: "Metadata.howItWorks" });
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HowItWorks");
  const tRisk = await getTranslations("Risk");
  const steps = t.raw("flow.steps") as Step[];
  const dayItems = t.raw("day.items") as Step[];
  const techSteps = t.raw("tech.steps") as Step[];

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
          <SectionHeading eyebrow={t("day.eyebrow")} title={t("day.heading")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dayItems.map((item, i) => {
              const Icon = DAY_ICONS[i % DAY_ICONS.length];
              return (
                <GlowCard key={item.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10">
                    <Icon className="h-6 w-6 text-brand-accent" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-brand-ink">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{item.body}</p>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        </section>

        {/* O que é IA e o que é regra */}
        <section className="mb-20">
          <div className="glow-border rounded-2xl bg-gradient-to-br from-brand-surface-2 to-brand-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold uppercase text-chrome">{t("honest.title")}</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <p className="rounded-xl bg-brand-bg/40 p-4 text-sm leading-relaxed text-brand-ink">{t("honest.ai")}</p>
              <p className="rounded-xl bg-brand-bg/40 p-4 text-sm leading-relaxed text-brand-ink">{t("honest.rules")}</p>
            </div>
            <p className="mt-4 text-sm text-brand-ink-dim">{t("honest.note")}</p>
          </div>
        </section>

        <section className="mb-16">
          <ProfilesSection />
        </section>

        {/* Detalhes técnicos (fechado por padrão) */}
        <details className="faq-item glow-border mb-14 rounded-2xl bg-brand-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <h2 className="font-display text-base font-semibold uppercase text-brand-ink">{t("tech.title")}</h2>
            <span
              aria-hidden="true"
              className="faq-plus flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/40 text-lg leading-none text-brand-accent"
            >
              +
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-6 px-5 pb-6 sm:px-6 lg:grid-cols-2">
            <ul className="grid gap-4">
              {techSteps.map((s) => (
                <li key={s.title} className="text-sm">
                  <p className="font-semibold text-brand-ink">{s.title}</p>
                  <p className="mt-1 leading-relaxed text-brand-ink-dim">{s.body}</p>
                </li>
              ))}
            </ul>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                {t("specs.heading")}
              </p>
              <SpecTable rows={specs} bare />
            </div>
          </div>
        </details>

        <div className="mb-14">
          <RiskNotice title={tRisk("noticeTitle")} body={tRisk("noticeBody")} />
        </div>

        <GlowCard className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-bold uppercase text-chrome">{t("cta.title")}</h2>
          <p className="max-w-md text-brand-ink-dim">{t("cta.body")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/products">{t("cta.button")}</Button>
          </div>
        </GlowCard>
      </div>
    </>
  );
}
