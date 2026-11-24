"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveRobotSettingsAction } from "@/app/actions/robot";

type Profile = "conservative" | "moderate" | "aggressive" | "custom";
export type RobotFormValues = {
  symbols: string[];
  riskProfile: Profile;
  riskPct: number;
  dailyGoalPct: number;
  dailyLossPct: number;
  recovery: boolean;
  recoveryLevels: number;
  newsFilter: boolean;
  maxPositions: number;
  startHour: number;
  endHour: number;
};

const SYMBOL_LABEL: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  USDCHF: "USD/CHF",
  NZDUSD: "NZD/USD",
};

const field = "rounded-xl border border-brand-hairline bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink focus:border-brand-accent focus:outline-none";

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-accent" : "bg-brand-surface-2 ring-1 ring-brand-hairline"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-brand-ink">{label}</span>
        {hint && <span className="block text-xs text-brand-ink-dim">{hint}</span>}
      </span>
    </label>
  );
}

export function RobotSettingsForm({
  login,
  initial,
  symbols,
  profiles,
  goalOptions,
  lossOptions,
  maxPositions,
  allowCustom,
}: {
  login: string;
  initial: RobotFormValues;
  symbols: string[];
  profiles: Record<Exclude<Profile, "custom">, number>;
  goalOptions: number[];
  lossOptions: number[];
  maxPositions: number;
  allowCustom: boolean;
}) {
  const t = useTranslations("Portal.robot");
  const [v, setV] = useState<RobotFormValues>(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof RobotFormValues>(k: K, value: RobotFormValues[K]) => {
    setV((old) => ({ ...old, [k]: value }));
    setStatus(null);
  };
  const pct = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const profileList: Profile[] = ["conservative", "moderate", "aggressive", ...(allowCustom ? (["custom"] as Profile[]) : [])];

  function save() {
    start(async () => {
      const result = await saveRobotSettingsAction(login, v);
      setStatus(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t(`errors.${result.error}`) });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("symbols")}</h2>
        <p className="mt-1 text-xs text-brand-ink-dim">{t("symbolsHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {symbols.map((s) => {
            const on = v.symbols.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => set("symbols", on ? v.symbols.filter((x) => x !== s) : [...v.symbols, s])}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  on
                    ? "border-brand-accent bg-brand-accent/15 text-brand-accent shadow-[0_0_14px_rgba(51,214,160,0.2)]"
                    : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
                }`}
              >
                {on ? "✓ " : ""}
                {SYMBOL_LABEL[s] ?? s}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("risk")}</h2>
        <p className="mt-1 text-xs text-brand-ink-dim">{t("riskHint")}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {profileList.map((p) => {
            const on = v.riskProfile === p;
            const value = p === "custom" ? v.riskPct : profiles[p];
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => set("riskProfile", p)}
                className={`rounded-xl border p-3 text-left transition ${
                  on ? "border-brand-accent bg-brand-accent/10" : "border-brand-hairline bg-brand-surface-2 hover:border-brand-accent/40"
                }`}
              >
                <span className={`block text-sm font-bold ${on ? "text-brand-accent" : "text-brand-ink"}`}>{t(`profiles.${p}`)}</span>
                <span className="mt-1 block text-[11px] text-brand-ink-dim">
                  {t("profileDesc", { pct: pct(value), per: Math.round(500 / Math.max(value, 0.1)) })}
                </span>
              </button>
            );
          })}
        </div>
        {v.riskProfile === "custom" && (
          <label className="mt-3 flex items-center gap-2 text-sm text-brand-ink-dim">
            {t("customPct")}
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={v.riskPct}
              onChange={(e) => set("riskPct", Number(e.target.value))}
              className={`${field} w-24`}
            />
          </label>
        )}
      </section>

      <section className="panel-card grid gap-5 rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5 sm:grid-cols-2">
        {(
          [
            ["dailyGoalPct", "goal", goalOptions],
            ["dailyLossPct", "loss", lossOptions],
          ] as const
        ).map(([key, label, options]) => (
          <label key={key} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t(label)}</span>
            <select value={v[key]} onChange={(e) => set(key, Number(e.target.value))} className={field}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o === 0 ? t("off") : `${pct(o)}%`}
                </option>
              ))}
            </select>
          </label>
        ))}
        <p className="text-xs text-brand-ink-dim sm:col-span-2">{t("goalHint")}</p>
      </section>

      <section className="panel-card flex flex-col gap-5 rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toggle checked={v.recovery} onChange={(x) => set("recovery", x)} label={t("recovery")} hint={t("recoveryHint")} />
          {v.recovery && (
            <label className="flex items-center gap-2 text-sm text-brand-ink-dim">
              {t("levels")}
              <select value={v.recoveryLevels} onChange={(e) => set("recoveryLevels", Number(e.target.value))} className={field}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <Toggle checked={v.newsFilter} onChange={(x) => set("newsFilter", x)} label={t("news")} hint={t("newsHint")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t("maxPositions")}</span>
            <select value={v.maxPositions} onChange={(e) => set("maxPositions", Number(e.target.value))} className={field}>
              {Array.from({ length: maxPositions }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t("hours")}</span>
            <div className="flex items-center gap-2 text-sm text-brand-ink-dim">
              {t("from")}
              <select value={v.startHour} onChange={(e) => set("startHour", Number(e.target.value))} className={field}>
                {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
              {t("to")}
              <select value={v.endHour} onChange={(e) => set("endHour", Number(e.target.value))} className={field}>
                {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-glow rounded-full bg-brand-accent px-6 py-2.5 text-sm font-bold text-brand-bg disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {status && (
          <p role="status" className={`text-sm font-semibold ${status.ok ? "text-brand-accent" : "text-red-300"}`}>
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}
