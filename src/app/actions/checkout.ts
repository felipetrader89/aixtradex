"use server";

import { eq } from "drizzle-orm";
import { EMAIL_RE } from "@/lib/auth";
import { isAutoPayActive } from "@/lib/config";
import { db, schema } from "@/lib/db";
import { cleanLogins, createOrder } from "@/lib/licensing";
import { PASS_DAYS, PLAN_MAX_ACCOUNTS, PLAN_TYPE, isPassKey, isPlanKey } from "@/lib/plans";

// payAmount só vem quando a leitura automática da Binance está ligada; sem ela o checkout segue no fluxo manual (Telegram).
export type CreateOrderResult =
  | { ok: true; code: string; amount: string; payAmount: string | null; credit: string | null; recharge: boolean }
  | { ok: false; error: string };

// Grava o pedido do checkout como "pendente". A licença só nasce quando o pagamento é aprovado.
export async function createOrderAction(input: {
  planKey: string;
  email: string;
  name: string;
  country: string;
  broker?: string | null;
  logins: string[];
  locale?: string;
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
    const order = await createOrder({
      email,
      name,
      country,
      plan,
      broker: input.broker,
      logins: cleaned.logins!,
      locale: input.locale?.slice(0, 5),
      passDays: isPassKey(input.planKey) ? PASS_DAYS[input.planKey] : undefined,
    });
    const payAmount = (await isAutoPayActive()) && order.payAmount ? Number(order.payAmount).toFixed(2) : null;
    return {
      ok: true,
      code: order.code,
      amount: order.amountUsd,
      payAmount,
      credit: Number(order.creditUsd) > 0 ? Number(order.creditUsd).toFixed(2) : null,
      recharge: plan === "trial" && Boolean(order.licenseId),
    };
  } catch (error) {
    console.error("createOrderAction", error);
    return { ok: false, error: "server" };
  }
}

// A página de pagamento pergunta a cada poucos segundos se o pedido já foi pago (só devolve o status).
export async function orderStatusAction(code: string): Promise<"pending" | "paid" | "cancelled" | null> {
  if (!/^AX-[A-Z0-9]{6}$/.test(code)) return null;
  const [order] = await db()
    .select({ status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.code, code));
  return order?.status ?? null;
}
