import { getTranslations } from "next-intl/server";
import { PRODUCT } from "@/lib/plans";
import { getRobotConfig } from "@/lib/robot-settings";
import { MESA_BITS, currentBias, mesaStats, type BiasAnalysis, type MesaBit } from "@/lib/market-bias";
import { symbolLabel } from "@/lib/robot-options";

const card = "panel-card rounded-2xl border border-brand-hairline bg-brand-surface/90 p-5";
const h2 = "text-xs font-semibold uppercase tracking-wide text-brand-accent";
const th = "py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim";
const td = "py-2 pr-3 align-top";
const BIAS_TONE: Record<string, string> = {
  buy: "border-brand-accent/50 bg-brand-accent/10 text-brand-accent",
  sell: "border-red-400/50 bg-red-500/10 text-red-300",
  both: "border-amber-300/50 bg-amber-300/10 text-amber-200",
  none: "border-brand-hairline bg-brand-surface-2 text-brand-ink-dim",
};

// v7.5 Mesa de Análise de UMA conta: o viés do dia do trader sênior (IA) nos pares ligados e o que funcionou nas operações reais, por confluência.
export async function MesaPanel({ login, locale }: { login: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "Portal.mesa" });
  const config = await getRobotConfig(PRODUCT.slug, login);
  const [bias, st] = await Promise.all([currentBias(config.symbols), mesaStats(PRODUCT.slug, login)]);
  const nf = (v: number, d = 2) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const rate = (a: { n: number; wins: number }) => (a.n ? `${nf((a.wins / a.n) * 100, 0)}%` : "-");
  const tone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");
  const lang = (["pt", "en", "es"].includes(locale) ? locale : "en") as "pt" | "en" | "es";
  const bits = (Object.keys(MESA_BITS) as MesaBit[]).filter((k) => st.bits[k].n > 0).sort((a, b) => st.bits[b].n - st.bits[a].n);

  return (
    <section className="flex flex-col gap-5">
      <div className={card}>
        <p className={h2}>{t("biasTitle")}</p>
        <p className="mt-1 text-sm text-brand-ink-dim">{t("biasIntro")}</p>
        {config.symbols.some((s) => bias.has(s)) ? (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {config.symbols
              .filter((s) => bias.has(s))
              .map((s) => {
                const b = bias.get(s)!;
                const a = b.analysis as BiasAnalysis;
                return (
                  <li key={s} className="rounded-xl border border-brand-hairline bg-brand-surface-2/60 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-base font-extrabold text-brand-ink">{symbolLabel(s)}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${BIAS_TONE[b.bias] ?? BIAS_TONE.none}`}>
                        {t(`bias.${b.bias}`)} · {b.confidence}%
                      </span>
                    </div>
                    <p className="mt-2 text-brand-ink">{a[lang] || a.en}</p>
                    <p className="mt-2 text-xs text-brand-ink-dim">
                      {a.regime && t.has(`regime.${a.regime}`) ? t(`regime.${a.regime}`) : ""}
                      {a.supports?.length ? ` · ${t("supports")}: ${a.supports.join(" / ")}` : ""}
                      {a.resistances?.length ? ` · ${t("resistances")}: ${a.resistances.join(" / ")}` : ""}
                      {a.invalidation ? ` · ${t("invalidation")}: ${a.invalidation}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-brand-ink-dim">{t("readAt", { at: dateTime.format(b.createdAt) })}</p>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-brand-ink-dim">{t("biasNone")}</p>
        )}
        <p className="mt-3 text-[11px] text-brand-ink-dim">{t("biasDisclaimer")}</p>
      </div>

      <div className={card}>
        <p className={h2}>{t("statsTitle")}</p>
        <p className="mt-1 text-sm text-brand-ink-dim">{t("statsIntro")}</p>
        {st.all.n === 0 ? (
          <p className="mt-4 text-sm text-brand-ink-dim">{t("statsNone")}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {(["low", "mid", "high", "top"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-brand-surface-2/60 p-3">
                  <p className="text-[11px] text-brand-ink-dim">{t(`bands.${k}`)}</p>
                  <p className="mt-0.5 font-mono font-bold text-brand-ink">
                    {st.bands[k].n} · {rate(st.bands[k])}
                  </p>
                  <p className={`font-mono text-xs ${tone(st.bands[k].net)}`}>{nf(st.bands[k].net)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr>
                    <th className={th}>{t("col.confluence")}</th>
                    <th className={th}>{t("col.trades")}</th>
                    <th className={th}>{t("col.winRate")}</th>
                    <th className={th}>{t("col.net")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bits.map((k) => (
                    <tr key={k} className="border-t border-brand-hairline/60">
                      <td className={`${td} text-brand-ink`}>{t(`bits.${k}`)}</td>
                      <td className={`${td} font-mono`}>{st.bits[k].n}</td>
                      <td className={`${td} font-mono`}>{rate(st.bits[k])}</td>
                      <td className={`${td} font-mono ${tone(st.bits[k].net)}`}>{nf(st.bits[k].net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-brand-ink-dim">{t("statsNote", { n: st.all.n, rate: rate(st.all) })}</p>
          </>
        )}
      </div>
    </section>
  );
}
