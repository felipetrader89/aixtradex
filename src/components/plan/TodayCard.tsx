import { useLocale, useTranslations } from "next-intl";
import { symbolLabel } from "@/lib/robot-options";
import type { Today } from "@/lib/plan";
import { Card } from "@/components/portal/ui";

// Painel "Hoje" de uma conta com o Assistente ativo: meta geral e de cada par (server component).
export function TodayCard({ login, company, mode, today, href }: { login: string; company: string | null; mode: "auto" | "manual"; today: Today | null; href: string }) {
  const t = useTranslations("Plan.today");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const pct = (v: number) => `${v > 0 ? "+" : ""}${nf.format(v)}%`;

  const bar = (v: number, goal: number, loss: number) => {
    if (v >= 0) return { width: `${Math.min(100, goal > 0 ? (v / goal) * 100 : 0)}%`, cls: "bg-brand-accent" };
    return { width: `${Math.min(100, loss > 0 ? (-v / loss) * 100 : 0)}%`, cls: "bg-red-400" };
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("title")}</p>
          <p className="mt-1 font-mono text-lg font-extrabold text-chrome">{login}</p>
          <p className="text-xs text-brand-ink-dim">{[company, t(`mode.${mode}`)].filter(Boolean).join(" · ")}</p>
        </div>
        <a href={href} className="text-xs font-semibold text-brand-accent hover:underline">
          {t("open")} →
        </a>
      </div>

      {!today ? (
        <p className="mt-4 text-sm text-brand-ink-dim">{t("noData")}</p>
      ) : (
        <>
          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className={`font-display text-3xl font-extrabold ${today.pct > 0 ? "text-brand-accent" : today.pct < 0 ? "text-red-300" : "text-brand-ink"}`}>{pct(today.pct)}</p>
              <p className="pb-1 text-xs text-brand-ink-dim">{today.loss > 0 ? t("goalLoss", { goal: nf.format(today.goal), loss: nf.format(today.loss) }) : t("goalNoLoss", { goal: nf.format(today.goal) })}</p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-hairline">
              <div className={`h-full ${bar(today.pct, today.goal, today.loss).cls}`} style={{ width: bar(today.pct, today.goal, today.loss).width }} />
            </div>
            <p className={`mt-2 text-sm font-semibold ${today.status === "done" ? "text-brand-accent" : today.status === "stopped" ? "text-red-300" : "text-brand-ink"}`}>
              {t(`status.${today.status}`)}
            </p>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {today.pairs.map((p) => {
              const b = bar(p.pct, p.goal, today.loss);
              return (
                <li key={p.symbol} className="rounded-xl bg-brand-surface-2 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-brand-ink">{symbolLabel(p.symbol)}</span>
                    <span className="font-mono text-xs text-brand-ink-dim">
                      <span className={p.pct > 0 ? "text-brand-accent" : p.pct < 0 ? "text-red-300" : ""}>{pct(p.pct)}</span> / {nf.format(p.goal)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-hairline">
                    <div className={`h-full ${b.cls}`} style={{ width: b.width }} />
                  </div>
                  <p className="mt-1 text-[11px] text-brand-ink-dim">{t(`pair.${p.status}`)}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-brand-ink-dim">{t("note")}</p>
        </>
      )}
    </Card>
  );
}
