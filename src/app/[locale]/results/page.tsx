import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { getResultImages, RESULT_VIDEOS } from "@/lib/results";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

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
  const images = getResultImages();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

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
    </div>
  );
}
