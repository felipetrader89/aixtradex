"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GrowthChart } from "@/components/tools/GrowthChart";
import {
  DAYS_IN,
  MAX_DAYS,
  daysToGoal,
  firstProfit,
  schedule,
  simulate,
  type GrowthMode,
  type HorizonUnit,
  type RatePeriod,
} from "@/lib/growth";

// Calculadora de juros simples ou compostos (só no navegador). Mesma tela nas duas, cada uma comparando com a outra.
const RATE_CHIPS = [0.5, 1, 2, 3, 5, 10];
const RATE_PERIODS: RatePeriod[] = ["day", "week", "month"];
const HORIZON_UNITS: HorizonUnit[] = ["day", "week", "month", "year"];
const HUGE = 1e15;

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const inputClass =
  "w-full rounded-xl border border-brand-hairline bg-brand-bg px-3.5 py-2.5 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-ink-dim/60 focus:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-brand-ink";
const hintClass = "mt-1.5 text-xs text-brand-ink-dim";

export function GrowthCalculator({ mode }: { mode: GrowthMode }) {
  const t = useTranslations("Tools.growth");
  const locale = useLocale();
  const id = useId();

  const [principal, setPrincipal] = useState("1000");
  const [rate, setRate] = useState("1");
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>("day");
  const [horizon, setHorizon] = useState("3");
  const [unit, setUnit] = useState<HorizonUnit>("month");
  const [monthly, setMonthly] = useState("");
  const [goal, setGoal] = useState("");
  const [showTable, setShowTable] = useState(false);

  const fmt = useMemo(() => {
    const money2 = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
    const axis = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
    const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
    const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    return {
      money: (v: number) => (Math.abs(v) >= HUGE ? t("huge") : Math.abs(v) >= 1e7 ? compact.format(v) : money2.format(v)),
      axis: (v: number) => (v >= HUGE ? "∞" : axis.format(v)),
      pct: (v: number) => (Math.abs(v) >= 1e9 ? t("hugePct") : pct.format(v)),
      plain: (v: number) => plain.format(v),
    };
  }, [locale, t]);

  const parsed = useMemo(() => {
    const p = num(principal);
    const r = num(rate);
    const h = num(horizon);
    const m = monthly.trim() ? num(monthly) : 0;
    const g = goal.trim() ? num(goal) : 0;
    if (!(p > 0) || !(r >= 0) || r > 100 || !(h > 0) || !(m >= 0) || !(g >= 0)) return null;
    const days = Math.round(h * DAYS_IN[unit]);
    if (days < 1) return null;
    return { principal: p, rate: r / 100, ratePeriod, days: Math.min(days, MAX_DAYS), capped: days > MAX_DAYS, monthly: m, goal: g };
  }, [principal, rate, ratePeriod, horizon, unit, monthly, goal]);

  const out = useMemo(() => {
    if (!parsed) return null;
    const res = simulate(parsed);
    const other: GrowthMode = mode === "compound" ? "simple" : "compound";
    const final = res.final[mode];
    const deposited = res.final.deposited;
    const profit = final - deposited;
    return {
      res,
      final,
      deposited,
      profit,
      profitPct: profit / deposited,
      otherFinal: res.final[other],
      firsts: (["day", "week", "month"] as const).map((u) => [u, firstProfit(parsed.principal, parsed.rate, parsed.ratePeriod, mode, DAYS_IN[u])] as const),
      goalDays: parsed.goal > 0 ? daysToGoal(parsed, mode, parsed.goal) : undefined,
      rows: schedule(res, mode),
    };
  }, [parsed, mode]);

  const formatDay = (d: number) => {
    if (!parsed) return String(d);
    const n = parsed.days;
    if (n <= 31) return t("axisDay", { n: d });
    if (n <= 252) return t("axisMonth", { n: fmt.plain(d / DAYS_IN.month) });
    return t("axisYear", { n: fmt.plain(d / DAYS_IN.year) });
  };

  const goalText = (days: number) => {
    if (days < DAYS_IN.month) return t("goalDays", { days });
    if (days < DAYS_IN.year) return t("goalMonths", { days, months: fmt.plain(days / DAYS_IN.month) });
    return t("goalYears", { days, years: fmt.plain(days / DAYS_IN.year) });
  };

  const highRate = parsed && ((ratePeriod === "day" && parsed.rate > 0.03) || (ratePeriod === "week" && parsed.rate > 0.15) || (ratePeriod === "month" && parsed.rate > 0.5));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <form className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-p`} className={labelClass}>
                {t("principal")}
              </label>
              <input id={`${id}-p`} inputMode="decimal" autoComplete="off" className={inputClass} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={`${id}-r`} className={labelClass}>
                {t("rate")}
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input id={`${id}-r`} inputMode="decimal" autoComplete="off" className={inputClass} value={rate} onChange={(e) => setRate(e.target.value)} />
                <Segmented
                  name={`${id}-rp`}
                  value={ratePeriod}
                  options={RATE_PERIODS.map((v) => [v, t(`per.${v}`)])}
                  onChange={(v) => setRatePeriod(v as RatePeriod)}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RATE_CHIPS.map((c) => {
                  const on = num(rate) === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setRate(String(c))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        on ? "bg-brand-accent text-brand-bg" : "border border-brand-hairline text-brand-ink-dim hover:border-brand-accent hover:text-brand-accent"
                      }`}
                    >
                      {fmt.plain(c)}%
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor={`${id}-h`} className={labelClass}>
                {t("horizon")}
              </label>
              <div className="grid grid-cols-[1fr_1.3fr] gap-2">
                <input id={`${id}-h`} inputMode="decimal" autoComplete="off" className={inputClass} value={horizon} onChange={(e) => setHorizon(e.target.value)} />
                <select aria-label={t("horizonUnit")} className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value as HorizonUnit)}>
                  {HORIZON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`units.${u}`)}
                    </option>
                  ))}
                </select>
              </div>
              <p className={hintClass}>{parsed?.capped ? t("capped") : t("daysNote")}</p>
            </div>

            <div>
              <label htmlFor={`${id}-m`} className={labelClass}>
                {t("monthly")}
              </label>
              <input id={`${id}-m`} inputMode="decimal" autoComplete="off" placeholder="0" className={inputClass} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              <p className={hintClass}>{t("monthlyHint")}</p>
            </div>
            <div>
              <label htmlFor={`${id}-g`} className={labelClass}>
                {t("goal")}
              </label>
              <input id={`${id}-g`} inputMode="decimal" autoComplete="off" placeholder={t("goalPlaceholder")} className={inputClass} value={goal} onChange={(e) => setGoal(e.target.value)} />
              <p className={hintClass}>{t("goalHint")}</p>
            </div>
          </div>
        </form>

        <section aria-live="polite" className="flex flex-col rounded-2xl border border-brand-accent/30 bg-gradient-to-b from-brand-surface-2 to-brand-surface p-5 sm:p-6">
          {!out || !parsed ? (
            <p className="text-sm text-brand-ink-dim">{t("invalid")}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{t("final")}</p>
              <p className="mt-1 break-words font-display text-4xl font-extrabold text-chrome sm:text-5xl">{fmt.money(out.final)}</p>
              <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                {[
                  [t("profit"), fmt.money(out.profit)],
                  [t("profitPct"), fmt.pct(out.profitPct)],
                  [t("deposited"), fmt.money(out.deposited)],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col-reverse rounded-xl bg-brand-bg/50 px-3 py-2.5">
                    <dt className="text-[11px] text-brand-ink-dim">{k}</dt>
                    <dd className="break-words font-mono font-semibold text-brand-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">{t("firstsTitle")}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {out.firsts.map(([u, v]) => (
                  <div key={u} className="flex flex-col-reverse rounded-xl bg-brand-bg/50 px-3 py-2.5">
                    <dt className="text-[11px] text-brand-ink-dim">{t(`firsts.${u}`)}</dt>
                    <dd className="break-words font-mono text-xs font-semibold text-brand-accent sm:text-sm">{fmt.money(v)}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 text-sm leading-relaxed text-brand-ink">
                {t(mode === "compound" ? "compareCompound" : "compareSimple", {
                  other: fmt.money(out.otherFinal),
                  diff: fmt.money(Math.abs(out.final - out.otherFinal)),
                })}
              </p>

              {out.goalDays !== undefined && (
                <p className="mt-3 rounded-xl border border-brand-hairline bg-brand-bg/50 p-3 text-sm leading-relaxed text-brand-ink">
                  {out.goalDays === null
                    ? t("goalNever", { goal: fmt.money(parsed.goal) })
                    : out.goalDays === 0
                      ? t("goalAlready")
                      : t("goalReach", { goal: fmt.money(parsed.goal), when: goalText(out.goalDays) })}
                </p>
              )}

              {highRate && (
                <p role="note" className="mt-3 rounded-xl border border-brand-chrome-end/25 bg-brand-bg/50 p-3 text-xs leading-relaxed text-brand-ink-dim">
                  {t("highRate")}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {out && parsed && (
        <div className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-brand-ink">{t("chartTitle")}</h2>
          <GrowthChart
            points={out.res.points}
            mode={mode}
            labels={{ simple: t("simple"), compound: t("compound"), deposited: t("depositedLine"), day: t.raw("tipDay") as string }}
            formatMoney={fmt.money}
            formatAxisMoney={fmt.axis}
            formatDay={formatDay}
          />

          <button
            type="button"
            aria-expanded={showTable}
            onClick={() => setShowTable((s) => !s)}
            className="mt-5 text-sm font-semibold text-brand-accent hover:underline"
          >
            {showTable ? t("hideTable") : t("showTable")}
          </button>
          {showTable && (
            <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-brand-hairline">
              <table className="w-full min-w-[560px] whitespace-nowrap text-right text-sm">
                <thead className="sticky top-0 bg-brand-surface-2 text-[11px] uppercase tracking-wide text-brand-ink-dim">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">
                      {t("colPeriod")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t("colDeposits")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t("colProfit")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t("colBalance")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t("colTotalPct")}
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {out.rows.map((r) => (
                    <tr key={r.index} className="border-t border-brand-hairline/60">
                      <th scope="row" className="px-3 py-1.5 text-left font-sans font-medium text-brand-ink">
                        {t(`row.${r.unit}`, { n: r.index })}
                      </th>
                      <td className="px-3 py-1.5 text-brand-ink-dim">{r.deposits > 0 ? fmt.money(r.deposits) : "-"}</td>
                      <td className="px-3 py-1.5 text-brand-accent">{fmt.money(r.profit)}</td>
                      <td className="px-3 py-1.5 text-brand-ink">{fmt.money(r.balance)}</td>
                      <td className="px-3 py-1.5 text-brand-ink-dim">{fmt.pct(r.totalPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-brand-hairline p-5 text-sm leading-relaxed text-brand-ink-dim sm:p-6">
        <h2 className="mb-2 font-display text-base font-bold text-brand-ink">{t(mode === "compound" ? "howCompoundTitle" : "howSimpleTitle")}</h2>
        <p>{t(mode === "compound" ? "howCompound" : "howSimple")}</p>
        <p className="mt-3 text-xs">{t("disclaimer")}</p>
      </div>
    </div>
  );
}

function Segmented({ name, value, options, onChange }: { name: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-xl bg-brand-bg p-1">
      {options.map(([v, label]) => (
        <label
          key={v}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-accent sm:px-3 ${
            value === v ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim hover:text-brand-ink"
          }`}
        >
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}
