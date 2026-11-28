import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { CalculatorShell, calculatorJsonLd } from "@/components/tools/CalculatorShell";
import { GrowthCalculator } from "@/components/tools/GrowthCalculator";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/tools/calculators/simple-interest", namespace: "Tools.calculators.items.simple", titleKey: "metaTitle", descriptionKey: "metaDescription" });
}

export default async function SimpleInterestCalculatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <CalculatorShell active="simple">
      <GrowthCalculator mode="simple" />
      {await calculatorJsonLd("simple")}
    </CalculatorShell>
  );
}
