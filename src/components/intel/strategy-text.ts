// Texto curto (português, pro admin) de cada ajuste do par.
import { RISK_PROFILES, tfLabel, type PairParams } from "@/lib/robot-options";

const onOff = (v: unknown) => (v ? "ligado" : "desligado");
const pips = (v: unknown) => (Number(v) === 0 ? "auto" : `${v} pips`);

export const KEY_PT: Record<string, string> = {
  rsiZone: "Zona do RSI",
  rsiPeriod: "Período do RSI",
  rsiTf: "Tempo gráfico do RSI",
  breakout: "Lógica",
  pending: "Entrada",
  atr: "ATR",
  adx: "ADX",
  adxLevel: "Nível do ADX",
  zones: "Zonas",
  zonesMode: "Modo das zonas",
  breakEven: "Break-even",
  trailing: "Stop móvel",
  lossPips: "Limite de perda",
  profitPips: "Alvo de lucro",
};

export function valuePt(k: string, v: unknown): string {
  switch (k) {
    case "rsiZone":
      return `RSI ${50 - 5 * Number(v)}-${50 + 5 * Number(v)}`;
    case "rsiTf":
    case "adxTf":
    case "atrTf":
      return tfLabel(Number(v));
    case "breakout":
      return v ? "rompimento" : "reversão";
    case "pending":
      return v ? "pendente" : "a mercado";
    case "zonesMode":
      return ["só com o ADX", "não opera contra a zona", "só nas zonas"][Number(v)] ?? String(v);
    case "lossPips":
    case "profitPips":
      return pips(v);
    case "atr":
    case "adx":
    case "zones":
    case "breakEven":
    case "trailing":
      return onOff(v);
    default:
      return String(v);
  }
}

// Linhas do resumo de um par (admin → conta).
export function pairSummary(p: PairParams): [string, string][] {
  const names = { conservative: "conservador", moderate: "moderado", aggressive: "agressivo" } as const;
  const risk = p.riskProfile === "custom" ? `${p.riskPct}% (personalizado)` : `${RISK_PROFILES[p.riskProfile]}% (${names[p.riskProfile]})`;
  return [
    ["Risco", risk],
    ["Meta / perda do par", `${p.goalPct || "-"}% / ${p.lossPct || "-"}%`],
    ["Direção", ["compra e venda", "só compra", "só venda"][p.direction]],
    ["Recuperação", p.recovery ? `até ${p.recoveryLevels} níveis${p.recoveryOpposite ? ", inverte" : ""}` : "desligada"],
    ["RSI", `${valuePt("rsiZone", p.rsiZone)} · período ${p.rsiPeriod} · ${tfLabel(p.rsiTf)} · ${valuePt("breakout", p.breakout)} · ${valuePt("pending", p.pending)}`],
    ["Mesa de Análise", p.mesa ? `${["desligada", "equilibrado", "rigoroso", "muito rigoroso"][p.mesa] ?? p.mesa} · risco/retorno mínimo ${p.minRR ? `${p.minRR}x` : "-"}` : "desligada (só RSI e filtros)"],
    ["ATR", p.atr ? `${tfLabel(p.atrTf)} · período ${p.atrPeriod} · média ${p.atrBars} · ${p.atrMin}x a ${p.atrMax}x` : "desligado"],
    ["ADX", p.adx ? `${tfLabel(p.adxTf)} · período ${p.adxPeriod} · nível ${p.adxLevel}${p.adxRising ? " · subindo" : ""}` : "desligado"],
    [
      "Zonas",
      p.zones
        ? `${valuePt("zonesMode", p.zonesMode)} · ${p.zoneTfs.map(tfLabel).join(" ")} · ${p.zoneCandles} velas · tolerância ${pips(p.zoneTolerance)} · linhas ${p.zoneLines.map(tfLabel).join(" ") || "nenhuma"}`
        : "desligadas",
    ],
    [
      "Saída",
      [
        p.profitClose ? `alvo ${pips(p.profitPips)}` : "sem alvo",
        p.lossClose ? `perda ${pips(p.lossPips)}` : `perda ${pips(p.lossPips)} (só stop de emergência)`,
        p.breakEven ? `BE ${pips(p.beTrigger)}/${pips(p.beOffset)}` : "sem BE",
        p.trailing ? `stop móvel ${pips(p.trailStart)}/${pips(p.trailDistance)}/${pips(p.trailStep)}` : "sem stop móvel",
      ].join(" · "),
    ],
  ];
}
