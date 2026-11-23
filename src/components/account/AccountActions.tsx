"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PaymentMethods } from "@/components/payment/PaymentMethods";
import { renewMyLicenseAction } from "@/app/actions/account";
import { siteConfig } from "@/lib/site-config";

const secondaryBtn =
  "inline-flex items-center justify-center rounded-full border border-brand-accent/40 px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:border-brand-accent hover:text-brand-accent disabled:pointer-events-none disabled:opacity-40";

export function RenewButton({ licenseId, price }: { licenseId: string; price: string }) {
  const t = useTranslations("Account");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <p className="text-xs text-brand-accent">{t("renewPending")}</p>;
  return (
    <button
      type="button"
      className={secondaryBtn}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await renewMyLicenseAction(licenseId);
          if (result.ok) setDone(true);
        })
      }
    >
      {t("renew", { price })}
    </button>
  );
}

// Pedido pendente: abre as carteiras com a mensagem do Telegram já preenchida com o número do pedido.
export function PayOrder({ code, amount, email }: { code: string; amount: string; email: string }) {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const dmHref = `${siteConfig.telegramDmUrl}?text=${encodeURIComponent(t("dmPay", { code, amount, email }))}`;
  return (
    <div className="w-full">
      <button type="button" className={secondaryBtn} onClick={() => setOpen((v) => !v)}>
        {open ? t("hidePay") : t("pay")}
      </button>
      {open && (
        <div className="mt-4">
          <p className="mb-4 text-sm text-brand-ink-dim">{t("payIntro", { amount, code })}</p>
          <PaymentMethods dmHref={dmHref} />
        </div>
      )}
    </div>
  );
}
