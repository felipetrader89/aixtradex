"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { EMAIL_RE, findOrCreateUser, isPlaceholderEmail, normalizeEmail, requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { approveOrder, extendLicense, loginsInUse, newLicenseKey, setLicenseAccounts } from "@/lib/licensing";
import { MONTHLY_DAYS, PLAN_MAX_ACCOUNTS, PRODUCT, type PlanType } from "@/lib/plans";

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

export async function approveOrderAction(form: FormData) {
  await requireAdmin();
  const result = await approveOrder(field(form, "orderId"), {
    method: field(form, "method") || "manual",
    ref: field(form, "ref") || undefined,
  });
  if (!result.ok) back(form, result.error === "notPending" ? "Esse pedido já não está pendente." : "Pedido não encontrado.");
  back(
    form,
    result.skippedLogins.length
      ? `Pedido aprovado. Atenção: as contas ${result.skippedLogins.join(", ")} já estavam em outra licença e não foram adicionadas.`
      : "Pedido aprovado e licença liberada."
  );
}

export async function cancelOrderAction(form: FormData) {
  await requireAdmin();
  await db()
    .update(schema.orders)
    .set({ status: "cancelled" })
    .where(eq(schema.orders.id, field(form, "orderId")));
  back(form, "Pedido cancelado.");
}

async function loadLicense(form: FormData) {
  const [license] = await db().select().from(schema.licenses).where(eq(schema.licenses.id, field(form, "licenseId")));
  if (!license) back(form, "Licença não encontrada.");
  return license;
}

export async function setLicenseStatusAction(form: FormData) {
  await requireAdmin();
  const license = await loadLicense(form);
  const status = field(form, "status") === "suspended" ? "suspended" : "active";
  await db().update(schema.licenses).set({ status }).where(eq(schema.licenses.id, license.id));
  back(form, status === "suspended" ? "Licença bloqueada." : "Licença reativada.");
}

export async function extendLicenseAction(form: FormData) {
  await requireAdmin();
  const license = await loadLicense(form);
  if (license.plan === "lifetime") back(form, "Licença vitalícia não vence.");
  const days = Math.min(Math.max(Number(field(form, "days")) || MONTHLY_DAYS, 1), 3650);
  const until = await extendLicense(license, days);
  back(form, `Licença estendida até ${until.toLocaleDateString("pt-BR")}.`);
}

export async function setLicenseAccountsAction(form: FormData) {
  await requireAdmin();
  const license = await loadLicense(form);
  const result = await setLicenseAccounts(license, splitLogins(field(form, "logins")));
  if (result.ok) back(form, "Contas MT4 atualizadas.");
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
  await requireAdmin();
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
  back(form, `Licença ${license.key} agora é de ${email}. O cliente já pode entrar em Minha Conta com esse email.`);
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
  await requireAdmin();
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
  back(form, `Licença ${license.key} criada para ${email}.`);
}

export async function setCurrentVersionAction(form: FormData) {
  await requireAdmin();
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
  back(form, `Versão ${version.version} marcada como atual.`);
}

export async function deleteVersionAction(form: FormData) {
  await requireAdmin();
  const id = Number(field(form, "versionId"));
  await db().delete(schema.productVersions).where(eq(schema.productVersions.id, id));
  back(form, "Versão apagada.");
}
