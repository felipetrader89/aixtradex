"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Abas das Configurações.
export function SettingsTabs({ tabs }: { tabs: { href: string; label: string; dot?: "ok" | "warn" | "bad" }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-brand-hairline [scrollbar-width:none]">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${
              active ? "border-brand-accent font-semibold text-brand-ink" : "border-transparent text-brand-ink-dim hover:text-brand-ink"
            }`}
          >
            {tab.dot && (
              <span
                className={`h-2 w-2 rounded-full ${tab.dot === "ok" ? "bg-brand-accent" : tab.dot === "warn" ? "bg-amber-400" : "bg-red-400"}`}
              />
            )}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
