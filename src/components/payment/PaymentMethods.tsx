"use client";

import { useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { CopyButton } from "@/components/ui/CopyButton";
import type { PublicPaymentMethod } from "@/lib/payment-methods";

// Carteiras cripto (as ligadas em Admin → Configurações → Carteiras) + botão do Telegram com a mensagem pronta.
// Com `exactAmount` (leitura automática da Binance ligada), mostra no topo o valor exato que confirma o pedido sozinho.
export function PaymentMethods({
  dmHref,
  methods,
  exactAmount,
}: {
  dmHref: string;
  methods: PublicPaymentMethod[];
  exactAmount?: string | null;
}) {
  const t = useTranslations("Payment");
  return (
    <>
      {exactAmount && (
        <GlowCard className="mb-4 border border-brand-accent/50 text-center">
          <p className="font-display text-lg font-bold text-chrome">{t("auto.title", { amount: exactAmount })}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-xl bg-brand-accent/10 px-4 py-2 font-mono text-2xl font-extrabold tracking-wide text-brand-accent">
              {exactAmount}
            </span>
            <CopyButton value={exactAmount} label={t("copy")} copiedLabel={t("copied")} />
          </div>
          <p className="mt-3 text-sm text-brand-ink-dim">{t("auto.body")}</p>
          <p className="mt-2 text-xs text-brand-ink-dim">⚠️ {t("auto.exactHint", { amount: exactAmount })}</p>
          <p className="mt-2 text-xs text-brand-ink-dim">{t("auto.otherCoins")}</p>
        </GlowCard>
      )}

      <GlowCard className="mb-4 text-sm text-brand-ink-dim">
        <p>⚠️ {t("warning")}</p>
      </GlowCard>

      <div className="mb-8 flex flex-col gap-4">
        {methods.map(({ key, value, auto }) => (
          <GlowCard key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold text-chrome">
                {t(`methods.${key}.label`)}
                {auto && exactAmount && (
                  <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-brand-accent">
                    {t("auto.badge")}
                  </span>
                )}
              </p>
              <p className="text-xs text-brand-ink-dim">{t(`methods.${key}.network`)}</p>
              <p className="mt-1 break-all font-mono text-xs text-brand-ink">{value}</p>
            </div>
            <CopyButton value={value} label={t("copy")} copiedLabel={t("copied")} />
          </GlowCard>
        ))}
      </div>

      <div className="flex justify-center">
        <a
          href={dmHref}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-neon flex items-center gap-2 rounded-full bg-brand-surface px-6 py-3 text-center text-sm font-semibold text-brand-ink transition-colors duration-300 hover:text-brand-accent"
        >
          {t("ctaTelegram")}
        </a>
      </div>
    </>
  );
}
