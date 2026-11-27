import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconCalendar, IconRocket } from "@/components/brand/icons";
import { SpecTable } from "@/components/sections/SpecTable";
import { PricingCard } from "@/components/sections/PricingCard";
import { PageHeader } from "@/components/sections/PageHeader";
import { ProfilesSection } from "@/components/sections/ProfilesSection";
import { RiskNotice } from "@/components/sections/RiskNotice";
import { CheckList } from "@/components/sections/CheckList";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, href: "/products", namespace: "Metadata.products" });
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Products");
  const tRisk = await getTranslations("Risk");
  const includes = t.raw("includes.items") as string[];

  const specs = [
    { label: t("pulse.specs.platform"), value: t("pulse.specs.platformValue") },
    { label: t("pulse.specs.accountType"), value: t("pulse.specs.accountTypeValue") },
    { label: t("pulse.specs.spread"), value: t("pulse.specs.spreadValue") },
    { label: t("pulse.specs.leverage"), value: t("pulse.specs.leverageValue") },
    { label: t("pulse.specs.deposit"), value: t("pulse.specs.depositValue") },
    { label: t("pulse.specs.operation"), value: t("pulse.specs.operationValue") },
  ];

  // Links do checkout: não mudar (o /payment lê o ?plan=).
  const plans = [
    {
      label: t("license.oneMonth.label"),
      price: t("license.oneMonth.price"),
      period: t("license.oneMonth.period"),
      note: t("license.oneMonth.note"),
      discountNote: t("license.oneMonth.discountNote"),
      ctaLabel: t("license.ctaOneMonth"),
      ctaHref: "/payment?plan=licenseMonthly",
      Icon: IconCalendar,
    },
    {
      label: t("license.lifetime.label"),
      price: t("license.lifetime.price"),
      period: t("license.lifetime.period"),
      originalPrice: t("license.lifetime.originalPrice"),
      badge: t("license.lifetime.badge"),
      note: t("license.lifetime.note"),
      discountNote: t("license.lifetime.discountNote"),
      ctaLabel: t("license.ctaLifetime"),
      ctaHref: "/payment?plan=licenseLifetime",
      Icon: IconRocket,
      highlight: true,
    },
  ];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        {/* Licenças */}
        <section id="licenses" className="scroll-mt-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">
            {t("license.tag")}
          </p>
          <p className="mb-6 max-w-3xl text-brand-ink-dim">{t("license.description")}</p>

          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-stretch">
            {plans.map(({ label, price, period, originalPrice, badge, note, discountNote, ctaLabel, ctaHref, Icon, highlight }) => (
              <div key={label} className="flex flex-col gap-4">
                <PricingCard
                  label={label}
                  price={price}
                  period={period}
                  originalPrice={originalPrice}
                  badge={badge}
                  note={note}
                  discountNote={discountNote}
                  className={highlight ? "!border-2 !border-brand-accent shadow-[0_0_40px_rgba(51,214,160,0.25)]" : ""}
                />
                <Link
                  href={ctaHref}
                  className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[filter,color] duration-300 ${
                    highlight
                      ? "bg-gradient-to-b from-brand-accent to-brand-accent-dark text-brand-bg hover:brightness-110"
                      : "cta-neon bg-brand-surface text-brand-ink hover:text-brand-accent"
                  }`}
                >
                  <Icon className="!h-5 !w-5" />
                  {ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <GlowCard className="mb-12 flex items-start gap-3 text-sm">
            <span aria-hidden="true" className="text-2xl">🎁</span>
            <div>
              <p className="font-semibold text-brand-accent">{t("license.discountTitle")}</p>
              <p className="mt-1 text-brand-ink-dim">{t("license.discountBody")}</p>
            </div>
          </GlowCard>
        </section>

        {/* Passe de teste: 1, 3 ou 7 dias antes de assinar */}
        <section id="pass" className="mb-14 scroll-mt-24">
          <GlowCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("pass.tag")}</p>
            <h2 className="mt-2 font-display text-xl font-bold text-chrome sm:text-2xl">{t("pass.title")}</h2>
            <p className="mt-2 text-sm text-brand-ink-dim">{t("pass.description")}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(["d1", "d3", "d7"] as const).map((d) => (
                <Link
                  key={d}
                  href={`/payment?plan=pass${d.slice(1)}`}
                  className="flex flex-col items-center rounded-2xl border border-brand-hairline bg-brand-surface-2 px-4 py-4 text-center transition hover:border-brand-accent"
                >
                  <span className="text-sm font-semibold text-brand-ink">{t(`pass.${d}.label`)}</span>
                  <span className="mt-1 font-display text-2xl font-extrabold text-chrome">{t(`pass.${d}.price`)}</span>
                  <span className="mt-1 text-[11px] text-brand-ink-dim">{t(`pass.${d}.note`)}</span>
                  <span className="mt-3 text-xs font-semibold text-brand-accent">{t("pass.cta")} →</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-brand-ink-dim">💡 {t("pass.creditNote")}</p>
          </GlowCard>
        </section>

        {/* O que inclui */}
        <section className="mb-14">
          <GlowCard className="sm:!p-8">
            <h2 className="mb-5 font-display text-lg font-bold uppercase text-chrome">{t("includes.title")}</h2>
            <CheckList items={includes} className="sm:grid-cols-2 sm:gap-x-8" />
          </GlowCard>
        </section>

        {/* Perfis de risco */}
        <section className="mb-14">
          <ProfilesSection />
        </section>

        {/* Detalhes técnicos (fechado por padrão) */}
        <details className="faq-item glow-border mb-10 rounded-2xl bg-brand-surface">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <h2 className="font-display text-base font-semibold uppercase text-brand-ink">{t("techTitle")}</h2>
            <span
              aria-hidden="true"
              className="faq-plus flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/40 text-lg leading-none text-brand-accent"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6">
            <SpecTable rows={specs} bare />
            <p className="mt-4 text-xs text-brand-ink-dim">{t("license.requirementsNote")}</p>
          </div>
        </details>

        <RiskNotice title={tRisk("noticeTitle")} body={tRisk("noticeBody")} />

        <p className="mt-10 text-center">
          <Link href="/faq" className="text-sm font-semibold text-brand-accent hover:underline">
            {t("faqCta")} →
          </Link>
        </p>
      </div>
    </>
  );
}
