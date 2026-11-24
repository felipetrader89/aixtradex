"use client";

import { useTranslations } from "next-intl";
import { InlineField } from "@/components/payment/InlineField";

// Login MT4 é só número; aceita de 4 a 12 dígitos pra cobrir todas as corretoras.
const MT4_LOGIN = /^\d{4,12}$/;

export function AccountIdSlots({
  max,
  ids,
  onChange,
  lockedIds = [],
  lockedText,
}: {
  max: number;
  ids: string[];
  onChange: (ids: string[]) => void;
  // Contas que não podem mais ser trocadas (vagas vazias continuam livres).
  lockedIds?: string[];
  lockedText?: string;
}) {
  const t = useTranslations("Payment.flow.account");
  const slots = Array.from({ length: max }, (_, i) => ids[i] ?? "");

  return (
    <div className="mx-auto mt-6 max-w-md">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-accent">
        {t("accountsTitle", { max })}
      </p>
      <ul className="flex flex-col gap-2">
        {slots.map((id, i) => (
          <li key={i}>
            <InlineField
              label={t("slotLabel", { n: i + 1 })}
              emptyText={t("slotEmpty", { n: i + 1 })}
              value={id}
              placeholder={t("placeholder")}
              inputMode="numeric"
              mono
              locked={Boolean(id) && lockedIds.includes(id)}
              lockedText={lockedText}
              sanitize={(raw) => raw.replace(/\D/g, "")}
              validate={(v) =>
                !MT4_LOGIN.test(v)
                  ? t("invalid")
                  : slots.some((other, j) => j !== i && other === v)
                    ? t("duplicate")
                    : null
              }
              onSave={(v) => {
                const next = [...slots];
                next[i] = v;
                onChange(next);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
