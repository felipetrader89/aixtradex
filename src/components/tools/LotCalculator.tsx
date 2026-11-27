"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuotes } from "@/components/tools/useQuotes";

// Calculadora de lote (só no navegador). Conta em USD, contrato padrão: forex 100.000 unidades, ouro 100 onças.
// Valor do pip por 1 lote em USD: cotada em USD = contrato × pip; USD/XXX e cruzados = convertido pela cotação informada.
type Conv = { pair: string; op: "div" | "mul" } | null;
type Instrument = { s: string; label: string; pip: number; contract: number; conv: Conv; defaultStop: number };

const INSTRUMENTS: Instrument[] = [
  { s: "XAUUSD", label: "XAU/USD", pip: 0.01, contract: 100, conv: null, defaultStop: 500 },
  { s: "EURUSD", label: "EUR/USD", pip: 0.0001, contract: 100000, conv: null, defaultStop: 20 },
  { s: "GBPUSD", label: "GBP/USD", pip: 0.0001, contract: 100000, conv: null, defaultStop: 20 },
  { s: "AUDUSD", label: "AUD/USD", pip: 0.0001, contract: 100000, conv: null, defaultStop: 20 },
  { s: "NZDUSD", label: "NZD/USD", pip: 0.0001, contract: 100000, conv: null, defaultStop: 20 },
  { s: "USDJPY", label: "USD/JPY", pip: 0.01, contract: 100000, conv: { pair: "USD/JPY", op: "div" }, defaultStop: 20 },
  { s: "USDCAD", label: "USD/CAD", pip: 0.0001, contract: 100000, conv: { pair: "USD/CAD", op: "div" }, defaultStop: 20 },
  { s: "USDCHF", label: "USD/CHF", pip: 0.0001, contract: 100000, conv: { pair: "USD/CHF", op: "div" }, defaultStop: 20 },
  { s: "EURJPY", label: "EUR/JPY", pip: 0.01, contract: 100000, conv: { pair: "USD/JPY", op: "div" }, defaultStop: 25 },
  { s: "GBPJPY", label: "GBP/JPY", pip: 0.01, contract: 100000, conv: { pair: "USD/JPY", op: "div" }, defaultStop: 30 },
  { s: "EURGBP", label: "EUR/GBP", pip: 0.0001, contract: 100000, conv: { pair: "GBP/USD", op: "mul" }, defaultStop: 15 },
];

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const inputClass =
  "w-full rounded-xl border border-brand-hairline bg-brand-bg px-3.5 py-2.5 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-ink-dim/60 focus:border-brand-accent focus-visible:outline-2 focus-visible:outline-brand-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-brand-ink";

export function LotCalculator() {
  const t = useTranslations("Tools.calculator");
  const locale = useLocale();
  const id = useId();
  const { quotes } = useQuotes();

  const [balance, setBalance] = useState("1000");
  const [riskPct, setRiskPct] = useState("1");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [mode, setMode] = useState<"pips" | "price">("pips");
  const [stopPips, setStopPips] = useState("500");
  const [entry, setEntry] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  // null = o visitante ainda não digitou: usa a cotação de referência do site
  const [convInput, setConvInput] = useState<string | null>(null);

  const inst = INSTRUMENTS.find((i) => i.s === symbol) ?? INSTRUMENTS[0];
  const refConv = inst.conv ? quotes.find((x) => x.pair === inst.conv!.pair) : undefined;
  const conv = convInput ?? (refConv ? String(refConv.price) : "");

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale]
  );
  const plain = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const lotFmt = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const pctFmt = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }), [locale]);

  const result = useMemo(() => {
    const b = num(balance);
    const r = num(riskPct);
    const pips = mode === "pips" ? num(stopPips) : Math.abs(num(entry) - num(stopPrice)) / inst.pip;
    if (!(b > 0) || !(r > 0) || !(pips > 0)) return null;
    let pipPerLot = inst.contract * inst.pip; // na moeda de cotação
    if (inst.conv) {
      const c = num(conv);
      if (!(c > 0)) return null;
      pipPerLot = inst.conv.op === "div" ? pipPerLot / c : pipPerLot * c;
    }
    const riskAmount = (b * r) / 100;
    const raw = riskAmount / (pips * pipPerLot);
    const lot = Math.floor(raw * 100 + 1e-9) / 100;
    const minRisk = 0.01 * pips * pipPerLot;
    return {
      pips,
      riskAmount,
      pip001: pipPerLot * 0.01,
      lot,
      actual: lot * pips * pipPerLot,
      minRisk,
      minPct: minRisk / b,
      riskPctFrac: r / 100,
      balance: b,
    };
  }, [balance, riskPct, mode, stopPips, entry, stopPrice, inst, conv]);

  function onSymbol(next: string) {
    const i = INSTRUMENTS.find((x) => x.s === next) ?? INSTRUMENTS[0];
    setSymbol(next);
    setStopPips(String(i.defaultStop));
    setConvInput(null);
    setEntry("");
    setStopPrice("");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
      <form className="glow-border rounded-2xl bg-brand-surface p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-balance`} className={labelClass}>
              {t("balance")}
            </label>
            <input id={`${id}-balance`} inputMode="decimal" autoComplete="off" className={inputClass} value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-risk`} className={labelClass}>
              {t("riskPct")}
            </label>
            <input id={`${id}-risk`} inputMode="decimal" autoComplete="off" className={inputClass} value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-pair`} className={labelClass}>
              {t("pair")}
            </label>
            <select id={`${id}-pair`} className={inputClass} value={symbol} onChange={(e) => onSymbol(e.target.value)}>
              {INSTRUMENTS.map((i) => (
                <option key={i.s} value={i.s}>
                  {i.label}
                </option>
              ))}
            </select>
            {inst.s === "XAUUSD" && <p className="mt-1.5 text-xs text-brand-ink-dim">{t("goldPip")}</p>}
          </div>

          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>{t("stopMode")}</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-brand-bg p-1">
              {(["pips", "price"] as const).map((m) => (
                <label
                  key={m}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-accent ${
                    mode === m ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim hover:text-brand-ink"
                  }`}
                >
                  <input type="radio" name={`${id}-mode`} value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                  {m === "pips" ? t("byPips") : t("byPrice")}
                </label>
              ))}
            </div>
          </fieldset>

          {mode === "pips" ? (
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-pips`} className={labelClass}>
                {t("stopPips")}
              </label>
              <input id={`${id}-pips`} inputMode="decimal" autoComplete="off" className={inputClass} value={stopPips} onChange={(e) => setStopPips(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor={`${id}-entry`} className={labelClass}>
                  {t("entry")}
                </label>
                <input id={`${id}-entry`} inputMode="decimal" autoComplete="off" className={inputClass} value={entry} onChange={(e) => setEntry(e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-stop`} className={labelClass}>
                  {t("stopPrice")}
                </label>
                <input id={`${id}-stop`} inputMode="decimal" autoComplete="off" className={inputClass} value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} />
              </div>
            </>
          )}

          {inst.conv && (
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-conv`} className={labelClass}>
                {t("convPrice", { pair: inst.conv.pair })}
              </label>
              <input id={`${id}-conv`} inputMode="decimal" autoComplete="off" className={inputClass} value={conv} onChange={(e) => setConvInput(e.target.value)} />
              <p className="mt-1.5 text-xs text-brand-ink-dim">{t("convHint")}</p>
            </div>
          )}
        </div>
      </form>

      <section
        aria-live="polite"
        className="flex flex-col rounded-2xl border border-brand-accent/30 bg-gradient-to-b from-brand-surface-2 to-brand-surface p-5 sm:p-6"
      >
        {!result ? (
          <p className="text-sm text-brand-ink-dim">{t("invalid")}</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">{t("resultLot")}</p>
            <p className="mt-1 font-display text-5xl font-extrabold text-chrome">{lotFmt.format(Math.max(result.lot, 0))}</p>
            <dl className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                [t("resultRisk"), money.format(result.riskAmount)],
                [t("resultPip"), money.format(result.pip001)],
                [t("resultActual"), money.format(result.actual)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse rounded-xl bg-brand-bg/50 px-3 py-2.5">
                  <dt className="text-[11px] text-brand-ink-dim">{k}</dt>
                  <dd className="font-mono font-semibold text-brand-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {result.lot >= 0.01 ? (
              <p className="mt-5 text-sm leading-relaxed text-brand-ink">
                {t("explain", {
                  balance: money.format(result.balance),
                  pct: pctFmt.format(result.riskPctFrac),
                  risk: money.format(result.riskAmount),
                  pips: plain.format(result.pips),
                  pair: inst.label,
                  pip: money.format(result.pip001),
                  lot: lotFmt.format(result.lot),
                })}
              </p>
            ) : (
              <p role="alert" className="mt-5 rounded-xl border border-brand-chrome-end/25 bg-brand-bg/50 p-3 text-sm leading-relaxed text-brand-ink">
                {t("belowMin", { risk: money.format(result.minRisk), pct: pctFmt.format(result.minPct) })}
              </p>
            )}
          </>
        )}
        <p className="mt-auto pt-5 text-xs leading-relaxed text-brand-ink-dim">{t("assumptions")}</p>
      </section>
    </div>
  );
}
