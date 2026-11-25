"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applySuggestionAction, generateAnalysisAction, requestScanAction } from "@/app/actions/intelligence";
import type { ScanPeriod } from "@/lib/intelligence";

const chip = (on: boolean) =>
  `rounded-xl border px-3 py-2 text-xs font-semibold transition ${
    on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
  }`;

export type ScanFormLabels = {
  pair: string;
  period: string;
  start: string;
  sent: string;
  busy: string;
  limit: string;
  error: string;
  periods: Record<string, string>;
  full: string;
  fullHint: string;
};

// Pede a leitura das velas. Enquanto tem leitura ativa, atualiza a página a cada 8 s.
export function ScanForm({
  login,
  symbols,
  defaultSymbol,
  periods,
  active,
  labels,
}: {
  login: string;
  symbols: { value: string; label: string }[];
  defaultSymbol: string;
  periods: readonly ScanPeriod[];
  active: boolean;
  labels: ScanFormLabels;
}) {
  const router = useRouter();
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [period, setPeriod] = useState<ScanPeriod>("3m");
  const [full, setFull] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [active, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-brand-ink">{labels.pair}</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="rounded-xl border border-brand-hairline bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink focus:border-brand-accent focus:outline-none"
          >
            {symbols.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={labels.period} className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-brand-ink">{labels.period}</span>
          <div className="flex flex-wrap gap-1.5">
            {periods.map((p) => (
              <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)} className={chip(p === period)}>
                {labels.periods[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="mt-1 h-4 w-4 accent-[#33d6a0]" />
        <span>
          <span className="block text-sm font-semibold text-brand-ink">{labels.full}</span>
          <span className="block text-xs text-brand-ink-dim">{labels.fullHint}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || active}
          onClick={() =>
            start(async () => {
              const r = await requestScanAction(login, symbol, period, full);
              if (r.ok) {
                setMsg({ ok: true, text: labels.sent });
                router.refresh();
              } else setMsg({ ok: false, text: r.error === "busy" ? labels.busy : r.error === "limit" ? labels.limit : labels.error });
            })
          }
          className="rounded-full bg-brand-accent px-5 py-2.5 text-sm font-bold text-brand-bg transition hover:brightness-110 disabled:opacity-50"
        >
          {labels.start}
        </button>
        {msg && (
          <p role="status" className={`text-sm ${msg.ok ? "text-brand-accent" : "text-red-300"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

export type ApplyLabels = { apply: string; applied: string; blocked: string; error: string; confirm: string };

export function ApplyButton({ login, symbol, patch, labels }: { login: string; symbol: string; patch: Record<string, unknown>; labels: ApplyLabels }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "done" | "blocked" | "error">("idle");
  const [pending, start] = useTransition();
  if (state === "done") return <span className="text-xs font-semibold text-brand-accent">{labels.applied}</span>;
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(labels.confirm)) return;
          start(async () => {
            const r = await applySuggestionAction(login, symbol, patch);
            if (r.ok) {
              setState("done");
              router.refresh();
            } else setState(r.error === "blocked" ? "blocked" : "error");
          });
        }}
        className="rounded-full border border-brand-accent/60 px-3 py-1 text-xs font-semibold text-brand-accent transition hover:bg-brand-accent/10 disabled:opacity-50"
      >
        {labels.apply}
      </button>
      {state !== "idle" && <span className="text-[11px] text-red-300">{state === "blocked" ? labels.blocked : labels.error}</span>}
    </span>
  );
}

export type AnalysisLabels = { generate: string; again: string; working: string; errors: Record<string, string> };

// Gera a análise escrita pela IA (leva de 20 s a 1 min).
export function AnalysisButton({ login, locale, hasOne, disabled, labels }: { login: string; locale: string; hasOne: boolean; disabled?: boolean; labels: AnalysisLabels }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await generateAnalysisAction(login, locale);
            if (r.ok) router.refresh();
            else setError(labels.errors[r.error] ?? labels.errors.api);
          })
        }
        className={`rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
          hasOne ? "border border-brand-accent/60 text-brand-accent hover:bg-brand-accent/10" : "bg-brand-accent text-brand-bg hover:brightness-110"
        }`}
      >
        {pending ? labels.working : hasOne ? labels.again : labels.generate}
      </button>
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" aria-hidden />}
      {error && (
        <p role="status" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
