import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { withMembers } from "@/lib/telegram";
import { Hero } from "@/components/sections/Hero";
import { PanelMockup } from "@/components/sections/PanelMockup";
import { MarketTicker } from "@/components/sections/MarketTicker";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { ProfilesSection } from "@/components/sections/ProfilesSection";
import { StepList, type Step } from "@/components/sections/StepList";
import { RiskNotice } from "@/components/sections/RiskNotice";
import { VerifiedSoon } from "@/components/sections/VerifiedSoon";
import { CheckList } from "@/components/sections/CheckList";
import { ResultsCarousel } from "@/components/results/ResultsCarousel";
import { GlowCard } from "@/components/brand/GlowCard";
import {
  IconCandles,
  IconChartUp,
  IconChat,
  IconClock,
  IconLock,
  IconShield,
  IconSpark,
  IconTelegram,
  IconUser,
} from "@/components/brand/icons";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site-config";
import { PARTNER_LOGOS, hasPartnerLogo } from "@/lib/partnerLogos";
import { getHomeResultImages } from "@/lib/results";

type Props = { params: Promise<{ locale: string }> };

const BENEFIT_ICONS = [IconClock, IconShield, IconSpark, IconCandles, IconLock, IconChat];
const AI_ICONS = [IconSpark, IconCandles, IconChartUp];

type Item = { title: string; body: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/", namespace: "Metadata.home", absoluteTitle: true });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tRisk = await getTranslations("Risk");
  const tProducts = await getTranslations("Products");
  const benefits = t.raw("benefits.items") as Item[];
  const steps = t.raw("how.items") as Step[];
  const aiItems = t.raw("ai.items") as Item[];
  const panelItems = t.raw("panel.items") as string[];
  const trust = await withMembers(t.raw("hero.trust") as string[], locale);
  const homeResults = getHomeResultImages();

  // Resumo das licenças: preços vêm das mesmas chaves que o checkout usa (Products.license.*).
  const plans: {
    key: string;
    label: string;
    price: string;
    period: string;
    from?: string;
    originalPrice?: string;
    note: string;
    href: string;
    highlight?: boolean;
  }[] = [
    {
      key: "pass",
      label: t("plans.passLabel"),
      price: t("plans.passPrice"),
      from: t("plans.passFrom"),
      period: "",
      note: t("plans.passNote"),
      href: "/products#pass",
    },
    {
      key: "monthly",
      label: tProducts("license.oneMonth.label"),
      price: tProducts("license.oneMonth.price"),
      period: tProducts("license.oneMonth.period"),
      note: tProducts("license.oneMonth.note"),
      href: "/products#licenses",
    },
    {
      key: "lifetime",
      label: tProducts("license.lifetime.label"),
      price: tProducts("license.lifetime.price"),
      period: tProducts("license.lifetime.period"),
      originalPrice: tProducts("license.lifetime.originalPrice"),
      note: tProducts("license.lifetime.note"),
      href: "/products#licenses",
      highlight: true,
    },
  ];

  return (
    <>
      <Hero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        ctaPrimary={t("hero.ctaPrimary")}
        ctaPrimaryHref="/products"
        ctaSecondary={t("hero.ctaSecondary")}
        ctaSecondaryHref="/products#pass"
        ctaTertiary={t("hero.ctaTertiary")}
        ctaTertiaryHref={siteConfig.telegramUrl}
        trust={trust}
        visual={<PanelMockup />}
      />

      <section aria-label={t("market.title")}>
        <MarketTicker />
      </section>

      {/* Por que usar: vantagens */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading
          eyebrow={t("benefits.eyebrow")}
          title={t("benefits.title")}
          intro={t("benefits.intro")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <GlowCard key={item.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
                  <Icon className="h-6 w-6 text-brand-accent" />
                </span>
                <h3 className="mt-4 text-base font-bold text-brand-ink">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{item.body}</p>
              </GlowCard>
            );
          })}
        </div>
      </section>

      {/* Como funciona em 4 passos */}
      <section className="band px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow={t("how.eyebrow")} title={t("how.title")} />
          <StepList steps={steps} columns={4} />
          <div className="mt-8 text-center">
            <Button href="/how-it-works" variant="secondary">
              {t("how.cta")}
            </Button>
          </div>
        </div>
      </section>

      {/* Onde está a IA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading eyebrow={t("ai.eyebrow")} title={t("ai.title")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiItems.map((item, i) => {
            const Icon = AI_ICONS[i % AI_ICONS.length];
            return (
              <div
                key={item.title}
                className="glow-border hover-card rounded-2xl bg-gradient-to-b from-brand-surface-2 to-brand-surface p-6"
              >
                <Icon className="h-8 w-8 text-brand-accent" />
                <h3 className="mt-4 font-display text-lg font-bold text-chrome">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink-dim">{item.body}</p>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-brand-ink-dim">{t("ai.honest")}</p>
      </section>

      {/* Perfis de risco */}
      <section className="band px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <ProfilesSection />
        </div>
      </section>

      {/* Área do cliente */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <GlowCard className="grid grid-cols-1 gap-6 sm:!p-8 md:grid-cols-[1fr_1.3fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{t("panel.eyebrow")}</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold uppercase text-chrome">{t("panel.title")}</h2>
          </div>
          <CheckList items={panelItems} />
        </GlowCard>
      </section>

      {/* Resultados */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHeading
            eyebrow={t("results.eyebrow")}
            title={t("results.title")}
            intro={t("results.intro")}
          />
        </div>
        {homeResults.length > 0 && <ResultsCarousel images={homeResults} />}
        <div className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
          <VerifiedSoon
            badge={t("results.verifiedBadge")}
            title={t("results.verifiedTitle")}
            body={t("results.verifiedBody")}
          />
          <div className="mt-8 text-center">
            <Button href="/results" variant="secondary">
              {t("results.cta")}
            </Button>
          </div>
        </div>
      </section>

      {/* Licenças (resumo) */}
      <section className="band px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <SectionHeading eyebrow={t("plans.eyebrow")} title={t("plans.title")} intro={t("plans.intro")} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <Link
                key={plan.key}
                href={plan.href}
                className={`hover-card relative flex flex-col rounded-2xl bg-brand-surface p-6 ${
                  plan.highlight
                    ? "border-2 border-brand-accent shadow-[0_0_40px_rgba(51,214,160,0.2)]"
                    : "glow-border"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-accent px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-bg">
                    {t("plans.popular")}
                  </span>
                )}
                <span className="font-display text-base font-bold text-brand-accent">{plan.label}</span>
                <span className="mt-3 font-display text-3xl font-extrabold text-chrome">
                  {plan.from && (
                    <span className="mr-2 text-base font-medium text-brand-ink-dim">{plan.from}</span>
                  )}
                  {plan.originalPrice && (
                    <span className="mr-2 text-base font-medium text-brand-ink-dim line-through">
                      {plan.originalPrice}
                    </span>
                  )}
                  {plan.price}
                  <span className="text-base font-medium text-brand-ink-dim">{plan.period}</span>
                </span>
                <span className="mt-2 text-sm text-brand-ink-dim">{plan.note}</span>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-center text-sm text-brand-ink-dim">{t("plans.ibNote")}</p>
          <div className="mt-8 text-center">
            <Button href="/products">{t("plans.cta")}</Button>
          </div>
        </div>
      </section>

      {/* Quem está por trás */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <GlowCard className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8 sm:!p-8">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-accent/10">
            <IconUser className="h-9 w-9 text-brand-accent" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              {t("aboutTeaser.eyebrow")}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-chrome sm:text-2xl">
              {t("aboutTeaser.title")}
            </h2>
            <p className="mt-3 text-brand-ink-dim">{t("aboutTeaser.body")}</p>
            <Link
              href="/about"
              className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent"
            >
              {t("aboutTeaser.cta")}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </GlowCard>
      </section>

      {/* Corretoras parceiras */}
      <section className="mx-auto max-w-5xl px-4 pb-16 text-center sm:px-6">
        <h2 className="font-display text-xl font-bold uppercase text-chrome sm:text-2xl">
          {t("partners.title")}
        </h2>
        <p className="mx-auto mb-8 mt-3 max-w-2xl text-sm text-brand-ink-dim">{t("partners.body")}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {PARTNER_LOGOS.map(({ slug, name }) =>
            hasPartnerLogo(slug) ? (
              <div
                key={slug}
                className="flex h-16 w-32 items-center justify-center rounded-xl bg-white p-3 transition-transform duration-200 hover:scale-105 sm:h-20 sm:w-40 sm:p-4"
              >
                <Image
                  src={`/brokers/${slug}.png`}
                  alt={name}
                  width={140}
                  height={48}
                  unoptimized
                  className="h-auto max-h-10 w-auto object-contain"
                />
              </div>
            ) : (
              <span
                key={slug}
                className="cursor-default rounded-full border border-brand-accent/40 bg-brand-accent/5 px-4 py-2 text-sm font-semibold text-brand-accent"
              >
                {name}
              </span>
            )
          )}
        </div>
      </section>

      {/* Chamada final */}
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className="hero-glow relative overflow-hidden rounded-3xl border border-brand-accent/30 bg-gradient-to-br from-brand-surface-2 to-brand-surface px-6 py-12 text-center sm:px-12">
          <h2 className="text-balance font-display text-2xl font-extrabold uppercase text-chrome sm:text-3xl">
            {t("finalCta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-ink-dim">{t("finalCta.body")}</p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href="/products#pass">{t("finalCta.primary")}</Button>
            <Button href={siteConfig.telegramDmUrl} variant="secondary">
              <IconTelegram className="!h-4 !w-4" />
              {t("finalCta.secondary")}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <RiskNotice title={tRisk("noticeTitle")} body={tRisk("noticeBody")} />
      </section>
    </>
  );
}
