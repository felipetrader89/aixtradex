import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.contact" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/contact", locale: l })])
      ),
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="mb-8 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
        {t("title")}
      </h1>

      <TelegramCta body={t("body")} cta={t("cta")} />

      <p className="mt-6 text-sm text-brand-ink-dim">{t("note")}</p>
    </div>
  );
}
