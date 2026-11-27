// Opções e padrões da configuração do robô - usados no servidor e no formulário (sem nada secreto aqui).

// Pares mais negociados. Nome base: o robô acha o nome da corretora (sufixo m, c, .pro...).
export const ROBOT_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD"] as const;
// v7.1: além desses, qualquer ativo que o robô listou na corretora da conta (índices, cripto, energia...), pelo nome sem prefixo/sufixo.
export const OTHER_ASSETS = "*"; // na permissão "Pares": libera os outros ativos da corretora
export const MAX_SYMBOLS = 20; // pares ligados ao mesmo tempo (o robô processa até 30, contando os que só têm ordem antiga)
export const SYMBOL_KEY = /^[A-Za-z0-9._#&+!-]{1,24}$/;
export const isStandardSymbol = (s: string) => (ROBOT_SYMBOLS as readonly string[]).includes(s);
export const ASSET_CATEGORIES = ["forex", "metals", "crypto", "indices", "energy", "stocks", "commodities", "other"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// % do saldo arriscado em cada entrada (até o fechamento na perda).
// 2026-11-27: perfis do modelo testado (sem recuperação): risco × 2 = meta do dia, risco × 3 = limite de perda do dia.
export const RISK_PROFILES = { conservative: 0.5, moderate: 1, aggressive: 1.5 } as const;
export type RiskProfile = keyof typeof RISK_PROFILES | "custom";
// Meta e limite de perda do dia que cada perfil liga junto (por par e na conta).
export const PROFILE_LIMITS = {
  conservative: { goal: 1, loss: 1.5 },
  moderate: { goal: 2, loss: 3 },
  aggressive: { goal: 3, loss: 4.5 },
} as const;

// Metas e limites de perda do dia (0 = desligado). 2026-11-25: de 0,5 em 0,5 até 10 (o Assistente divide a meta entre os pares).
export const PCT_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13, 14, 15, 20] as const;
// Opções antigas: permissão salva só com elas vira "até o maior valor liberado" (senão os valores novos ficariam bloqueados).
const PCT_OLD = [0, 1.5, 2.5, 3.5, 5.5, 10.5, 15, 20];
const PCT_KEYS = ["goalPct", "lossPct", "dailyGoalPct", "dailyLossPct"];
export const MAX_POSITIONS = 10;
export const DD_CAP_DEFAULT = 30; // teto do rebaixamento que o cliente escolhe (o admin pode mudar)
export const RSI_PERIODS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 21] as const; // v7: mais períodos (v6.9 só entende 5-14)
export const RSI_TIMEFRAMES = [1, 5, 15, 30, 60, 240] as const; // minutos (v7: + H1 e H4)
export const ADX_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export const NEWS_MINUTES = [5, 15, 30] as const;
// v7: tempos gráficos em minutos (M1 ... MN). As zonas de topo/fundo usam qualquer um deles.
export const TIMEFRAMES = [1, 5, 15, 30, 60, 240, 1440, 10080, 43200] as const;
export const ZONE_TFS_DEFAULT = [15, 30, 60, 240, 1440, 10080, 43200];
export const FILTER_TFS = [1, 5, 15, 30, 60, 240, 1440] as const; // ADX e ATR
export const ADX_PERIODS = [3, 5, 7, 10, 14, 20, 28] as const;
export const ATR_PERIODS = [3, 5, 7, 10, 14, 20] as const;
export const ATR_BARS = [20, 50, 100, 200, 500] as const; // velas da média do ATR
export const ATR_MIN_RATIOS = [0, 0.1, 0.2, 0.3, 0.5, 0.8, 1] as const;
export const ATR_MAX_RATIOS = [0.5, 0.8, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.5, 3, 5] as const;
// v7.5 Mesa de Análise: rigor (0 desligada, 1 equilibrado, 2 rigoroso, 3 muito rigoroso) e risco/retorno mínimo (espaço até a próxima zona ÷ stop)
export const MESA_LEVELS = [0, 1, 2, 3] as const;
export const MIN_RR_OPTIONS = [0, 1, 1.5, 2, 2.5, 3] as const;
export const tfLabel = (m: number) =>
  ({ 1: "M1", 5: "M5", 15: "M15", 30: "M30", 60: "H1", 240: "H4", 1440: "D1", 10080: "W1", 43200: "MN" })[m] ?? `M${m}`;

// v7: distâncias em pips DO PAR (0 = automático: no ouro os valores de sempre, nos outros pares acompanha a volatilidade do ouro).
// No ouro 1 pip = 0,01 (o mesmo do robô desde a v6 M5: break-even 250, perda 500, lucro 2500).
export const AUTO_PIPS = { beTrigger: 250, beOffset: 200, trailStart: 500, trailDistance: 250, trailStep: 250, profitPips: 2500, lossPips: 500, zoneTolerance: 25 } as const;

export type PairParams = {
  riskProfile: RiskProfile;
  riskPct: number; // % efetivo (do perfil ou personalizado)
  goalPct: number; // meta do dia SÓ deste par (0 = desligada)
  lossPct: number; // limite de perda do dia SÓ deste par (0 = desligado)
  direction: number; // 0 = compra e venda, 1 = só compra, 2 = só venda
  recovery: boolean;
  recoveryLevels: number;
  recoveryOpposite: boolean; // depois de perda, a próxima entrada vai na direção oposta
  rsiZone: number; // 0 = RSI 50-50 ... 9 = RSI 5-95
  rsiPeriod: number;
  rsiTf: number; // minutos (1, 5, 15, 30)
  breakout: boolean; // false = reversão (compra fundo, vende topo), true = rompimento
  pending: boolean; // true = ordem pendente, false = a mercado
  atr: boolean;
  adx: boolean;
  adxLevel: number;
  zones: boolean;
  zonesMode: number; // 0 = só com ADX, 1 = bloqueia contra a zona, 2 = só opera nas zonas
  breakEven: boolean;
  trailing: boolean;
  // v7: valores de saída (pips do par, 0 = automático)
  beTrigger: number; // lucro em pips que liga o break-even
  beOffset: number; // pips de lucro que o break-even trava
  trailStart: number; // lucro em pips que liga o stop móvel
  trailDistance: number; // distância do stop móvel ao preço
  trailStep: number; // de quanto em quanto o stop móvel anda
  profitClose: boolean; // fecha no alvo de lucro
  profitPips: number;
  lossClose: boolean; // fecha no limite de perda
  lossPips: number;
  // v7: zonas
  zoneTfs: number[]; // tempos gráficos usados (minutos)
  zoneLines: number[]; // tempos gráficos com linha no gráfico
  zoneCandles: number; // topo/fundo = máxima/mínima das últimas N velas fechadas
  zoneTolerance: number; // pips (0 = automático)
  // v7: ADX e ATR
  adxTf: number;
  adxPeriod: number;
  adxRising: boolean; // só conta tendência se o ADX estiver subindo
  atrTf: number;
  atrPeriod: number;
  atrBars: number;
  atrMin: number;
  atrMax: number;
  // v7.5 Mesa de Análise (robô v7.5+; os anteriores ignoram)
  mesa: number;
  minRR: number;
};

// Padrão de cada par = os parâmetros que o Alesson deixou no robô (conta demo 74033338).
export const DEFAULT_PAIR: PairParams = {
  riskProfile: "moderate",
  riskPct: RISK_PROFILES.moderate,
  goalPct: PROFILE_LIMITS.moderate.goal,
  lossPct: PROFILE_LIMITS.moderate.loss,
  direction: 0,
  recovery: false, // 2026-11-27: a recuperação (lote maior depois de perda) causou os dias de -42% a -67% nos testes
  recoveryLevels: 10,
  recoveryOpposite: false,
  rsiZone: 0,
  rsiPeriod: 5,
  rsiTf: 5,
  breakout: false,
  pending: true,
  atr: true,
  adx: true,
  adxLevel: 20,
  zones: true,
  zonesMode: 2,
  breakEven: true,
  trailing: true,
  beTrigger: 0,
  beOffset: 0,
  trailStart: 0,
  trailDistance: 0,
  trailStep: 0,
  profitClose: true,
  profitPips: 0,
  lossClose: true,
  lossPips: 0,
  zoneTfs: [...ZONE_TFS_DEFAULT],
  zoneLines: [...ZONE_TFS_DEFAULT],
  zoneCandles: 20,
  zoneTolerance: 0,
  adxTf: 1,
  adxPeriod: 5,
  adxRising: true,
  atrTf: 1,
  atrPeriod: 5,
  atrBars: 200,
  atrMin: 0.1,
  atrMax: 1.4,
  // Mesa desligada por padrão: no backtest do ouro (27/10-25/11) ela piorou o resultado com o gatilho RSI; liga por par quando a leitura completa provar que ajuda
  mesa: 0,
  minRR: 1.5,
};

export type RobotConfig = {
  symbols: string[];
  maxPositions: number;
  ddPct: number; // rebaixamento máximo (% do saldo) - 0 = desligado
  dailyGoalPct: number; // meta do dia somando todos os pares
  dailyLossPct: number;
  startHour: number;
  endHour: number;
  days: number[]; // 0 = domingo ... 6 = sábado
  newsFilter: boolean;
  newsMedium: boolean;
  newsBefore: number;
  newsAfter: number;
  newsClose: number; // 0 = nada, 1 = posições, 2 = pendentes, 3 = tudo
  pairs: Record<string, PairParams>;
  updatedAt: Date | null;
};

export const SYMBOL_LABEL: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  USDCHF: "USD/CHF",
  NZDUSD: "NZD/USD",
};
export const symbolLabel = (s: string) => SYMBOL_LABEL[s] ?? s;

// ======================= PERMISSÕES DO ADMIN (Admin → Configurações → Robô) =======================
// Pra cada parâmetro o admin escolhe: mostrar ou ocultar pro cliente, o padrão e quais opções o cliente pode escolher
// (nos números isso também dá o "valor máximo"). Oculto = o cliente não vê e o robô usa o padrão.
// Contas salvas por um admin ignoram esses limites (o admin vê e escolhe tudo).

export const DD_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 75, 100] as const; // rebaixamento máximo (0 = desligado)
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export type PolicyValue = number | boolean | string;
// Nos parâmetros de faixa (range) allow = [mínimo, máximo] que o cliente pode digitar; 0 = automático quando o parâmetro aceita.
export type ParamPolicy = { show: boolean; def: PolicyValue | PolicyValue[]; allow: PolicyValue[] };
type ParamDef = {
  scope: "account" | "pair";
  options: readonly PolicyValue[];
  multi?: boolean;
  ordered?: boolean;
  allowEmpty?: boolean; // multi: pode ficar sem nenhum
  range?: { min: number; max: number; auto?: boolean };
};
const pips = (max = 20000): ParamDef => ({ scope: "pair", options: [], range: { min: 1, max, auto: true } });

export const PARAM_DEFS = {
  // conta
  symbols: { scope: "account", options: [...ROBOT_SYMBOLS, OTHER_ASSETS], multi: true },
  maxPositions: { scope: "account", options: range(1, MAX_POSITIONS), ordered: true },
  ddPct: { scope: "account", options: DD_OPTIONS, ordered: true },
  dailyGoalPct: { scope: "account", options: PCT_OPTIONS, ordered: true },
  dailyLossPct: { scope: "account", options: PCT_OPTIONS, ordered: true },
  startHour: { scope: "account", options: range(0, 23) },
  endHour: { scope: "account", options: range(1, 24) },
  days: { scope: "account", options: [1, 2, 3, 4, 5, 6, 0], multi: true },
  newsFilter: { scope: "account", options: [true, false] },
  newsMedium: { scope: "account", options: [true, false] },
  newsBefore: { scope: "account", options: NEWS_MINUTES, ordered: true },
  newsAfter: { scope: "account", options: NEWS_MINUTES, ordered: true },
  newsClose: { scope: "account", options: [3, 1, 2, 0] },
  // cada par
  riskProfile: { scope: "pair", options: ["conservative", "moderate", "aggressive"] },
  goalPct: { scope: "pair", options: PCT_OPTIONS, ordered: true },
  lossPct: { scope: "pair", options: PCT_OPTIONS, ordered: true },
  direction: { scope: "pair", options: [0, 1, 2] },
  recovery: { scope: "pair", options: [true, false] },
  recoveryLevels: { scope: "pair", options: range(1, 10), ordered: true },
  recoveryOpposite: { scope: "pair", options: [false, true] },
  rsiZone: { scope: "pair", options: range(0, 9) },
  rsiPeriod: { scope: "pair", options: RSI_PERIODS },
  rsiTf: { scope: "pair", options: RSI_TIMEFRAMES },
  breakout: { scope: "pair", options: [false, true] },
  pending: { scope: "pair", options: [true, false] },
  atr: { scope: "pair", options: [true, false] },
  adx: { scope: "pair", options: [true, false] },
  adxLevel: { scope: "pair", options: ADX_LEVELS, ordered: true },
  zones: { scope: "pair", options: [true, false] },
  zonesMode: { scope: "pair", options: [2, 1, 0] },
  breakEven: { scope: "pair", options: [true, false] },
  trailing: { scope: "pair", options: [true, false] },
  // v7
  beTrigger: pips(),
  beOffset: pips(),
  trailStart: pips(),
  trailDistance: pips(),
  trailStep: pips(),
  profitClose: { scope: "pair", options: [true, false] },
  profitPips: pips(),
  lossClose: { scope: "pair", options: [true, false] },
  lossPips: pips(),
  zoneTfs: { scope: "pair", options: TIMEFRAMES, multi: true },
  zoneLines: { scope: "pair", options: TIMEFRAMES, multi: true, allowEmpty: true },
  zoneCandles: { scope: "pair", options: [], range: { min: 1, max: 1000 } },
  zoneTolerance: { scope: "pair", options: [], range: { min: 5, max: 500, auto: true } },
  adxTf: { scope: "pair", options: FILTER_TFS, ordered: true },
  adxPeriod: { scope: "pair", options: ADX_PERIODS, ordered: true },
  adxRising: { scope: "pair", options: [true, false] },
  atrTf: { scope: "pair", options: FILTER_TFS, ordered: true },
  atrPeriod: { scope: "pair", options: ATR_PERIODS, ordered: true },
  atrBars: { scope: "pair", options: ATR_BARS, ordered: true },
  atrMin: { scope: "pair", options: ATR_MIN_RATIOS, ordered: true },
  atrMax: { scope: "pair", options: ATR_MAX_RATIOS, ordered: true },
  // v7.5
  mesa: { scope: "pair", options: MESA_LEVELS, ordered: true },
  minRR: { scope: "pair", options: MIN_RR_OPTIONS, ordered: true },
} satisfies Record<string, ParamDef>;

export type ParamKey = keyof typeof PARAM_DEFS;
export const PARAM_KEYS = Object.keys(PARAM_DEFS) as ParamKey[];
export type RobotPolicy = Record<ParamKey, ParamPolicy>;
export type ConfigValues = Omit<RobotConfig, "updatedAt">;
export const paramDef = (k: ParamKey) => PARAM_DEFS[k] as ParamDef;

// Padrões da conta = os parâmetros que o Alesson deixou no robô.
export const ACCOUNT_DEFAULTS = {
  symbols: ["XAUUSD"],
  maxPositions: MAX_POSITIONS,
  ddPct: DD_CAP_DEFAULT,
  dailyGoalPct: PROFILE_LIMITS.moderate.goal,
  dailyLossPct: PROFILE_LIMITS.moderate.loss,
  startHour: 0,
  endHour: 22,
  days: [0, 1, 2, 3, 4, 5, 6],
  newsFilter: true,
  newsMedium: false,
  newsBefore: 30,
  newsAfter: 30,
  newsClose: 3,
};

const builtInDefault = (k: ParamKey): PolicyValue | PolicyValue[] =>
  paramDef(k).scope === "pair" ? DEFAULT_PAIR[k as keyof PairParams] : ACCOUNT_DEFAULTS[k as keyof typeof ACCOUNT_DEFAULTS];

const sameValue = (a: PolicyValue, b: PolicyValue) => a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-9);
export const hasValue = (list: readonly PolicyValue[], v: PolicyValue) => list.some((x) => sameValue(x, v));

type StoredPolicy = Partial<Record<string, Partial<ParamPolicy>>>;

// Junta o que o admin salvou com os padrões e conserta o que não fizer sentido (padrão fora das opções liberadas etc.).
// legacy = {ddCap, ddDefault} da primeira versão desta tela.
export function normalizePolicy(stored?: StoredPolicy | null, legacy?: { ddCap?: number; ddDefault?: number }): RobotPolicy {
  const out = {} as RobotPolicy;
  for (const k of PARAM_KEYS) {
    const d = paramDef(k);
    const s = stored?.[k] ?? {};
    if (d.range) {
      out[k] = normalizeRange(d.range, s, builtInDefault(k) as number);
      continue;
    }
    let allow = Array.isArray(s.allow) ? d.options.filter((o) => hasValue(s.allow!, o)) : [...d.options];
    if (PCT_KEYS.includes(k) && Array.isArray(s.allow) && s.allow.length && s.allow.every((x) => hasValue(PCT_OLD, x))) {
      const max = Math.max(...s.allow.map(Number));
      const zero = hasValue(s.allow, 0);
      allow = d.options.filter((o) => (o as number) <= max && ((o as number) > 0 || zero));
    }
    if (k === "ddPct" && !stored?.ddPct && legacy?.ddCap != null) allow = d.options.filter((o) => (o as number) <= legacy.ddCap!);
    if (!allow.length) allow = [...d.options];
    let def: PolicyValue | PolicyValue[] = s.def ?? (k === "ddPct" && legacy?.ddDefault != null ? legacy.ddDefault : builtInDefault(k));
    if (k === "symbols" && !allow.some((o) => o !== OTHER_ASSETS)) allow = [...d.options];
    if (d.multi) {
      const list = (Array.isArray(def) ? def : [def]).filter((x) => hasValue(allow, x) && !(k === "symbols" && x === OTHER_ASSETS));
      def = d.options.filter((o) => hasValue(list, o));
      if (!def.length && !d.allowEmpty) def = [allow.find((o) => o !== OTHER_ASSETS) ?? allow[0]];
    } else if (Array.isArray(def) || !hasValue(allow, def)) {
      const fallback = builtInDefault(k) as PolicyValue;
      def = hasValue(allow, fallback) ? fallback : d.ordered ? allow[allow.length - 1] : allow[0];
    }
    out[k] = { show: s.show !== false, def, allow };
  }
  if ((out.endHour.def as number) <= (out.startHour.def as number)) {
    out.startHour.def = out.startHour.allow[0];
    out.endHour.def = out.endHour.allow[out.endHour.allow.length - 1];
  }
  return out;
}

function normalizeRange(r: NonNullable<ParamDef["range"]>, s: Partial<ParamPolicy>, builtIn: number): ParamPolicy {
  const clampInt = (v: number) => Math.min(r.max, Math.max(r.min, Math.round(v)));
  let lo = r.min;
  let hi = r.max;
  if (Array.isArray(s.allow) && s.allow.length === 2 && s.allow.every((x) => Number.isFinite(Number(x)))) {
    lo = clampInt(Number(s.allow[0]));
    hi = clampInt(Number(s.allow[1]));
    if (hi < lo) [lo, hi] = [hi, lo];
  }
  const want = Number(s.def ?? builtIn);
  const def = r.auto && want === 0 ? 0 : Number.isFinite(want) ? Math.min(hi, Math.max(lo, Math.round(want))) : r.auto ? 0 : lo;
  return { show: s.show !== false, def, allow: [lo, hi] };
}

// Valor digitado num parâmetro de faixa → dentro do que o admin liberou (0 = automático quando aceita).
export function fitRange(k: ParamKey, value: unknown, pol: ParamPolicy): number {
  const r = paramDef(k).range!;
  const v = Number(value);
  if (r.auto && v === 0) return 0;
  if (!Number.isFinite(v)) return pol.def as number;
  return Math.min(Number(pol.allow[1]), Math.max(Number(pol.allow[0]), Math.round(v)));
}

// Maior opção liberada (pros números: "o cliente escolhe até X").
export const policyMax = (p: ParamPolicy) => Math.max(...p.allow.map(Number));

export function policyPair(policy: RobotPolicy): PairParams {
  const pair = { ...DEFAULT_PAIR } as Record<string, unknown>;
  for (const k of PARAM_KEYS) if (paramDef(k).scope === "pair") pair[k] = Array.isArray(policy[k].def) ? [...(policy[k].def as PolicyValue[])] : policy[k].def;
  const p = pair as PairParams;
  p.riskPct = RISK_PROFILES[p.riskProfile as keyof typeof RISK_PROFILES] ?? RISK_PROFILES.moderate;
  return p;
}

// Configuração de quem ainda não mexeu = padrões do admin.
export function policyDefaults(policy: RobotPolicy): ConfigValues {
  const acc = {} as Record<string, unknown>;
  for (const k of PARAM_KEYS)
    if (paramDef(k).scope === "account") acc[k] = Array.isArray(policy[k].def) ? [...(policy[k].def as PolicyValue[])] : policy[k].def;
  const pair = policyPair(policy);
  return { ...(acc as Omit<ConfigValues, "pairs">), pairs: Object.fromEntries(ROBOT_SYMBOLS.map((s) => [s, { ...pair }])) };
}

function fit(k: ParamKey, value: unknown, policy: RobotPolicy): unknown {
  const pol = policy[k];
  if (!pol.show) return Array.isArray(pol.def) ? [...pol.def] : pol.def;
  const d = paramDef(k);
  if (d.range) return fitRange(k, value, pol);
  if (k === "symbols") {
    // os 8 pares: cada um liberado ou não; os outros ativos da corretora: liberados juntos (opção "*")
    const others = hasValue(pol.allow, OTHER_ASSETS);
    const list = Array.isArray(value) ? (value as string[]).filter((s) => (isStandardSymbol(s) ? hasValue(pol.allow, s) : others)) : [];
    return list.length ? list : [...(pol.def as PolicyValue[])];
  }
  if (d.multi) {
    const list = Array.isArray(value) ? value.filter((x) => hasValue(pol.allow, x)) : [];
    return list.length || (d.allowEmpty && Array.isArray(value)) ? list : [...(pol.def as PolicyValue[])];
  }
  return hasValue(pol.allow, value as PolicyValue) ? value : pol.def;
}

// Aplica as permissões numa configuração: oculto → padrão; opção bloqueada → padrão.
export function enforcePolicy(c: ConfigValues, policy: RobotPolicy): ConfigValues {
  const out = { ...c } as Record<string, unknown>;
  for (const k of PARAM_KEYS) if (paramDef(k).scope === "account") out[k] = fit(k, c[k as keyof ConfigValues], policy);
  if ((out.endHour as number) <= (out.startHour as number)) {
    out.startHour = policy.startHour.def;
    out.endHour = policy.endHour.def;
  }
  const pairs: Record<string, PairParams> = {};
  for (const [s, p] of Object.entries(c.pairs)) {
    const q = { ...p } as Record<string, unknown>;
    for (const k of PARAM_KEYS) if (paramDef(k).scope === "pair") q[k] = fit(k, p[k as keyof PairParams], policy);
    q.riskPct = RISK_PROFILES[q.riskProfile as keyof typeof RISK_PROFILES] ?? RISK_PROFILES.moderate;
    pairs[s] = q as PairParams;
  }
  return { ...(out as ConfigValues), pairs };
}
