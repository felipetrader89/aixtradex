"use client";

import { useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { paymentAddresses } from "@/lib/site-config";

const METHODS = [
  { key: "binancePay", value: paymentAddresses.binancePayId },
  { key: "btc", value: paymentAddresses.btc },
  { key: "usdtTrc20", value: paymentAddresses.usdtTrc20 },
  { key: "usdtErc20", value: paymentAddresses.usdtErc20 },
  { key: "usdtBep20", value: paymentAddresses.usdtBep20 },
  { key: "usdc", value: paymentAddresses.usdc },
  { key: "ltc", value: paymentAddresses.ltc },
  { key: "eth", value: paymentAddresses.eth },
] as const;

// Carteiras cripto + botão do Telegram com a mensagem já pronta.
// Com `exactAmount` (leitura automática da Binance ligada), mostra no topo o valor exato que confirma o pedido sozinho.
export function PaymentMethods({ dmHref, exactAmount }: { dmHref: string; exactAmount?: string | null }) {
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
        {METHODS.map(({ key, value }) => (
          <GlowCard key={key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-base font-bold text-chrome">{t(`methods.${key}.label`)}</p>
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
