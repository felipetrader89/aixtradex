"use server";

import { headers } from "next/headers";
import { EMAIL_RE, isPlaceholderEmail, normalizeEmail } from "@/lib/auth";
import { createClaim, type ClaimError } from "@/lib/claims";
import { MT4_LOGIN } from "@/lib/plans";
import { routing } from "@/i18n/routing";

export type ClaimResult = { ok: true } | { ok: false; error: ClaimError | "server" };

// "Já sou cliente": pedido de acesso de quem comprou antes do portal (o admin aprova).
export async function claimAccessAction(rawEmail: string, rawLogin: string, rawLocale: string): Promise<ClaimResult> {
  const email = normalizeEmail(rawEmail);
  const login = rawLogin.replace(/\D/g, "");
  if (!EMAIL_RE.test(email) || isPlaceholderEmail(email)) return { ok: false, error: "email" };
  if (!MT4_LOGIN.test(login)) return { ok: false, error: "login" };
  const locale = (routing.locales as readonly string[]).includes(rawLocale) ? rawLocale : routing.defaultLocale;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  try {
    return await createClaim({ email, login, locale, ip });
  } catch (error) {
    console.error("claimAccessAction", error);
    return { ok: false, error: "server" };
  }
}
