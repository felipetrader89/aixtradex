// Opções e padrões da configuração do robô - usados no servidor e no formulário (sem nada secreto aqui).

// Pares mais negociados. Nome base: o robô acha o nome da corretora (sufixo m, c, .pro...).
export const ROBOT_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD"] as const;

// % do saldo arriscado em cada entrada (até o fechamento na perda). Moderado = o padrão de sempre no ouro (0,01 a cada $250).
export const RISK_PROFILES = { conservative: 1, moderate: 2, aggressive: 3 } as const;
export type RiskProfile = keyof typeof RISK_PROFILES | "custom";

export const PCT_OPTIONS = [0, 1.5, 2.5, 3.5, 5.5, 10.5, 15, 20] as const; // metas e limites de perda (0 = desligado)
export const MAX_POSITIONS = 10;
export const DD_CAP_DEFAULT = 30; // teto do rebaixamento que o cliente escolhe (o admin pode mudar)
export const RSI_PERIODS = [5, 7, 8, 10, 12, 14] as const;
export const RSI_TIMEFRAMES = [1, 5, 15, 30] as const;
export const ADX_LEVELS = [20, 25, 30, 35, 40] as const;
export const NEWS_MINUTES = [5, 15, 30] as const;

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
};

// Padrão de cada par = os parâmetros que o Alesson deixou no robô (conta demo 74033338).
export const DEFAULT_PAIR: PairParams = {
  riskProfile: "moderate",
  riskPct: RISK_PROFILES.moderate,
  goalPct: 0,
  lossPct: 0,
  direction: 0,
  recovery: true,
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

// ======================= PERMISSÕES DO ADMIN (Admin → Configurações → Robô) =======================
// Pra cada parâmetro o admin escolhe: mostrar ou ocultar pro cliente, o padrão e quais opções o cliente pode escolher
// (nos números isso também dá o "valor máximo"). Oculto = o cliente não vê e o robô usa o padrão.
// Contas salvas por um admin ignoram esses limites (o admin vê e escolhe tudo).

export const DD_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 75, 100] as const; // rebaixamento máximo (0 = desligado)
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export type PolicyValue = number | boolean | string;
export type ParamPolicy = { show: boolean; def: PolicyValue | PolicyValue[]; allow: PolicyValue[] };
type ParamDef = { scope: "account" | "pair"; options: readonly PolicyValue[]; multi?: boolean; ordered?: boolean };

export const PARAM_DEFS = {
  // conta
  symbols: { scope: "account", options: ROBOT_SYMBOLS, multi: true },
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
  dailyGoalPct: 10.5,
  dailyLossPct: 5.5,
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
    let allow = Array.isArray(s.allow) ? d.options.filter((o) => hasValue(s.allow!, o)) : [...d.options];
    if (k === "ddPct" && !stored?.ddPct && legacy?.ddCap != null) allow = d.options.filter((o) => (o as number) <= legacy.ddCap!);
    if (!allow.length) allow = [...d.options];
    let def: PolicyValue | PolicyValue[] = s.def ?? (k === "ddPct" && legacy?.ddDefault != null ? legacy.ddDefault : builtInDefault(k));
    if (d.multi) {
      const list = (Array.isArray(def) ? def : [def]).filter((x) => hasValue(allow, x));
      def = d.options.filter((o) => hasValue(list, o));
      if (!def.length) def = [allow[0]];
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

// Maior opção liberada (pros números: "o cliente escolhe até X").
export const policyMax = (p: ParamPolicy) => Math.max(...p.allow.map(Number));

export function policyPair(policy: RobotPolicy): PairParams {
  const pair = { ...DEFAULT_PAIR } as Record<string, unknown>;
  for (const k of PARAM_KEYS) if (paramDef(k).scope === "pair") pair[k] = policy[k].def;
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
  if (paramDef(k).multi) {
    const list = Array.isArray(value) ? value.filter((x) => hasValue(pol.allow, x)) : [];
    return list.length ? list : [...(pol.def as PolicyValue[])];
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
