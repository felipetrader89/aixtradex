"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { EMAIL_RE, findOrCreateUser, isPlaceholderEmail, normalizeEmail, requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { approveOrder, extendLicense, loginsInUse, newLicenseKey, setLicenseAccounts } from "@/lib/licensing";
import { MONTHLY_DAYS, PLAN_MAX_ACCOUNTS, PRODUCT, type PlanType } from "@/lib/plans";
import { notifyOrderPaid } from "@/lib/notify";
import { logEvent } from "@/lib/config";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// Volta pra página de onde veio, com um aviso no topo (?msg=).
function back(form: FormData, msg: string): never {
  const target = field(form, "back") || "/admin";
  const safe = target.startsWith("/admin") ? target : "/admin";
  const url = new URL(safe, "http://x");
  url.searchParams.set("msg", msg);
  revalidatePath("/admin", "layout");
  redirect(url.pathname + url.search);
}

const splitLogins = (raw: string) => raw.split(/[\s,;]+/).filter(Boolean);

// Sucesso: registra no histórico (Configurações → Sistema) e volta com o aviso.
async function done(form: FormData, actor: string, action: string, detail: string, msg: string): Promise<never> {
  await logEvent(actor, action, detail);
  back(form, msg);
}

export async function approveOrderAction(form: FormData) {
  const admin = await requireAdmin();
  const result = await approveOrder(field(form, "orderId"), {
    method: field(form, "method") || "manual",
    ref: field(form, "ref") || undefined,
  });
  if (!result.ok) back(form, result.error === "notPending" ? "Esse pedido já não está pendente." : "Pedido não encontrado.");
  await notifyOrderPaid(field(form, "orderId"), "aprovação manual no admin");
  const [approved] = await db().select({ code: schema.orders.code }).from(schema.orders).where(eq(schema.orders.id, field(form, "orderId")));
  await done(
    form,
    admin.email,
    "order.approve",
    `${approved?.code ?? "-"} (manual)`,
    result.skippedLogins.length
      ? `Pedido aprovado. Atenção: as contas ${result.skippedLogins.join(", ")} já estavam em outra licença e não foram adicionadas.`
      : "Pedido aprovado e licença liberada."
  );
}

// Depósito da Binance que não bateu sozinho com um pedido (valor diferente, BTC/ETH...): o admin diz de qual pedido é.
export async function approveDepositAction(form: FormData) {
  const admin = await requireAdmin();
  const depositId = Number(field(form, "depositId"));
  const code = field(form, "orderCode").toUpperCase().replace(/^(AX)?-?/, "AX-");
  const [deposit] = await db().select().from(schema.cryptoDeposits).where(eq(schema.cryptoDeposits.id, depositId));
  if (!deposit || deposit.status === "matched") back(form, "Depósito não encontrado ou já usado.");
  const [order] = await db().select().from(schema.orders).where(eq(schema.orders.code, code));
  if (!order) back(form, `Pedido ${code} não encontrado.`);
  const result = await approveOrder(order.id, { method: "binance", ref: deposit.externalId });
  if (!result.ok) back(form, `O pedido ${code} já não está pendente.`);
  await db()
    .update(schema.cryptoDeposits)
    .set({ status: "matched", orderId: order.id })
    .where(eq(schema.cryptoDeposits.id, deposit.id));
  await notifyOrderPaid(order.id, `Binance · ${deposit.amount} ${deposit.coin} (vinculado no admin)`);
  await done(form, admin.email, "deposit.link", `${code} ← ${Number(deposit.amount)} ${deposit.coin}`, `Pedido ${code} aprovado com o depósito de ${Number(deposit.amount)} ${deposit.coin}.`);
}

// Depósito que não é de cliente (ex.: transferência sua) — some da lista de pendências.
export async function ignoreDepositAction(form: FormData) {
  const admin = await requireAdmin();
  const status = field(form, "status") === "unmatched" ? "unmatched" : "ignored";
  await db()
    .update(schema.cryptoDeposits)
    .set({ status })
    .where(and(eq(schema.cryptoDeposits.id, Number(field(form, "depositId"))), ne(schema.cryptoDeposits.status, "matched")));
  await done(form, admin.email, "deposit.ignore", `#${field(form, "depositId")} → ${status}`, status === "ignored" ? "Depósito marcado como não sendo de cliente." : "Depósito voltou pra lista.");
}

export async function cancelOrderAction(form: FormData) {
  const admin = await requireAdmin();
  await db()
    .update(schema.orders)
    .set({ status: "cancelled" })
    .where(eq(schema.orders.id, field(form, "orderId")));
  const [cancelled] = await db().select({ code: schema.orders.code }).from(schema.orders).where(eq(schema.orders.id, field(form, "orderId")));
  await done(form, admin.email, "order.cancel", cancelled?.code ?? "-", "Pedido cancelado.");
}

async function loadLicense(form: FormData) {
  const [license] = await db().select().from(schema.licenses).where(eq(schema.licenses.id, field(form, "licenseId")));
  if (!license) back(form, "Licença não encontrada.");
  return license;
}

export async function setLicenseStatusAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await loadLicense(form);
  const status = field(form, "status") === "suspended" ? "suspended" : "active";
  await db().update(schema.licenses).set({ status }).where(eq(schema.licenses.id, license.id));
  await done(form, admin.email, "license.status", `${license.key} → ${status === "suspended" ? "bloqueada" : "ativa"}`, status === "suspended" ? "Licença bloqueada." : "Licença reativada.");
}

export async function extendLicenseAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await loadLicense(form);
  if (license.plan === "lifetime") back(form, "Licença vitalícia não vence.");
  const days = Math.min(Math.max(Number(field(form, "days")) || MONTHLY_DAYS, 1), 3650);
  const until = await extendLicense(license, days);
  await done(form, admin.email, "license.extend", `${license.key} +${days} dias`, `Licença estendida até ${until.toLocaleDateString("pt-BR")}.`);
}

export async function setLicenseAccountsAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await loadLicense(form);
  const result = await setLicenseAccounts(license, splitLogins(field(form, "logins")));
  if (result.ok) return done(form, admin.email, "license.accounts", `${license.key}: ${splitLogins(field(form, "logins")).join(", ") || "nenhuma"}`, "Contas MT4 atualizadas.");
  const reason = {
    tooMany: `Máximo de ${license.maxAccounts} contas nessa licença.`,
    invalid: "Número de conta MT4 inválido (só dígitos, 4 a 12).",
    inUse: `Já estão em outra licença: ${result.logins?.join(", ")}`,
  }[result.error];
  back(form, reason);
}

// Troca o dono da licença pelo email informado (cliente importado do robô sem email, ou cliente que mudou de email).
// Se o dono antigo era provisório (@sem-email.invalid) e ficou sem licença, os pedidos dele passam pro novo e ele é apagado.
export async function setLicenseOwnerAction(form: FormData) {
  const admin = await requireAdmin();
  const license = await loadLicense(form);
  const email = normalizeEmail(field(form, "email"));
  if (!EMAIL_RE.test(email) || isPlaceholderEmail(email)) back(form, "Email inválido.");

  const [oldOwner] = await db().select().from(schema.users).where(eq(schema.users.id, license.userId));
  const owner = await findOrCreateUser(email, { name: oldOwner?.name ?? undefined });
  if (owner.id === license.userId) back(form, "Essa licença já é desse email.");

  await db().transaction(async (tx) => {
    await tx.update(schema.licenses).set({ userId: owner.id }).where(eq(schema.licenses.id, license.id));
    if (oldOwner && isPlaceholderEmail(oldOwner.email)) {
      const [left] = await tx
        .select({ id: schema.licenses.id })
        .from(schema.licenses)
        .where(eq(schema.licenses.userId, oldOwner.id))
        .limit(1);
      if (!left) {
        await tx.update(schema.orders).set({ userId: owner.id }).where(eq(schema.orders.userId, oldOwner.id));
        await tx.delete(schema.users).where(eq(schema.users.id, oldOwner.id));
      }
    }
  });
  await done(form, admin.email, "license.owner", `${license.key} → ${email}`, `Licença ${license.key} agora é de ${email}. O cliente já pode entrar em Minha Conta com esse email.`);
}

export async function saveLicenseNotesAction(form: FormData) {
  await requireAdmin();
  const license = await loadLicense(form);
  await db()
    .update(schema.licenses)
    .set({ notes: field(form, "notes").slice(0, 2000) || null })
    .where(eq(schema.licenses.id, license.id));
  back(form, "Anotação salva.");
}

// Licença criada à mão (cliente que pagou por fora, cortesia, teste).
export async function createManualLicenseAction(form: FormData) {
  const admin = await requireAdmin();
  const email = field(form, "email").toLowerCase();
  const plan: PlanType = field(form, "plan") === "lifetime" ? "lifetime" : "monthly";
  const days = Math.min(Math.max(Number(field(form, "days")) || MONTHLY_DAYS, 1), 3650);
  const logins = splitLogins(field(form, "logins"));
  if (!EMAIL_RE.test(email)) back(form, "Email inválido.");
  const max = PLAN_MAX_ACCOUNTS[plan];
  if (logins.length > max || logins.some((l) => !/^\d{4,12}$/.test(l))) {
    back(form, `Contas MT4 inválidas (máximo ${max}, só dígitos).`);
  }
  const taken = await loginsInUse(logins);
  if (taken.length) back(form, `Já estão em outra licença: ${taken.join(", ")}`);

  const user = await findOrCreateUser(email, {
    name: field(form, "name") || undefined,
    country: field(form, "country") || undefined,
  });
  const [license] = await db()
    .insert(schema.licenses)
    .values({
      key: newLicenseKey(),
      userId: user.id,
      product: PRODUCT.slug,
      plan,
      maxAccounts: max,
      expiresAt: plan === "monthly" ? new Date(Date.now() + days * 86_400_000) : null,
      notes: field(form, "notes") || "Criada manualmente no admin",
    })
    .returning();
  if (logins.length) {
    await db()
      .insert(schema.licenseAccounts)
      .values(logins.map((login) => ({ licenseId: license.id, product: PRODUCT.slug, login })));
  }
  await done(form, admin.email, "license.create", `${license.key} · ${plan} · ${email}`, `Licença ${license.key} criada para ${email}.`);
}

export async function setCurrentVersionAction(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(field(form, "versionId"));
  const [version] = await db().select().from(schema.productVersions).where(eq(schema.productVersions.id, id));
  if (!version) back(form, "Versão não encontrada.");
  await db().transaction(async (tx) => {
    await tx
      .update(schema.productVersions)
      .set({ isCurrent: false })
      .where(eq(schema.productVersions.product, version.product));
    await tx.update(schema.productVersions).set({ isCurrent: true }).where(eq(schema.productVersions.id, id));
  });
  await done(form, admin.email, "files.current", version.version, `Versão ${version.version} marcada como atual.`);
}

export async function deleteVersionAction(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(field(form, "versionId"));
  const [removed] = await db()
    .delete(schema.productVersions)
    .where(eq(schema.productVersions.id, id))
    .returning({ version: schema.productVersions.version });
  await done(form, admin.email, "files.delete", removed?.version ?? `#${id}`, "Versão apagada.");
}
