import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getRobotConfig, getRobotPolicy, saveRobotConfig, validateConfig } from "@/lib/robot-settings";
import { buildSpec, requestScan } from "@/lib/intelligence";
import { allowedSymbolKeys, getBrokerSymbols } from "@/lib/broker-symbols";
import { FULL_KEYS, fixedGroups, fullPatch, policyCan, type ScanResult } from "@/lib/intel-stats";
import {
  DEFAULT_PAIR,
  OTHER_ASSETS,
  PCT_OPTIONS,
  RISK_PROFILES,
  ROBOT_SYMBOLS,
  hasValue,
  isStandardSymbol,
  type ConfigValues,
  type PairParams,
  type ParamKey,
  type RobotPolicy,
} from "@/lib/robot-options";
import {
  PLAN_MAX_PAIRS,
  analyzePair,
  autoCandidates,
  evaluateAuto,
  type PairAnalysis,
  type PlanProfile,
  PLAN_PROFILE_KEYS,
} from "@/lib/plan-math";

// Assistente "Comece em 5 passos" (Área do cliente → página inicial). Matemática em src/lib/plan-math.ts.
//  1) conta (o robô precisa estar ligado)  2) modo automático ou manual  3) meta e limite de perda do dia (perfil ou %)
//  4) leitura completa de 1 mês dos pares (no terminal do cliente)  5) revisar a chance de bater a meta e ativar.
// Automático: o portal escolhe os pares e a combinação de cada um e divide a meta; todo dia útil refaz sozinho.
// Manual: o cliente escolhe os pares e a meta de cada um; pode trocar a configuração de um par pela da IA.

export type Plan = typeof schema.robotPlans.$inferSelect;
export type PlanMode = Plan["mode"];
export type PlanSummary = { at: string; pairs: { symbol: string; goal: number }[]; added: string[]; removed: string[]; note?: "none" | "kept" };

const PERIOD = "1m" as const; // leitura de 1 mês: rápida (ouro M1 ~2 min) e recente
const RETRY_MS = 10 * 60_000;
const BY_AUTO = "Ai X Intelligence (auto)";

export const PROFILE_RISK: Partial<Record<PlanProfile, keyof typeof RISK_PROFILES>> = {
  conservative: "conservative",
  moderate: "moderate",
  aggressive: "aggressive",
};

export const isPct = (v: unknown) => typeof v === "number" && hasValue(PCT_OPTIONS, v);
// maior opção de % que não passa de v (acima de 10 as opções pulam: 10,5 / 11 / 12...)
export const snapPct = (v: number) => (PCT_OPTIONS as readonly number[]).filter((o) => o <= v + 1e-9).pop() ?? 0;
export const isProfile = (v: unknown): v is PlanProfile => (PLAN_PROFILE_KEYS as readonly unknown[]).includes(v);

export async function getPlan(product: string, login: string) {
  const [row] = await db()
    .select()
    .from(schema.robotPlans)
    .where(and(eq(schema.robotPlans.product, product), eq(schema.robotPlans.login, login)));
  return row ?? null;
}

export async function plansFor(product: string, logins: string[]) {
  if (!logins.length) return new Map<string, Plan>();
  const rows = await db()
    .select()
    .from(schema.robotPlans)
    .where(and(eq(schema.robotPlans.product, product), inArray(schema.robotPlans.login, logins)));
  return new Map(rows.map((r) => [r.login, r]));
}

async function updatePlan(product: string, login: string, set: Partial<Plan>) {
  await db()
    .update(schema.robotPlans)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(schema.robotPlans.product, product), eq(schema.robotPlans.login, login)));
}

export async function deletePlan(product: string, login: string) {
  await db()
    .delete(schema.robotPlans)
    .where(and(eq(schema.robotPlans.product, product), eq(schema.robotPlans.login, login)));
}

// Risco de cada entrada que o par vai usar depois de ativar (o perfil do Assistente manda no risco; personalizado = o do par).
export function riskFor(profile: string, pair: PairParams | undefined) {
  const p = PROFILE_RISK[profile as PlanProfile];
  return p ? RISK_PROFILES[p] : (pair?.riskPct ?? DEFAULT_PAIR.riskPct);
}

// Pares que o automático lê: os 8 de sempre que a corretora tem + os outros ativos que a conta já ligou (até 12),
// só os que o cliente pode ligar (permissão "Pares" do admin).
export async function autoSymbols(product: string, login: string, config: ConfigValues, policy: RobotPolicy | null) {
  const broker = await getBrokerSymbols(product, login);
  const have = broker ? new Set(broker.symbols.map((s) => s.k)) : null;
  const can = (s: string) =>
    !policy || (isStandardSymbol(s) ? hasValue(policy.symbols.allow, s) : hasValue(policy.symbols.allow, OTHER_ASSETS));
  const list = [...ROBOT_SYMBOLS.filter((s) => !have || have.has(s)), ...config.symbols.filter((s) => !isStandardSymbol(s))];
  return [...new Set(list)].filter(can).slice(0, PLAN_MAX_PAIRS);
}

// Pede a leitura completa de 1 mês dos pares (o robô faz um de cada vez). Meta/perda do dia ficam de fora (o Assistente decide).
async function startRun(product: string, login: string, symbols: string[], config: ConfigValues, policy: RobotPolicy | null, by: string) {
  const fix = [...new Set([...fixedGroups(policy), "goal", "dloss"])];
  const items = symbols.map((s) => ({ symbol: s, spec: buildSpec(PERIOD, config.pairs[s] ?? config.pairs[config.symbols[0]] ?? DEFAULT_PAIR, { fix, daily: true }) }));
  return requestScan(product, login, items, by);
}

export type PlanDraft = {
  mode: PlanMode;
  profile: PlanProfile;
  goalPct: number;
  lossPct: number;
  pairGoals: Record<string, number>;
};

// Passo 4: guarda o que o cliente escolheu e pede as leituras.
export async function analyzePlan(product: string, login: string, draft: PlanDraft, policy: RobotPolicy | null, by: string) {
  const config = await getRobotConfig(product, login);
  const symbols = draft.mode === "auto" ? await autoSymbols(product, login, config, policy) : Object.keys(draft.pairGoals);
  if (!symbols.length) return { ok: false as const, error: "invalid" as const };
  const r = await startRun(product, login, symbols, config, policy, by);
  if (!r.ok) return r;
  const values = {
    mode: draft.mode,
    profile: draft.profile,
    goalPct: draft.goalPct.toFixed(2),
    lossPct: draft.lossPct.toFixed(2),
    pairGoals: draft.pairGoals,
    useAi: [],
    status: "analyzing" as const,
    scanIds: r.ids,
    pendingApply: false,
    updatedAt: new Date(),
  };
  await db()
    .insert(schema.robotPlans)
    .values({ product, login, ...values })
    .onConflictDoUpdate({ target: [schema.robotPlans.product, schema.robotPlans.login], set: values });
  return { ok: true as const };
}

// Leituras do plano (na ordem pedida) → resultado por par.
export async function planAnalyses(product: string, login: string, plan: Plan): Promise<PairAnalysis[]> {
  const ids = (plan.scanIds as number[]) ?? [];
  if (!ids.length) return [];
  const rows = await db()
    .select({
      id: schema.robotScans.id,
      symbol: schema.robotScans.symbol,
      status: schema.robotScans.status,
      error: schema.robotScans.error,
      result: schema.robotScans.result,
    })
    .from(schema.robotScans)
    .where(and(eq(schema.robotScans.product, product), eq(schema.robotScans.login, login), inArray(schema.robotScans.id, ids)));
  return ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => analyzePair(r.symbol, r.status, r.error, (r.result as ScanResult | null) ?? null));
}

const finished = (list: PairAnalysis[]) => list.length > 0 && list.every((a) => a.status !== "pending" && a.status !== "running");

export type ApplyChoices = { pairGoals: Record<string, number>; useAi: string[] };
export type ApplyError = "invalid" | "noPairs" | "config";

// Passo 5 (e a reaplicação diária do automático): monta a configuração e salva. O robô recebe em ~30 s.
export async function applyPlan(opts: {
  product: string;
  login: string;
  plan: Plan;
  choices: ApplyChoices;
  by: string;
  isAdmin: boolean;
}): Promise<{ ok: true; summary: PlanSummary } | { ok: false; error: ApplyError }> {
  const { product, login, plan, choices, by, isAdmin } = opts;
  const policy = await getRobotPolicy();
  const [full, keys, analyses] = await Promise.all([getRobotConfig(product, login), allowedSymbolKeys(product, login), planAnalyses(product, login, plan)]);
  const goals: Record<string, number> = {};
  for (const [s, v] of Object.entries(choices.pairGoals)) if (typeof v === "number" && snapPct(v) > 0) goals[s] = snapPct(v);
  const symbols = Object.keys(goals);
  if (!symbols.length) return { ok: false, error: "noPairs" };
  if (symbols.length > PLAN_MAX_PAIRS || symbols.some((s) => !keys.has(s))) return { ok: false, error: "invalid" };
  const can = policyCan(isAdmin ? null : policy);
  const config: ConfigValues = { ...full };
  delete (config as Partial<typeof full>).updatedAt;
  delete (config as Partial<typeof full>).admin;
  const pairs = { ...config.pairs };
  const riskKey = PROFILE_RISK[plan.profile as PlanProfile];
  for (const s of symbols) {
    let pair: PairParams = { ...(pairs[s] ?? pairs[config.symbols[0]] ?? DEFAULT_PAIR) };
    const a = analyses.find((x) => x.symbol === s);
    const wantAi = plan.mode === "auto" || choices.useAi.includes(s);
    if (wantAi && a?.bestCfg) {
      const patch = fullPatch(a.bestCfg, pair) as Record<string, unknown>;
      delete patch.goalPct;
      delete patch.lossPct;
      // cliente: só o que o admin liberou (o resto fica como está)
      for (const k of Object.keys(patch)) if (!FULL_KEYS.includes(k as ParamKey) || !can(k as ParamKey, patch[k], pair[k as keyof PairParams])) delete patch[k];
      pair = { ...pair, ...(patch as Partial<PairParams>) };
    }
    if (riskKey && can("riskProfile", riskKey, pair.riskProfile)) pair = { ...pair, riskProfile: riskKey, riskPct: RISK_PROFILES[riskKey] };
    pair.goalPct = goals[s];
    pair.lossPct = 0; // o limite de perda é o da conta (para tudo)
    pairs[s] = pair;
  }
  const ordered = [...ROBOT_SYMBOLS.filter((s) => symbols.includes(s)), ...symbols.filter((s) => !isStandardSymbol(s))];
  const next: ConfigValues = {
    ...config,
    symbols: ordered,
    dailyGoalPct: Number(plan.goalPct),
    dailyLossPct: Number(plan.lossPct),
    pairs,
  };
  if (validateConfig(next, isAdmin, keys)) return { ok: false, error: "config" };
  await saveRobotConfig(product, login, next, by, isAdmin, policy);
  const before = new Set(full.symbols);
  const summary: PlanSummary = {
    at: new Date().toISOString(),
    pairs: ordered.map((s) => ({ symbol: s, goal: goals[s] })),
    added: ordered.filter((s) => !before.has(s)),
    removed: full.symbols.filter((s) => !ordered.includes(s)),
  };
  return { ok: true, summary };
}

// Escolha automática a partir das leituras (divisão da meta geral entre os melhores pares).
export function autoChoice(plan: Plan, analyses: PairAnalysis[], config: ConfigValues) {
  const cands = autoCandidates(analyses, (s) => riskFor(plan.profile, config.pairs[s]), config.days);
  return evaluateAuto(cands, Number(plan.goalPct), Number(plan.lossPct), config.days);
}

// Robô terminou (ou desistiu de) uma leitura: se era a última do plano, marca pronto ou reaplica (automático).
export async function planScanFinished(product: string, login: string) {
  const plan = await getPlan(product, login);
  if (!plan || !(plan.scanIds as number[]).length) return;
  if (plan.status !== "analyzing" && !(plan.status === "active" && plan.pendingApply)) return;
  const analyses = await planAnalyses(product, login, plan);
  if (!finished(analyses)) return;
  if (plan.status === "analyzing") {
    await updatePlan(product, login, { status: "ready" });
    return;
  }
  await finishAutoRun(product, login, plan, analyses);
}

async function finishAutoRun(product: string, login: string, plan: Plan, analyses: PairAnalysis[]) {
  const config = await getRobotConfig(product, login);
  const { alloc } = autoChoice(plan, analyses, config);
  let summary: PlanSummary;
  if (!Object.keys(alloc).length) {
    // nenhum par confirmado hoje: mantém o que estava (melhor que parar sem avisar)
    summary = { at: new Date().toISOString(), pairs: [], added: [], removed: [], note: "none" };
  } else {
    const r = await applyPlan({ product, login, plan, choices: { pairGoals: alloc, useAi: [] }, by: BY_AUTO, isAdmin: config.admin });
    summary = r.ok ? r.summary : { at: new Date().toISOString(), pairs: [], added: [], removed: [], note: "kept" };
    if (r.ok)
      await db()
        .update(schema.robotPlans)
        .set({ pairGoals: Object.fromEntries(r.summary.pairs.map((p) => [p.symbol, p.goal])) })
        .where(and(eq(schema.robotPlans.product, product), eq(schema.robotPlans.login, login)));
  }
  await updatePlan(product, login, { pendingApply: false, summary });
}

// Chamado na consulta de 30 s do robô (v7.3+): automático ativo → uma leitura nova por dia útil (logo depois da meia-noite UTC).
export async function maybeAutoRun(product: string, login: string) {
  const plan = await getPlan(product, login);
  if (!plan || plan.mode !== "auto" || plan.status !== "active") return;
  const now = new Date();
  if (plan.pendingApply) {
    // leitura do dia em andamento: se todas acabaram (ou venceram), aplica
    const analyses = await planAnalyses(product, login, plan);
    if (finished(analyses) || !analyses.length) await finishAutoRun(product, login, plan, analyses);
    return;
  }
  const dow = now.getUTCDay();
  if (dow === 0 || dow === 6) return;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (plan.lastRunAt && plan.lastRunAt.getTime() >= today) return;
  if (plan.lastTryAt && now.getTime() - plan.lastTryAt.getTime() < RETRY_MS) return;
  await updatePlan(product, login, { lastTryAt: now });
  const config = await getRobotConfig(product, login);
  const policy = config.admin ? null : await getRobotPolicy();
  const symbols = await autoSymbols(product, login, config, policy);
  if (!symbols.length) return;
  const r = await startRun(product, login, symbols, config, policy, BY_AUTO);
  if (!r.ok) return; // ocupado (leitura pedida pelo cliente) ou limite do dia: tenta de novo em 10 min
  await updatePlan(product, login, { scanIds: r.ids, pendingApply: true, lastRunAt: now });
}

export async function activatePlan(product: string, login: string, plan: Plan, choices: ApplyChoices, by: string, isAdmin: boolean) {
  const r = await applyPlan({ product, login, plan, choices, by, isAdmin });
  if (!r.ok) return r;
  await updatePlan(product, login, {
    status: "active",
    goalPct: plan.goalPct,
    pairGoals: Object.fromEntries(r.summary.pairs.map((p) => [p.symbol, p.goal])),
    useAi: choices.useAi,
    summary: r.summary,
    activatedAt: new Date(),
    lastRunAt: new Date(), // a próxima leitura automática é no próximo dia útil
    pendingApply: false,
  });
  return r;
}

// ------------------------------------------------------------------ painel "Hoje"

export type TodayPair = { symbol: string; goal: number; pct: number; status: "hit" | "trading" | "stopped" | "done" };
export type Today = { goal: number; loss: number; pct: number; status: "trading" | "done" | "stopped"; pairs: TodayPair[]; base: number };

export async function todayFor(product: string, login: string, plan: Plan, stats: { balanceDayStart: string; resultToday: string; brokerGmt: number | null } | undefined): Promise<Today | null> {
  if (!stats) return null;
  const base = Number(stats.balanceDayStart);
  if (!(base > 0)) return null;
  const gmt = stats.brokerGmt ?? 0;
  const nowB = Math.floor(Date.now() / 1000) + gmt;
  const dayStart = new Date((nowB - (nowB % 86400) - gmt) * 1000);
  const rows = await db()
    .select({ symbol: schema.robotTrades.symbol, net: sql<string>`sum(${schema.robotTrades.net})` })
    .from(schema.robotTrades)
    .where(and(eq(schema.robotTrades.product, product), eq(schema.robotTrades.login, login), gte(schema.robotTrades.closeAt, dayStart)))
    .groupBy(schema.robotTrades.symbol);
  const goal = Number(plan.goalPct);
  const loss = Number(plan.lossPct);
  const pct = (Number(stats.resultToday) / base) * 100;
  const status: Today["status"] = loss > 0 && pct <= -loss ? "stopped" : goal > 0 && pct >= goal ? "done" : "trading";
  const goals = plan.pairGoals as Record<string, number>;
  const pairs: TodayPair[] = Object.entries(goals).map(([symbol, g]) => {
    const p = (Number(rows.find((r) => r.symbol === symbol)?.net ?? 0) / base) * 100;
    return { symbol, goal: g, pct: p, status: status !== "trading" ? status : g > 0 && p >= g ? "hit" : "trading" };
  });
  return { goal, loss, pct, status, pairs, base };
}
