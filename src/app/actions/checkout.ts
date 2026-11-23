"use server";

import { EMAIL_RE } from "@/lib/auth";
import { cleanLogins, createOrder } from "@/lib/licensing";
import { PLAN_MAX_ACCOUNTS, PLAN_TYPE, isPlanKey } from "@/lib/plans";

export type CreateOrderResult = { ok: true; code: string; amount: string } | { ok: false; error: string };

// Grava o pedido do checkout como "pendente". A licença só nasce quando o pagamento é aprovado.
export async function createOrderAction(input: {
  planKey: string;
  email: string;
  name: string;
  country: string;
  broker?: string | null;
  logins: string[];
}): Promise<CreateOrderResult> {
  if (!isPlanKey(input.planKey)) return { ok: false, error: "plan" };
  const plan = PLAN_TYPE[input.planKey];
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 120);
  const country = input.country.trim().slice(0, 80);
  if (!EMAIL_RE.test(email) || !name || !country) return { ok: false, error: "fields" };
  const cleaned = cleanLogins(input.logins, PLAN_MAX_ACCOUNTS[plan]);
  if ("error" in cleaned || cleaned.logins!.length === 0) return { ok: false, error: "logins" };

  try {
    const order = await createOrder({ email, name, country, plan, broker: input.broker, logins: cleaned.logins! });
    return { ok: true, code: order.code, amount: order.amountUsd };
  } catch (error) {
    console.error("createOrderAction", error);
    return { ok: false, error: "server" };
  }
}
