"use server";

import { revalidatePath } from "next/cache";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { logEvent } from "@/lib/config";
import { getRobotConfig, getRobotPolicy, saveRobotConfig, validateConfig } from "@/lib/robot-settings";
import { allowedSymbolKeys } from "@/lib/broker-symbols";
import { policyCan } from "@/lib/intel-stats";
import { policyPair, type ConfigValues } from "@/lib/robot-options";
import { PLAN_MAX_PAIRS } from "@/lib/plan-math";
import { activatePlan, analyzePlan, deletePlan, getPlan, isPct, isProfile, type ApplyError, type PlanDraft } from "@/lib/plan";

type Fail = { ok: false; error: "denied" | "invalid" | "blocked" | "busy" | "limit" | "state" | ApplyError };

const refresh = () => {
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
};

const sum = (o: Record<string, number>) => Math.round(Object.values(o).reduce((s, v) => s + v, 0) * 100) / 100;

// Passo 4: guarda as escolhas e pede a leitura dos pares pro robô.
export async function analyzePlanAction(login: string, draft: PlanDraft): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  if (!draft || (draft.mode !== "auto" && draft.mode !== "manual") || !isProfile(draft.profile)) return { ok: false, error: "invalid" };
  if (!isPct(draft.goalPct) || !isPct(draft.lossPct) || !(draft.goalPct > 0) || !(draft.lossPct > 0)) return { ok: false, error: "invalid" };
  const pairGoals: Record<string, number> = {};
  if (draft.mode === "manual") {
    const keys = await allowedSymbolKeys(PRODUCT.slug, login);
    const entries = Object.entries(draft.pairGoals ?? {});
    if (!entries.length || entries.length > PLAN_MAX_PAIRS) return { ok: false, error: "invalid" };
    for (const [s, v] of entries) {
      if (!keys.has(s) || !isPct(v) || !(v > 0)) return { ok: false, error: "invalid" };
      pairGoals[s] = v;
    }
    if (Math.abs(sum(pairGoals) - draft.goalPct) > 1e-6) return { ok: false, error: "invalid" };
  }
  const policy = user.isAdmin ? null : await getRobotPolicy();
  if (policy) {
    const cfg = await getRobotConfig(PRODUCT.slug, login);
    const can = policyCan(policy);
    if (!can("dailyGoalPct", draft.goalPct, cfg.dailyGoalPct) || !can("dailyLossPct", draft.lossPct, cfg.dailyLossPct)) return { ok: false, error: "blocked" };
    if (Object.values(pairGoals).some((v) => !can("goalPct", v, null))) return { ok: false, error: "blocked" };
  }
  const r = await analyzePlan(PRODUCT.slug, login, { ...draft, pairGoals }, policy, user.email, user.isAdmin);
  if (!r.ok) return { ok: false, error: r.error };
  if (user.isAdmin) await logEvent(user.email, "robot.plan", `${login}: Assistente ${draft.mode} - meta ${draft.goalPct}% / perda ${draft.lossPct}% (análise pedida)`);
  refresh();
  return { ok: true };
}

// Manual, passo 4: "usar o padrão do robô" nos pares escolhidos (estratégia, filtros e saída voltam pro padrão do admin).
export async function applyPlanDefaultsAction(login: string, symbols: string[]): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const keys = await allowedSymbolKeys(PRODUCT.slug, login);
  if (!Array.isArray(symbols) || !symbols.length || symbols.length > PLAN_MAX_PAIRS || symbols.some((s) => !keys.has(s))) return { ok: false, error: "invalid" };
  const policy = await getRobotPolicy();
  const full = await getRobotConfig(PRODUCT.slug, login);
  const config: ConfigValues = { ...full };
  delete (config as Partial<typeof full>).updatedAt;
  delete (config as Partial<typeof full>).admin;
  const base = policyPair(policy);
  const pairs = { ...config.pairs };
  for (const s of symbols) pairs[s] = { ...base, riskProfile: pairs[s]?.riskProfile ?? base.riskProfile, riskPct: pairs[s]?.riskPct ?? base.riskPct };
  const next = { ...config, pairs };
  if (validateConfig(next, user.isAdmin, keys)) return { ok: false, error: "invalid" };
  await saveRobotConfig(PRODUCT.slug, login, next, user.email, user.isAdmin, policy);
  refresh();
  return { ok: true };
}

// Passo 5: ativa (o robô recebe a configuração em ~30 s). pairGoals = metas por par que o cliente confirmou (podem ter sido ajustadas).
export async function activatePlanAction(login: string, choices: { pairGoals: Record<string, number>; useAi: string[] }): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const plan = await getPlan(PRODUCT.slug, login);
  if (!plan || (plan.status !== "ready" && plan.status !== "active")) return { ok: false, error: "state" };
  const pairGoals: Record<string, number> = {};
  for (const [s, v] of Object.entries(choices?.pairGoals ?? {})) {
    if (typeof v !== "number" || !(v > 0)) continue;
    pairGoals[s] = Math.round(v * 2) / 2;
  }
  const useAi = Array.isArray(choices?.useAi) ? choices.useAi.filter((s) => typeof s === "string" && s in pairGoals) : [];
  if (!Object.keys(pairGoals).length) return { ok: false, error: "noPairs" };
  // a meta geral passa a ser a soma do que o cliente confirmou (ele pode ter ajustado par a par)
  const total = sum(pairGoals);
  if (!isPct(total)) return { ok: false, error: "invalid" };
  const policy = user.isAdmin ? null : await getRobotPolicy();
  if (policy && !policyCan(policy)("dailyGoalPct", total, null)) return { ok: false, error: "blocked" };
  const r = await activatePlan(PRODUCT.slug, login, { ...plan, goalPct: total.toFixed(2) }, { pairGoals, useAi }, user.email, user.isAdmin);
  if (!r.ok) return r;
  if (user.isAdmin) await logEvent(user.email, "robot.plan", `${login}: Assistente ativado - ${Object.entries(pairGoals).map(([s, v]) => `${s} ${v}%`).join(", ")}`);
  refresh();
  return { ok: true };
}

// Recomeçar o passo a passo (a configuração do robô fica como está até ativar de novo).
export async function resetPlanAction(login: string): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  await deletePlan(PRODUCT.slug, login);
  refresh();
  return { ok: true };
}
