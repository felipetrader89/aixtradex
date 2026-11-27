import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/sections/PageHeader";
import { ToolCta } from "@/components/tools/ToolCta";
import { IconCalendar, IconCandles, IconChartUp, IconClock, IconGlobe, IconSpark } from "@/components/brand/icons";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/tools";

type Props = { params: Promise<{ locale: string }> };

const ICONS = { calculator: IconCandles, sessions: IconClock, quotes: IconChartUp, calendar: IconCalendar, analysis: IconSpark, news: IconGlobe } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, href: "/tools", namespace: "Metadata.tools" });
}

export default async function ToolsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tools.hub");
  const tf = await getTranslations("Footer.toolsLinks");

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = ICONS[tool.key];
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
                    <Icon className="h-6 w-6 text-brand-accent" />
                  </span>
                  {tool.href ? (
                    <span className="text-sm font-semibold text-brand-accent">{t("open")} →</span>
                  ) : (
                    <span className="rounded-full border border-brand-hairline px-2 py-0.5 text-[11px] uppercase tracking-wide text-brand-ink-dim">
                      {t("soon")}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-brand-ink">{tf(tool.key)}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-ink-dim">{t(`items.${tool.key}`)}</p>
              </>
            );
            return (
              <li key={tool.key}>
                {tool.href ? (
                  <Link href={tool.href} className="glow-border hover-card block h-full rounded-2xl bg-brand-surface p-6">
                    {body}
                  </Link>
                ) : (
                  <div className="h-full rounded-2xl border border-dashed border-brand-hairline p-6 opacity-80">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <ToolCta />
      </div>
    </>
  );
}
