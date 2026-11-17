"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getCountries, normalizeSearch } from "@/lib/countries";

// Mesmo visual do InlineField, mas o valor só pode vir da lista de países.
export function CountryField({ value, onSave }: { value: string; onSave: (country: string) => void }) {
  const t = useTranslations("Payment.flow.account");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const countries = useMemo(() => getCountries(locale), [locale]);
  const matches = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return countries;
    return countries.filter((c) => normalizeSearch(c.name).includes(q) || c.code.toLowerCase() === q);
  }, [countries, query]);

  function choose(name: string) {
    onSave(name);
    setOpen(false);
  }

  if (open) {
    return (
      <div className="overflow-hidden rounded-xl border-2 border-brand-accent bg-brand-bg">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="shrink-0 text-xs text-brand-ink-dim">{t("countryLabel")}</span>
          <input
            autoFocus
            autoComplete="off"
            value={query}
            placeholder={t("countryPlaceholder")}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) choose(matches[0].name);
              if (e.key === "Escape") setOpen(false);
            }}
            className="min-w-0 flex-1 bg-transparent text-base text-brand-ink outline-none placeholder:text-brand-ink-dim/60"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto border-t border-brand-hairline">
          {matches.length === 0 && <li className="px-4 py-3 text-sm text-brand-ink-dim">{t("countryNone")}</li>}
          {matches.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                // Evita o blur do campo de busca antes do clique registrar.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c.name)}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-brand-accent/10 hover:text-brand-accent ${
                  c.name === value ? "font-semibold text-brand-accent" : "text-brand-ink"
                }`}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const openPicker = () => {
    setQuery("");
    setOpen(true);
  };

  if (value) {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="flex w-full items-center gap-3 rounded-xl border border-brand-accent/40 bg-brand-accent/5 px-4 py-3 text-left transition-colors hover:border-brand-accent"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-brand-bg">
          ✓
        </span>
        <span className="shrink-0 text-xs text-brand-ink-dim">{t("countryLabel")}</span>
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-brand-ink">{value}</span>
        <span className="shrink-0 text-xs text-brand-ink-dim">✎ {t("edit")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      className="w-full rounded-xl border border-dashed border-brand-hairline px-4 py-3 text-left text-sm text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
    >
      {t("countryEmpty")}
    </button>
  );
}
