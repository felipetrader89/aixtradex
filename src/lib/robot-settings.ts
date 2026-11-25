import "server-only";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSetting } from "@/lib/config";
import type { RobotSettings } from "@/lib/db/schema";
import {
  ADX_LEVELS,
  DD_OPTIONS,
  DEFAULT_PAIR,
  MAX_POSITIONS,
  NEWS_MINUTES,
  PCT_OPTIONS,
  RISK_PROFILES,
  ROBOT_SYMBOLS,
  RSI_PERIODS,
  RSI_TIMEFRAMES,
  enforcePolicy,
  normalizePolicy,
  policyDefaults,
  policyPair,
  type ConfigValues,
  type PairParams,
  type RiskProfile,
  type RobotConfig,
  type RobotPolicy,
} from "@/lib/robot-options";

// Configuração do robô por conta MT4 (Área do cliente → Contas MT4 → Configurar robô).
// v6.7+: o robô recebe junto com a consulta de licença (a cada 5 min).
// v6.8+: além disso, confere a cada 30 s se mudou (/api/license/check?cfgonly=1) - o que o cliente salva chega em ~30 s.
// Duas partes: GERAL da conta (pares, máx. de operações, rebaixamento, metas do dia, horário, dias, notícias)
// e POR PAR (risco, meta/perda do par, direção, recuperação, estratégia, filtros e saída). Padrões = os do robô.

// Permissões do admin (Admin → Configurações → Robô): mostrar/ocultar, padrão e opções liberadas de cada parâmetro.
export async function getRobotPolicy(): Promise<RobotPolicy> {
  const s = await getSetting("robot");
  return normalizePolicy(s?.policy, s ?? undefined);
}

const pairOf = (p: Partial<PairParams> | undefined, base: PairParams): PairParams => ({ ...base, ...(p ?? {}) });

type StoredParams = ConfigValues & { admin?: boolean };

// admin = a última vez quem salvou foi um admin (aí os limites do admin não valem pra essa conta).
function toConfig(row: RobotSettings | undefined, policy: RobotPolicy): RobotConfig & { admin: boolean } {
  const base = policyDefaults(policy);
  const basePair = policyPair(policy);
  if (!row) return { ...base, updatedAt: null, admin: false };
  const stored = row.params as Partial<StoredParams> | null;
  let config: ConfigValues;
  if (stored) {
    // v6.8+: tudo guardado em params (campos novos que ainda não existiam ficam com o padrão).
    config = {
      ...base,
      ...stored,
      symbols: (stored.symbols ?? base.symbols).filter((s) => (ROBOT_SYMBOLS as readonly string[]).includes(s)),
      pairs: Object.fromEntries(ROBOT_SYMBOLS.map((s) => [s, pairOf(stored.pairs?.[s], basePair)])),
    };
  } else {
    // Configuração salva na v6.7 (colunas antigas): risco e recuperação valiam pra todos os pares.
    const profile = row.riskProfile as RiskProfile;
    const legacyPair = pairOf(
      {
        riskProfile: profile,
        riskPct: profile === "custom" ? Number(row.riskPct ?? RISK_PROFILES.moderate) : RISK_PROFILES[profile],
        recovery: row.recovery,
        recoveryLevels: row.recoveryLevels,
      },
      basePair
    );
    config = {
      ...base,
      symbols: row.symbols.filter((s) => (ROBOT_SYMBOLS as readonly string[]).includes(s)),
      maxPositions: row.maxPositions,
      dailyGoalPct: Number(row.dailyGoalPct),
      dailyLossPct: Number(row.dailyLossPct),
      startHour: row.startHour,
      endHour: row.endHour,
      newsFilter: row.newsFilter,
      pairs: Object.fromEntries(ROBOT_SYMBOLS.map((s) => [s, { ...legacyPair }])),
    };
  }
  delete (config as Partial<StoredParams>).admin;
  if (!config.symbols.length) config.symbols = base.symbols;
  const admin = stored?.admin === true;
  return { ...(admin ? config : enforcePolicy(config, policy)), updatedAt: row.updatedAt, admin };
}

export async function getRobotConfig(product: string, login: string) {
  const [[row], policy] = await Promise.all([
    db()
      .select()
      .from(schema.robotSettings)
      .where(and(eq(schema.robotSettings.product, product), eq(schema.robotSettings.login, login))),
    getRobotPolicy(),
  ]);
  return toConfig(row, policy);
}

export type ConfigInput = ConfigValues;
export type ConfigError = "symbols" | "risk" | "goal" | "loss" | "levels" | "positions" | "hours" | "days" | "dd" | "news" | "strategy";

const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const inList = (v: unknown, list: readonly number[]) => list.includes(v as number);
const isBool = (v: unknown) => typeof v === "boolean";

function validatePair(p: PairParams, isAdmin: boolean): ConfigError | null {
  if (p.riskProfile === "custom") {
    if (!isAdmin || !(Number(p.riskPct) >= 0.1 && Number(p.riskPct) <= 10)) return "risk";
  } else if (!(p.riskProfile in RISK_PROFILES)) return "risk";
  if (!inList(p.goalPct, PCT_OPTIONS)) return "goal";
  if (!inList(p.lossPct, PCT_OPTIONS)) return "loss";
  if (!isInt(p.recoveryLevels, 1, 10)) return "levels";
  if (
    !isInt(p.direction, 0, 2) ||
    !isInt(p.rsiZone, 0, 9) ||
    !inList(p.rsiPeriod, RSI_PERIODS) ||
    !inList(p.rsiTf, RSI_TIMEFRAMES) ||
    !inList(p.adxLevel, ADX_LEVELS) ||
    !isInt(p.zonesMode, 0, 2) ||
    ![p.recovery, p.recoveryOpposite, p.breakout, p.pending, p.atr, p.adx, p.zones, p.breakEven, p.trailing].every(isBool)
  )
    return "strategy";
  return null;
}

// Confere tudo que vem do formulário (nunca confiar no navegador). Personalizado só pra admin.
// Os limites do admin (opções ocultas/bloqueadas) não dão erro: no salvar, o que não é permitido volta pro padrão.
export function validateConfig(input: ConfigInput, isAdmin: boolean): ConfigError | null {
  if (!Array.isArray(input.symbols) || !input.symbols.length || input.symbols.some((s) => !(ROBOT_SYMBOLS as readonly string[]).includes(s)))
    return "symbols";
  if (!inList(input.dailyGoalPct, PCT_OPTIONS)) return "goal";
  if (!inList(input.dailyLossPct, PCT_OPTIONS)) return "loss";
  if (!isInt(input.maxPositions, 1, MAX_POSITIONS)) return "positions";
  if (!inList(input.ddPct, DD_OPTIONS)) return "dd";
  if (!isInt(input.startHour, 0, 23) || !isInt(input.endHour, 1, 24) || input.endHour <= input.startHour) return "hours";
  if (!Array.isArray(input.days) || !input.days.length || input.days.some((d) => !isInt(d, 0, 6))) return "days";
  if (
    !isBool(input.newsFilter) ||
    !isBool(input.newsMedium) ||
    !inList(input.newsBefore, NEWS_MINUTES) ||
    !inList(input.newsAfter, NEWS_MINUTES) ||
    !isInt(input.newsClose, 0, 3)
  )
    return "news";
  for (const s of ROBOT_SYMBOLS) {
    const p = input.pairs?.[s];
    if (!p) return "strategy";
    const error = validatePair(p, isAdmin);
    if (error) return error;
  }
  return null;
}

export async function saveRobotConfig(product: string, login: string, raw: ConfigInput, updatedBy: string, isAdmin: boolean, policy: RobotPolicy) {
  const input = isAdmin ? raw : enforcePolicy(raw, policy);
  const symbols = ROBOT_SYMBOLS.filter((s) => input.symbols.includes(s));
  const pairs = Object.fromEntries(
    ROBOT_SYMBOLS.map((s) => {
      const p = input.pairs[s];
      return [s, { ...p, riskPct: p.riskProfile === "custom" ? Number(p.riskPct) : RISK_PROFILES[p.riskProfile] }];
    })
  ) as Record<string, PairParams>;
  const params: StoredParams = {
    symbols,
    maxPositions: input.maxPositions,
    ddPct: input.ddPct,
    dailyGoalPct: input.dailyGoalPct,
    dailyLossPct: input.dailyLossPct,
    startHour: input.startHour,
    endHour: input.endHour,
    days: [...new Set(input.days)].sort(),
    newsFilter: input.newsFilter,
    newsMedium: input.newsMedium,
    newsBefore: input.newsBefore,
    newsAfter: input.newsAfter,
    newsClose: input.newsClose,
    pairs,
    admin: isAdmin,
  };
  const first = pairs[symbols[0]];
  // Colunas antigas continuam preenchidas (resumo; o robô v6.7 lê só esses campos).
  const values = {
    symbols,
    riskProfile: first.riskProfile,
    riskPct: first.riskProfile === "custom" ? first.riskPct.toFixed(2) : null,
    dailyGoalPct: input.dailyGoalPct.toFixed(2),
    dailyLossPct: input.dailyLossPct.toFixed(2),
    recovery: first.recovery,
    recoveryLevels: first.recoveryLevels,
    newsFilter: input.newsFilter,
    maxPositions: input.maxPositions,
    startHour: input.startHour,
    endHour: input.endHour,
    params,
    updatedBy,
    updatedAt: new Date(),
  };
  await db()
    .insert(schema.robotSettings)
    .values({ product, login, ...values })
    .onConflictDoUpdate({ target: [schema.robotSettings.product, schema.robotSettings.login], set: values });
}

const n = (v: number) => String(Math.round(v * 100) / 100);
const b = (v: boolean) => (v ? 1 : 0);

function pairPayload(p: PairParams) {
  return [
    `r:${n(p.riskPct)}`,
    `g:${n(p.goalPct)}`,
    `l:${n(p.lossPct)}`,
    `d:${p.direction}`,
    `rc:${b(p.recovery)}`,
    `lv:${p.recoveryLevels}`,
    `rd:${b(p.recoveryOpposite)}`,
    `rz:${p.rsiZone}`,
    `rp:${p.rsiPeriod}`,
    `rt:${p.rsiTf}`,
    `iv:${b(p.breakout)}`,
    `em:${b(p.pending)}`,
    `at:${b(p.atr)}`,
    `ax:${b(p.adx)}`,
    `al:${p.adxLevel}`,
    `zn:${b(p.zones)}`,
    `zm:${p.zonesMode}`,
    `be:${b(p.breakEven)}`,
    `tr:${b(p.trailing)}`,
  ].join(",");
}

// Texto que o robô recebe (sem "|", que separa os campos da resposta). Ex.:
// sym=XAUUSD,EURUSD;risk=2;goal=10.5;loss=5.5;rec=1;lv=10;news=1;max=10;h1=0;h2=22;dd=30;days=0123456;nm=0;nb=30;na=30;nc=3;
// p.XAUUSD=r:2,g:0,...;p.EURUSD=...;ver=3f9a1c2b7d10
// risk/rec/lv = do 1º par (o robô v6.7 só entende esses); v6.8+ usa os "p.PAR". ver = muda sempre que algo muda.
// v6.9: manda os ajustes de TODOS os pares (os desligados também) - o backtest usa os do par testado.
export function configPayload(c: ConfigValues) {
  const first = c.pairs[c.symbols[0]] ?? DEFAULT_PAIR;
  const body = [
    `sym=${c.symbols.join(",")}`,
    `risk=${n(first.riskPct)}`,
    `goal=${n(c.dailyGoalPct)}`,
    `loss=${n(c.dailyLossPct)}`,
    `rec=${b(first.recovery)}`,
    `lv=${first.recoveryLevels}`,
    `news=${b(c.newsFilter)}`,
    `max=${c.maxPositions}`,
    `h1=${c.startHour}`,
    `h2=${c.endHour}`,
    `dd=${n(c.ddPct)}`,
    `days=${c.days.join("")}`,
    `nm=${b(c.newsMedium)}`,
    `nb=${c.newsBefore}`,
    `na=${c.newsAfter}`,
    `nc=${c.newsClose}`,
    ...ROBOT_SYMBOLS.map((s) => `p.${s}=${pairPayload(c.pairs[s] ?? DEFAULT_PAIR)}`),
  ].join(";");
  return `${body};ver=${createHash("sha256").update(body).digest("hex").slice(0, 12)}`;
}

export { ROBOT_SYMBOLS, RISK_PROFILES, PCT_OPTIONS, MAX_POSITIONS };
