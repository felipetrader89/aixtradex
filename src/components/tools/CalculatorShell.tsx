import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/sections/PageHeader";
import { ToolCta } from "@/components/tools/ToolCta";
import { Link } from "@/i18n/navigation";
import { CALCULATORS, type CalculatorKey } from "@/lib/tools";

// Moldura de cada calculadora: topo "Calculadoras", abas pra trocar de calculadora, conteúdo e chamada final.
export async function CalculatorShell({ active, children }: { active: CalculatorKey; children: ReactNode }) {
  const t = await getTranslations("Tools.calculators");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t(`items.${active}.title`)} intro={t(`items.${active}.intro`)} />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <nav aria-label={t("title")} className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1 rounded-2xl border border-brand-hairline bg-brand-surface p-1 sm:w-auto">
            {CALCULATORS.map((c) => {
              const on = c.key === active;
              return (
                <li key={c.key} className="sm:flex-1">
                  <Link
                    href={c.href}
                    aria-current={on ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                      on ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim hover:bg-brand-surface-2 hover:text-brand-ink"
                    }`}
                  >
                    {t(`items.${c.key}.tab`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {children}
        <ToolCta current="calculators" />
      </div>
    </>
  );
}

// Dados estruturados de ferramenta gratuita (o Google pode mostrar a página como aplicativo web).
export async function calculatorJsonLd(key: CalculatorKey) {
  const t = await getTranslations("Tools.calculators");
  const json = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t(`items.${key}.metaTitle`),
    description: t(`items.${key}.metaDescription`),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />;
}
