import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/blog", namespace: "Metadata.blog", noindex: true });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mb-10 text-brand-ink-dim">{t("comingSoon")}</p>

      <TelegramCta body={t("cta.body")} cta={t("cta.button")} href={siteConfig.telegramUrl} />
    </div>
  );
}
