import { useLocale, useTranslations } from "next-intl";
import { CardTitle, useMoney } from "@/components/portal/ui";
import type { DayResult } from "@/lib/consistency";

// Consistência da conta: dias, semanas e meses positivos + calendário do mês (verde/vermelho) + últimas semanas e meses.
// A meta do produto é fechar o dia, a semana e o mês positivos - este quadro mostra exatamente isso (server component).

const DAY_MS = 86_400_000;
const weekOf = (d: number) => Math.floor((d + 3) / 7); // semana começando na segunda (1970-01-01 foi quinta)
const dateOf = (d: number) => new Date(d * DAY_MS);
const monthOf = (d: number) => {
  const x = dateOf(d);
  return x.getUTCFullYear() * 12 + x.getUTCMonth();
};

// Verde/vermelho com 3 intensidades (pelo tamanho do resultado no mês); texto sempre na cor de texto.
const POS = ["bg-brand-accent/15", "bg-brand-accent/30", "bg-brand-accent/50"];
const NEG = ["bg-red-500/15", "bg-red-500/30", "bg-red-500/50"];
const level = (v: number, max: number) => Math.min(2, Math.max(0, Math.ceil((Math.abs(v) / (max || 1)) * 3) - 1));
const cellTone = (v: number, max: number) => (v > 0 ? POS[level(v, max)] : v < 0 ? NEG[level(v, max)] : "bg-brand-surface-2");
const textTone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");

function group(days: DayResult[], key: (d: number) => number) {
  const m = new Map<number, number>();
  for (const x of days) m.set(key(x.d), (m.get(key(x.d)) ?? 0) + x.net);
  return m;
}

function Rate({ label, pos, total }: { label: string; pos: number; total: number }) {
  const t = useTranslations("Portal.consistency");
  const pct = total ? Math.round((pos / total) * 100) : 0;
  return (
    <div className="panel-tile rounded-xl bg-brand-surface-2 p-2.5 sm:p-3">
      <p className="text-[10px] leading-tight text-brand-ink-dim sm:text-[11px]">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-brand-ink sm:text-lg">{t("ofTotal", { pos, total })}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-surface" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-brand-ink-dim sm:text-[11px]">{t("rate", { pct })}</p>
    </div>
  );
}

function Bars({ title, items }: { title: string; items: { label: string; value: number; current: boolean }[] }) {
  const money = useMoney();
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0.01);
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-2 text-xs">
            <span className={i.current ? "font-semibold text-brand-ink" : "text-brand-ink-dim"}>{i.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-brand-surface-2" aria-hidden="true">
              <span
                className={`block h-full rounded-full ${i.value >= 0 ? "bg-brand-accent" : "bg-red-500"}`}
                style={{ width: `${(Math.abs(i.value) / max) * 100}%` }}
              />
            </span>
            <span className={`text-right font-mono ${textTone(i.value)}`}>{i.value === 0 ? "-" : money(i.value, null, true)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConsistencyPanel({ days, today, currency }: { days: DayResult[]; today: number; currency?: string | null }) {
  const t = useTranslations("Portal.consistency");
  const locale = useLocale();
  const money = useMoney();

  if (!days.length) {
    return (
      <div className="mt-5 border-t border-brand-hairline pt-4">
        <CardTitle>{t("title")}</CardTitle>
        <p className="text-xs text-brand-ink-dim">{t("empty")}</p>
      </div>
    );
  }

  const byDay = new Map(days.map((x) => [x.d, x]));
  const weeks = group(days, weekOf);
  const months = group(days, monthOf);
  const count = (m: Map<number, number> | DayResult[]) => {
    const vals = Array.isArray(m) ? m.map((x) => x.net) : [...m.values()];
    return { pos: vals.filter((v) => v > 0).length, total: vals.filter((v) => v !== 0).length };
  };
  const dayRate = count(days);
  const weekRate = count(weeks);
  const monthRate = count(months);
  const best = days.reduce((a, b) => (b.net > a.net ? b : a));
  const worst = days.reduce((a, b) => (b.net < a.net ? b : a));

  // Calendário do mês atual (corretora), semanas começando na segunda.
  const now = dateOf(today);
  const first = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / DAY_MS;
  const last = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0) / DAY_MS;
  const lead = (dateOf(first).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: last - first + 1 }, (_, i) => first + i)];
  while (cells.length % 7) cells.push(null);
  const monthMax = Math.max(...cells.map((d) => (d != null ? Math.abs(byDay.get(d)?.net ?? 0) : 0)), 0.01);

  const fmtDay = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" });
  const fmtMonthLong = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const fmtWeekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => fmtWeekday.format(dateOf(4 + i))); // 1970-01-05 = segunda
  const compact = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: "exceptZero" });

  const thisWeek = weekOf(today);
  const weekItems = Array.from({ length: 8 }, (_, i) => thisWeek - 7 + i).map((w) => ({
    label: fmtDay.format(dateOf(w * 7 - 3)),
    value: weeks.get(w) ?? 0,
    current: w === thisWeek,
  }));
  const thisMonth = monthOf(today);
  const monthItems = Array.from({ length: 6 }, (_, i) => thisMonth - 5 + i).map((m) => ({
    label: fmtMonth.format(new Date(Date.UTC(Math.floor(m / 12), m % 12, 1))),
    value: months.get(m) ?? 0,
    current: m === thisMonth,
  }));

  return (
    <div className="mt-5 border-t border-brand-hairline pt-4">
      <CardTitle>{t("title")}</CardTitle>
      <p className="-mt-2 mb-3 text-xs text-brand-ink-dim">{t("intro")}</p>

      <div className="stagger grid grid-cols-3 gap-2">
        <Rate label={t("days")} {...dayRate} />
        <Rate label={t("weeks")} {...weekRate} />
        <Rate label={t("months")} {...monthRate} />
      </div>
      <p className="mt-2 text-[11px] text-brand-ink-dim">
        {t("bestWorst", {
          best: money(best.net, currency, true),
          bestDay: fmtDay.format(dateOf(best.d)),
          worst: money(worst.net, currency, true),
          worstDay: fmtDay.format(dateOf(worst.d)),
        })}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">{fmtMonthLong.format(now)}</p>
          <div className="grid max-w-sm grid-cols-7 gap-1 text-center">
            {weekdays.map((w, i) => (
              <span key={i} className="pb-1 text-[10px] font-semibold text-brand-ink-dim">
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <span key={i} aria-hidden="true" />;
              const r = byDay.get(d);
              const v = r?.net ?? 0;
              const tip = r ? t("tooltip", { date: fmtDay.format(dateOf(d)), value: money(v, currency, true), count: r.n }) : t("noTrade", { date: fmtDay.format(dateOf(d)) });
              return (
                <span
                  key={i}
                  title={tip}
                  aria-label={tip}
                  className={`flex aspect-square min-h-9 flex-col items-center justify-center rounded-md ${cellTone(v, monthMax)} ${d === today ? "ring-1 ring-brand-accent" : ""} ${d > today ? "opacity-40" : ""}`}
                >
                  <span className="text-[10px] leading-none text-brand-ink-dim">{dateOf(d).getUTCDate()}</span>
                  {r && <span className="mt-0.5 font-mono text-[10px] font-semibold leading-none text-brand-ink">{compact.format(v)}</span>}
                </span>
              );
            })}
          </div>
          <p className="mt-2 max-w-sm text-[11px] text-brand-ink-dim">{t("legend")}</p>
        </div>
        <div className="flex flex-col gap-5">
          <Bars title={t("lastWeeks")} items={weekItems} />
          <Bars title={t("lastMonths")} items={monthItems} />
        </div>
      </div>
    </div>
  );
}
