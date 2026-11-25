import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PRODUCT } from "@/lib/plans";
import { communityScans, communityTrades, tradeCountsByLogin } from "@/lib/intelligence";
import { learn, mergeScans, rankScan, type ScanResult } from "@/lib/intel-stats";
import { SYMBOL_LABEL, tfLabel } from "@/lib/robot-options";
import { KEY_PT, valuePt } from "@/components/intel/strategy-text";
import { PageHeader, Panel } from "@/components/admin/ui";

const th = "py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-ink-dim";
const td = "py-2 pr-3 align-top";
const nf = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${nf(v * 100, 1)}%`;
const pf = (v: number) => (v >= 99 ? "∞" : nf(v));
const tone = (v: number) => (v > 0 ? "text-brand-accent" : v < 0 ? "text-red-400" : "text-brand-ink-dim");

// Ai X Intelligence (admin): o que funciona melhor em cada par, juntando as operações reais de todas as contas (v7+)
// e as leituras de velas feitas nos terminais dos clientes.
export default async function AdminIntelligence() {
  await requireAdmin();
  const [trades, scans, counts] = await Promise.all([communityTrades(PRODUCT.slug, 365), communityScans(PRODUCT.slug), tradeCountsByLogin(PRODUCT.slug)]);
  const pairs = learn(trades);
  const scansBy = new Map<string, ScanResult[]>();
  for (const s of scans) scansBy.set(s.symbol, [...(scansBy.get(s.symbol) ?? []), s.result]);
  const symbols = [...new Set([...pairs.map((p) => p.symbol), ...scansBy.keys()])];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ai X Intelligence"
        description="Aprende com as operações reais de todas as contas (robô v7) e com as leituras de velas feitas nos terminais dos clientes. Resultado por operação normalizado a cada 0,01 lote, pra comparar contas de tamanhos diferentes."
      />

      {!symbols.length && (
        <Panel>
          <p className="text-sm text-brand-ink-dim">
            Ainda não chegou nada. Assim que as contas estiverem com a v7.0, o robô manda as operações fechadas a cada 5 minutos e as leituras de velas pedidas
            no portal (Contas MT4 → conta → Ai X Intelligence).
          </p>
        </Panel>
      )}

      {symbols.map((sym) => {
        const l = pairs.find((p) => p.symbol === sym);
        const sc = scansBy.get(sym) ?? [];
        const merged = mergeScans(sc);
        const top = merged ? rankScan(merged, () => true, 5).best : [];
        return (
          <Panel key={sym} title={SYMBOL_LABEL[sym] ?? sym}>
            {l && (
              <>
                <p className="text-sm text-brand-ink-dim">
                  {l.accounts} contas · {l.overall.trades} operações · acerto {pct(l.overall.winRate)} · fator de lucro {pf(l.overall.pf)} · média{" "}
                  <span className={tone(l.overall.net)}>{nf(l.overall.trades ? l.overall.net / l.overall.trades : 0)}</span> por operação (0,01 lote)
                </p>

                <h3 className="mt-4 text-sm font-semibold text-brand-ink">Conjuntos de ajustes (melhores primeiro, mínimo 20 operações)</h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Ajustes</th>
                        <th className={`${th} text-right`}>Contas</th>
                        <th className={`${th} text-right`}>Operações</th>
                        <th className={`${th} text-right`}>Acerto</th>
                        <th className={`${th} text-right`}>Fator de lucro</th>
                        <th className={`${th} text-right`}>Média / op.</th>
                        <th className={`${th} text-right`}>Maior queda</th>
                      </tr>
                    </thead>
                    <tbody className="text-brand-ink">
                      {l.sets.slice(0, 8).map((s) => (
                        <tr key={s.key} className="border-t border-brand-hairline">
                          <td className={`${td} text-xs`}>
                            {Object.entries(s.strategy)
                              .map(([k, v]) => `${KEY_PT[k] ?? k}: ${valuePt(k, v)}`)
                              .join(" · ")}
                          </td>
                          <td className={`${td} text-right`}>{s.accounts}</td>
                          <td className={`${td} text-right`}>{s.stats.trades}</td>
                          <td className={`${td} text-right`}>{pct(s.stats.winRate)}</td>
                          <td className={`${td} text-right`}>{pf(s.stats.pf)}</td>
                          <td className={`${td} text-right font-semibold ${tone(s.stats.net)}`}>{nf(s.stats.trades ? s.stats.net / s.stats.trades : 0)}</td>
                          <td className={`${td} text-right`}>{nf(s.stats.maxDD)}</td>
                        </tr>
                      ))}
                      {!l.sets.length && (
                        <tr>
                          <td className={td} colSpan={7}>
                            As operações deste par abriram antes da configuração ser salva no portal (sem ajustes conhecidos).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {Object.keys(l.params).length > 0 && (
                  <>
                    <h3 className="mt-5 text-sm font-semibold text-brand-ink">Cada ajuste: média por operação contra a média do par</h3>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {Object.entries(l.params).map(([k, list]) => (
                        <div key={k} className="rounded-xl bg-brand-surface-2/40 p-3 text-xs">
                          <p className="mb-1 font-semibold text-brand-ink">{KEY_PT[k] ?? k}</p>
                          {list!.map((v) => (
                            <p key={JSON.stringify(v.value)} className="flex justify-between gap-3 text-brand-ink-dim">
                              <span>{valuePt(k, v.value)}</span>
                              <span>
                                <span className={`font-semibold ${tone(v.lift)}`}>
                                  {v.lift > 0 ? "+" : ""}
                                  {nf(v.lift)}
                                </span>{" "}
                                · FL {pf(v.stats.pf)} · {v.stats.trades} op. · {v.accounts} contas
                              </span>
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {merged && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-brand-ink">
                  Leitura das velas: melhores combinações somando {sc.length} {sc.length === 1 ? "conta" : "contas"} (resultado em R)
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Tempo gráfico</th>
                        <th className={th}>Período</th>
                        <th className={th}>Zona</th>
                        <th className={th}>Lógica</th>
                        <th className={`${th} text-right`}>Operações</th>
                        <th className={`${th} text-right`}>Acerto</th>
                        <th className={`${th} text-right`}>Fator de lucro</th>
                        <th className={`${th} text-right`}>Resultado (R)</th>
                        <th className={`${th} text-right`}>Maior queda (R)</th>
                      </tr>
                    </thead>
                    <tbody className="text-brand-ink">
                      {top.map((r) => (
                        <tr key={`${r.tf}-${r.per}-${r.zone}-${r.logic}`} className="border-t border-brand-hairline">
                          <td className={td}>{tfLabel(r.tf)}</td>
                          <td className={td}>{r.per}</td>
                          <td className={td}>{valuePt("rsiZone", r.zone)}</td>
                          <td className={td}>{valuePt("breakout", r.logic === 1)}</td>
                          <td className={`${td} text-right`}>{r.trades}</td>
                          <td className={`${td} text-right`}>{pct(r.winRate)}</td>
                          <td className={`${td} text-right`}>{pf(r.pf)}</td>
                          <td className={`${td} text-right font-semibold ${tone(r.netR)}`}>{nf(r.netR, 1)}</td>
                          <td className={`${td} text-right`}>{nf(r.ddR, 1)}</td>
                        </tr>
                      ))}
                      {!top.length && (
                        <tr>
                          <td className={td} colSpan={9}>
                            Nenhuma combinação passou nos critérios (20+ operações, fator de lucro acima de 1, positiva nas duas metades).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        );
      })}

      {counts.size > 0 && (
        <Panel title="Contas que já mandaram operações">
          <div className="flex flex-wrap gap-2">
            {[...counts.entries()]
              .sort((a, b) => b[1].trades - a[1].trades)
              .map(([login, c]) => (
                <Link key={login} href={`/admin/accounts/${login}`} className="rounded-lg border border-brand-hairline px-3 py-1.5 text-xs text-brand-ink hover:border-brand-accent/50">
                  <span className="font-mono font-semibold">{login}</span> · {c.trades} op. · <span className={tone(c.net)}>{nf(c.net)}</span>
                </Link>
              ))}
          </div>
        </Panel>
      )}

      <p className="text-xs text-amber-300/90">
        Estatística, não promessa: resultado passado não garante resultado futuro. Conjuntos com poucas operações ou poucas contas podem ser sorte.
      </p>
    </div>
  );
}
