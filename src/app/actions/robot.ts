"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { getRobotPolicy, saveRobotConfig, validateConfig, type ConfigError, type ConfigInput } from "@/lib/robot-settings";
import { PARAM_KEYS, normalizePolicy, type RobotPolicy } from "@/lib/robot-options";
import { getSetting, logEvent, setSetting } from "@/lib/config";

export async function saveRobotSettingsAction(
  login: string,
  input: ConfigInput
): Promise<{ ok: true } | { ok: false; error: ConfigError | "denied" }> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const error = validateConfig(input, user.isAdmin);
  if (error) return { ok: false, error };
  await saveRobotConfig(PRODUCT.slug, login, input, user.email, user.isAdmin, await getRobotPolicy());
  if (user.isAdmin) {
    const risks = input.symbols.map((s) => `${s} ${input.pairs[s].riskProfile === "custom" ? `${input.pairs[s].riskPct}%` : input.pairs[s].riskProfile}`);
    await logEvent(user.email, "robot.settings", `${login}: ${risks.join(", ")} · DD ${input.ddPct}%`);
  }
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}

// Admin → Configurações → Robô: o que o cliente vê, o padrão e as opções liberadas de cada parâmetro.
export async function saveRobotPolicyAction(input: RobotPolicy): Promise<{ ok: true; policy: RobotPolicy } | { ok: false }> {
  const admin = await requireAdmin();
  if (!input || typeof input !== "object") return { ok: false };
  const policy = normalizePolicy(input);
  const old = await getSetting("robot");
  await setSetting("robot", { policy });
  const prev = normalizePolicy(old?.policy, old ?? undefined);
  const changed = PARAM_KEYS.filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(policy[k]));
  await logEvent(admin.email, "robot.admin", changed.length ? `Permissões do robô: ${changed.join(", ")}` : "Permissões do robô salvas (sem mudança)");
  revalidatePath("/admin", "layout");
  revalidatePath("/[locale]/account", "layout");
  return { ok: true, policy };
}
