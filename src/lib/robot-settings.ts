import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { RobotSettings } from "@/lib/db/schema";

// Configuração do robô por conta MT4 (Área do cliente → Contas MT4 → Configurar robô).
// O robô (v6.7+) recebe junto com a consulta de licença (/api/license/check?...&cfg=1), a cada 5 min.

// Pares mais negociados. Nome base: o robô acha o nome da corretora (sufixo m, c, .pro...).
export const ROBOT_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD"] as const;

// % do saldo arriscado em cada entrada (até o fechamento na perda). Moderado = o padrão de sempre no ouro (0,01 a cada $250).
export const RISK_PROFILES = { conservative: 1, moderate: 2, aggressive: 3 } as const;
export type RiskProfile = keyof typeof RISK_PROFILES | "custom";

export const GOAL_OPTIONS = [0, 3.5, 5.5, 10.5] as const; // 0 = desligada
export const LOSS_OPTIONS = [0, 3.5, 5.5, 10.5] as const;
export const MAX_POSITIONS = 10;

export type RobotConfig = {
  symbols: string[];
  riskProfile: RiskProfile;
  riskPct: number; // % efetivo (do perfil ou personalizado)
  dailyGoalPct: number;
  dailyLossPct: number;
  recovery: boolean;
  recoveryLevels: number;
  newsFilter: boolean;
  maxPositions: number;
  startHour: number;
  endHour: number;
  updatedAt: Date | null;
};

export const DEFAULT_CONFIG: RobotConfig = {
  symbols: ["XAUUSD"],
  riskProfile: "moderate",
  riskPct: RISK_PROFILES.moderate,
  dailyGoalPct: 10.5,
  dailyLossPct: 5.5,
  recovery: true,
  recoveryLevels: 10,
  newsFilter: true,
  maxPositions: MAX_POSITIONS,
  startHour: 0,
  endHour: 22,
  updatedAt: null,
};

function toConfig(row: RobotSettings | undefined): RobotConfig {
  if (!row) return DEFAULT_CONFIG;
  const profile = row.riskProfile as RiskProfile;
  return {
    symbols: row.symbols.filter((s) => (ROBOT_SYMBOLS as readonly string[]).includes(s)),
    riskProfile: profile,
    riskPct: profile === "custom" ? Number(row.riskPct ?? RISK_PROFILES.moderate) : RISK_PROFILES[profile],
    dailyGoalPct: Number(row.dailyGoalPct),
    dailyLossPct: Number(row.dailyLossPct),
    recovery: row.recovery,
    recoveryLevels: row.recoveryLevels,
    newsFilter: row.newsFilter,
    maxPositions: row.maxPositions,
    startHour: row.startHour,
    endHour: row.endHour,
    updatedAt: row.updatedAt,
  };
}

export async function getRobotConfig(product: string, login: string) {
  const [row] = await db()
    .select()
    .from(schema.robotSettings)
    .where(and(eq(schema.robotSettings.product, product), eq(schema.robotSettings.login, login)));
  return toConfig(row);
}

export type ConfigInput = Omit<RobotConfig, "riskPct" | "updatedAt"> & { riskPct?: number };
export type ConfigError = "symbols" | "risk" | "goal" | "loss" | "levels" | "positions" | "hours";

// Confere tudo que vem do formulário (nunca confiar no navegador). Personalizado só pra admin.
export function validateConfig(input: ConfigInput, isAdmin: boolean): ConfigError | null {
  if (!input.symbols.length || input.symbols.some((s) => !(ROBOT_SYMBOLS as readonly string[]).includes(s))) return "symbols";
  if (input.riskProfile === "custom") {
    if (!isAdmin || !(Number(input.riskPct) >= 0.1 && Number(input.riskPct) <= 10)) return "risk";
  } else if (!(input.riskProfile in RISK_PROFILES)) return "risk";
  if (!(GOAL_OPTIONS as readonly number[]).includes(input.dailyGoalPct)) return "goal";
  if (!(LOSS_OPTIONS as readonly number[]).includes(input.dailyLossPct)) return "loss";
  if (!Number.isInteger(input.recoveryLevels) || input.recoveryLevels < 1 || input.recoveryLevels > 10) return "levels";
  if (!Number.isInteger(input.maxPositions) || input.maxPositions < 1 || input.maxPositions > MAX_POSITIONS) return "positions";
  if (
    !Number.isInteger(input.startHour) || !Number.isInteger(input.endHour) ||
    input.startHour < 0 || input.startHour > 23 || input.endHour < 1 || input.endHour > 24 || input.endHour <= input.startHour
  )
    return "hours";
  return null;
}

export async function saveRobotConfig(product: string, login: string, input: ConfigInput, updatedBy: string) {
  const values = {
    symbols: ROBOT_SYMBOLS.filter((s) => input.symbols.includes(s)),
    riskProfile: input.riskProfile,
    riskPct: input.riskProfile === "custom" ? Number(input.riskPct).toFixed(2) : null,
    dailyGoalPct: input.dailyGoalPct.toFixed(2),
    dailyLossPct: input.dailyLossPct.toFixed(2),
    recovery: input.recovery,
    recoveryLevels: input.recoveryLevels,
    newsFilter: input.newsFilter,
    maxPositions: input.maxPositions,
    startHour: input.startHour,
    endHour: input.endHour,
    updatedBy,
    updatedAt: new Date(),
  };
  await db()
    .insert(schema.robotSettings)
    .values({ product, login, ...values })
    .onConflictDoUpdate({ target: [schema.robotSettings.product, schema.robotSettings.login], set: values });
}

// Texto que o robô recebe (sem "|", que separa os campos da resposta). Ex.:
// sym=XAUUSD,EURUSD;risk=2;goal=10.5;loss=5.5;rec=1;lv=10;news=1;max=10;h1=0;h2=22;ver=1764000000
export function configPayload(c: RobotConfig) {
  const n = (v: number) => String(Math.round(v * 100) / 100);
  return [
    `sym=${c.symbols.join(",")}`,
    `risk=${n(c.riskPct)}`,
    `goal=${n(c.dailyGoalPct)}`,
    `loss=${n(c.dailyLossPct)}`,
    `rec=${c.recovery ? 1 : 0}`,
    `lv=${c.recoveryLevels}`,
    `news=${c.newsFilter ? 1 : 0}`,
    `max=${c.maxPositions}`,
    `h1=${c.startHour}`,
    `h2=${c.endHour}`,
    `ver=${c.updatedAt ? Math.floor(c.updatedAt.getTime() / 1000) : 0}`,
  ].join(";");
}
