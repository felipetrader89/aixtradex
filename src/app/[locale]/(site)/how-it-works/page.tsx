import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconLock, IconServer, IconChartUp, IconGlobe } from "@/components/brand/icons";
import { SpecTable } from "@/components/sections/SpecTable";
import { Button } from "@/components/ui/Button";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const BENEFIT_ICONS = [IconLock, IconServer, IconChartUp, IconGlobe];

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
  const benefitItems = t.raw("benefits.items") as { title: string; body: string }[];
  const steps = t.raw("technical.steps") as { title: string; body: string }[];

  const specs = [
    { label: t("specs.platform"), value: t("specs.platformValue") },
    { label: t("specs.pair"), value: t("specs.pairValue") },
    { label: t("specs.timeframe"), value: t("specs.timeframeValue") },
    { label: t("specs.accountType"), value: t("specs.accountTypeValue") },
    { label: t("specs.operation"), value: t("specs.operationValue") },
    { label: t("specs.dashboard"), value: t("specs.dashboardValue") },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-16 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold uppercase text-chrome">
          {t("benefits.heading")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {benefitItems.map((item, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <GlowCard key={item.title} className="flex items-start gap-4">
                <Icon className="h-9 w-9 shrink-0 text-brand-accent" />
                <div>
                  <h3 className="mb-1 text-base font-bold text-brand-ink">{item.title}</h3>
                  <p className="text-sm text-brand-ink-dim">{item.body}</p>
                </div>
              </GlowCard>
            );
          })}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold uppercase text-chrome">
          {t("technical.heading")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {steps.map((step, i) => (
            <GlowCard key={step.title} className="flex gap-4">
              <span className="font-display text-2xl font-extrabold text-brand-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="mb-1 text-base font-bold text-brand-ink">{step.title}</h3>
                <p className="text-sm text-brand-ink-dim">{step.body}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SpecTable rows={specs} />
      </section>

      <GlowCard className="mb-16 text-sm">
        <p className="text-brand-ink-dim">{t("risk.body")}</p>
      </GlowCard>

      <GlowCard className="flex flex-col items-center gap-4 text-center">
        <h3 className="font-display text-2xl font-bold uppercase text-chrome">
          {t("cta.title")}
        </h3>
        <p className="max-w-md text-brand-ink-dim">{t("cta.body")}</p>
        <Button href="/products">{t("cta.button")}</Button>
      </GlowCard>
    </div>
  );
}
