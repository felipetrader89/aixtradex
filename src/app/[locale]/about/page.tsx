import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.about" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/about", locale: l })])
      ),
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const story = t.raw("story") as string[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-brand-ink-dim">{t("intro")}</p>
      </header>

      <div className="mb-12 space-y-4">
        {story.map((paragraph, i) => (
          <p key={i} className="text-brand-ink">
            {paragraph}
          </p>
        ))}
      </div>

      <section className="mb-12">
        <h2 className="mb-3 font-display text-xl font-bold text-chrome">
          {t("brokers.title")}
        </h2>
        <p className="mb-5 text-brand-ink-dim">{t("brokers.body")}</p>
        <div className="flex flex-wrap gap-3">
          {siteConfig.brokers.map((broker) => (
            <span
              key={broker}
              className="cursor-default rounded-full border border-brand-accent/40 bg-brand-accent/5 px-4 py-2 text-sm font-semibold text-brand-accent transition-all duration-200 hover:scale-105 hover:border-brand-accent hover:bg-brand-accent/15"
            >
              {broker}
            </span>
          ))}
          <span className="cursor-default rounded-full border border-dashed border-brand-hairline px-4 py-2 text-sm font-semibold text-brand-ink-dim">
            {t("brokers.comingSoon")}
          </span>
        </div>
      </section>

      <TelegramCta
        title={t("closing.title")}
        body={t("closing.body")}
        cta={t("cta")}
        href={siteConfig.telegramDmUrl}
      />
    </div>
  );
}
