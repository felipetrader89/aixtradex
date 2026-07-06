import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GlowCard } from "@/components/brand/GlowCard";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.faq" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, getPathname({ href: "/faq", locale: l })])
      ),
    },
  };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");
  const items = t.raw("items") as { q: string; a: string }[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-brand-ink-dim">{t("intro")}</p>
      </header>

      <div className="mb-12 space-y-4">
        {items.map((item) => (
          <GlowCard key={item.q} className="text-left">
            <h2 className="mb-2 font-display text-base font-bold text-brand-ink">{item.q}</h2>
            <p className="text-sm text-brand-ink-dim">{item.a}</p>
          </GlowCard>
        ))}
      </div>

      <TelegramCta title={t("cta.title")} body={t("cta.body")} cta={t("cta.button")} />
    </div>
  );
}
