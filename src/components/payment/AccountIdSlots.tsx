"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Login MT4 é só número; aceita de 4 a 12 dígitos pra cobrir todas as corretoras.
const MT4_LOGIN = /^\d{4,12}$/;

export function AccountIdSlots({
  max,
  ids,
  onChange,
}: {
  max: number;
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("Payment.flow.account");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const slots = Array.from({ length: max }, (_, i) => ids[i] ?? "");

  function open(i: number) {
    setEditing(i);
    setDraft(slots[i]);
    setError(null);
  }

  function save(i: number) {
    const value = draft.replace(/\D/g, "");
    const next = [...slots];
    if (value && !MT4_LOGIN.test(value)) return setError(t("invalid"));
    if (value && slots.some((id, j) => j !== i && id === value)) return setError(t("duplicate"));
    next[i] = value;
    onChange(next);
    setEditing(null);
    setError(null);
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-accent">
        {t("accountsTitle", { max })}
      </p>
      <ul className="flex flex-col gap-2">
        {slots.map((id, i) => (
          <li key={i}>
            {editing === i ? (
              <div>
                <div className="flex items-center gap-2 rounded-xl border-2 border-brand-accent bg-brand-bg px-3 py-2">
                  <span className="shrink-0 text-xs text-brand-ink-dim">{t("slotLabel", { n: i + 1 })}</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="off"
                    value={draft}
                    placeholder={t("placeholder")}
                    onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                    onBlur={() => save(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(i);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="min-w-0 flex-1 bg-transparent font-mono text-base text-brand-ink outline-none placeholder:text-brand-ink-dim/60"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => save(i)}
                    className="shrink-0 rounded-full bg-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-bg"
                  >
                    {t("save")}
                  </button>
                </div>
                {error && <p className="mt-1 px-1 text-xs text-red-400">{error}</p>}
              </div>
            ) : id ? (
              <button
                type="button"
                onClick={() => open(i)}
                className="flex w-full items-center gap-3 rounded-xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3 text-left transition-colors hover:border-brand-accent"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-brand-bg">
                  ✓
                </span>
                <span className="text-xs text-brand-ink-dim">{t("slotLabel", { n: i + 1 })}</span>
                <span className="flex-1 font-mono text-base font-semibold text-brand-ink">{id}</span>
                <span className="text-xs text-brand-ink-dim">✎ {t("edit")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => open(i)}
                className="w-full rounded-xl border border-dashed border-brand-hairline px-4 py-3 text-left text-sm text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
              >
                {t("slotEmpty", { n: i + 1 })}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
