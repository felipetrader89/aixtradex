"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ícones simples (traço), no mesmo estilo, sem biblioteca externa.
const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-4H4v4Zm10-16v4h6V4h-6Z" />,
  orders: <path d="M7 4h10l1 4H6l1-4Zm-1 4h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Zm4 4h4" />,
  receipts: <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />,
  licenses: <path d="M15 7a4 4 0 1 1-7.5 2M7.5 9 3 13.5V17h3.5v-2H9v-2.5l1.2-1.2M15 7h.01" />,
  customers: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m17 0v-1a4 4 0 0 0-3-3.9M14 4.1a4 4 0 0 1 0 7.8M13 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />,
  files: <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6m-6 4h6" />,
  settings: (
    <path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0l.2.9a1.7 1.7 0 0 0 2.5 1l.8-.4a1.7 1.7 0 0 1 2.4 2.4l-.4.8a1.7 1.7 0 0 0 1 2.5l.9.2a1.7 1.7 0 0 1 0 3.4l-.9.2a1.7 1.7 0 0 0-1 2.5l.4.8a1.7 1.7 0 0 1-2.4 2.4l-.8-.4a1.7 1.7 0 0 0-2.5 1l-.2.9a1.7 1.7 0 0 1-3.4 0l-.2-.9a1.7 1.7 0 0 0-2.5-1l-.8.4a1.7 1.7 0 0 1-2.4-2.4l.4-.8a1.7 1.7 0 0 0-1-2.5l-.9-.2a1.7 1.7 0 0 1 0-3.4l.9-.2a1.7 1.7 0 0 0 1-2.5l-.4-.8a1.7 1.7 0 0 1 2.4-2.4l.8.4a1.7 1.7 0 0 0 2.5-1l.2-.9ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  ),
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      {ICONS[name]}
    </svg>
  );
}

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

export function AdminNav({ items, variant }: { items: NavItem[]; variant: "side" | "top" }) {
  const pathname = usePathname();
  if (variant === "top") {
    return (
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ${
              isActive(pathname, item.href) ? "bg-brand-accent text-brand-bg" : "text-brand-ink-dim"
            }`}
          >
            {item.label}
            {item.count ? <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-brand-bg">{item.count}</span> : null}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-brand-accent/12 font-semibold text-brand-accent"
                : "text-brand-ink-dim hover:bg-brand-surface-2 hover:text-brand-ink"
            }`}
          >
            <Icon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            {item.count ? (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-brand-bg">{item.count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

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
