export const PLAN_KEYS = ["licenseMonthly", "licenseLifetime"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

// Caminho do plano dentro de `Products` nas mensagens.
export const PLAN_PATH: Record<PlanKey, string> = {
  licenseMonthly: "license.oneMonth",
  licenseLifetime: "license.lifetime",
};

// Quantas contas MT4 cada licença libera.
export const PLAN_ACCOUNTS: Record<PlanKey, number> = {
  licenseMonthly: 2,
  licenseLifetime: 5,
};

export function isPlanKey(value: string | undefined): value is PlanKey {
  return PLAN_KEYS.includes(value as PlanKey);
}
