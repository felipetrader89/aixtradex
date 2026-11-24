import "server-only";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { db, schema } from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { licenseServerUrl } from "@/lib/site-config";
import { getAdminEmails } from "@/lib/config";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.aixtradex.com";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function pickLocale(locale: string | null | undefined) {
  return (routing.locales as readonly string[]).includes(locale ?? "") ? locale! : "en";
}

// Email simples pro cliente: parágrafos + botão.
export function customerEmailHtml(lines: string[], cta?: { href: string; label: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111;line-height:1.5">${lines
    .map((l) => (l ? `<p style="margin:0 0 8px">${escapeHtml(l)}</p>` : "<br>"))
    .join("")}${
    cta
      ? `<p style="margin-top:20px"><a href="${cta.href}" style="background:#33d6a0;color:#0b1929;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(cta.label)}</a></p>`
      : ""
  }</div>`;
}

export async function notifyAdmins(subject: string, lines: string[]) {
  const admins = (await getAdminEmails()).all;
  if (!admins.length) return;
  await sendEmail({
    to: admins.join(","),
    subject,
    text: lines.join("\n"),
    html: lines.map((l) => `<p style="margin:0 0 6px;font-family:Arial,sans-serif">${l ? escapeHtml(l) : "&nbsp;"}</p>`).join(""),
  });
}

// Email pro cliente quando o pedido é pago (automático pela Binance ou aprovado no admin).
// Nunca derruba quem chamou: se o email falhar, só registra no log.
export async function notifyOrderPaid(orderId: string, via: string) {
  try {
    const [row] = await db()
      .select({ order: schema.orders, user: schema.users })
      .from(schema.orders)
      .innerJoin(schema.users, eq(schema.users.id, schema.orders.userId))
      .where(eq(schema.orders.id, orderId));
    if (!row) return;
    const { order, user } = row;
    const [license] = order.licenseId
      ? await db().select().from(schema.licenses).where(eq(schema.licenses.id, order.licenseId))
      : [];
    const accounts = license
      ? await db()
          .select({ login: schema.licenseAccounts.login })
          .from(schema.licenseAccounts)
          .where(eq(schema.licenseAccounts.licenseId, license.id))
      : [];

    const locale = pickLocale(order.locale);
    const t = await getTranslations({ locale, namespace: "Emails.paid" });
    const accountUrl = `${SITE_URL}/${locale}/account`;
    const expires = license?.expiresAt
      ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(license.expiresAt)
      : t("lifetime");
    const lines = [
      t("intro", { code: order.code }),
      "",
      `${t("key")}: ${license?.key ?? "-"}`,
      `${t("plan")}: ${order.plan === "lifetime" ? t("planLifetime") : t("planMonthly")}`,
      `${t("expires")}: ${expires}`,
      `${t("accounts")}: ${accounts.map((a) => a.login).join(", ") || "-"}`,
      "",
      t("stepsTitle"),
      `1. ${t("step1", { url: accountUrl, email: user.email })}`,
      `2. ${t("step2")}`,
      `3. ${t("step3", { url: licenseServerUrl })}`,
      "",
      t("help"),
    ];

    if (!isPlaceholderEmail(user.email)) {
      await sendEmail({
        to: user.email,
        subject: t("subject", { code: order.code }),
        text: lines.join("\n"),
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111;line-height:1.5">${lines
          .map((l) => (l ? `<p style="margin:0 0 8px">${escapeHtml(l)}</p>` : "<br>"))
          .join("")}<p style="margin-top:20px"><a href="${accountUrl}" style="background:#33d6a0;color:#0b1929;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(t("cta"))}</a></p></div>`,
      });
    }

    const admins = (await getAdminEmails()).all;
    if (admins.length) {
      const adminLines = [
        `Pedido ${order.code} pago via ${via}.`,
        `Cliente: ${user.name ?? "-"} <${user.email}>`,
        `Plano: ${order.plan === "lifetime" ? "Vitalícia" : "Mensal"}${order.licenseId && order.mt4Logins.length === 0 ? " (renovação)" : ""}`,
        `Valor: ${order.payAmount ?? order.amountUsd} USD`,
        `Licença: ${license?.key ?? "-"} · contas ${accounts.map((a) => a.login).join(", ") || "-"}`,
        "",
        `${SITE_URL}/admin/orders`,
      ];
      await sendEmail({
        to: admins.join(","),
        subject: `✅ Pedido ${order.code} pago (${via})`,
        text: adminLines.join("\n"),
        html: adminLines
          .map((l) => `<p style="margin:0 0 6px;font-family:Arial,sans-serif">${l ? escapeHtml(l) : "&nbsp;"}</p>`)
          .join(""),
      });
    }
  } catch (error) {
    console.error("notifyOrderPaid", orderId, error);
  }
}
