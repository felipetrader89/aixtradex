"use server";

import { revalidatePath } from "next/cache";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { logEvent } from "@/lib/config";
import { getRobotConfig, getRobotPolicy, saveRobotConfig, validateConfig } from "@/lib/robot-settings";
import { buildSpec, requestScan, SCAN_PERIODS, type ScanPeriod } from "@/lib/intelligence";
import { ROBOT_SYMBOLS, fitRange, hasValue, paramDef, type ConfigValues, type PairParams, type ParamKey, type PolicyValue } from "@/lib/robot-options";
import { STRATEGY_KEYS, type Strategy } from "@/lib/intel-stats";

type Fail = { ok: false; error: "denied" | "busy" | "limit" | "invalid" | "blocked" };

// Pede um estudo de velas pro robô da conta (ele busca em até 30 s e roda no terminal do cliente).
export async function requestScanAction(login: string, symbol: string, period: ScanPeriod): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  if (!(ROBOT_SYMBOLS as readonly string[]).includes(symbol) || !(SCAN_PERIODS as readonly string[]).includes(period)) return { ok: false, error: "invalid" };
  const config = await getRobotConfig(PRODUCT.slug, login);
  const r = await requestScan(PRODUCT.slug, login, symbol, buildSpec(period, config.pairs[symbol]), user.email);
  if (!r.ok) return { ok: false, error: r.error };
  if (user.isAdmin) await logEvent(user.email, "robot.scan", `${login}: estudo ${symbol} (${period})`);
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Aplica uma sugestão num par (combinação do estudo ou conjunto da comunidade). Cliente: só o que o admin liberou.
export async function applySuggestionAction(login: string, symbol: string, patch: Strategy): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  if (!(ROBOT_SYMBOLS as readonly string[]).includes(symbol) || !patch || typeof patch !== "object") return { ok: false, error: "invalid" };
  const keys = Object.keys(patch);
  if (!keys.length || keys.some((k) => !(STRATEGY_KEYS as readonly string[]).includes(k))) return { ok: false, error: "invalid" };
  const policy = await getRobotPolicy();
  if (!user.isAdmin) {
    for (const k of keys as ParamKey[]) {
      const pol = policy[k];
      const v = (patch as Record<string, unknown>)[k];
      const ok = pol.show && (paramDef(k).range ? fitRange(k, v, pol) === v : hasValue(pol.allow, v as PolicyValue));
      if (!ok) return { ok: false, error: "blocked" };
    }
  }
  const full = await getRobotConfig(PRODUCT.slug, login);
  const config: ConfigValues = { ...full };
  delete (config as Partial<typeof full>).updatedAt;
  delete (config as Partial<typeof full>).admin;
  const pair = { ...config.pairs[symbol], ...(patch as Partial<PairParams>) };
  const next = { ...config, pairs: { ...config.pairs, [symbol]: pair } };
  if (validateConfig(next, user.isAdmin)) return { ok: false, error: "invalid" };
  await saveRobotConfig(PRODUCT.slug, login, next, user.email, user.isAdmin, policy);
  if (user.isAdmin) await logEvent(user.email, "robot.intel", `${login}: sugestão aplicada em ${symbol} (${keys.map((k) => `${k}=${JSON.stringify((patch as Record<string, unknown>)[k])}`).join(", ")})`);
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
