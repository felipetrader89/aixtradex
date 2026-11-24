export const PLAN_KEYS = ["licenseMonthly", "licenseLifetime"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_PATH: Record<PlanKey, string> = {
  licenseMonthly: "license.oneMonth",
  licenseLifetime: "license.lifetime",
};

export const PLAN_ACCOUNTS: Record<PlanKey, number> = {
  licenseMonthly: 2,
  licenseLifetime: 5,
};

export function isPlanKey(value: string | undefined): value is PlanKey {
  return PLAN_KEYS.includes(value as PlanKey);
}

// Robô vendido pelo site (licença online checada pela conta MT4).
export const PRODUCT = { slug: "pulse-rs", name: "Ai X PULSE RS" } as const;

export type PlanType = "monthly" | "lifetime";

export const PLAN_TYPE: Record<PlanKey, PlanType> = {
  licenseMonthly: "monthly",
  licenseLifetime: "lifetime",
};

export const PLAN_KEY_BY_TYPE: Record<PlanType, PlanKey> = {
  monthly: "licenseMonthly",
  lifetime: "licenseLifetime",
};

// Valores em USD usados pelo servidor (o navegador não decide preço).
export const PLAN_PRICE_USD: Record<PlanType, number> = { monthly: 99, lifetime: 499 };
export const PLAN_DISCOUNT_USD: Record<PlanType, number> = { monthly: 30, lifetime: 50 };
export const PLAN_MAX_ACCOUNTS: Record<PlanType, number> = { monthly: 2, lifetime: 5 };
export const MONTHLY_DAYS = 30;

// Trocas de conta MT4 que o cliente pode fazer sozinho por licença (pra corrigir número errado da compra).
// Depois disso, só o admin troca - evita usar uma licença em contas infinitas.
export const FREE_ACCOUNT_SWAPS = 1;

export const MT4_LOGIN = /^\d{4,12}$/;
