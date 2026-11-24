import { getTranslations } from "next-intl/server";
import { hasLogo } from "@/lib/logo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketTicker } from "@/components/sections/MarketTicker";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";
import { LocaleSuggest } from "@/components/layout/LocaleSuggest";
import { Suspense } from "react";

// Páginas públicas: cabeçalho, cotações e rodapé do site.
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Common" });
  return (
    <>
      <Header logoExists={hasLogo()} />
      <main>{children}</main>
      <section aria-label={t("marketTicker")}>
        <MarketTicker />
      </section>
      <Footer />
      <ScrollToTopButton />
      <Suspense fallback={null}>
        <LocaleSuggest />
      </Suspense>
    </>
  );
}
