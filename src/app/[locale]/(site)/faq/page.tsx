import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { TelegramCta } from "@/components/sections/TelegramCta";
import { PageHeader } from "@/components/sections/PageHeader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, href: "/faq", namespace: "Metadata.faq" });
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");
  const items = t.raw("items") as { q: string; a: string }[];

  // Dados estruturados de FAQ (ajuda o Google e as IAs a lerem as respostas).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-12 space-y-3">
          {items.map((item, i) => (
            <details
              key={item.q}
              className="faq-item glow-border group rounded-2xl bg-brand-surface transition-colors open:border-brand-accent/40"
              open={i === 0}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <h2 className="font-display text-base font-semibold text-brand-ink">{item.q}</h2>
                <span
                  aria-hidden="true"
                  className="faq-plus flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/40 text-lg leading-none text-brand-accent"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-brand-ink-dim sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>

        <TelegramCta title={t("cta.title")} body={t("cta.body")} cta={t("cta.button")} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
