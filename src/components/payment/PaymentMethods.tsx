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
export function PaymentMethods({ dmHref }: { dmHref: string }) {
  const t = useTranslations("Payment");
  return (
    <>
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
