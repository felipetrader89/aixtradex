"use server";

import { revalidatePath } from "next/cache";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { saveRobotConfig, validateConfig, type ConfigError, type ConfigInput } from "@/lib/robot-settings";
import { logEvent } from "@/lib/config";

export async function saveRobotSettingsAction(
  login: string,
  input: ConfigInput
): Promise<{ ok: true } | { ok: false; error: ConfigError | "denied" }> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const error = validateConfig(input, user.isAdmin);
  if (error) return { ok: false, error };
  await saveRobotConfig(PRODUCT.slug, login, input, user.email);
  if (user.isAdmin) {
    await logEvent(user.email, "robot.settings", `${login}: ${input.symbols.join(",")} · ${input.riskProfile}${input.riskProfile === "custom" ? ` ${input.riskPct}%` : ""}`);
  }
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}
