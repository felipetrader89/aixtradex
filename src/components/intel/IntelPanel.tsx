import { getTranslations } from "next-intl/server";
import { PRODUCT } from "@/lib/plans";
import { statsFor } from "@/lib/account-stats";
import { getRobotConfig } from "@/lib/robot-settings";
import { communityScans, communityTrades, scansFor, tradesFor, SCAN_PERIODS } from "@/lib/intelligence";
import {
  betterSet,
  learn,
  mergeScans,
  policyCan,
  rankScan,
  scanRowAllowed,
  scanRowPatch,
  stats,
  type RatedRow,
  type ScanResult,
  type StrategyKey,
} from "@/lib/intel-stats";
import { ROBOT_SYMBOLS, enforcePolicy, symbolLabel, tfLabel, type RobotPolicy } from "@/lib/robot-options";
import { getAiKey } from "@/lib/config";
import { analysesToday, clientDailyLimit, latestAnalysis } from "@/lib/ai-analysis";
import { EquityChart } from "@/components/intel/EquityChart";
import { AnalysisText } from "@/components/intel/AnalysisText";
import { AnalysisButton, ApplyButton, ScanForm } from "@/components/intel/IntelActions";

const card = "panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5";
const h2 = "text-xs font-semibold uppercase tracking-wide text-brand-accent";
const th = "py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim";
const td = "py-2 pr-3 align-top";
const tone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");

// Ai X Intelligence de UMA conta: resultados reais, leitura das velas e sugestões (cliente e admin).
// policy = null → admin (vê e aplica tudo).
export async function IntelPanel({ login, locale, policy }: { login: string; locale: string; policy: RobotPolicy | null }) {
  const t = await getTranslations({ locale, namespace: "Portal.intel" });
  const [full, trades, accStats, scans, community, cScans, analysis, aiKey, usedToday, clientLimit] = await Promise.all([
    getRobotConfig(PRODUCT.slug, login),
    tradesFor(PRODUCT.slug, login),
    statsFor(PRODUCT.slug, [login]),
    scansFor(PRODUCT.slug, login, 30),
    communityTrades(PRODUCT.slug),
    communityScans(PRODUCT.slug),
    latestAnalysis(PRODUCT.slug, login),
    getAiKey(),
    analysesToday(PRODUCT.slug, login),
    clientDailyLimit(PRODUCT.slug, login),
  ]);
  const aiLimit = policy ? clientLimit : 20;
  const config = policy && full.admin ? enforcePolicy(full, policy) : full;
  const currency = accStats.get(login)?.currency ?? "USD";
  const nf = (v: number, d = 2) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = (v: number) => `${nf(v)} ${currency}`;
  const pct = (v: number) => `${nf(v * 100, 1)}%`;
  const pf = (v: number) => (v >= 99 ? "∞" : nf(v));
  const dateUtc = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  // ---------- o que o cliente pode escolher (admin: tudo)
  const can = policyCan(policy);
  const pairOf = (sym: string) => config.pairs[sym] ?? config.pairs[config.symbols[0]];
  const rowAllowed = (sym: string) => scanRowAllowed(can, pairOf(sym));

  const applyLabels = (pair: string) => ({
    apply: t("apply"),
    applied: t("applied"),
    blocked: t("applyBlocked"),
    error: t("applyError"),
    confirm: t("applyConfirm", { pair }),
  });

  // ---------- descrição de um valor de ajuste
  const onOff = (v: unknown) => (v ? t("on") : t("off"));
  const valueText = (k: StrategyKey, v: unknown): string => {
    switch (k) {
      case "rsiZone":
        return `RSI ${50 - 5 * Number(v)}-${50 + 5 * Number(v)}`;
      case "rsiTf":
        return tfLabel(Number(v));
      case "breakout":
        return t(v ? "logics.b" : "logics.r");
      case "pending":
        return t(v ? "entries.p" : "entries.m");
      case "zonesMode":
        return t(`zonesModes.m${Number(v)}`);
      case "lossPips":
      case "profitPips":
        return Number(v) === 0 ? t("auto") : `${v} pips`;
      case "atr":
      case "adx":
      case "zones":
      case "breakEven":
      case "trailing":
        return onOff(v);
      default:
        return String(v);
    }
  };

  // ---------- resultados reais da conta
  const tradeVals = trades.map((r) => Number(r.net));
  const overall = stats(tradeVals);
  const curve: { t: number; v: number }[] = [];
  for (const r of trades) curve.push({ t: r.closeAt.getTime(), v: (curve.at(-1)?.v ?? 0) + Number(r.net) });
  const bySymbol = [...new Set([...ROBOT_SYMBOLS, ...trades.map((r) => r.symbol)])].map((s) => ({ s, st: stats(trades.filter((r) => r.symbol === s).map((r) => Number(r.net))) })).filter((x) => x.st.trades);

  // ---------- leituras das velas (a mais recente concluída de cada par)
  const lastDone = new Map<string, { result: ScanResult; finishedAt: Date | null }>();
  for (const s of scans) if (s.status === "done" && s.result && !lastDone.has(s.symbol)) lastDone.set(s.symbol, { result: s.result as ScanResult, finishedAt: s.finishedAt });
  const active = scans.some((s) => s.status === "pending" || s.status === "running");
  const pairsForScan = [...config.symbols, ...ROBOT_SYMBOLS.filter((s) => !config.symbols.includes(s))];
  const scanChoices = [
    ...(config.symbols.length > 1 ? [{ value: "*", label: t("allPairs", { n: config.symbols.length }) }] : []),
    ...pairsForScan.map((s) => ({ value: s, label: symbolLabel(s) })),
  ];

  // ---------- comunidade
  const learning = new Map(learn(community).map((l) => [l.symbol, l]));
  const scanBySymbol = new Map<string, ScanResult[]>();
  for (const c of cScans) scanBySymbol.set(c.symbol, [...(scanBySymbol.get(c.symbol) ?? []), c.result]);

  const ScanTable = ({ rows, current, sym, showApply }: { rows: RatedRow[]; current: RatedRow | null; sym: string; showApply: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <th className={th}>{t("tf")}</th>
            <th className={th}>{t("period")}</th>
            <th className={th}>{t("zone")}</th>
            <th className={th}>{t("logic")}</th>
            <th className={`${th} text-right`}>{t("trades")}</th>
            <th className={`${th} text-right`}>{t("winRate")}</th>
            <th className={`${th} text-right`}>{t("pf")}</th>
            <th className={`${th} text-right`}>{t("resultR")}</th>
            <th className={`${th} text-right`}>{t("ddR")}</th>
            <th className={th}>{t("firm")}</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody className="text-brand-ink">
          {[...(current ? [{ r: current, cur: true }] : []), ...rows.map((r) => ({ r, cur: false }))].map(({ r, cur }) => (
            <tr key={`${cur}-${r.tf}-${r.per}-${r.zone}-${r.logic}`} className={`border-t border-brand-hairline ${cur ? "bg-brand-surface-2/50" : ""}`}>
              <td className={td}>
                {tfLabel(r.tf)}
                {cur && <span className="ml-2 rounded bg-brand-surface-2 px-1.5 py-0.5 text-[10px] text-brand-ink-dim">{t("yours")}</span>}
              </td>
              <td className={td}>{r.per}</td>
              <td className={td}>{`RSI ${50 - 5 * r.zone}-${50 + 5 * r.zone}`}</td>
              <td className={td}>{t(r.logic ? "logics.b" : "logics.r")}</td>
              <td className={`${td} text-right`}>{r.trades}</td>
              <td className={`${td} text-right`}>{pct(r.winRate)}</td>
              <td className={`${td} text-right`}>{pf(r.pf)}</td>
              <td className={`${td} text-right font-semibold ${tone(r.netR)}`}>{`${r.netR > 0 ? "+" : ""}${nf(r.netR, 1)}`}</td>
              <td className={`${td} text-right`}>{nf(r.ddR, 1)}</td>
              <td className={td}>{r.consistent ? "✓" : "-"}</td>
              <td className={`${td} text-right`}>{showApply && !cur && <ApplyButton login={login} symbol={sym} patch={scanRowPatch(r)} labels={applyLabels(symbolLabel(sym))} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* ===== ANÁLISE DA IA ===== */}
      <section className={`${card} flex flex-col gap-4 ring-1 ring-brand-accent/30`}>
        <div>
          <h2 className={h2}>{t("aiTitle")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("aiHint")}</p>
        </div>
        {analysis ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-brand-ink-dim">{t("aiWhen", { date: dateTime.format(analysis.createdAt) })}</p>
            <AnalysisText text={analysis.text} />
          </div>
        ) : (
          <p className="text-sm text-brand-ink-dim">{aiKey ? t("aiNone") : t("aiOff")}</p>
        )}
        {aiKey && aiLimit > 0 && (
          <div className="flex flex-col gap-1">
            <AnalysisButton
              login={login}
              locale={locale}
              hasOne={!!analysis}
              disabled={usedToday >= aiLimit}
              labels={{
                generate: t("aiGenerate"),
                again: t("aiAgain"),
                working: t("aiWorking"),
                errors: Object.fromEntries(["nokey", "nodata", "limit", "auth", "busy", "refused", "api", "denied"].map((k) => [k, t(`aiErrors.${k}`)])),
              }}
            />
            <p className="text-[11px] text-brand-ink-dim">{t("aiLeft", { n: Math.max(0, aiLimit - usedToday), max: aiLimit })}</p>
          </div>
        )}
      </section>

      {/* ===== RESULTADOS REAIS ===== */}
      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className={h2}>{t("results")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("resultsHint")}</p>
        </div>
        {overall.trades === 0 ? (
          <p className="text-sm text-brand-ink-dim">{t("noTrades")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                [t("trades"), String(overall.trades), ""],
                [t("winRate"), pct(overall.winRate), ""],
                [t("pf"), pf(overall.pf), ""],
                [t("net"), money(overall.net), tone(overall.net)],
                [t("maxDD"), money(-overall.maxDD), overall.maxDD ? "text-red-400" : ""],
              ].map(([k, v, c]) => (
                <div key={k} className="rounded-xl bg-brand-surface-2/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim">{k}</p>
                  <p className={`mt-1 text-lg font-bold ${c || "text-brand-ink"}`}>{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-brand-ink">{t("curve")}</p>
              <EquityChart points={curve} currency={currency} locale={locale} label={t("curve")} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr>
                    <th className={th}>{t("pair")}</th>
                    <th className={`${th} text-right`}>{t("trades")}</th>
                    <th className={`${th} text-right`}>{t("winRate")}</th>
                    <th className={`${th} text-right`}>{t("pf")}</th>
                    <th className={`${th} text-right`}>{t("net")}</th>
                    <th className={`${th} text-right`}>{t("avgWin")}</th>
                    <th className={`${th} text-right`}>{t("avgLoss")}</th>
                    <th className={`${th} text-right`}>{t("maxCl")}</th>
                  </tr>
                </thead>
                <tbody className="text-brand-ink">
                  {bySymbol.map(({ s, st }) => (
                    <tr key={s} className="border-t border-brand-hairline">
                      <td className={td}>{symbolLabel(s)}</td>
                      <td className={`${td} text-right`}>{st.trades}</td>
                      <td className={`${td} text-right`}>{pct(st.winRate)}</td>
                      <td className={`${td} text-right`}>{pf(st.pf)}</td>
                      <td className={`${td} text-right font-semibold ${tone(st.net)}`}>{money(st.net)}</td>
                      <td className={`${td} text-right`}>{nf(st.avgWin)}</td>
                      <td className={`${td} text-right`}>{nf(-st.avgLoss)}</td>
                      <td className={`${td} text-right`}>{st.maxConsecLoss}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ===== LEITURA DAS VELAS ===== */}
      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className={h2}>{t("scan")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("scanHint")}</p>
        </div>
        <ScanForm
          login={login}
          symbols={scanChoices}
          defaultSymbol={scanChoices[0].value}
          periods={SCAN_PERIODS}
          active={active}
          labels={{
            pair: t("scanPair"),
            period: t("scanPeriod"),
            start: t("scanStart"),
            sent: t("scanSent"),
            busy: t("scanBusy"),
            limit: t("scanLimit"),
            error: t("scanError"),
            periods: Object.fromEntries(SCAN_PERIODS.map((p) => [p, t(`periods.${p}`)])),
          }}
        />
        {scans.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold text-brand-ink">{t("recent")}</p>
            <ul className="flex flex-col gap-1 text-xs text-brand-ink-dim">
              {scans.slice(0, 8).map((s) => {
                const spec = s.spec as { period?: string };
                return (
                  <li key={s.id} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold text-brand-ink">{symbolLabel(s.symbol)}</span>
                    <span>{spec.period ? t(`periods.${spec.period}`) : ""}</span>
                    <span>· {dateTime.format(s.createdAt)}</span>
                    <span className={s.status === "done" ? "text-brand-accent" : s.status === "error" || s.status === "expired" ? "text-red-300" : "text-amber-300"}>
                      · {t(`status.${s.status}`)}
                      {s.error ? ` (${s.error})` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {[...lastDone.entries()].map(([sym, { result }]) => {
          const m = result.meta;
          const { current, best } = rankScan(result, rowAllowed(sym));
          const pips = (price: number) => nf(price / (m.pip || 1), 0);
          const pipsList = (txt: string) => (txt === "0" ? t("off") : `${txt.split("/").map((x) => pips(Number(x))).join("/")} pips`);
          return (
            <div key={sym} className="flex flex-col gap-2 border-t border-brand-hairline pt-4">
              <p className="text-sm font-semibold text-brand-ink">{symbolLabel(sym)}</p>
              <p className="text-xs text-brand-ink-dim">
                {t("readInfo", { broker: m.broker, from: dateUtc.format(m.from * 1000), to: dateUtc.format(m.to * 1000), m1: m.m1.toLocaleString(locale) })}
              </p>
              <p className="text-xs text-brand-ink-dim">
                {t("exitUsed", { loss: pips(m.loss), profit: m.profit > 0 ? `${pips(m.profit)} pips` : t("off"), be: pipsList(m.be), tr: pipsList(m.tr) })}
              </p>
              {best.length ? (
                <ScanTable rows={best} current={current} sym={sym} showApply />
              ) : (
                <>
                  {current && <ScanTable rows={[]} current={current} sym={sym} showApply={false} />}
                  <p className="text-sm text-brand-ink-dim">{t("noneBetter")}</p>
                </>
              )}
              {!current && <p className="text-xs text-brand-ink-dim">{t("notInScan")}</p>}
            </div>
          );
        })}
        <p className="text-xs text-brand-ink-dim">
          {t("rHint")} {t("firmHint")}
        </p>
      </section>

      {/* ===== COMUNIDADE ===== */}
      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <h2 className={h2}>{t("community")}</h2>
          <p className="mt-1 text-xs text-brand-ink-dim">{t("communityHint")}</p>
        </div>
        {config.symbols.map((sym) => {
          const found = betterSet(learning.get(sym), pairOf(sym), can);
          const better = found?.set;
          const diff = found?.diff ?? [];
          const sc = scanBySymbol.get(sym) ?? [];
          const merged = sc.length >= 2 ? mergeScans(sc) : null;
          const top = merged ? rankScan(merged, rowAllowed(sym), 1).best[0] : undefined;
          return (
            <div key={sym} className="flex flex-col gap-2 border-t border-brand-hairline pt-4 first:border-0 first:pt-0">
              <p className="text-sm font-semibold text-brand-ink">{symbolLabel(sym)}</p>
              {!better && !top && <p className="text-sm text-brand-ink-dim">{t("communityNone")}</p>}
              {better && diff.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl bg-brand-surface-2/50 p-3">
                  <p className="text-sm text-brand-ink">{t("communityBetter")}</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {diff.map((d) => (
                      <li key={d.key}>
                        <span className="text-brand-ink-dim">{t(`keys.${d.key}`)}: </span>
                        <span className="text-brand-ink-dim line-through">{valueText(d.key, d.from)}</span> →{" "}
                        <span className="font-semibold text-brand-accent">{valueText(d.key, d.to)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-brand-ink-dim">
                    {t("perTrade", {
                      v: nf(better.stats.net / better.stats.trades),
                      pf: pf(better.stats.pf),
                      trades: better.stats.trades,
                      accounts: better.accounts,
                    })}
                  </p>
                  <div>
                    <ApplyButton
                      login={login}
                      symbol={sym}
                      patch={Object.fromEntries(diff.map((d) => [d.key, d.to]))}
                      labels={applyLabels(symbolLabel(sym))}
                    />
                  </div>
                </div>
              )}
              {top && merged && (
                <div className="flex flex-col gap-2 rounded-xl bg-brand-surface-2/50 p-3">
                  <p className="text-sm text-brand-ink">{t("communityScan", { n: sc.length })}</p>
                  <ScanTable rows={[top]} current={null} sym={sym} showApply />
                </div>
              )}
            </div>
          );
        })}
        <p className="text-xs text-amber-300/90">{t("disclaimer")}</p>
      </section>
    </div>
  );
}
