import "server-only";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { licenseState } from "@/lib/licensing";
import { liveState, statsFor } from "@/lib/account-stats";
import { PRODUCT } from "@/lib/plans";

// Dados da área do cliente (Minha Conta). Toda página do portal passa por aqui.
export async function requireCustomer(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

export async function loadLicenses(userId: string) {
  const licenses = await db()
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.userId, userId))
    .orderBy(desc(schema.licenses.createdAt));
  const accounts = licenses.length
    ? await db()
        .select()
        .from(schema.licenseAccounts)
        .where(
          inArray(
            schema.licenseAccounts.licenseId,
            licenses.map((l) => l.id)
          )
        )
        .orderBy(schema.licenseAccounts.id)
    : [];
  return { licenses, accounts };
}

// Contas MT4 do cliente com os dados que o robô enviou (saldo, resultados...).
export async function loadAccountsWithStats(userId: string) {
  const { licenses, accounts } = await loadLicenses(userId);
  const stats = await statsFor(
    PRODUCT.slug,
    accounts.map((a) => a.login)
  );
  const now = new Date();
  const rows = accounts.map((account) => {
    const license = licenses.find((l) => l.id === account.licenseId)!;
    const s = stats.get(account.login);
    return { account, license, licenseState: licenseState(license, now), stats: s, state: liveState(s, now) };
  });
  return { licenses, accounts, rows };
}

export async function loadOrders(userId: string) {
  return db().select().from(schema.orders).where(eq(schema.orders.userId, userId)).orderBy(desc(schema.orders.createdAt));
}

export async function loadVersions() {
  return db()
    .select({
      id: schema.productVersions.id,
      version: schema.productVersions.version,
      notes: schema.productVersions.notes,
      notesI18n: schema.productVersions.notesI18n,
      fileName: schema.productVersions.fileName,
      isCurrent: schema.productVersions.isCurrent,
      createdAt: schema.productVersions.createdAt,
    })
    .from(schema.productVersions)
    .where(eq(schema.productVersions.product, PRODUCT.slug))
    .orderBy(desc(schema.productVersions.isCurrent), desc(schema.productVersions.createdAt));
}

export const DAY_MS = 86_400_000;
