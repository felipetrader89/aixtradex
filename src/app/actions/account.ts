"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { createOrder, setLicenseAccounts, type SetAccountsResult } from "@/lib/licensing";

async function ownLicense(licenseId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const [license] = await db()
    .select()
    .from(schema.licenses)
    .where(and(eq(schema.licenses.id, licenseId), eq(schema.licenses.userId, user.id)));
  return license ? { user, license } : null;
}

export async function updateMyAccountsAction(licenseId: string, logins: string[]): Promise<SetAccountsResult> {
  const owned = await ownLicense(licenseId);
  if (!owned) return { ok: false, error: "invalid" };
  const result = await setLicenseAccounts(owned.license, logins, { byCustomer: true });
  if (result.ok) revalidatePath("/[locale]/account", "layout");
  return result;
}

// Renovação da mensal: cria um pedido pendente ligado à licença (mantém o desconto da corretora parceira).
export async function renewMyLicenseAction(licenseId: string, locale?: string): Promise<{ ok: boolean }> {
  const owned = await ownLicense(licenseId);
  if (!owned || owned.license.plan !== "monthly") return { ok: false };
  const { user, license } = owned;

  const [pending] = await db()
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.licenseId, license.id), eq(schema.orders.status, "pending")));
  if (!pending) {
    await createOrder({
      email: user.email,
      name: user.name ?? "",
      country: user.country ?? "",
      plan: "monthly",
      broker: license.broker,
      logins: [],
      licenseId: license.id,
      locale: locale?.slice(0, 5),
    });
  }
  revalidatePath("/[locale]/account", "layout");
  return { ok: true };
}
