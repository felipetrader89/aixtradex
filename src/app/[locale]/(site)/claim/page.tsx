import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClaimForm } from "@/components/account/ClaimForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Claim" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ClaimPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <ClaimForm />
    </div>
  );
}
