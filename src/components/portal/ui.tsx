import { useLocale, useTranslations } from "next-intl";
import type { AccountStats } from "@/lib/db/schema";
import type { AccountLiveState } from "@/lib/account-stats";

// Peças visuais da área do cliente (server components).

export function PortalHeader({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-chrome sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-brand-ink-dim">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5 backdrop-blur-sm ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">{children}</h2>;
}

export function useMoney() {
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (value: string | number, currency?: string | null, signed = false) => {
    const n = Number(value);
    const text = nf.format(Math.abs(n));
    const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
    return `${sign}${text}${currency ? ` ${currency}` : ""}`;
  };
}

export const resultTone = (value: string | number) =>
  Number(value) > 0 ? "text-brand-accent" : Number(value) < 0 ? "text-red-400" : "text-brand-ink";

const STATE_STYLE: Record<AccountLiveState, { dot: string; badge: string }> = {
  running: { dot: "bg-brand-accent animate-pulse", badge: "bg-brand-accent/15 text-brand-accent" },
  autotradingOff: { dot: "bg-amber-400", badge: "bg-amber-400/15 text-amber-300" },
  inactive: { dot: "bg-red-400", badge: "bg-red-500/15 text-red-300" },
  waiting: { dot: "bg-brand-ink-dim", badge: "bg-brand-surface-2 text-brand-ink-dim" },
};

export function StateBadge({ state }: { state: AccountLiveState }) {
  const t = useTranslations("Portal.stats.state");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[state].badge}`}>
      <span className={`h-2 w-2 rounded-full ${STATE_STYLE[state].dot}`} />
      {t(state)}
    </span>
  );
}

function Metric({ label, value, tone = "text-brand-ink", hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="panel-tile rounded-xl bg-brand-surface-2 p-3">
      <p className="text-[11px] text-brand-ink-dim">{label}</p>
      <p className={`mt-1 font-mono text-base font-bold sm:text-lg ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-brand-ink-dim">{hint}</p>}
    </div>
  );
}

// Cartão completo de uma conta MT4: corretora, status, saldo, resultados e ordens abertas.
export function AccountStatsCard({
  login,
  planLabel,
  state,
  stats,
  lastCheckAt,
}: {
  login: string;
  planLabel: string;
  state: AccountLiveState;
  stats?: AccountStats;
  lastCheckAt?: Date | null;
}) {
  const t = useTranslations("Portal.stats");
  const locale = useLocale();
  const money = useMoney();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const cur = stats?.currency;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-brand-ink-dim">{stats?.company ?? t("brokerUnknown")}</p>
          <p className="font-mono text-xl font-extrabold text-chrome">{login}</p>
          <p className="mt-0.5 text-xs text-brand-ink-dim">
            {[stats?.server, stats?.leverage ? `1:${stats.leverage}` : null, planLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StateBadge state={state} />
          {stats && <p className="text-[11px] text-brand-ink-dim">{t("updated", { time: when.format(stats.reportedAt) })}</p>}
        </div>
      </div>

      <p className="mt-3 text-xs text-brand-ink-dim">
        {state === "inactive"
          ? t("stateHint.inactive", { date: when.format(stats?.reportedAt ?? lastCheckAt ?? new Date()) })
          : t(`stateHint.${state}`)}
      </p>

      {stats && (
        <>
          <div className="stagger mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            <Metric label={t("balance")} value={money(stats.balance, cur)} />
            <Metric label={t("equity")} value={money(stats.equity, cur)} />
            <Metric
              label={t("floating")}
              value={money(stats.floating, cur, true)}
              tone={resultTone(stats.floating)}
              hint={`${t("openOrders", { count: stats.openOrders })}${stats.pendingOrders ? ` · ${t("pendingOrders", { count: stats.pendingOrders })}` : ""}`}
            />
            <Metric label={t("balanceYesterday")} value={money(stats.balanceDayStart, cur)} />
            <Metric label={t("balanceWeek")} value={money(stats.balanceWeekStart, cur)} />
            <Metric label={t("balanceMonth")} value={money(stats.balanceMonthStart, cur)} />
          </div>
          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">{t("results")}</p>
          <div className="stagger grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label={t("today")} value={money(stats.resultToday, cur, true)} tone={resultTone(stats.resultToday)} />
            <Metric label={t("yesterday")} value={money(stats.resultYesterday, cur, true)} tone={resultTone(stats.resultYesterday)} />
            <Metric label={t("week")} value={money(stats.resultWeek, cur, true)} tone={resultTone(stats.resultWeek)} />
            <Metric label={t("month")} value={money(stats.resultMonth, cur, true)} tone={resultTone(stats.resultMonth)} />
          </div>
        </>
      )}
    </Card>
  );
}
