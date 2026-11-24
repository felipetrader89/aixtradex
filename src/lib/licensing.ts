import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lt, ne, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { License } from "@/lib/db/schema";
import { findOrCreateUser } from "@/lib/auth";
import { partnerBrokers } from "@/lib/site-config";
import { recordActivity } from "@/lib/activity";
import {
  FREE_ACCOUNT_SWAPS,
  MONTHLY_DAYS,
  MT4_LOGIN,
  PLAN_DISCOUNT_USD,
  PLAN_MAX_ACCOUNTS,
  PLAN_PRICE_USD,
  PRODUCT,
  type PlanType,
} from "@/lib/plans";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I pra não confundir

function randomCode(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const newOrderCode = () => `AX-${randomCode(6)}`;
export const newLicenseKey = () => `AXP-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;

export type LicenseState = "active" | "expired" | "suspended";

export function licenseState(license: Pick<License, "status" | "expiresAt">, now = new Date()): LicenseState {
  if (license.status === "suspended") return "suspended";
  if (license.expiresAt && license.expiresAt <= now) return "expired";
  return "active";
}

export function isPartnerBroker(slug: string | null | undefined): slug is string {
  return Boolean(slug && partnerBrokers.some((b) => b.slug === slug));
}

export function priceFor(plan: PlanType, broker: string | null | undefined) {
  return PLAN_PRICE_USD[plan] - (isPartnerBroker(broker) ? PLAN_DISCOUNT_USD[plan] : 0);
}

export function cleanLogins(logins: string[], max: number) {
  const unique = [...new Set(logins.map((l) => l.trim()).filter(Boolean))];
  if (unique.length > max) return { error: "tooMany" as const };
  if (unique.some((l) => !MT4_LOGIN.test(l))) return { error: "invalid" as const };
  return { logins: unique };
}

// Contas que já estão em outra licença do mesmo produto.
export async function loginsInUse(logins: string[], exceptLicenseId?: string) {
  if (logins.length === 0) return [];
  const rows = await db()
    .select({ login: schema.licenseAccounts.login })
    .from(schema.licenseAccounts)
    .where(
      and(
        eq(schema.licenseAccounts.product, PRODUCT.slug),
        inArray(schema.licenseAccounts.login, logins),
        exceptLicenseId ? ne(schema.licenseAccounts.licenseId, exceptLicenseId) : undefined
      )
    );
  return rows.map((r) => r.login);
}

// Valor exato do pedido em USDT/USDC: preço + centavos que nenhum outro pedido pendente está usando
// (99.01 a 99.99; se acabarem, 100.01 a 103.99). É assim que o depósito da Binance acha o pedido certo.
async function freePayAmount(price: number) {
  const pending = await db()
    .select({ value: schema.orders.payAmount })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "pending"), isNotNull(schema.orders.payAmount)));
  const used = new Set(pending.map((r) => Number(r.value).toFixed(2)));
  for (const [from, to] of [
    [1, 99],
    [101, 499],
  ]) {
    const free: string[] = [];
    for (let cents = from; cents <= to; cents++) {
      if (cents % 100 === 0) continue;
      const value = (price + cents / 100).toFixed(2);
      if (!used.has(value)) free.push(value);
    }
    if (free.length) return free[randomInt(free.length)];
  }
  return null;
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";

export async function createOrder(input: {
  email: string;
  name: string;
  country: string;
  plan: PlanType;
  broker?: string | null;
  logins: string[];
  licenseId?: string;
  locale?: string;
}) {
  const user = await findOrCreateUser(input.email, { name: input.name, country: input.country, track: true });
  const broker = isPartnerBroker(input.broker) ? input.broker : null;
  const price = priceFor(input.plan, broker);
  // Dois clientes no mesmo segundo podem sortear o mesmo valor: o índice único barra e tentamos de novo.
  for (let attempt = 0; ; attempt++) {
    try {
      const [order] = await db()
        .insert(schema.orders)
        .values({
          code: newOrderCode(),
          userId: user.id,
          product: PRODUCT.slug,
          plan: input.plan,
          amountUsd: price.toFixed(2),
          payAmount: await freePayAmount(price),
          locale: input.locale ?? null,
          broker,
          mt4Logins: input.logins,
          licenseId: input.licenseId,
        })
        .returning();
      await recordActivity(
        "order",
        user,
        `${order.code} · ${input.plan === "lifetime" ? "Vitalícia" : "Mensal"} $${order.amountUsd}${input.licenseId ? " · renovação" : ""}`
      );
      return order;
    } catch (error) {
      if (attempt >= 4 || !isUniqueViolation(error)) throw error;
    }
  }
}

export type ApproveResult =
  | { ok: true; licenseId: string; skippedLogins: string[] }
  | { ok: false; error: "notPending" | "notFound" };

// Confirma o pagamento: cria a licença (com as contas MT4 do pedido) ou estende a mensal na renovação.
// Tudo numa transação: ou grava pedido pago + licença, ou nada.
export async function approveOrder(orderId: string, payment: { method: string; ref?: string }): Promise<ApproveResult> {
  const result = await approveOrderTx(orderId, payment);
  if (result.ok) {
    const [row] = await db()
      .select({ order: schema.orders, user: schema.users })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(eq(schema.orders.id, orderId));
    if (row) await recordActivity("paid", row.user, `${row.order.code} · $${row.order.payAmount ?? row.order.amountUsd} · ${payment.method}`);
  }
  return result;
}

function approveOrderTx(orderId: string, payment: { method: string; ref?: string }): Promise<ApproveResult> {
  return db().transaction(async (tx) => {
    const [order] = await tx
      .update(schema.orders)
      .set({ status: "paid", paidAt: new Date(), paymentMethod: payment.method, paymentRef: payment.ref ?? null })
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "pending")))
      .returning();
    if (!order) {
      const [exists] = await tx.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.id, orderId));
      return { ok: false, error: exists ? "notPending" : "notFound" } as const;
    }

    if (order.licenseId) {
      const [license] = await tx.select().from(schema.licenses).where(eq(schema.licenses.id, order.licenseId));
      if (license) {
        const base = license.expiresAt && license.expiresAt > new Date() ? license.expiresAt : new Date();
        await tx
          .update(schema.licenses)
          .set({ expiresAt: new Date(base.getTime() + MONTHLY_DAYS * 86_400_000) })
          .where(eq(schema.licenses.id, license.id));
        return { ok: true, licenseId: license.id, skippedLogins: [] as string[] } as const;
      }
    }

    const max = PLAN_MAX_ACCOUNTS[order.plan];
    const wanted = order.mt4Logins.slice(0, max);
    const taken = await loginsInUse(wanted);
    const logins = wanted.filter((l) => !taken.includes(l));
    const licenseId = randomUUID();
    await tx.insert(schema.licenses).values({
      id: licenseId,
      key: newLicenseKey(),
      userId: order.userId,
      product: order.product,
      plan: order.plan,
      maxAccounts: max,
      broker: order.broker,
      expiresAt: order.plan === "monthly" ? new Date(Date.now() + MONTHLY_DAYS * 86_400_000) : null,
    });
    if (logins.length) {
      await tx
        .insert(schema.licenseAccounts)
        .values(logins.map((login) => ({ licenseId, product: order.product, login })));
    }
    await tx.update(schema.orders).set({ licenseId }).where(eq(schema.orders.id, order.id));
    return { ok: true, licenseId, skippedLogins: taken } as const;
  });
}

// Soma dias a partir do vencimento atual (ou de hoje, se já venceu).
export async function extendLicense(license: License, days: number) {
  const base = license.expiresAt && license.expiresAt > new Date() ? license.expiresAt : new Date();
  const expiresAt = new Date(base.getTime() + days * 86_400_000);
  await db().update(schema.licenses).set({ expiresAt }).where(eq(schema.licenses.id, license.id));
  return expiresAt;
}

export type SetAccountsResult =
  | { ok: true; swapped?: boolean }
  | { ok: false; error: "tooMany" | "invalid" | "inUse" | "locked"; logins?: string[] };

// Trocas que o cliente ainda pode fazer sozinho nessa licença.
export const swapsLeft = (license: Pick<License, "accountSwapsUsed">) =>
  Math.max(0, FREE_ACCOUNT_SWAPS - license.accountSwapsUsed);

// Troca as contas MT4 de uma licença, mantendo o histórico de checagem das que continuam.
// byCustomer: tirar uma conta já cadastrada gasta 1 troca (limite FREE_ACCOUNT_SWAPS); só adicionar em vaga vazia é livre.
// O admin não tem limite.
export async function setLicenseAccounts(
  license: License,
  rawLogins: string[],
  opts: { byCustomer?: boolean } = {}
): Promise<SetAccountsResult> {
  const cleaned = cleanLogins(rawLogins, license.maxAccounts);
  if ("error" in cleaned) return { ok: false, error: cleaned.error! };
  const { logins } = cleaned;
  const taken = await loginsInUse(logins, license.id);
  if (taken.length) return { ok: false, error: "inUse", logins: taken };

  const current = await db()
    .select({ login: schema.licenseAccounts.login })
    .from(schema.licenseAccounts)
    .where(eq(schema.licenseAccounts.licenseId, license.id));
  const toAdd = logins.filter((l) => !current.some((c) => c.login === l));
  const removed = current.filter((c) => !logins.includes(c.login));
  const isSwap = Boolean(opts.byCustomer) && removed.length > 0;
  if (isSwap && swapsLeft(license) <= 0) return { ok: false, error: "locked" };

  const done = await db().transaction(async (tx) => {
    if (isSwap) {
      // Gasta a troca de forma atômica (dois cliques ao mesmo tempo não viram duas trocas).
      const spent = await tx
        .update(schema.licenses)
        .set({ accountSwapsUsed: sql`${schema.licenses.accountSwapsUsed} + 1` })
        .where(and(eq(schema.licenses.id, license.id), lt(schema.licenses.accountSwapsUsed, FREE_ACCOUNT_SWAPS)))
        .returning({ id: schema.licenses.id });
      if (!spent.length) return false;
    }
    await tx
      .delete(schema.licenseAccounts)
      .where(
        and(
          eq(schema.licenseAccounts.licenseId, license.id),
          logins.length ? notInArray(schema.licenseAccounts.login, logins) : undefined
        )
      );
    if (toAdd.length) {
      await tx
        .insert(schema.licenseAccounts)
        .values(toAdd.map((login) => ({ licenseId: license.id, product: license.product, login })));
    }
    return true;
  });
  if (!done) return { ok: false, error: "locked" };
  return { ok: true, swapped: isSwap };
}

export type CheckStatus = "ACTIVE" | "EXPIRED" | "SUSPENDED" | "NOT_FOUND";

export async function checkLicense(input: {
  product: string;
  login: string;
  ip?: string | null;
  eaVersion?: string | null;
  server?: string | null;
}): Promise<{ status: CheckStatus; plan: string; expiresAt: Date | null }> {
  const [row] = await db()
    .select({ account: schema.licenseAccounts, license: schema.licenses })
    .from(schema.licenseAccounts)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseAccounts.licenseId))
    .where(and(eq(schema.licenseAccounts.product, input.product), eq(schema.licenseAccounts.login, input.login)))
    .limit(1);
  if (!row) return { status: "NOT_FOUND", plan: "-", expiresAt: null };

  await db()
    .update(schema.licenseAccounts)
    .set({
      lastCheckAt: new Date(),
      lastIp: input.ip ?? null,
      lastEaVersion: input.eaVersion?.slice(0, 32) ?? null,
      lastServer: input.server?.slice(0, 64) ?? null,
    })
    .where(eq(schema.licenseAccounts.id, row.account.id));

  const state = licenseState(row.license);
  const status: CheckStatus = state === "active" ? "ACTIVE" : state === "expired" ? "EXPIRED" : "SUSPENDED";
  return { status, plan: row.license.plan, expiresAt: row.license.expiresAt };
}
