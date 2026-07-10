import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/Hero";
import { MarketTicker } from "@/components/sections/MarketTicker";
import { WhyUsStrip } from "@/components/sections/WhyUsStrip";
import { CompoundCalculator } from "@/components/sections/CompoundCalculator";
import { GlowCard } from "@/components/brand/GlowCard";
import { Button } from "@/components/ui/Button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";
import { PARTNER_LOGOS, hasPartnerLogo } from "@/lib/partnerLogos";
import { hasLogo } from "@/lib/logo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/", locale: l })])
      ),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const whyUsItems = t.raw("whyUs.items") as { title: string; body: string }[];

  return (
    <>
      <Hero
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        ctaPrimary={t("hero.ctaPrimary")}
        ctaPrimaryHref="/products"
        ctaSecondary={t("hero.ctaSecondary")}
        ctaSecondaryHref={siteConfig.telegramUrl}
      />

      <section aria-label={t("market.title")}>
        <MarketTicker />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <WhyUsStrip heading={t("whyUs.heading")} items={whyUsItems} hasLogo={hasLogo()} />
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <CompoundCalculator locale={locale} />
        <div className="mt-8 text-center">
          <Button href="/products">{t("calculatorCta")}</Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase text-chrome">
          {t("why.title")}
        </h2>
        <GlowCard className="text-left">
          <p className="text-brand-ink-dim">{t("why.body")}</p>
        </GlowCard>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase text-chrome">
          {t("aboutTeaser.title")}
        </h2>
        <GlowCard className="text-left">
          <p className="text-brand-ink-dim">{t("aboutTeaser.body")}</p>
          <Link
            href="/about"
            className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent"
          >
            {t("aboutTeaser.cta")}
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </GlowCard>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="mb-8 font-display text-2xl font-bold uppercase text-chrome">
          {t("partners.title")}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {PARTNER_LOGOS.map(({ slug, name }) =>
            hasPartnerLogo(slug) ? (
              <div
                key={slug}
                className="flex h-20 w-40 items-center justify-center rounded-xl bg-white p-4 transition-transform duration-200 hover:scale-105"
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
                className="cursor-default rounded-full border border-brand-accent/40 bg-brand-accent/5 px-4 py-2 text-sm font-semibold text-brand-accent transition-all duration-200 hover:scale-105 hover:border-brand-accent hover:bg-brand-accent/15"
              >
                {name}
              </span>
            )
          )}
        </div>
      </section>
    </>
  );
}
