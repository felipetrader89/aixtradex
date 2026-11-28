"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DAYS_IN, recoveryDays, recoveryGain, type RatePeriod } from "@/lib/growth";

// Recuperação de perda: quanto precisa ganhar pra voltar ao saldo de antes (perda de 50% pede +100%).
const TABLE = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90];
const RATE_PERIODS: RatePeriod[] = ["day", "week", "month"];

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const inputClass =
  "w-full rounded-xl border border-brand-hairline bg-brand-bg px-3.5 py-2.5 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-ink-dim/60 focus:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-brand-ink";

export function RecoveryCalculator() {
  const t = useTranslations("Tools.recovery");
  const tg = useTranslations("Tools.growth");
  const locale = useLocale();
  const id = useId();

  const [by, setBy] = useState<"pct" | "balance">("pct");
  const [lossPct, setLossPct] = useState("20");
  const [before, setBefore] = useState("1000");
  const [after, setAfter] = useState("800");
  const [rate, setRate] = useState("1");
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>("day");

  const fmt = useMemo(() => {
    const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
    const plain = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    return { money: money.format, pct: pct.format, plain: plain.format };
  }, [locale]);

  const out = useMemo(() => {
    let loss: number;
    let b: number | null = null;
    let a: number | null = null;
    if (by === "pct") loss = num(lossPct) / 100;
    else {
      b = num(before);
      a = num(after);
      if (!(b > 0) || !(a > 0) || a >= b) return null;
      loss = (b - a) / b;
    }
    if (!(loss > 0) || loss >= 1) return null;
    const gain = recoveryGain(loss);
    const r = num(rate) / 100;
    const days = r > 0 && r <= 1 ? recoveryDays(loss, r, ratePeriod) : NaN;
    return { loss, gain, before: b, after: a, need: b != null && a != null ? b - a : null, days };
  }, [by, lossPct, before, after, rate, ratePeriod]);

  const when = (days: number) => {
    if (days < DAYS_IN.month) return tg("goalDays", { days });
    if (days < DAYS_IN.year) return tg("goalMonths", { days, months: fmt.plain(days / DAYS_IN.month) });
    return tg("goalYears", { days, years: fmt.plain(days / DAYS_IN.year) });
  };

  const maxGain = recoveryGain(TABLE[TABLE.length - 1] / 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <form className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className={labelClass}>{t("by")}</legend>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-brand-bg p-1">
                {(["pct", "balance"] as const).map((m) => (
                  <label
                    key={m}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-accent ${
                      by === m ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim hover:text-brand-ink"
                    }`}
                  >
                    <input type="radio" name={`${id}-by`} value={m} checked={by === m} onChange={() => setBy(m)} className="sr-only" />
                    {t(m === "pct" ? "byPct" : "byBalance")}
                  </label>
                ))}
              </div>
            </fieldset>

            {by === "pct" ? (
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-l`} className={labelClass}>
                  {t("lossPct")}
                </label>
                <input id={`${id}-l`} inputMode="decimal" autoComplete="off" className={inputClass} value={lossPct} onChange={(e) => setLossPct(e.target.value)} />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor={`${id}-b`} className={labelClass}>
                    {t("before")}
                  </label>
                  <input id={`${id}-b`} inputMode="decimal" autoComplete="off" className={inputClass} value={before} onChange={(e) => setBefore(e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-a`} className={labelClass}>
                    {t("after")}
                  </label>
                  <input id={`${id}-a`} inputMode="decimal" autoComplete="off" className={inputClass} value={after} onChange={(e) => setAfter(e.target.value)} />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label htmlFor={`${id}-r`} className={labelClass}>
                {t("rate")}
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input id={`${id}-r`} inputMode="decimal" autoComplete="off" className={inputClass} value={rate} onChange={(e) => setRate(e.target.value)} />
                <div className="flex rounded-xl bg-brand-bg p-1">
                  {RATE_PERIODS.map((v) => (
                    <label
                      key={v}
                      className={`cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center text-xs font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-accent sm:px-3 ${
                        ratePeriod === v ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim hover:text-brand-ink"
                      }`}
                    >
                      <input type="radio" name={`${id}-rp`} value={v} checked={ratePeriod === v} onChange={() => setRatePeriod(v)} className="sr-only" />
                      {tg(`per.${v}`)}
                    </label>
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-brand-ink-dim">{t("rateHint")}</p>
            </div>
          </div>
        </form>

        <section aria-live="polite" className="flex flex-col rounded-2xl border border-brand-accent/30 bg-gradient-to-b from-brand-surface-2 to-brand-surface p-5 sm:p-6">
          {!out ? (
            <p className="text-sm text-brand-ink-dim">{t("invalid")}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{t("result")}</p>
              <p className="mt-1 font-display text-5xl font-extrabold text-chrome">+{fmt.pct(out.gain)}</p>
              <p className="mt-4 text-sm leading-relaxed text-brand-ink">
                {out.need != null && out.before != null && out.after != null
                  ? t("explainBalance", { after: fmt.money(out.after), before: fmt.money(out.before), need: fmt.money(out.need), gain: fmt.pct(out.gain), loss: fmt.pct(out.loss) })
                  : t("explainPct", { loss: fmt.pct(out.loss), gain: fmt.pct(out.gain) })}
              </p>
              {Number.isFinite(out.days) && (
                <p className="mt-3 rounded-xl border border-brand-hairline bg-brand-bg/50 p-3 text-sm leading-relaxed text-brand-ink">
                  {t("time", { rate: `${rate}%`, period: tg(`per.${ratePeriod}`), when: when(out.days) })}
                </p>
              )}
              <p className="mt-auto pt-5 text-sm leading-relaxed text-brand-ink-dim">{t("lesson")}</p>
            </>
          )}
        </section>
      </div>

      <div className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6">
        <h2 className="mb-1 font-display text-lg font-bold text-brand-ink">{t("tableTitle")}</h2>
        <p className="mb-4 text-sm text-brand-ink-dim">{t("tableIntro")}</p>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-brand-ink-dim">
            <tr>
              <th scope="col" className="w-24 py-2 text-left font-semibold">
                {t("colLoss")}
              </th>
              <th scope="col" className="py-2 text-left font-semibold">
                {t("colGain")}
              </th>
            </tr>
          </thead>
          <tbody>
            {TABLE.map((l) => {
              const g = recoveryGain(l / 100);
              const near = out && Math.abs(out.loss * 100 - l) < 0.5;
              return (
                <tr key={l} className={`border-t border-brand-hairline/60 ${near ? "bg-brand-accent/10" : ""}`}>
                  <th scope="row" className="py-2 pl-1 text-left font-mono font-medium text-brand-ink">
                    -{l}%
                  </th>
                  <td className="py-2 pr-1">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="h-2 rounded-r bg-brand-accent/70" style={{ width: `${Math.max(2, (Math.log1p(g) / Math.log1p(maxGain)) * 70)}%` }} />
                      <span className="whitespace-nowrap font-mono text-brand-ink">+{fmt.pct(g)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-brand-ink-dim">{t("tableNote")}</p>
      </div>
    </div>
  );
}
