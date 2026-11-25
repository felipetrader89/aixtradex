import "server-only";
import { planLabelPt } from "@/lib/plans";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db, schema } from "@/lib/db";
import { findOrCreateUser, isPlaceholderEmail } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { PRODUCT } from "@/lib/plans";
import { SITE_URL, customerEmailHtml, notifyAdmins, pickLocale } from "@/lib/notify";
import { recordActivity } from "@/lib/activity";

// Cliente antigo (importado do robô, sem email) pede acesso ao portal informando email + uma conta MT4 dele.
// O admin confere (ex.: no Telegram) e aprova: TODAS as licenças do cadastro provisório passam pro email informado.

export type ClaimError = "email" | "login" | "notFound" | "registered" | "already" | "tooMany";

export async function createClaim(input: { email: string; login: string; locale: string; ip: string | null }) {
  const [row] = await db()
    .select({ license: schema.licenses, user: schema.users })
    .from(schema.licenseAccounts)
    .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseAccounts.licenseId))
    .innerJoin(schema.users, eq(schema.users.id, schema.licenses.userId))
    .where(and(eq(schema.licenseAccounts.product, PRODUCT.slug), eq(schema.licenseAccounts.login, input.login)))
    .limit(1);
  if (!row) return { ok: false as const, error: "notFound" as ClaimError };
  if (!isPlaceholderEmail(row.user.email)) return { ok: false as const, error: "registered" as ClaimError };

  if (input.ip) {
    const recent = await db()
      .select({ id: schema.licenseClaims.id })
      .from(schema.licenseClaims)
      .where(and(eq(schema.licenseClaims.ip, input.ip), gt(schema.licenseClaims.createdAt, new Date(Date.now() - 3600_000))));
    if (recent.length >= 5) return { ok: false as const, error: "tooMany" as ClaimError };
  }

  const [dup] = await db()
    .select({ id: schema.licenseClaims.id })
    .from(schema.licenseClaims)
    .where(
      and(
        eq(schema.licenseClaims.licenseId, row.license.id),
        eq(schema.licenseClaims.email, input.email),
        eq(schema.licenseClaims.status, "pending")
      )
    );
  if (dup) return { ok: false as const, error: "already" as ClaimError };

  await db().insert(schema.licenseClaims).values({
    email: input.email,
    login: input.login,
    licenseId: row.license.id,
    locale: input.locale,
    ip: input.ip,
  });
  await recordActivity("claim", { email: input.email }, `conta ${input.login} · ${row.user.name ?? "-"}`);
  await notifyAdmins(`🔑 Pedido de acesso: ${input.email} (conta ${input.login})`, [
    `Cliente antigo pedindo acesso ao portal.`,
    `Email: ${input.email}`,
    `Conta MT4 informada: ${input.login}`,
    `Licença: ${row.license.key} (${planLabelPt(row.license.plan)}) · cadastro: ${row.user.name ?? "-"}`,
    "",
    `Confira se é ele mesmo e aprove em ${SITE_URL}/admin/claims`,
  ]).catch((error) => console.error("claim admin email", error));
  return { ok: true as const };
}

export type ClaimDecision = { ok: true; email: string } | { ok: false; reason: string };

export async function approveClaim(claimId: string, actor: string): Promise<ClaimDecision> {
  const [claim] = await db().select().from(schema.licenseClaims).where(eq(schema.licenseClaims.id, claimId));
  if (!claim || claim.status !== "pending") return { ok: false, reason: "Esse pedido já foi resolvido." };
  const [license] = await db().select().from(schema.licenses).where(eq(schema.licenses.id, claim.licenseId));
  const [oldOwner] = license ? await db().select().from(schema.users).where(eq(schema.users.id, license.userId)) : [];
  if (!license || !oldOwner) return { ok: false, reason: "Licença não encontrada." };
  if (!isPlaceholderEmail(oldOwner.email)) {
    return { ok: false, reason: `Essa licença já está com o email ${oldOwner.email}. Recuse o pedido ou troque o email em Licenças.` };
  }

  const owner = await findOrCreateUser(claim.email, { name: oldOwner.name ?? undefined, country: oldOwner.country ?? undefined });
  const moved = await db().transaction(async (tx) => {
    const ids = (
      await tx.select({ id: schema.licenses.id }).from(schema.licenses).where(eq(schema.licenses.userId, oldOwner.id))
    ).map((l) => l.id);
    await tx.update(schema.licenses).set({ userId: owner.id }).where(eq(schema.licenses.userId, oldOwner.id));
    await tx.update(schema.orders).set({ userId: owner.id }).where(eq(schema.orders.userId, oldOwner.id));
    await tx.delete(schema.users).where(eq(schema.users.id, oldOwner.id));
    const now = new Date();
    await tx
      .update(schema.licenseClaims)
      .set({ status: "approved", decidedBy: actor, decidedAt: now })
      .where(eq(schema.licenseClaims.id, claim.id));
    // Outros pedidos pendentes pras mesmas licenças ficam recusados (alguém já ficou com elas).
    if (ids.length) {
      await tx
        .update(schema.licenseClaims)
        .set({ status: "rejected", decidedBy: actor, decidedAt: now })
        .where(
          and(
            inArray(schema.licenseClaims.licenseId, ids),
            eq(schema.licenseClaims.status, "pending"),
            ne(schema.licenseClaims.id, claim.id)
          )
        );
    }
    return ids.length;
  });

  const locale = pickLocale(claim.locale);
  const t = await getTranslations({ locale, namespace: "Emails.claimApproved" });
  const url = `${SITE_URL}/${locale}/login`;
  const lines = [t("intro"), "", t("stepsTitle"), `1. ${t("step1", { url })}`, `2. ${t("step2")}`, `3. ${t("step3")}`, "", t("help")];
  await sendEmail({
    to: claim.email,
    subject: t("subject"),
    text: lines.join("\n"),
    html: customerEmailHtml(lines, { href: url, label: t("cta") }),
  }).catch((error) => console.error("claim approved email", error));
  return { ok: true, email: `${claim.email} (${moved} licença${moved === 1 ? "" : "s"})` };
}

export async function rejectClaim(claimId: string, actor: string): Promise<ClaimDecision> {
  const [claim] = await db().select().from(schema.licenseClaims).where(eq(schema.licenseClaims.id, claimId));
  if (!claim || claim.status !== "pending") return { ok: false, reason: "Esse pedido já foi resolvido." };
  await db()
    .update(schema.licenseClaims)
    .set({ status: "rejected", decidedBy: actor, decidedAt: new Date() })
    .where(eq(schema.licenseClaims.id, claim.id));
  const locale = pickLocale(claim.locale);
  const t = await getTranslations({ locale, namespace: "Emails.claimRejected" });
  const lines = [t("intro"), "", t("help")];
  await sendEmail({ to: claim.email, subject: t("subject"), text: lines.join("\n"), html: customerEmailHtml(lines) }).catch(
    (error) => console.error("claim rejected email", error)
  );
  return { ok: true, email: claim.email };
}
