// Ai X Intelligence: contas e sugestões (sem banco - usado no servidor e testável à parte).
//
// Duas fontes:
//  1) Operações REAIS que os robôs mandam (robot_trades), cada uma com os ajustes do par quando abriu. Pra comparar contas
//     de tamanhos diferentes, o resultado é normalizado por 0,01 lote ("por 0,01").
//  2) ESTUDOS DE VELAS feitos no terminal do cliente (robot_scans): gatilho do RSI (tempo gráfico × período × zona × lógica)
//     simulado com a saída do par. Resultado em "R" = múltiplos da distância do limite de perda (compara pares e corretoras).
import { ROBOT_SYMBOLS, TIMEFRAMES, fitRange, hasValue, paramDef, type PairParams, type ParamKey, type PolicyValue, type RobotPolicy } from "./robot-options";

export type Stats = {
  trades: number;
  wins: number;
  winRate: number; // 0..1
  grossWin: number;
  grossLoss: number;
  pf: number; // fator de lucro (lucro bruto ÷ perda bruta); 99 = sem perdas
  net: number;
  avgWin: number;
  avgLoss: number;
  maxConsecLoss: number;
  maxDD: number; // maior queda da curva (mesma unidade do net)
};

export function stats(values: number[]): Stats {
  let wins = 0,
    gw = 0,
    gl = 0,
    eq = 0,
    peak = 0,
    dd = 0,
    cl = 0,
    maxCl = 0;
  for (const v of values) {
    if (v > 0) {
      wins++;
      gw += v;
      cl = 0;
    } else {
      gl -= v;
      cl++;
      maxCl = Math.max(maxCl, cl);
    }
    eq += v;
    peak = Math.max(peak, eq);
    dd = Math.max(dd, peak - eq);
  }
  const n = values.length;
  const losses = n - wins;
  return {
    trades: n,
    wins,
    winRate: n ? wins / n : 0,
    grossWin: gw,
    grossLoss: gl,
    pf: gl > 0 ? gw / gl : gw > 0 ? 99 : 0,
    net: gw - gl,
    avgWin: wins ? gw / wins : 0,
    avgLoss: losses ? gl / losses : 0,
    maxConsecLoss: maxCl,
    maxDD: dd,
  };
}

// ============================================================ OPERAÇÕES REAIS

export type TradeLite = {
  login: string;
  symbol: string;
  lots: number;
  net: number;
  closeAt: Date;
  params: Partial<PairParams> | null;
};

// Resultado por 0,01 lote (compara contas de tamanhos diferentes no mesmo par).
export const per001 = (t: { net: number; lots: number }) => (t.net / Math.max(t.lots, 0.01)) * 0.01;

// Ajustes que definem "a estratégia" de um par (o que a inteligência compara).
export const STRATEGY_KEYS = [
  "rsiZone",
  "rsiPeriod",
  "rsiTf",
  "breakout",
  "pending",
  "atr",
  "adx",
  "adxLevel",
  "zones",
  "zonesMode",
  "breakEven",
  "trailing",
  "lossPips",
  "profitPips",
] as const;
export type StrategyKey = (typeof STRATEGY_KEYS)[number];
export type Strategy = Partial<Record<StrategyKey, unknown>>;

export function strategyOf(p: Partial<PairParams>): Strategy {
  const out: Strategy = {};
  for (const k of STRATEGY_KEYS) if (p[k] !== undefined) out[k] = p[k];
  return out;
}
export const fingerprint = (p: Partial<PairParams>) => JSON.stringify(strategyOf(p));

export type StrategySet = { key: string; strategy: Strategy; stats: Stats; accounts: number; lastAt: Date };
export type ParamValueStats = { value: unknown; stats: Stats; accounts: number; lift: number };
export type PairLearning = {
  symbol: string;
  overall: Stats;
  accounts: number;
  sets: StrategySet[]; // conjuntos de ajustes (melhores primeiro)
  params: Partial<Record<StrategyKey, ParamValueStats[]>>; // cada valor de cada ajuste
};

const byClose = (a: TradeLite, b: TradeLite) => a.closeAt.getTime() - b.closeAt.getTime();

// Ordena conjuntos: amostra mínima primeiro, depois resultado médio por operação (por 0,01) com o fator de lucro desempatando.
const setScore = (s: Stats) => (s.trades ? s.net / s.trades : 0) + Math.min(s.pf, 5) * 1e-6;

export function learn(trades: TradeLite[], minTrades = 20): PairLearning[] {
  const out: PairLearning[] = [];
  // os 8 de sempre primeiro, depois os outros ativos da corretora que aparecerem (v7.1)
  const symbols = [...new Set([...ROBOT_SYMBOLS, ...trades.map((t) => t.symbol).sort()])];
  for (const symbol of symbols) {
    const list = trades.filter((t) => t.symbol === symbol).sort(byClose);
    if (!list.length) continue;
    const overall = stats(list.map(per001));
    const avg = overall.trades ? overall.net / overall.trades : 0;
    const known = list.filter((t) => t.params);
    // conjuntos
    const groups = new Map<string, TradeLite[]>();
    for (const t of known) {
      const k = fingerprint(t.params!);
      groups.set(k, [...(groups.get(k) ?? []), t]);
    }
    const sets: StrategySet[] = [...groups.entries()].map(([key, g]) => ({
      key,
      strategy: strategyOf(g[0].params!),
      stats: stats(g.map(per001)),
      accounts: new Set(g.map((t) => t.login)).size,
      lastAt: g[g.length - 1].closeAt,
    }));
    sets.sort((a, b) => Number(b.stats.trades >= minTrades) - Number(a.stats.trades >= minTrades) || setScore(b.stats) - setScore(a.stats));
    // cada valor de cada ajuste
    const params: PairLearning["params"] = {};
    for (const k of STRATEGY_KEYS) {
      const byValue = new Map<string, TradeLite[]>();
      for (const t of known) {
        const v = JSON.stringify(t.params![k] ?? null);
        byValue.set(v, [...(byValue.get(v) ?? []), t]);
      }
      if (byValue.size < 2) continue; // todo mundo usa o mesmo valor: nada a comparar
      params[k] = [...byValue.entries()]
        .map(([v, g]) => {
          const s = stats(g.map(per001));
          return { value: JSON.parse(v), stats: s, accounts: new Set(g.map((t) => t.login)).size, lift: (s.trades ? s.net / s.trades : 0) - avg };
        })
        .sort((a, b) => b.lift - a.lift);
    }
    out.push({ symbol, overall, accounts: new Set(list.map((t) => t.login)).size, sets, params });
  }
  return out;
}

// O que mudar no par pra ficar igual a um conjunto melhor (só o que é diferente).
export function strategyDiff(current: Partial<PairParams>, target: Strategy) {
  const diff: { key: StrategyKey; from: unknown; to: unknown }[] = [];
  for (const k of STRATEGY_KEYS) {
    if (target[k] === undefined) continue;
    if (JSON.stringify(current[k]) !== JSON.stringify(target[k])) diff.push({ key: k, from: current[k], to: target[k] });
  }
  return diff;
}

// ============================================================ ESTUDO DE VELAS

export type ScanRow = {
  tf: number;
  per: number;
  zone: number;
  logic: number; // 0 = reversão, 1 = rompimento
  trades: number;
  wins: number;
  gw: number;
  gl: number;
  dd: number;
  maxcl: number;
  ta: number;
  na: number;
  tb: number;
  nb: number;
};
export type ScanMeta = {
  sym: string;
  broker: string;
  from: number; // unix (hora da corretora)
  to: number;
  m1: number;
  pip: number;
  loss: number; // distância do limite de perda (preço) = 1R
  profit: number;
  be: string;
  tr: string;
  spread: number;
  lossclose: boolean;
  cur: { tf: number; per: number; zone: number; logic: number } | null;
  v: string;
};
// v7.2 leitura completa: configuração (chaves curtas do robô) + estatística em R.
// st: 0 ops, 1 ganhos, 2 lucro bruto, 3 perda bruta, 4 maior queda, 5 perdas seguidas, 6 ops 70%, 7 resultado 70%, 8 lucro 70%, 9 perda 70%,
// 10 queda 70%, 11 ops 30%, 12 resultado 30%, 13 lucro 30%, 14 perda 30%
export type FullRow = { cfg: Record<string, number>; st: number[] };
export type FullStudy = { meta: Record<string, string>; cur: FullRow | null; best: FullRow | null; ex: FullRow[] };
// v7.4: resultado dia a dia da leitura completa (configuração atual e a melhor, sem meta/limite do dia).
// days = dias com mercado no período (unix da meia-noite, hora da corretora); cur/best: dia → R de cada operação, na ordem de fechamento.
export type DailyData = { days: number[]; cur?: Record<string, number[]>; best?: Record<string, number[]> };
export type ScanResult = { meta: ScanMeta; rows: ScanRow[]; full?: FullStudy; daily?: DailyData };

const num = (v: string | undefined) => (v === undefined || v === "" ? 0 : Number(v));

export function parseScan(body: string): ScanResult | null {
  const lines = body.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const kv = Object.fromEntries(
    lines[0].split(";").map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    })
  );
  const cur = (kv.cur ?? "").split(",").map(Number);
  const meta: ScanMeta = {
    sym: String(kv.sym ?? "").slice(0, 24),
    broker: String(kv.broker ?? "").slice(0, 32),
    from: num(kv.from),
    to: num(kv.to),
    m1: num(kv.m1),
    pip: num(kv.pip),
    loss: num(kv.loss),
    profit: num(kv.profit),
    be: String(kv.be ?? "0").slice(0, 40),
    tr: String(kv.tr ?? "0").slice(0, 60),
    spread: num(kv.spread),
    lossclose: kv.lossclose !== "0",
    cur: cur.length === 4 && cur.every(Number.isFinite) ? { tf: cur[0], per: cur[1], zone: cur[2], logic: cur[3] } : null,
    v: String(kv.v ?? "").trim().slice(0, 32),
  };
  if (!(meta.loss > 0) || !meta.sym) return null;
  const rows: ScanRow[] = [];
  const full: FullStudy = { meta: {}, cur: null, best: null, ex: [] };
  let hasFull = false;
  const daily: DailyData = { days: [] };
  let hasDaily = false;
  for (const line of lines.slice(1)) {
    if (line.startsWith("D;")) {
      const [, label, a, b] = line.split(";");
      if (label === "days") {
        daily.days = (a ?? "").split(",").map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 800);
        hasDaily = true;
      } else if ((label === "cur" || label === "best") && /^\d{1,12}$/.test(a ?? "")) {
        const map = (daily[label] ??= {});
        if (Object.keys(map).length < 800) map[a] = (b ?? "").split(",").filter(Boolean).map(Number).filter(Number.isFinite).slice(0, 2000);
        hasDaily = true;
      }
      continue;
    }
    if (line.startsWith("F;")) {
      const [, label, cfgText, stText] = line.split(";");
      const pairs = (cfgText ?? "").split(",").map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)] as const);
      if (label === "meta") {
        full.meta = Object.fromEntries(pairs.filter(([k]) => k).map(([k, v]) => [k, v.slice(0, 80)]));
        hasFull = true;
        continue;
      }
      const cfg = Object.fromEntries(pairs.filter(([k, v]) => /^[a-z]{1,6}$/.test(k) && Number.isFinite(Number(v))).map(([k, v]) => [k, Number(v)]));
      const st = (stText ?? "").split(",").map(Number);
      if (st.length !== 15 || !st.every(Number.isFinite) || !("tf" in cfg)) continue;
      const row = { cfg, st };
      if (label === "cur") full.cur = row;
      else if (label === "best") full.best = row;
      else if (label === "ex" && full.ex.length < 5) full.ex.push(row);
      hasFull = true;
      continue;
    }
    const f = line.split(",").map(Number);
    if (f.length !== 14 || !f.every(Number.isFinite)) continue;
    const [tf, per, zone, logic, trades, wins, gw, gl, dd, maxcl, ta, na, tb, nb] = f;
    rows.push({ tf, per, zone, logic, trades, wins, gw, gl, dd, maxcl, ta, na, tb, nb });
  }
  if (!rows.length) return null;
  return { meta, rows, ...(hasFull ? { full } : {}), ...(hasDaily ? { daily } : {}) };
}

export const fullStats = (st: number[]) => {
  const pf = (w: number, l: number) => (l > 0 ? w / l : w > 0 ? 99 : 0);
  return {
    trades: st[0],
    winRate: st[0] ? st[1] / st[0] : 0,
    pf: pf(st[2], st[3]),
    netR: st[2] - st[3],
    ddR: st[4],
    maxcl: st[5],
    isTrades: st[6],
    isNetR: st[7],
    oosTrades: st[11],
    oosNetR: st[12],
    oosPf: pf(st[13], st[14]),
    // confirmada = também positiva nos últimos 30% (que não entraram na escolha)
    validated: st[11] >= 5 && st[12] > 0 && pf(st[13], st[14]) > 1,
  };
};

// Configuração da leitura completa → ajustes do par (só o que muda). Distâncias já vêm em pips do par.
export function fullPatch(cfg: Record<string, number>, pair: PairParams): Partial<PairParams> {
  const mask = cfg.zu ?? 0;
  const next: Partial<PairParams> = {
    rsiTf: cfg.tf,
    rsiPeriod: cfg.per,
    rsiZone: cfg.zone,
    breakout: cfg.logic === 1,
    lossClose: true,
    lossPips: cfg.lp,
    profitClose: cfg.pe === 1,
    ...(cfg.pe === 1 ? { profitPips: cfg.pp } : {}),
    breakEven: cfg.be === 1,
    ...(cfg.be === 1 ? { beTrigger: cfg.bt, beOffset: cfg.bo } : {}),
    trailing: cfg.tr === 1,
    ...(cfg.tr === 1 ? { trailStart: cfg.ts, trailDistance: cfg.td, trailStep: cfg.tt } : {}),
    atr: cfg.at === 1,
    ...(cfg.at === 1 ? { atrTf: cfg.yt, atrPeriod: cfg.yp, atrBars: cfg.yb, atrMin: cfg.yn, atrMax: cfg.yx } : {}),
    adx: cfg.ax === 1,
    ...(cfg.ax === 1 ? { adxTf: cfg.xt, adxPeriod: cfg.xp, adxLevel: cfg.xl, adxRising: cfg.xr === 1 } : {}),
    zones: cfg.zn === 1,
    ...(cfg.zn === 1 ? { zonesMode: cfg.zm, zoneTfs: TIMEFRAMES.filter((_, i) => (mask >> i) & 1), zoneCandles: cfg.zc } : {}),
    direction: cfg.d,
    goalPct: cfg.g,
    lossPct: cfg.l,
  };
  const out: Partial<PairParams> = {};
  for (const [k, v] of Object.entries(next) as [keyof PairParams, unknown][]) {
    if (v === undefined || (typeof v === "number" && !Number.isFinite(v))) continue;
    if (JSON.stringify(pair[k]) !== JSON.stringify(v)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

// Grupos de ajustes da leitura completa: o grupo fica travado (o robô não mexe) se o cliente não pode mudar algum ajuste dele.
export const FULL_GROUPS: Record<string, ParamKey[]> = {
  rsi: ["rsiTf", "rsiPeriod", "rsiZone", "breakout"],
  loss: ["lossClose", "lossPips"],
  profit: ["profitClose", "profitPips"],
  be: ["breakEven", "beTrigger", "beOffset"],
  trail: ["trailing", "trailStart", "trailDistance", "trailStep"],
  atr: ["atr", "atrTf", "atrPeriod", "atrBars", "atrMin", "atrMax"],
  adx: ["adx", "adxTf", "adxPeriod", "adxLevel", "adxRising"],
  zones: ["zones", "zonesMode", "zoneTfs", "zoneCandles"],
  dir: ["direction"],
  goal: ["goalPct"],
  dloss: ["lossPct"],
};
export const FULL_KEYS = Object.values(FULL_GROUPS).flat();

export function fixedGroups(policy: RobotPolicy | null) {
  if (!policy) return [];
  return Object.entries(FULL_GROUPS)
    .filter(([, keys]) => keys.some((k) => !policy[k].show || (!paramDef(k).range && policy[k].allow.length < 2)))
    .map(([g]) => g);
}

export type RatedRow = ScanRow & {
  pf: number;
  netR: number; // resultado em múltiplos do limite de perda
  ddR: number;
  winRate: number;
  consistent: boolean; // positivo nas duas metades do período
  eligible: boolean; // amostra mínima, fator de lucro > 1 e consistente
  score: number;
};

export const MIN_SCAN_TRADES = 20;

export function rateRow(r: ScanRow, loss: number): RatedRow {
  const netR = (r.gw - r.gl) / loss;
  const ddR = r.dd / loss;
  const pf = r.gl > 0 ? r.gw / r.gl : r.gw > 0 ? 99 : 0;
  const consistent = r.ta > 0 && r.tb > 0 && r.na > 0 && r.nb > 0;
  const eligible = r.trades >= MIN_SCAN_TRADES && pf > 1 && consistent;
  // retorno ajustado ao risco: resultado ÷ (1 + maior queda), os dois em R
  return { ...r, pf, netR, ddR, winRate: r.trades ? r.wins / r.trades : 0, consistent, eligible, score: netR / (1 + ddR) };
}

export const sameCombo = (a: { tf: number; per: number; zone: number; logic: number }, b: { tf: number; per: number; zone: number; logic: number }) =>
  a.tf === b.tf && a.per === b.per && a.zone === b.zone && a.logic === b.logic;

// Melhores combinações (allowed = o que o cliente pode escolher) + como está a combinação atual do par.
export function rankScan(res: ScanResult, allowed: (r: ScanRow) => boolean = () => true, top = 5) {
  const rated = res.rows.map((r) => rateRow(r, res.meta.loss));
  const current = res.meta.cur ? (rated.find((r) => sameCombo(r, res.meta.cur!)) ?? null) : null;
  const best = rated
    .filter((r) => r.eligible && allowed(r))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
  return { current, best, total: rated.length };
}

// Vários estudos do mesmo par (contas/corretoras diferentes) somados em R.
export function mergeScans(list: ScanResult[]): ScanResult | null {
  if (!list.length) return null;
  const map = new Map<string, ScanRow>();
  for (const s of list) {
    const k = s.meta.loss;
    for (const r of s.rows) {
      const key = `${r.tf}|${r.per}|${r.zone}|${r.logic}`;
      const acc = map.get(key) ?? { tf: r.tf, per: r.per, zone: r.zone, logic: r.logic, trades: 0, wins: 0, gw: 0, gl: 0, dd: 0, maxcl: 0, ta: 0, na: 0, tb: 0, nb: 0 };
      acc.trades += r.trades;
      acc.wins += r.wins;
      acc.gw += r.gw / k;
      acc.gl += r.gl / k;
      acc.dd = Math.max(acc.dd, r.dd / k);
      acc.maxcl = Math.max(acc.maxcl, r.maxcl);
      acc.ta += r.ta;
      acc.na += r.na / k;
      acc.tb += r.tb;
      acc.nb += r.nb / k;
      map.set(key, acc);
    }
  }
  const first = list[0].meta;
  return { meta: { ...first, loss: 1, cur: null }, rows: [...map.values()] };
}

// ============================================================ PERMISSÕES

// O cliente pode passar o ajuste k de "cur" pra "v"? (oculto = só se não mudar; faixa = dentro do que o admin liberou). policy null = admin.
export function policyCan(policy: RobotPolicy | null) {
  return (k: ParamKey, v: unknown, cur: unknown) => {
    if (!policy) return true;
    const pol = policy[k];
    if (!pol.show) return JSON.stringify(v) === JSON.stringify(cur);
    if (paramDef(k).range) return fitRange(k, v, pol) === v;
    if (Array.isArray(v)) return v.every((x) => hasValue(pol.allow, x as PolicyValue)) && (v.length > 0 || !!paramDef(k).allowEmpty);
    return hasValue(pol.allow, v as PolicyValue);
  };
}

// Combinação do estudo de velas que o cliente pode aplicar nesse par.
export const scanRowAllowed = (can: ReturnType<typeof policyCan>, pair: PairParams) => (r: ScanRow) =>
  can("rsiTf", r.tf, pair.rsiTf) && can("rsiPeriod", r.per, pair.rsiPeriod) && can("rsiZone", r.zone, pair.rsiZone) && can("breakout", r.logic === 1, pair.breakout);
export const scanRowPatch = (r: ScanRow): Strategy => ({ rsiTf: r.tf, rsiPeriod: r.per, rsiZone: r.zone, breakout: r.logic === 1 });

// ============================================================ SUGESTÃO DA COMUNIDADE

export const MIN_SET_TRADES = 30;
export const MIN_SET_ACCOUNTS = 3;

// Conjunto de ajustes de outras contas melhor que o do par (amostra mínima, fator de lucro > 1, média maior) e que o cliente pode aplicar.
export function betterSet(l: PairLearning | undefined, pair: PairParams, can: ReturnType<typeof policyCan>) {
  if (!l) return null;
  const mine = fingerprint(pair);
  const base = l.sets.find((s) => s.key === mine);
  const baseAvg = base && base.stats.trades ? base.stats.net / base.stats.trades : l.overall.trades ? l.overall.net / l.overall.trades : 0;
  const set = l.sets.find((s) => {
    if (s.key === mine || s.stats.trades < MIN_SET_TRADES || s.accounts < MIN_SET_ACCOUNTS || s.stats.pf <= 1) return false;
    if (s.stats.net / s.stats.trades <= baseAvg) return false;
    return strategyDiff(pair, s.strategy).every((d) => can(d.key, d.to, d.from));
  });
  if (!set) return null;
  const diff = strategyDiff(pair, set.strategy);
  return diff.length ? { set, diff } : null;
}
