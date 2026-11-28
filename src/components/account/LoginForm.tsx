"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { Link } from "@/i18n/navigation";
import { requestCodeAction, verifyCodeAction, type AuthResult } from "@/app/actions/auth";

const inputClass =
  "w-full rounded-xl border-2 border-brand-hairline bg-brand-bg px-4 py-3 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-ink-dim/60 focus:border-brand-accent";
const primaryBtn =
  "inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-brand-accent to-brand-accent-dark px-6 py-3 text-sm font-semibold text-brand-bg transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";
const linkBtn = "text-sm text-brand-ink-dim transition-colors hover:text-brand-accent";

// Login sem senha: email → código de 6 dígitos.
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function showError(result: AuthResult) {
    if (!result.ok) setMessage({ kind: "error", text: t(`errors.${result.error}`) });
  }

  function sendCode(resend = false) {
    setMessage(null);
    startTransition(async () => {
      const result = await requestCodeAction(email, locale);
      if (!result.ok) return showError(result);
      setStage("code");
      setCode("");
      if (resend) setMessage({ kind: "info", text: t("resent") });
    });
  }

  function verify() {
    setMessage(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await verifyCodeAction(email, code, locale, next);
      if (result) showError(result);
    });
  }

  return (
    <GlowCard className="mx-auto max-w-md">
      {stage === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
          className="flex flex-col gap-4"
        >
          <h1 className="text-center font-display text-xl font-bold text-chrome">{t("title")}</h1>
          <p className="text-center text-sm text-brand-ink-dim">{t("body")}</p>
          <label className="flex flex-col gap-2 text-xs text-brand-ink-dim">
            {t("emailLabel")}
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              placeholder={t("emailPlaceholder")}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, "").toLowerCase())}
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={pending || !email} className={primaryBtn}>
            {pending ? t("sending") : t("send")}
          </button>
          <p className="rounded-xl bg-brand-surface-2 px-4 py-3 text-center text-xs text-brand-ink-dim">
            {t("claimHint")}{" "}
            <Link href="/claim" className="font-semibold text-brand-accent hover:underline">
              {t("claimCta")} →
            </Link>
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
          className="flex flex-col gap-4"
        >
          <h1 className="text-center font-display text-xl font-bold text-chrome">{t("codeTitle")}</h1>
          <p className="text-center text-sm text-brand-ink-dim">{t("codeBody", { email })}</p>
          <label className="flex flex-col gap-2 text-xs text-brand-ink-dim">
            {t("codeLabel")}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={code}
              placeholder="000000"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </label>
          <button type="submit" disabled={pending || code.length !== 6} className={primaryBtn}>
            {pending ? t("verifying") : t("verify")}
          </button>
          <div className="flex justify-between">
            <button
              type="button"
              className={linkBtn}
              onClick={() => {
                setStage("email");
                setMessage(null);
              }}
            >
              {t("changeEmail")}
            </button>
            <button type="button" className={linkBtn} disabled={pending} onClick={() => sendCode(true)}>
              {t("resend")}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className={`mt-4 text-center text-sm ${message.kind === "error" ? "text-red-400" : "text-brand-accent"}`}>
          {message.text}
        </p>
      )}
    </GlowCard>
  );
}
