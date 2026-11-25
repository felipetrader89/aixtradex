// pass1/pass3/pass7 = passe de teste (1, 3 ou 7 dias, 1 conta MT4, sem desconto de corretora).
export const PLAN_KEYS = ["licenseMonthly", "licenseLifetime", "pass1", "pass3", "pass7"] as const;
export const PASS_KEYS = ["pass1", "pass3", "pass7"] as const;
export type PassKey = (typeof PASS_KEYS)[number];
export const isPassKey = (k: string | undefined): k is PassKey => PASS_KEYS.includes(k as PassKey);
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_PATH: Record<PlanKey, string> = {
  licenseMonthly: "license.oneMonth",
  licenseLifetime: "license.lifetime",
  pass1: "pass.d1",
  pass3: "pass.d3",
  pass7: "pass.d7",
};

export const PLAN_ACCOUNTS: Record<PlanKey, number> = {
  licenseMonthly: 2,
  licenseLifetime: 5,
  pass1: 1,
  pass3: 1,
  pass7: 1,
};

export function isPlanKey(value: string | undefined): value is PlanKey {
  return PLAN_KEYS.includes(value as PlanKey);
}

// Robô vendido pelo site (licença online checada pela conta MT4).
export const PRODUCT = { slug: "pulse-rs", name: "Ai X PULSE RS" } as const;

export type PlanType = "monthly" | "lifetime" | "trial";

export const PLAN_TYPE: Record<PlanKey, PlanType> = {
  licenseMonthly: "monthly",
  licenseLifetime: "lifetime",
  pass1: "trial",
  pass3: "trial",
  pass7: "trial",
};

export const PLAN_KEY_BY_TYPE: Record<PlanType, PlanKey> = {
  monthly: "licenseMonthly",
  lifetime: "licenseLifetime",
  trial: "pass1",
};

// Valores em USD usados pelo servidor (o navegador não decide preço).
export const PLAN_PRICE_USD: Record<PlanType, number> = { monthly: 99, lifetime: 499, trial: 10 };
export const PLAN_DISCOUNT_USD: Record<PlanType, number> = { monthly: 30, lifetime: 50, trial: 0 };
export const PLAN_MAX_ACCOUNTS: Record<PlanType, number> = { monthly: 2, lifetime: 5, trial: 1 };

// Passe de teste: dias e preço de cada um. Recargas somam dias na mesma licença.
export const PASS_DAYS: Record<PassKey, number> = { pass1: 1, pass3: 3, pass7: 7 };
export const PASS_PRICE_USD: Record<PassKey, number> = { pass1: 10, pass3: 25, pass7: 49 };
export const passKeyByDays = (days: number | null | undefined): PassKey | null =>
  (PASS_KEYS.find((k) => PASS_DAYS[k] === days) ?? null);
// O que foi pago em passes nos últimos PASS_CREDIT_DAYS vira desconto no Mensal/Vitalícia (até metade do preço).
export const PASS_CREDIT_DAYS = 7;
export const PASS_CREDIT_MAX_SHARE = 0.5;
export const MONTHLY_DAYS = 30;

// Trocas de conta MT4 que o cliente pode fazer sozinho por licença (pra corrigir número errado da compra).
// Depois disso, só o admin troca - evita usar uma licença em contas infinitas.
export const FREE_ACCOUNT_SWAPS = 1;

// Nome do plano pro admin (português).
export const planLabelPt = (plan: string, passDays?: number | null) =>
  plan === "lifetime" ? "Vitalícia" : plan === "trial" ? `Passe ${passDays ?? 1} dia${(passDays ?? 1) > 1 ? "s" : ""}` : "Mensal";

export const MT4_LOGIN = /^\d{4,12}$/;
