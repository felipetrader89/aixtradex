"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GlowCard } from "@/components/brand/GlowCard";
import { Link } from "@/i18n/navigation";
import { claimAccessAction } from "@/app/actions/claims";
import { siteConfig } from "@/lib/site-config";

const inputClass =
  "w-full rounded-xl border-2 border-brand-hairline bg-brand-bg px-4 py-3 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-ink-dim/60 focus:border-brand-accent";
const primaryBtn =
  "inline-flex w-full items-center justify-center rounded-full bg-gradient-to-b from-brand-accent to-brand-accent-dark px-6 py-3 text-sm font-semibold text-brand-bg transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

// "Já sou cliente": quem comprou antes do portal pede acesso com email + conta MT4 (o admin confirma).
export function ClaimForm() {
  const t = useTranslations("Claim");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await claimAccessAction(email, login, locale);
      if (result.ok) setSent(true);
      else setError(t(`errors.${result.error}`));
    });
  }

  if (sent) {
    return (
      <GlowCard className="mx-auto max-w-md text-center">
        <p className="text-3xl">✅</p>
        <h1 className="mt-2 font-display text-xl font-bold text-chrome">{t("sentTitle")}</h1>
        <p className="mt-3 text-sm text-brand-ink-dim">{t("sentBody", { email })}</p>
        <a
          href={`${siteConfig.telegramDmUrl}?text=${encodeURIComponent(t("dm", { email, login }))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-sm font-semibold text-brand-accent hover:underline"
        >
          {t("sentCta")} →
        </a>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="mx-auto max-w-md">
      <h1 className="text-center font-display text-2xl font-bold text-chrome">{t("title")}</h1>
      <p className="mt-2 text-center text-sm text-brand-ink-dim">{t("intro")}</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-brand-ink-dim">{t("emailLabel")}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-brand-ink-dim">{t("loginLabel")}</span>
          <input
            inputMode="numeric"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value.replace(/\D/g, ""))}
            placeholder={t("loginPlaceholder")}
            className={`${inputClass} font-mono`}
          />
          <span className="text-xs text-brand-ink-dim">{t("loginHint")}</span>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className={primaryBtn} disabled={pending || !email || login.length < 4}>
          {pending ? t("sending") : t("submit")}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-brand-ink-dim">
        {t("haveAccess")}{" "}
        <Link href="/login" className="font-semibold text-brand-accent hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </GlowCard>
  );
}
