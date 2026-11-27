import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { PageHeader } from "@/components/sections/PageHeader";
import { ToolCta } from "@/components/tools/ToolCta";
import { QuotesBoard } from "@/components/tools/QuotesBoard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/tools/quotes", namespace: "Tools.quotes", titleKey: "metaTitle", descriptionKey: "metaDescription" });
}

export default async function QuotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tools.quotes");
  // Dados estruturados: ferramenta gratuita (ajuda o Google a mostrar a página como aplicativo web).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("metaTitle"),
    description: t("metaDescription"),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
        <QuotesBoard />
        <ToolCta current="quotes" />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
