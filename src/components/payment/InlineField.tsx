"use client";

import { useState, type HTMLAttributes } from "react";
import { useTranslations } from "next-intl";

// Campo que fica fechado ("toque pra adicionar"), abre pra digitar e fecha mostrando o valor salvo.
export function InlineField({
  label,
  emptyText,
  value,
  placeholder,
  onSave,
  validate,
  sanitize,
  inputMode,
  autoComplete = "off",
  mono = false,
  locked = false,
  lockedText,
}: {
  label: string;
  emptyText: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  validate?: (value: string) => string | null;
  sanitize?: (raw: string) => string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  mono?: boolean;
  // Valor travado: mostra, mas não deixa editar (ex.: conta MT4 depois de usar a troca).
  locked?: boolean;
  lockedText?: string;
}) {
  const t = useTranslations("Payment.flow.account");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const font = mono ? "font-mono" : "";

  function open() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function save() {
    const next = draft.trim().replace(/\s+/g, " ");
    const problem = next && validate ? validate(next) : null;
    if (problem) return setError(problem);
    onSave(next);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div>
        <div className="flex items-center gap-2 rounded-xl border-2 border-brand-accent bg-brand-bg px-3 py-2">
          <span className="shrink-0 text-xs text-brand-ink-dim">{label}</span>
          <input
            autoFocus
            inputMode={inputMode}
            autoComplete={autoComplete}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(sanitize ? sanitize(e.target.value) : e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className={`min-w-0 flex-1 bg-transparent text-base text-brand-ink outline-none placeholder:text-brand-ink-dim/60 ${font}`}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={save}
            className="shrink-0 rounded-full bg-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-bg"
          >
            {t("save")}
          </button>
        </div>
        {error && <p className="mt-1 px-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (value && locked) {
    return (
      <div className="flex w-full items-center gap-3 rounded-xl border border-brand-hairline bg-brand-surface-2/40 px-4 py-3 text-left">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-brand-bg">
          ✓
        </span>
        <span className="shrink-0 text-xs text-brand-ink-dim">{label}</span>
        <span className={`min-w-0 flex-1 truncate text-base font-semibold text-brand-ink ${font}`}>{value}</span>
        <span className="shrink-0 text-xs text-brand-ink-dim">🔒 {lockedText}</span>
      </div>
    );
  }

  if (value) {
    return (
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-3 rounded-xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3 text-left transition-colors hover:border-brand-accent"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-brand-bg">
          ✓
        </span>
        <span className="shrink-0 text-xs text-brand-ink-dim">{label}</span>
        <span className={`min-w-0 flex-1 truncate text-base font-semibold text-brand-ink ${font}`}>{value}</span>
        <span className="shrink-0 text-xs text-brand-ink-dim">✎ {t("edit")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="w-full rounded-xl border border-dashed border-brand-hairline px-4 py-3 text-left text-sm text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
    >
      {emptyText}
    </button>
  );
}
