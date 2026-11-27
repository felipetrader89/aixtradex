import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { sitePageMetadata } from "@/components/seo/sitePageMetadata";
import { LegalPage } from "@/components/sections/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return sitePageMetadata({ locale, href: "/privacy", namespace: "Metadata.privacy" });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage locale={locale} doc="privacy" />;
}
