"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FlagBR, FlagUS, FlagES } from "@/components/brand/flags";

const flags: Record<string, typeof FlagBR> = {
  pt: FlagBR,
  en: FlagUS,
  es: FlagES,
};

const names: Record<string, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSwitch(loc: string) {
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: loc });
    setOpen(false);
  }

  const CurrentFlag = flags[locale];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={names[locale]}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 hover:border-brand-accent/40"
      >
        <span className="h-6 w-8 shrink-0 overflow-hidden rounded-[4px]">
          <CurrentFlag className="h-full w-full" />
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 text-brand-ink-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-40 flex-col gap-1 rounded-xl border border-brand-hairline bg-brand-surface p-2 shadow-lg">
          {routing.locales.map((loc) => {
            const Flag = flags[loc];
            const isActive = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleSwitch(loc)}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-200 ${
                  isActive
                    ? "bg-brand-accent/15 text-brand-accent"
                    : "text-brand-ink-dim hover:bg-brand-surface-2 hover:text-brand-ink"
                }`}
              >
                <span className="h-5 w-7 shrink-0 overflow-hidden rounded-[3px] border border-brand-hairline">
                  <Flag className="h-full w-full" />
                </span>
                {names[loc]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
