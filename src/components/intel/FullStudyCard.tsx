import { getTranslations } from "next-intl/server";
import { fullPatch, fullStats, policyCan, type FullStudy } from "@/lib/intel-stats";
import { tfLabel, type PairParams, type ParamKey } from "@/lib/robot-options";
import { ApplyButton, type ApplyLabels } from "@/components/intel/IntelActions";

const th = "py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim";
const td = "py-2 pr-3 align-top";
const tone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");

// v7.2: resultado da leitura completa de um par (gatilho + saída + filtros + meta/perda do dia): a configuração atual × a sugerida,
// o que muda e o botão Aplicar (tudo de uma vez). Cliente: só aparece o Aplicar se ele pode mudar todos os ajustes.
export async function FullStudyCard({
  login,
  locale,
  sym,
  full,
  pair,
  canAll,
  applyLabels,
}: {
  login: string;
  locale: string;
  sym: string;
  full: FullStudy;
  pair: PairParams;
  canAll: ReturnType<typeof policyCan>;
  applyLabels: ApplyLabels;
}) {
  const t = await getTranslations({ locale, namespace: "Portal.intel" });
  if (!full.best) return null;
  const nf = (v: number, d = 2) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const pf = (v: number) => (v >= 99 ? "∞" : nf(v));
  const cur = full.cur ? fullStats(full.cur.st) : null;
  const best = fullStats(full.best.st);
  const patch = fullPatch(full.best.cfg, pair);
  const changes = Object.entries(patch) as [ParamKey, unknown][];
  const allowed = changes.every(([k, v]) => canAll(k, v, pair[k as keyof PairParams]));

  const value = (k: string, v: unknown): string => {
    if (typeof v === "boolean") return v ? t("on") : t("off");
    switch (k) {
      case "rsiTf":
      case "atrTf":
      case "adxTf":
        return tfLabel(Number(v));
      case "rsiZone":
        return `RSI ${50 - 5 * Number(v)}-${50 + 5 * Number(v)}`;
      case "zoneTfs":
        return (v as number[]).map(tfLabel).join(" ");
      case "zonesMode":
        return t(`zonesModes.m${Number(v)}`);
      case "direction":
        return t(`dirs.d${Number(v)}`);
      case "goalPct":
      case "lossPct":
        return Number(v) ? `${nf(Number(v), 1)}%` : t("off");
      case "atrMin":
      case "atrMax":
        return `${nf(Number(v), 1)}x`;
      case "lossPips":
      case "profitPips":
      case "beTrigger":
      case "beOffset":
      case "trailStart":
      case "trailDistance":
      case "trailStep":
      case "zoneTolerance":
        return Number(v) === 0 ? t("auto") : `${v} pips`;
      default:
        return String(v);
    }
  };
  const metric = (label: string, a: string, b: string, cls = "") => (
    <tr className="border-t border-brand-hairline">
      <td className={`${td} text-brand-ink-dim`}>{label}</td>
      <td className={`${td} text-right`}>{a}</td>
      <td className={`${td} text-right font-semibold ${cls}`}>{b}</td>
    </tr>
  );
  const from = full.meta.split ? Number(full.meta.split) : 0;
  const fixed = (full.meta.fix ?? "").split(",").filter(Boolean);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-accent/40 bg-brand-accent/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-ink">{t("fullTitle")}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${best.validated ? "bg-brand-accent/15 text-brand-accent" : "bg-amber-400/15 text-amber-300"}`}
        >
          {best.validated ? t("fullValidated") : t("fullNotValidated")}
        </span>
      </div>
      <p className="text-xs text-brand-ink-dim">
        {t("fullHint", { risk: nf(Number(full.meta.risk ?? 0), 1) })}
        {from ? ` ${t("fullSplit", { date: new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }).format(from * 1000) })}` : ""}
        {fixed.length ? ` ${t("fullFixed", { groups: fixed.map((g) => t(`fullGroups.${g}`)).join(", ") })}` : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr>
              <th className={th} />
              <th className={`${th} text-right`}>{t("fullCurrent")}</th>
              <th className={`${th} text-right`}>{t("fullSuggested")}</th>
            </tr>
          </thead>
          <tbody className="text-brand-ink">
            {metric(t("trades"), cur ? String(cur.trades) : "-", String(best.trades))}
            {metric(t("winRate"), cur ? `${nf(cur.winRate * 100, 1)}%` : "-", `${nf(best.winRate * 100, 1)}%`)}
            {metric(t("pf"), cur ? pf(cur.pf) : "-", pf(best.pf))}
            {metric(t("resultR"), cur ? nf(cur.netR, 1) : "-", nf(best.netR, 1), tone(best.netR))}
            {metric(t("ddR"), cur ? nf(cur.ddR, 1) : "-", nf(best.ddR, 1))}
            {metric(t("maxCl"), cur ? String(cur.maxcl) : "-", String(best.maxcl))}
            {metric(
              t("fullOos"),
              cur ? `${nf(cur.oosNetR, 1)} · ${t("pf")} ${pf(cur.oosPf)}` : "-",
              `${nf(best.oosNetR, 1)} · ${t("pf")} ${pf(best.oosPf)}`,
              tone(best.oosNetR)
            )}
          </tbody>
        </table>
      </div>
      {changes.length ? (
        <>
          <p className="text-sm font-semibold text-brand-ink">{t("fullChanges", { n: changes.length })}</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {changes.map(([k, v]) => (
              <li key={k}>
                <span className="text-brand-ink-dim">{t(`keys.${k}`)}: </span>
                <span className="text-brand-ink-dim line-through">{value(k, pair[k as keyof PairParams])}</span> →{" "}
                <span className="font-semibold text-brand-accent">{value(k, v)}</span>
              </li>
            ))}
          </ul>
          {allowed ? (
            <div>
              <ApplyButton login={login} symbol={sym} patch={patch as Record<string, unknown>} labels={{ ...applyLabels, apply: t("fullApply") }} />
            </div>
          ) : (
            <p className="text-xs text-amber-300">{t("fullBlocked")}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-brand-ink-dim">{t("fullSame")}</p>
      )}
      <p className="text-[11px] text-brand-ink-dim">{t("fullNote")}</p>
    </div>
  );
}
