import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { CalculatorShell, calculatorJsonLd } from "@/components/tools/CalculatorShell";
import { RecoveryCalculator } from "@/components/tools/RecoveryCalculator";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/tools/calculators/loss-recovery", namespace: "Tools.calculators.items.recovery", titleKey: "metaTitle", descriptionKey: "metaDescription" });
}

export default async function LossRecoveryCalculatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <CalculatorShell active="recovery">
      <RecoveryCalculator />
      {await calculatorJsonLd("recovery")}
    </CalculatorShell>
  );
}
