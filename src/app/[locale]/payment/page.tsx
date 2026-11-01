import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutFlow } from "@/components/payment/CheckoutFlow";
import { isPlanKey } from "@/lib/plans";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Payment" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function PaymentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Payment");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase text-chrome sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-brand-ink-dim">{t("intro")}</p>
      </header>

      <CheckoutFlow initialPlan={isPlanKey(plan) ? plan : undefined} />
    </div>
  );
}
