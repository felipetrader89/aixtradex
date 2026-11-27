"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { saveAccountChoice } from "@/lib/panel";

// Seletor de conta no topo do painel, estilo corretora: número da conta + selo DEMO/REAL + saldo
// (verde na real, laranja na demo). Clicou no número, abre a lista das outras contas; escolheu, o painel todo passa a mostrar ela.

export type SwitchAccount = {
  login: string;
  company: string | null;
  server: string | null;
  balance: string | null;
  equity: string | null;
  currency: string | null;
  demo: boolean;
  online: boolean;
};

type Labels = { demo: string; real: string; choose: string; balance: string; equity: string; noData: string; online: string; offline: string };

function Badge({ demo, labels }: { demo: boolean; labels: Labels }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide ${
        demo ? "bg-orange-400/15 text-orange-300" : "bg-brand-accent/15 text-brand-accent"
      }`}
    >
      {demo ? labels.demo : labels.real}
    </span>
  );
}

export function AccountSwitcher({ accounts, selected, labels }: { accounts: SwitchAccount[]; selected: string; labels: Labels }) {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: string | null, cur: string | null) => (v == null ? labels.noData : `${nf.format(Number(v))}${cur ? ` ${cur}` : ""}`);
  const current = accounts.find((a) => a.login === selected) ?? accounts[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;

  function pick(login: string) {
    setOpen(false);
    if (login === current.login) return;
    saveAccountChoice(login);
    router.refresh();
  }

  const tone = (demo: boolean) => (demo ? "text-orange-300" : "text-brand-accent");

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={labels.choose}
        className="flex items-center gap-2 rounded-lg border border-brand-hairline bg-brand-surface/80 px-2.5 py-1.5 text-left transition hover:border-brand-accent/50 sm:gap-3 sm:px-3"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${current.online ? "bg-brand-accent shadow-[0_0_8px_var(--color-brand-accent)]" : "bg-brand-ink-dim/50"}`}
          aria-label={current.online ? labels.online : labels.offline}
        />
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-brand-ink">{current.login}</span>
            <Badge demo={current.demo} labels={labels} />
          </span>
          <span className={`font-mono text-sm font-bold ${tone(current.demo)}`}>{money(current.balance, current.currency)}</span>
        </span>
        {accounts.length > 1 && (
          <svg viewBox="0 0 20 20" className={`h-4 w-4 text-brand-ink-dim transition ${open ? "rotate-180" : ""}`} aria-hidden>
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && accounts.length > 1 && (
        <ul
          role="listbox"
          aria-label={labels.choose}
          className="absolute right-0 z-[60] mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-brand-hairline bg-brand-surface p-1 shadow-2xl shadow-black/40"
        >
          {accounts.map((a) => (
            <li key={a.login} role="option" aria-selected={a.login === current.login}>
              <button
                type="button"
                onClick={() => pick(a.login)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-brand-surface-2 ${
                  a.login === current.login ? "bg-brand-surface-2" : ""
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.online ? "bg-brand-accent" : "bg-brand-ink-dim/50"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-brand-ink">{a.login}</span>
                    <Badge demo={a.demo} labels={labels} />
                  </span>
                  <span className="block truncate text-[11px] text-brand-ink-dim">{[a.company, a.server].filter(Boolean).join(" · ") || labels.noData}</span>
                </span>
                <span className={`shrink-0 font-mono text-xs font-bold ${tone(a.demo)}`}>{money(a.balance, a.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
