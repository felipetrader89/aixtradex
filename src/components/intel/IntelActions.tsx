"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applySuggestionAction, requestScanAction } from "@/app/actions/intelligence";
import type { Strategy } from "@/lib/intel-stats";
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || active}
          onClick={() =>
            start(async () => {
              const r = await requestScanAction(login, symbol, period);
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

export function ApplyButton({ login, symbol, patch, labels }: { login: string; symbol: string; patch: Strategy; labels: ApplyLabels }) {
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
