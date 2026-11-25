"use server";

import { revalidatePath } from "next/cache";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { logEvent } from "@/lib/config";
import { getRobotConfig, getRobotPolicy, saveRobotConfig, validateConfig } from "@/lib/robot-settings";
import { buildSpec, requestScan, SCAN_PERIODS, type ScanPeriod } from "@/lib/intelligence";
import { allowedSymbolKeys } from "@/lib/broker-symbols";
import { type ConfigValues, type PairParams, type ParamKey } from "@/lib/robot-options";
import { FULL_KEYS, STRATEGY_KEYS, fixedGroups, policyCan } from "@/lib/intel-stats";
import { generateAnalysis, type AnalysisError } from "@/lib/ai-analysis";

type Fail = { ok: false; error: "denied" | "busy" | "limit" | "invalid" | "blocked" };

// Pede um estudo de velas pro robô da conta (ele busca em até 30 s e roda no terminal do cliente).
// symbol = "*" → um estudo pra cada par ligado (o robô faz um de cada vez).
export async function requestScanAction(login: string, symbol: string, period: ScanPeriod, full = false): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  if (!(SCAN_PERIODS as readonly string[]).includes(period)) return { ok: false, error: "invalid" };
  const [config, keys] = await Promise.all([getRobotConfig(PRODUCT.slug, login), allowedSymbolKeys(PRODUCT.slug, login)]);
  const symbols = symbol === "*" ? config.symbols : [symbol];
  if (!symbols.length || symbols.some((s) => !keys.has(s))) return { ok: false, error: "invalid" };
  const fix = full ? fixedGroups(user.isAdmin ? null : await getRobotPolicy()) : [];
  const items = symbols.map((s) => ({ symbol: s, spec: buildSpec(period, config.pairs[s] ?? config.pairs[config.symbols[0]], full ? { fix } : undefined) }));
  const r = await requestScan(PRODUCT.slug, login, items, user.email);
  if (!r.ok) return { ok: false, error: r.error };
  if (user.isAdmin) await logEvent(user.email, "robot.scan", `${login}: ${full ? "leitura completa" : "estudo"} ${symbols.join(", ")} (${period})`);
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Aplica uma sugestão num par: combinação do estudo, conjunto da comunidade ou a leitura completa (vários ajustes de uma vez).
export async function applySuggestionAction(login: string, symbol: string, patch: Record<string, unknown>): Promise<{ ok: true } | Fail> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  if (!patch || typeof patch !== "object") return { ok: false, error: "invalid" };
  const keys = await allowedSymbolKeys(PRODUCT.slug, login);
  if (!keys.has(symbol)) return { ok: false, error: "invalid" };
  const changed = Object.keys(patch);
  const allowedKeys = new Set<string>([...STRATEGY_KEYS, ...FULL_KEYS]);
  if (!changed.length || changed.some((k) => !allowedKeys.has(k))) return { ok: false, error: "invalid" };
  const policy = await getRobotPolicy();
  const full = await getRobotConfig(PRODUCT.slug, login);
  if (!user.isAdmin) {
    // cliente: só o que o admin liberou (oculto = só se não mudar)
    const can = policyCan(policy);
    const cur = full.pairs[symbol] ?? full.pairs[full.symbols[0]];
    for (const k of changed as ParamKey[]) {
      if (!policy[k].show || !can(k, patch[k], cur[k as keyof typeof cur])) return { ok: false, error: "blocked" };
    }
  }
  const config: ConfigValues = { ...full };
  delete (config as Partial<typeof full>).updatedAt;
  delete (config as Partial<typeof full>).admin;
  const pair = { ...(config.pairs[symbol] ?? config.pairs[config.symbols[0]]), ...(patch as Partial<PairParams>) };
  const next = { ...config, pairs: { ...config.pairs, [symbol]: pair } };
  if (validateConfig(next, user.isAdmin, keys)) return { ok: false, error: "invalid" };
  await saveRobotConfig(PRODUCT.slug, login, next, user.email, user.isAdmin, policy);
  if (user.isAdmin) await logEvent(user.email, "robot.intel", `${login}: sugestão aplicada em ${symbol} (${changed.map((k) => `${k}=${JSON.stringify((patch as Record<string, unknown>)[k])}`).join(", ")})`);
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Ai X Intelligence: análise escrita pela IA (Claude) em cima das estatísticas da conta.
export async function generateAnalysisAction(login: string, locale: string): Promise<{ ok: true } | { ok: false; error: AnalysisError | "denied" }> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const policy = user.isAdmin ? null : await getRobotPolicy();
  const r = await generateAnalysis({
    product: PRODUCT.slug,
    login,
    locale: ["pt", "en", "es"].includes(locale) ? locale : "en",
    policy,
    requestedBy: user.email,
    isAdmin: user.isAdmin,
  });
  if (!r.ok) return r;
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
