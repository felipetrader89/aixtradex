"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";

const MONTHS_IN_YEAR = 12;
const WEEK_DAYS = 5;
const RATE_OPTIONS = [1, 2, 3, 4, 5];

type Mode = "simple" | "compound";

function businessDaysInMonth(year: number, monthIndex: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const weekday = new Date(year, monthIndex, day).getDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

function monthAbbreviation(locale: string, monthIndex: number) {
  const raw = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(2024, monthIndex, 1)
  );
  const clean = raw.replace(".", "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function CompoundCalculator({ locale }: { locale: string }) {
  const t = useTranslations("Products.calculator");
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [deposit, setDeposit] = useState(100);
  const [ratePercent, setRatePercent] = useState(5);
  const [mode, setMode] = useState<Mode>("compound");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const dailyRate = ratePercent / 100;

  const currency = useMemo(() => {
    const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return { format: (value: number) => `$${numberFormat.format(value)}` };
  }, [locale]);

  const totalDays = useMemo(
    () => selectedMonths.reduce((sum, m) => sum + businessDaysInMonth(currentYear, m), 0),
    [selectedMonths, currentYear]
  );

  function growth(days: number) {
    return mode === "compound"
      ? deposit * Math.pow(1 + dailyRate, days)
      : deposit * (1 + dailyRate * days);
  }

  const projected = growth(totalDays);
  const profit = projected - deposit;
  const monthDays = businessDaysInMonth(currentYear, currentMonth);
  const dayProfit = growth(1) - deposit;
  const weekProfit = growth(WEEK_DAYS) - deposit;
  const monthProfit = growth(monthDays) - deposit;

  function toggleMonth(monthIndex: number) {
    setSelectedMonths((prev) => {
      if (prev.includes(monthIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== monthIndex);
      }
      return [...prev, monthIndex].sort((a, b) => a - b);
    });
  }

  return (
    <div>
      <h2 className="mb-8 text-center font-display text-2xl font-bold uppercase text-chrome">
        {t("title")}
      </h2>

      <GlowCard>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <label className="text-sm sm:w-64">
            <span className="mb-1 block text-brand-ink-dim">{t("depositLabel")}</span>
            <input
              type="number"
              min={100}
              step={50}
              value={deposit}
              onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-brand-hairline bg-brand-surface-2 px-3 py-2 font-mono text-brand-ink outline-none focus-visible:border-brand-accent"
            />
          </label>

          <div className="flex-1 text-sm">
            <span className="mb-1 block text-brand-ink-dim">{t("rateLabel")}</span>
            <div className="flex gap-1">
              {RATE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatePercent(r)}
                  className={
                    ratePercent === r
                      ? "rounded-md bg-brand-accent px-5 py-[10px] text-xs font-semibold text-brand-bg transition-transform hover:scale-[1.02]"
                      : "rounded-md border border-brand-hairline px-5 py-[10px] text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
                  }
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm sm:w-[330px]">
            <span className="mb-1 block text-brand-ink-dim">{t("modeLabel")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("simple")}
                className={
                  mode === "simple"
                    ? "flex-1 rounded-lg bg-brand-accent px-2 py-[10px] text-xs font-semibold text-brand-bg transition-transform hover:scale-[1.02]"
                    : "flex-1 rounded-lg border border-brand-hairline px-2 py-[10px] text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
                }
              >
                {t("simpleLabel")}
              </button>
              <button
                type="button"
                onClick={() => setMode("compound")}
                className={
                  mode === "compound"
                    ? "flex-1 rounded-lg bg-brand-accent px-2 py-[10px] text-xs font-semibold text-brand-bg transition-transform hover:scale-[1.02]"
                    : "flex-1 rounded-lg border border-brand-hairline px-2 py-[10px] text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
                }
              >
                {t("compoundLabel")}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm">
          <span className="mb-1 block text-brand-ink-dim">{t("monthsLabel")}</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: MONTHS_IN_YEAR }, (_, i) => i).map((monthIndex) => {
              const selected = selectedMonths.includes(monthIndex);
              return (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => toggleMonth(monthIndex)}
                  className={
                    selected
                      ? "rounded-md bg-brand-accent px-3 py-1.5 text-xs font-semibold text-brand-bg transition-transform hover:scale-[1.05]"
                      : "rounded-md border border-brand-hairline px-3 py-1.5 text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent"
                  }
                >
                  {monthAbbreviation(locale, monthIndex)}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mb-3 text-xs text-brand-ink-dim">
          {t("rateNote", { count: totalDays, rate: ratePercent })}
        </p>

        <div className="mb-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-brand-surface-2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-ink-dim">{t("profitDayLabel")}</p>
            <p className="font-display text-xl font-extrabold text-brand-accent sm:text-2xl">
              {currency.format(dayProfit)}
            </p>
          </div>
          <div className="rounded-lg bg-brand-surface-2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-ink-dim">{t("profitWeekLabel")}</p>
            <p className="font-display text-xl font-extrabold text-brand-accent sm:text-2xl">
              {currency.format(weekProfit)}
            </p>
          </div>
          <div className="rounded-lg bg-brand-surface-2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-ink-dim">{t("profitMonthLabel")}</p>
            <p className="font-display text-xl font-extrabold text-brand-accent sm:text-2xl">
              {currency.format(monthProfit)}
            </p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-brand-surface-2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-ink-dim">{t("resultLabel")}</p>
            <p className="font-display text-xl font-extrabold text-chrome sm:text-2xl">
              {currency.format(projected)}
            </p>
          </div>
          <div className="rounded-lg bg-brand-surface-2 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-ink-dim">{t("profitLabel")}</p>
            <p className="font-display text-xl font-extrabold text-brand-accent sm:text-2xl">
              {currency.format(profit)}
            </p>
          </div>
        </div>

        <p className="mb-3 text-center text-xs text-brand-ink-dim">
          {t("resultNote", { deposit: currency.format(deposit) })}
        </p>

        <p className="text-xs text-brand-ink-dim">{t("disclaimer")}</p>
      </GlowCard>
    </div>
  );
}
