import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { PageHeader } from "@/components/sections/PageHeader";
import { VerifiedSoon } from "@/components/sections/VerifiedSoon";
import { RiskNotice } from "@/components/sections/RiskNotice";
import { GlowCard } from "@/components/brand/GlowCard";
import { IconTelegram } from "@/components/brand/icons";
import { Button } from "@/components/ui/Button";
import { getResultImages, RESULT_VIDEOS } from "@/lib/results";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.results" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/results", locale: l })])
      ),
    },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Results");
  const tRisk = await getTranslations("Risk");
  const images = getResultImages();
  const context = t.raw("context") as string[];

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GlowCard>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              {t("contextTitle")}
            </p>
            <ul className="grid gap-3">
              {context.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-brand-ink-dim">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Button href={siteConfig.telegramUrl} variant="secondary" className="!px-4 !py-2">
                <IconTelegram className="!h-4 !w-4" />
                {t("telegramCta")}
              </Button>
            </div>
          </GlowCard>
          <VerifiedSoon badge={t("verifiedBadge")} title={t("verifiedTitle")} body={t("verifiedBody")} />
        </div>

        <ResultsTabs
          images={images}
          videos={RESULT_VIDEOS}
          labels={{
            images: t("tabs.images"),
            videos: t("tabs.videos"),
            videosEmpty: t("videosEmpty"),
            showMore: t("showMore"),
            showLess: t("showLess"),
          }}
        />

        <div className="mt-14">
          <RiskNotice title={tRisk("noticeTitle")} body={tRisk("noticeBody")} />
        </div>
      </div>
    </>
  );
}
