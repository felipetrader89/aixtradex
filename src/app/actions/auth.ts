"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  EMAIL_RE,
  createLoginCode,
  endSession,
  findOrCreateUser,
  normalizeEmail,
  startSession,
  verifyLoginCode,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { routing } from "@/i18n/routing";

export type AuthResult = { ok: true } | { ok: false; error: "email" | "wait" | "code" | "server" };

function safeLocale(locale: string) {
  return routing.locales.includes(locale as (typeof routing.locales)[number]) ? locale : routing.defaultLocale;
}

export async function requestCodeAction(rawEmail: string, rawLocale: string): Promise<AuthResult> {
  const email = normalizeEmail(rawEmail);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email" };
  const locale = safeLocale(rawLocale);
  try {
    const code = await createLoginCode(email);
    if (!code) return { ok: false, error: "wait" };
    const t = await getTranslations({ locale, namespace: "Auth.email" });
    await sendEmail({
      to: email,
      subject: t("subject", { code }),
      text: `${t("intro")}\n\n${code}\n\n${t("expires")}\n${t("ignore")}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
<p style="font-size:16px">${t("intro")}</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">${code}</p>
<p style="font-size:13px;color:#555">${t("expires")}<br>${t("ignore")}</p>
<p style="font-size:13px;color:#555">Ai X TradeX</p></div>`,
    });
    return { ok: true };
  } catch (error) {
    console.error("requestCodeAction", error);
    return { ok: false, error: "server" };
  }
}

function safeNext(next: string | undefined, locale: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/account`;
}

export async function verifyCodeAction(rawEmail: string, code: string, rawLocale: string, next?: string): Promise<AuthResult> {
  const email = normalizeEmail(rawEmail);
  const locale = safeLocale(rawLocale);
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code.trim())) return { ok: false, error: "code" };
  try {
    if (!(await verifyLoginCode(email, code))) return { ok: false, error: "code" };
    const user = await findOrCreateUser(email);
    await startSession(user.id);
  } catch (error) {
    console.error("verifyCodeAction", error);
    return { ok: false, error: "server" };
  }
  redirect(safeNext(next, locale));
}

export async function logoutAction(formData: FormData) {
  await endSession();
  redirect(`/${safeLocale(String(formData.get("locale") ?? ""))}/login`);
}
