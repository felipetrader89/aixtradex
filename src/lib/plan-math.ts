// Assistente (Comece em 5 passos): chance de bater a meta do dia a partir do resultado dia a dia da leitura completa (robô v7.4+).
// Sem banco - roda no servidor e no navegador (o cliente mexe nas metas e vê a chance mudar na hora).
//
// Como conta:
//  - cada par anda pelas operações do dia (R × risco do par = % do saldo) e para quando bate a meta DELE (igual ao robô: "par pausado até amanhã");
//  - o dia da conta = soma dos pares; se chegar no limite de perda da conta, o robô para tudo (conta como dia de perda);
//  - "bateu a meta" = a soma chegou na meta geral.
// É simulação em velas (uma entrada por vez em cada lado, sem a recuperação): mostra o que teria acontecido, não promete nada.
import { fullStats, type ScanResult } from "./intel-stats";

export const PLAN_PROFILES = {
  conservative: { goal: 3, loss: 2 },
  moderate: { goal: 5, loss: 3 },
  aggressive: { goal: 10, loss: 5 },
} as const;
export type PlanProfile = keyof typeof PLAN_PROFILES | "custom";
export const PLAN_PROFILE_KEYS = ["conservative", "moderate", "aggressive", "custom"] as const;
export const PLAN_STEP = 0.5;
export const PLAN_MAX_GOAL = 20;
// meta sugerida nunca passa de 10% (o teto do produto): a simulação em velas é otimista e o site não promete mais que isso
export const PLAN_SUGGEST_MAX = 10;
export const PLAN_TARGET_RATE = 0.7; // meta sugerida = a maior que bateu em pelo menos 70% dos dias
export const PLAN_MAX_AUTO_PAIRS = 5;
export const PLAN_MAX_PAIRS = 12;
// par com menos dias de histórico M1 no MT4 do cliente não entra na conta (o MT4 só tem histórico dos gráficos que já abriu)
export const PLAN_MIN_DAYS = 10;

export const roundStep = (v: number) => Math.round(v / PLAN_STEP) * PLAN_STEP;

// Série de um par: dias com mercado + operações (R) de cada dia.
export type PairSeries = { symbol: string; days: number[]; series: Record<string, number[]> };
export type PairSim = PairSeries & { risk: number; goal: number };

export function pairDay(rs: number[] | undefined, risk: number, goal: number) {
  let cum = 0;
  for (const r of rs ?? []) {
    cum += r * risk;
    if (goal > 0 && cum >= goal - 1e-9) return { pct: cum, hit: true };
  }
  return { pct: cum, hit: false };
}

export type PlanEval = {
  days: number;
  hitDays: number;
  lossDays: number;
  positiveDays: number;
  avgPct: number;
  worstPct: number;
  bestPct: number;
  pairs: { symbol: string; goal: number; days: number; hitDays: number; avgPct: number }[];
};

const weekdayOk = (d: number, weekdays?: number[]) => !weekdays || weekdays.includes(new Date(d * 1000).getUTCDay());

export function evaluatePlan(pairs: PairSim[], goal: number, loss: number, weekdays?: number[]): PlanEval {
  const sets = pairs.map((p) => new Set(p.days));
  const all = new Set<number>();
  for (const p of pairs) for (const d of p.days) if (weekdayOk(d, weekdays)) all.add(d);
  const days = [...all].sort((a, b) => a - b);
  const per = pairs.map((p) => ({ symbol: p.symbol, goal: p.goal, days: 0, hitDays: 0, sum: 0 }));
  let hit = 0,
    lossDays = 0,
    positive = 0,
    sum = 0,
    worst = 0,
    best = 0;
  for (const d of days) {
    let total = 0;
    pairs.forEach((p, i) => {
      if (!sets[i].has(d)) return;
      const r = pairDay(p.series[String(d)], p.risk, p.goal);
      per[i].days++;
      per[i].sum += r.pct;
      if (r.hit) per[i].hitDays++;
      total += r.pct;
    });
    if (loss > 0 && total <= -loss + 1e-9) {
      total = -loss;
      lossDays++;
    }
    if (goal > 0 && total >= goal - 1e-9) hit++;
    if (total > 0) positive++;
    sum += total;
    worst = Math.min(worst, total);
    best = Math.max(best, total);
  }
  return {
    days: days.length,
    hitDays: hit,
    lossDays,
    positiveDays: positive,
    avgPct: days.length ? sum / days.length : 0,
    worstPct: worst,
    bestPct: best,
    pairs: per.map(({ sum: s, ...p }) => ({ ...p, avgPct: p.days ? s / p.days : 0 })),
  };
}

// Média do dia do par (% do saldo) sem meta - é o "peso" do par na divisão automática.
export function avgDayPct(p: PairSeries, risk: number, weekdays?: number[]) {
  const days = p.days.filter((d) => weekdayOk(d, weekdays));
  if (!days.length) return 0;
  let sum = 0;
  for (const d of days) for (const r of p.series[String(d)] ?? []) sum += r * risk;
  return sum / days.length;
}

// Divide a meta geral entre os pares (de 0,5 em 0,5), proporcional ao peso. Só pares com peso > 0, no máximo maxPairs.
export function allocate(weights: { symbol: string; w: number }[], total: number, maxPairs = PLAN_MAX_AUTO_PAIRS): Record<string, number> {
  const units = Math.round(total / PLAN_STEP);
  const list = weights
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, Math.min(maxPairs, Math.max(units, 0)));
  if (!list.length || units <= 0) return {};
  // par que ficaria com menos de 0,5% sai (o mais fraco primeiro) e a parte dele vai pros outros
  while (list.length > 1 && (units * list[list.length - 1].w) / list.reduce((s, x) => s + x.w, 0) < 1) list.pop();
  const W = list.reduce((s, x) => s + x.w, 0);
  const out = list.map((x) => {
    const exact = (units * x.w) / W;
    return { symbol: x.symbol, u: Math.max(1, Math.floor(exact)), frac: exact - Math.floor(exact) };
  });
  let left = units - out.reduce((s, x) => s + x.u, 0);
  while (left < 0) {
    const big = out.reduce((a, b) => (b.u > a.u ? b : a));
    if (big.u <= 1) break;
    big.u--;
    left++;
  }
  const byFrac = [...out].sort((a, b) => b.frac - a.frac);
  for (let i = 0; left > 0; i = (i + 1) % byFrac.length, left--) byFrac[i].u++;
  return Object.fromEntries(out.map((x) => [x.symbol, x.u * PLAN_STEP]));
}

export type AutoCandidate = PairSeries & { risk: number; w: number };

export function evaluateAuto(cands: AutoCandidate[], goal: number, loss: number, weekdays?: number[]) {
  const alloc = allocate(
    cands.map((c) => ({ symbol: c.symbol, w: c.w })),
    goal
  );
  const sims = cands.filter((c) => alloc[c.symbol]).map((c) => ({ ...c, goal: alloc[c.symbol] }));
  return { alloc, ev: evaluatePlan(sims, goal, loss, weekdays) };
}

// Maior meta geral (até 10%) que bateu em pelo menos 70% dos dias (com a divisão automática).
export function suggestGoal(cands: AutoCandidate[], loss: number, weekdays?: number[]) {
  let best: { goal: number; rate: number } | null = null;
  for (let u = 1; u * PLAN_STEP <= PLAN_SUGGEST_MAX; u++) {
    const g = u * PLAN_STEP;
    const { ev } = evaluateAuto(cands, g, loss, weekdays);
    if (ev.days && ev.hitDays / ev.days >= PLAN_TARGET_RATE) best = { goal: g, rate: ev.hitDays / ev.days };
  }
  return best;
}

// Maior meta de UM par (até 10%) que bateu em pelo menos 70% dos dias (modo manual: dica ao lado de cada par).
export function suggestPairGoal(p: PairSeries, risk: number, weekdays?: number[]) {
  let best: number | null = null;
  for (let u = 1; u * PLAN_STEP <= PLAN_SUGGEST_MAX; u++) {
    const g = u * PLAN_STEP;
    const ev = evaluatePlan([{ ...p, risk, goal: g }], 0, 0, weekdays);
    if (ev.days && ev.pairs[0].hitDays / ev.days >= PLAN_TARGET_RATE) best = g;
  }
  return best;
}

// Resultado da leitura de um par, pronto pro Assistente.
export type PairAnalysis = {
  symbol: string;
  status: "pending" | "running" | "done" | "error" | "expired";
  error: string | null;
  cur: PairSeries | null; // configuração atual do par (dia a dia)
  best: PairSeries | null; // melhor configuração achada (dia a dia)
  bestCfg: Record<string, number> | null;
  validated: boolean; // a melhor também foi positiva nos últimos 30% do período
  netR: number;
  pf: number;
  trades: number;
  full: boolean; // teve leitura completa
  daily: boolean; // robô v7.4+ (mandou o dia a dia)
  days: number; // dias com mercado que o MT4 tinha no período
};

export function analyzePair(symbol: string, status: PairAnalysis["status"], error: string | null, result: ScanResult | null): PairAnalysis {
  const base: PairAnalysis = { symbol, status, error, cur: null, best: null, bestCfg: null, validated: false, netR: 0, pf: 0, trades: 0, full: false, daily: false, days: 0 };
  if (status !== "done" || !result) return base;
  const best = result.full?.best ?? null;
  const st = best ? fullStats(best.st) : null;
  const d = result.daily;
  const series = (m?: Record<string, number[]>): PairSeries | null => (d && m ? { symbol, days: d.days, series: m } : null);
  return {
    ...base,
    full: !!result.full,
    daily: !!d && d.days.length > 0,
    days: d?.days.length ?? 0,
    cur: series(d?.cur),
    best: series(d?.best),
    bestCfg: best?.cfg ?? null,
    validated: !!st?.validated,
    netR: st?.netR ?? 0,
    pf: st?.pf ?? 0,
    trades: st?.trades ?? 0,
  };
}

// Pares que o modo automático usa: melhor configuração confirmada e com média positiva no dia.
export function autoCandidates(list: PairAnalysis[], riskOf: (symbol: string) => number, weekdays?: number[]): AutoCandidate[] {
  return list
    .filter((a) => a.best && a.validated && a.bestCfg && a.days >= PLAN_MIN_DAYS)
    .map((a) => ({ ...a.best!, risk: riskOf(a.symbol), w: avgDayPct(a.best!, riskOf(a.symbol), weekdays) }))
    .filter((c) => c.w > 0);
}
