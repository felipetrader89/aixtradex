import "server-only";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PRODUCT } from "@/lib/plans";

// A conta precisa estar numa licença do cliente (admin pode configurar qualquer conta).
export async function canConfigure(login: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.isAdmin) return user;
  const [row] = await db()
    .select({ id: schema.licenseAccounts.id })
    .from(schema.licenseAccounts)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseAccounts.licenseId))
    .where(
      and(
        eq(schema.licenseAccounts.product, PRODUCT.slug),
        eq(schema.licenseAccounts.login, login),
        eq(schema.licenses.userId, user.id)
      )
    );
  return row ? user : null;
}

