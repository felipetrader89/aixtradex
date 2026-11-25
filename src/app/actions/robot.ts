"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { canConfigure } from "@/lib/robot-access";
import { PRODUCT } from "@/lib/plans";
import { getRobotAdminSettings, saveRobotConfig, validateConfig, type ConfigError, type ConfigInput } from "@/lib/robot-settings";
import { logEvent, setSetting } from "@/lib/config";

export async function saveRobotSettingsAction(
  login: string,
  input: ConfigInput
): Promise<{ ok: true } | { ok: false; error: ConfigError | "denied" }> {
  const user = await canConfigure(login);
  if (!user) return { ok: false, error: "denied" };
  const error = validateConfig(input, user.isAdmin, await getRobotAdminSettings());
  if (error) return { ok: false, error };
  await saveRobotConfig(PRODUCT.slug, login, input, user.email);
  if (user.isAdmin) {
    const risks = input.symbols.map((s) => `${s} ${input.pairs[s].riskProfile === "custom" ? `${input.pairs[s].riskPct}%` : input.pairs[s].riskProfile}`);
    await logEvent(user.email, "robot.settings", `${login}: ${risks.join(", ")} · DD ${input.ddPct}%`);
  }
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}

// Admin → Configurações → Robô: teto do rebaixamento que o cliente pode escolher e o padrão de quem não mexeu.
export async function saveRobotAdminAction(form: FormData) {
  const admin = await requireAdmin();
  const ddCap = Number(form.get("ddCap"));
  const ddDefault = Number(form.get("ddDefault"));
  const back = (msg: string, error = false): never => {
    revalidatePath("/admin", "layout");
    redirect(`/admin/settings/robot?${error ? "err" : "msg"}=${encodeURIComponent(msg)}`);
  };
  if (!Number.isInteger(ddCap) || ddCap < 1 || ddCap > 100) back("O teto precisa ser um número inteiro de 1 a 100.", true);
  if (!Number.isInteger(ddDefault) || ddDefault < 0 || ddDefault > ddCap) back("O padrão precisa ficar entre 0 (desligado) e o teto.", true);
  await setSetting("robot", { ddCap, ddDefault });
  await logEvent(admin.email, "robot.admin", `Rebaixamento: teto ${ddCap}% · padrão ${ddDefault}%`);
  back(`Salvo. Clientes escolhem até ${ddCap}%; quem não mexeu fica com ${ddDefault === 0 ? "desligado" : `${ddDefault}%`}.`);
}
