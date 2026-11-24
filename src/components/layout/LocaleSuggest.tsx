"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FlagBR, FlagUS, FlagES } from "@/components/brand/flags";

// Quem abre um link num idioma diferente do idioma do navegador/computador recebe uma barra discreta
// oferecendo a versão no idioma dele (ex.: brasileiro morando nos EUA que recebeu o link em inglês).
// Idioma que o site não tem (francês, alemão...) = sugere inglês. Fechar ou trocar de idioma na mão = não aparece mais.
// (Quem abre só app.aixtradex.com já cai direto no idioma certo - isso é feito no servidor.)

export const LOCALE_CHOICE_KEY = "aix_locale_choice";
const SUPPORTED = ["pt", "en", "es"] as const;
type Supported = (typeof SUPPORTED)[number];

// Texto no idioma SUGERIDO (é o que a pessoa lê).
const TEXT: Record<Supported, { message: string; cta: string; close: string }> = {
  pt: { message: "Este site também está em português.", cta: "Ver em português", close: "Fechar" },
  en: { message: "This site is also available in English.", cta: "View in English", close: "Close" },
  es: { message: "Este sitio también está en español.", cta: "Ver en español", close: "Cerrar" },
};
const FLAGS = { pt: FlagBR, en: FlagUS, es: FlagES };

function browserLocale(): Supported {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of list) {
    const base = tag?.slice(0, 2).toLowerCase();
    if ((SUPPORTED as readonly string[]).includes(base)) return base as Supported;
  }
  return "en";
}

export function LocaleSuggest() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [target, setTarget] = useState<Supported | null>(null);

  useEffect(() => {
    let chosen: string | null = null;
    try {
      chosen = localStorage.getItem(LOCALE_CHOICE_KEY);
    } catch {}
    const suggested = browserLocale();
    // Mostra depois da página montar (o servidor não sabe o idioma do navegador de quem abriu o link).
    const timer = setTimeout(() => setTarget(chosen || suggested === locale ? null : suggested), 0);
    return () => clearTimeout(timer);
  }, [locale]);

  if (!target) return null;
  const text = TEXT[target];
  const Flag = FLAGS[target];

  function remember(value: string) {
    try {
      localStorage.setItem(LOCALE_CHOICE_KEY, value);
    } catch {}
  }

  function switchTo() {
    remember(target!);
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: target! });
  }

  return (
    <div
      lang={target}
      className="animate-slide-down fixed inset-x-0 bottom-20 z-[60] sm:bottom-6 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center gap-3 rounded-2xl border border-brand-accent/30 bg-brand-surface/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur"
      role="dialog"
      aria-label={text.message}
    >
      <span className="h-5 w-7 shrink-0 overflow-hidden rounded-[3px]">
        <Flag className="h-full w-full" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-brand-ink">{text.message}</p>
      <button
        type="button"
        onClick={switchTo}
        className="shrink-0 rounded-full bg-brand-accent px-3 py-1.5 text-xs font-bold text-brand-bg transition hover:brightness-110"
      >
        {text.cta}
      </button>
      <button
        type="button"
        onClick={() => {
          remember(locale);
          setTarget(null);
        }}
        aria-label={text.close}
        className="shrink-0 rounded-full p-1 text-brand-ink-dim transition hover:text-brand-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
