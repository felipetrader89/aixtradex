"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuotes } from "@/components/tools/useQuotes";

const ORDER = ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF"];

function digits(pair: string) {
  if (pair === "XAU/USD" || pair.endsWith("/JPY")) return 2;
  return 4;
}

// Quadro de cotações de referência (as mesmas do letreiro do site), atualizado a cada minuto no navegador.
export function QuotesBoard() {
  const t = useTranslations("Tools.quotes");
  const locale = useLocale();
  const { quotes, updatedAt, status } = useQuotes(60_000);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);
  const sorted = [...quotes].sort((a, b) => ORDER.indexOf(a.pair) - ORDER.indexOf(b.pair));

  return (
    <div>
      <div className="grid min-h-[200px] grid-cols-2 gap-3 sm:grid-cols-3">
        {status === "loading" &&
          ORDER.map((p) => (
            <div key={p} className="glow-border h-[104px] animate-pulse rounded-2xl bg-brand-surface motion-reduce:animate-none" aria-hidden="true" />
          ))}
        {status !== "loading" && sorted.length === 0 && (
          <p className="col-span-full rounded-2xl border border-brand-hairline p-5 text-sm text-brand-ink-dim">{t("empty")}</p>
        )}
        {sorted.map((q) => (
          <div key={q.pair} className="glow-border rounded-2xl bg-brand-surface p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {q.pair === "XAU/USD" ? `${t("gold")} · ${q.pair}` : q.pair}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-brand-ink sm:text-3xl">
              {new Intl.NumberFormat(locale, { minimumFractionDigits: digits(q.pair), maximumFractionDigits: digits(q.pair) }).format(q.price)}
            </p>
          </div>
        ))}
      </div>
      {status === "loading" && <p className="sr-only">{t("loading")}</p>}
      <div className="mt-4 space-y-1 text-xs text-brand-ink-dim">
        {updatedAt && <p>{t("updated", { time: timeFmt.format(new Date(updatedAt)) })}</p>}
        <p>{t("delay")}</p>
        <p>{t("sources")}</p>
      </div>
    </div>
  );
}
