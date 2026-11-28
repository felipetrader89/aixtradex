import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { PageHeader } from "@/components/sections/PageHeader";
import { ToolCta } from "@/components/tools/ToolCta";
import { IconChartUp, IconRocket, IconShield, IconTarget } from "@/components/brand/icons";
import { Link } from "@/i18n/navigation";
import { CALCULATORS } from "@/lib/tools";

type Props = { params: Promise<{ locale: string }> };

const ICONS = { lot: IconTarget, simple: IconChartUp, compound: IconRocket, recovery: IconShield } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/tools/calculators", namespace: "Tools.calculators", titleKey: "metaTitle", descriptionKey: "metaDescription" });
}

export default async function CalculatorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tools.calculators");
  const th = await getTranslations("Tools.hub");

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CALCULATORS.map((c) => {
            const Icon = ICONS[c.key];
            return (
              <li key={c.key}>
                <Link href={c.href} className="glow-border hover-card block h-full rounded-2xl bg-brand-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
                      <Icon className="h-6 w-6 text-brand-accent" />
                    </span>
                    <span className="text-sm font-semibold text-brand-accent">{th("open")} →</span>
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold text-brand-ink">{t(`items.${c.key}.title`)}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{t(`items.${c.key}.card`)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
        <ToolCta current="calculators" />
      </div>
    </>
  );
}
