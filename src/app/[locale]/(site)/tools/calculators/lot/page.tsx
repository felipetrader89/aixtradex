import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { CalculatorShell, calculatorJsonLd } from "@/components/tools/CalculatorShell";
import { LotCalculator } from "@/components/tools/LotCalculator";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/tools/calculators/lot", namespace: "Tools.calculators.items.lot", titleKey: "metaTitle", descriptionKey: "metaDescription" });
}

export default async function LotCalculatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <CalculatorShell active="lot">
      <LotCalculator />
      {await calculatorJsonLd("lot")}
    </CalculatorShell>
  );
}
