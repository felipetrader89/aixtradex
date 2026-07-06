"use client";

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

  function handleSwitch(loc: string) {
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: loc });
  }

  return (
    <div className="flex items-center gap-2">
      {routing.locales.map((loc) => {
        const Flag = flags[loc];
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSwitch(loc)}
            aria-current={isActive ? "true" : undefined}
            aria-label={names[loc]}
            title={names[loc]}
            className={`h-6 w-8 shrink-0 overflow-hidden rounded-[4px] border-2 transition-all duration-200 ${
              isActive
                ? "border-brand-accent scale-110"
                : "border-transparent opacity-60 hover:scale-105 hover:opacity-100"
            }`}
          >
            <Flag className="h-full w-full" />
          </button>
        );
      })}
    </div>
  );
}
