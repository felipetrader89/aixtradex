"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveRobotSettingsAction } from "@/app/actions/robot";
import {
  ADX_LEVELS,
  DEFAULT_PAIR,
  MAX_POSITIONS,
  NEWS_MINUTES,
  PCT_OPTIONS,
  RISK_PROFILES,
  RSI_PERIODS,
  RSI_TIMEFRAMES,
  SYMBOL_LABEL,
  type PairParams,
  type RiskProfile,
  type RobotConfig,
} from "@/lib/robot-options";

export type RobotFormValues = Omit<RobotConfig, "updatedAt">;

const field =
  "w-full rounded-xl border border-brand-hairline bg-brand-surface-2 px-3 py-2 text-sm text-brand-ink focus:border-brand-accent focus:outline-none";
const card = "panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5";
const h2 = "text-xs font-semibold uppercase tracking-wide text-brand-accent";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-accent" : "bg-brand-surface-2 ring-1 ring-brand-hairline"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Switch checked={checked} onChange={onChange} label={label} />
      </div>
      <div>
        <span className="block text-sm font-semibold text-brand-ink">{label}</span>
        {hint && <span className="block text-xs text-brand-ink-dim">{hint}</span>}
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-brand-ink-dim">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim hover:text-brand-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RobotSettingsForm({
  login,
  initial,
  symbols,
  ddCap,
  allowCustom,
}: {
  login: string;
  initial: RobotFormValues;
  symbols: string[];
  ddCap: number;
  allowCustom: boolean;
}) {
  const t = useTranslations("Portal.robot");
  const [v, setV] = useState<RobotFormValues>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [editing, setEditing] = useState<string>(initial.symbols[0] ?? symbols[0]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== saved;

  const set = <K extends keyof RobotFormValues>(k: K, value: RobotFormValues[K]) => {
    setV((old) => ({ ...old, [k]: value }));
    setStatus(null);
  };
  const setPair = (sym: string, patch: Partial<PairParams>) => {
    setV((old) => ({ ...old, pairs: { ...old.pairs, [sym]: { ...old.pairs[sym], ...patch } } }));
    setStatus(null);
  };
  const toggleSymbol = (s: string, on: boolean) =>
    set("symbols", on ? symbols.filter((x) => x === s || v.symbols.includes(x)) : v.symbols.filter((x) => x !== s));

  const pct = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const pctLabel = (o: number) => (o === 0 ? t("off") : `${pct(o)}%`);
  const profileList: RiskProfile[] = ["conservative", "moderate", "aggressive", ...(allowCustom ? (["custom"] as RiskProfile[]) : [])];
  const riskOf = (p: PairParams) => (p.riskProfile === "custom" ? p.riskPct : RISK_PROFILES[p.riskProfile]);
  const ddOptions = useMemo(() => {
    const list = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100].filter((x) => x <= ddCap);
    if (!list.includes(ddCap)) list.push(ddCap);
    if (!list.includes(v.ddPct)) list.push(v.ddPct);
    return list.sort((a, b) => a - b);
  }, [ddCap, v.ddPct]);

  const p = v.pairs[editing] ?? DEFAULT_PAIR;
  const editingOn = v.symbols.includes(editing);

  function save() {
    start(async () => {
      const result = await saveRobotSettingsAction(login, v);
      if (result.ok) {
        setSaved(JSON.stringify(v));
        setStatus({ ok: true, text: t("saved") });
      } else setStatus({ ok: false, text: t(`errors.${result.error}`) });
    });
  }

  function copyToAll() {
    setV((old) => ({ ...old, pairs: Object.fromEntries(symbols.map((s) => [s, { ...old.pairs[editing] }])) }));
    setStatus({ ok: true, text: t("copied", { pair: SYMBOL_LABEL[editing] ?? editing }) });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ===== PARES ===== */}
      <section className={card}>
        <h2 className={h2}>{t("symbols")}</h2>
        <p className="mt-1 text-xs text-brand-ink-dim">{t("symbolsHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {symbols.map((s) => {
            const on = v.symbols.includes(s);
            const sel = s === editing;
            const sp = v.pairs[s] ?? DEFAULT_PAIR;
            return (
              <div
                key={s}
                className={`flex items-stretch overflow-hidden rounded-xl border transition ${
                  sel
                    ? "border-brand-accent shadow-[0_0_14px_rgba(51,214,160,0.25)]"
                    : on
                      ? "border-brand-accent/50"
                      : "border-brand-hairline"
                } ${on ? "bg-brand-accent/10" : "bg-brand-surface-2"}`}
              >
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-pressed={sel}
                  className="flex min-w-0 flex-1 flex-col items-start px-3 py-2.5 text-left"
                >
                  <span className={`text-sm font-bold ${on ? "text-brand-accent" : "text-brand-ink-dim"}`}>{SYMBOL_LABEL[s] ?? s}</span>
                  <span className="truncate text-[11px] text-brand-ink-dim">
                    {on ? t("pairSummary", { risk: pct(riskOf(sp)), goal: sp.goalPct ? `${pct(sp.goalPct)}%` : "-" }) : t("pairOff")}
                  </span>
                </button>
                <div className="flex items-center pr-2.5">
                  <Switch checked={on} onChange={(x) => toggleSymbol(s, x)} label={`${t("tradeThis")} ${SYMBOL_LABEL[s] ?? s}`} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-brand-ink-dim">{t("clickPair")}</p>
      </section>

      {/* ===== AJUSTES DO PAR ===== */}
      <section className={`${card} flex flex-col gap-6 ring-1 ring-brand-accent/30`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-ink">{t("editing", { pair: SYMBOL_LABEL[editing] ?? editing })}</h2>
          <Toggle checked={editingOn} onChange={(x) => toggleSymbol(editing, x)} label={t("tradeThis")} />
        </div>

        <div>
          <h3 className={h2}>{t("risk")}</h3>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("riskHint")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {profileList.map((pr) => {
              const on = p.riskProfile === pr;
              const value = pr === "custom" ? p.riskPct : RISK_PROFILES[pr];
              return (
                <button
                  key={pr}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPair(editing, { riskProfile: pr, riskPct: value })}
                  className={`rounded-xl border p-3 text-left transition ${
                    on ? "border-brand-accent bg-brand-accent/10" : "border-brand-hairline bg-brand-surface-2 hover:border-brand-accent/40"
                  }`}
                >
                  <span className={`block text-sm font-bold ${on ? "text-brand-accent" : "text-brand-ink"}`}>{t(`profiles.${pr}`)}</span>
                  <span className="mt-1 block text-[11px] text-brand-ink-dim">{t("profileDesc", { pct: pct(value) })}</span>
                </button>
              );
            })}
          </div>
          {p.riskProfile === "custom" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-brand-ink-dim">
              {t("customPct")}
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={p.riskPct}
                onChange={(e) => setPair(editing, { riskPct: Number(e.target.value) })}
                className={`${field} !w-24`}
              />
            </label>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("pairGoal")}>
            <select value={p.goalPct} onChange={(e) => setPair(editing, { goalPct: Number(e.target.value) })} className={field}>
              {PCT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("pairLoss")}>
            <select value={p.lossPct} onChange={(e) => setPair(editing, { lossPct: Number(e.target.value) })} className={field}>
              {PCT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <p className="-mt-2 text-xs text-brand-ink-dim sm:col-span-2">{t("pairGoalHint")}</p>
        </div>

        <Field label={t("direction")}>
          <Segmented
            value={p.direction}
            onChange={(x) => setPair(editing, { direction: x })}
            options={[0, 1, 2].map((d) => ({ value: d, label: t(`directions.d${d}`) }))}
          />
        </Field>

        <div className="flex flex-col gap-4 rounded-xl bg-brand-surface-2/60 p-4">
          <Toggle checked={p.recovery} onChange={(x) => setPair(editing, { recovery: x })} label={t("recovery")} hint={t("recoveryHint")} />
          {p.recovery && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("levels")}>
                <select value={p.recoveryLevels} onChange={(e) => setPair(editing, { recoveryLevels: Number(e.target.value) })} className={field}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("recoveryDir")}>
                <Segmented
                  value={p.recoveryOpposite ? 1 : 0}
                  onChange={(x) => setPair(editing, { recoveryOpposite: x === 1 })}
                  options={[
                    { value: 0, label: t("recoveryDirs.same") },
                    { value: 1, label: t("recoveryDirs.opposite") },
                  ]}
                />
              </Field>
            </div>
          )}
        </div>

        <div>
          <h3 className={h2}>{t("strategy")}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label={t("rsiZone")} hint={t("rsiZoneHint")}>
              <select value={p.rsiZone} onChange={(e) => setPair(editing, { rsiZone: Number(e.target.value) })} className={field}>
                {Array.from({ length: 10 }, (_, i) => i).map((i) => (
                  <option key={i} value={i}>{`RSI ${50 - 5 * i}-${50 + 5 * i}`}</option>
                ))}
              </select>
            </Field>
            <Field label={t("rsiPeriod")}>
              <select value={p.rsiPeriod} onChange={(e) => setPair(editing, { rsiPeriod: Number(e.target.value) })} className={field}>
                {RSI_PERIODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("rsiTf")}>
              <select value={p.rsiTf} onChange={(e) => setPair(editing, { rsiTf: Number(e.target.value) })} className={field}>
                {RSI_TIMEFRAMES.map((n) => (
                  <option key={n} value={n}>{`M${n}`}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("logic")}>
              <Segmented
                value={p.breakout ? 1 : 0}
                onChange={(x) => setPair(editing, { breakout: x === 1 })}
                options={[
                  { value: 0, label: t("logics.reversal") },
                  { value: 1, label: t("logics.breakout") },
                ]}
              />
            </Field>
            <Field label={t("entry")}>
              <Segmented
                value={p.pending ? 1 : 0}
                onChange={(x) => setPair(editing, { pending: x === 1 })}
                options={[
                  { value: 1, label: t("entries.pending") },
                  { value: 0, label: t("entries.market") },
                ]}
              />
            </Field>
          </div>
        </div>

        <div>
          <h3 className={h2}>{t("filters")}</h3>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <Toggle checked={p.atr} onChange={(x) => setPair(editing, { atr: x })} label={t("atr")} hint={t("atrHint")} />
            <div className="flex flex-col gap-3">
              <Toggle checked={p.adx} onChange={(x) => setPair(editing, { adx: x })} label={t("adx")} hint={t("adxHint")} />
              {p.adx && (
                <Field label={t("adxLevel")}>
                  <select value={p.adxLevel} onChange={(e) => setPair(editing, { adxLevel: Number(e.target.value) })} className={field}>
                    {ADX_LEVELS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Toggle checked={p.zones} onChange={(x) => setPair(editing, { zones: x })} label={t("zones")} hint={t("zonesHint")} />
              {p.zones && (
                <Field label={t("zonesMode")}>
                  <Segmented
                    value={p.zonesMode}
                    onChange={(x) => setPair(editing, { zonesMode: x })}
                    options={[2, 1, 0].map((m) => ({ value: m, label: t(`zonesModes.m${m}`) }))}
                  />
                </Field>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className={h2}>{t("exits")}</h3>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <Toggle checked={p.breakEven} onChange={(x) => setPair(editing, { breakEven: x })} label={t("breakEven")} hint={t("breakEvenHint")} />
            <Toggle checked={p.trailing} onChange={(x) => setPair(editing, { trailing: x })} label={t("trailing")} hint={t("trailingHint")} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-brand-hairline pt-4">
          <button
            type="button"
            onClick={copyToAll}
            className="rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink hover:border-brand-accent/50"
          >
            {t("copyAll")}
          </button>
          <button
            type="button"
            onClick={() => setPair(editing, { ...DEFAULT_PAIR })}
            className="rounded-full border border-brand-hairline px-4 py-2 text-xs font-semibold text-brand-ink-dim hover:text-brand-ink"
          >
            {t("resetPair")}
          </button>
        </div>
      </section>

      {/* ===== CONTA (TODOS OS PARES) ===== */}
      <section className={`${card} flex flex-col gap-5`}>
        <div>
          <h2 className={h2}>{t("account")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("accountHint")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("maxPositions")}>
            <select value={v.maxPositions} onChange={(e) => set("maxPositions", Number(e.target.value))} className={field}>
              {Array.from({ length: MAX_POSITIONS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("dd")} hint={t("ddHint", { cap: ddCap })}>
            <select value={v.ddPct} onChange={(e) => set("ddPct", Number(e.target.value))} className={field}>
              {ddOptions.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("goal")}>
            <select value={v.dailyGoalPct} onChange={(e) => set("dailyGoalPct", Number(e.target.value))} className={field}>
              {PCT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("loss")}>
            <select value={v.dailyLossPct} onChange={(e) => set("dailyLossPct", Number(e.target.value))} className={field}>
              {PCT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {pctLabel(o)}
                </option>
              ))}
            </select>
          </Field>
          <p className="-mt-2 text-xs text-brand-ink-dim sm:col-span-2">{t("goalHint")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-brand-ink">{t("days")}</span>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = v.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("days", on ? v.days.filter((x) => x !== d) : [...v.days, d].sort())}
                    className={`min-w-11 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      on ? "border-brand-accent bg-brand-accent/15 text-brand-accent" : "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim"
                    }`}
                  >
                    {t(`weekdays.d${d}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-brand-surface-2/60 p-4">
          <Toggle checked={v.newsFilter} onChange={(x) => set("newsFilter", x)} label={t("news")} hint={t("newsHint")} />
          {v.newsFilter && (
            <>
              <Toggle checked={v.newsMedium} onChange={(x) => set("newsMedium", x)} label={t("newsMedium")} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("newsBefore")}>
                  <select value={v.newsBefore} onChange={(e) => set("newsBefore", Number(e.target.value))} className={field}>
                    {NEWS_MINUTES.map((n) => (
                      <option key={n} value={n}>
                        {t("minutes", { n })}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("newsAfter")}>
                  <select value={v.newsAfter} onChange={(e) => set("newsAfter", Number(e.target.value))} className={field}>
                    {NEWS_MINUTES.map((n) => (
                      <option key={n} value={n}>
                        {t("minutes", { n })}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("newsClose")}>
                  <select value={v.newsClose} onChange={(e) => set("newsClose", Number(e.target.value))} className={field}>
                    {[3, 1, 2, 0].map((c) => (
                      <option key={c} value={c}>
                        {t(`newsCloses.c${c}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-brand-hairline bg-brand-bg/85 p-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-glow rounded-full bg-brand-accent px-6 py-2.5 text-sm font-bold text-brand-bg disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {status ? (
          <p role="status" className={`text-sm font-semibold ${status.ok ? "text-brand-accent" : "text-red-300"}`}>
            {status.text}
          </p>
        ) : (
          dirty && <p className="text-sm text-amber-300">{t("unsaved")}</p>
        )}
      </div>
    </div>
  );
}
