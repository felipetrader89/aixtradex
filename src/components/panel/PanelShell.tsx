"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_COOKIE, type MenuPosition } from "@/lib/panel";

// Estrutura comum dos painéis (cliente e admin): menu na esquerda, na direita ou no topo - cada pessoa escolhe,
// e a escolha fica num cookie (o servidor já desenha certo, sem piscar). No celular o menu fica sempre no topo.

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-4H4v4Zm10-16v4h6V4h-6Z" />,
  accounts: <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-6" />,
  orders: <path d="M7 4h10l1 4H6l1-4Zm-1 4h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Zm4 4h4" />,
  receipts: <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />,
  licenses: <path d="M15 7a4 4 0 1 1-7.5 2M7.5 9 3 13.5V17h3.5v-2H9v-2.5l1.2-1.2M15 7h.01" />,
  customers: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m17 0v-1a4 4 0 0 0-3-3.9M14 4.1a4 4 0 0 1 0 7.8M13 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />,
  claims: <path d="M15 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM16 11l2 2 4-4" />,
  files: <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6m-6 4h6" />,
  downloads: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />,
  guide: <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h9M9 8h4" />,
  support: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12ZM8.5 12h.01M12 12h.01M15.5 12h.01" />,
  site: <path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  settings: (
    <path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0l.2.9a1.7 1.7 0 0 0 2.5 1l.8-.4a1.7 1.7 0 0 1 2.4 2.4l-.4.8a1.7 1.7 0 0 0 1 2.5l.9.2a1.7 1.7 0 0 1 0 3.4l-.9.2a1.7 1.7 0 0 0-1 2.5l.4.8a1.7 1.7 0 0 1-2.4 2.4l-.8-.4a1.7 1.7 0 0 0-2.5 1l-.2.9a1.7 1.7 0 0 1-3.4 0l-.2-.9a1.7 1.7 0 0 0-2.5-1l-.8.4a1.7 1.7 0 0 1-2.4-2.4l.4-.8a1.7 1.7 0 0 0-1-2.5l-.9-.2a1.7 1.7 0 0 1 0-3.4l.9-.2a1.7 1.7 0 0 0 1-2.5l-.4-.8a1.7 1.7 0 0 1 2.4-2.4l.8.4a1.7 1.7 0 0 0 2.5-1l.2-.9ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  ),
  layoutLeft: <path d="M4 5h16v14H4V5Zm5 0v14" />,
  layoutTop: <path d="M4 5h16v14H4V5Zm0 4h16" />,
  layoutRight: <path d="M4 5h16v14H4V5Zm11 0v14" />,
};

export type PanelIcon = keyof typeof ICONS;
export type PanelNavItem = {
  href: string;
  label: string;
  icon: PanelIcon;
  count?: number;
  exact?: boolean;
  external?: boolean;
};

export function PanelIconSvg({ name, className = "h-[18px] w-[18px]" }: { name: PanelIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`${className} shrink-0`} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

function useActive() {
  const pathname = usePathname();
  return (item: PanelNavItem) =>
    !item.external && (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
}

function NavLink({ item, active, compact }: { item: PanelNavItem; active: boolean; compact?: boolean }) {
  const base = compact
    ? `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
        active ? "bg-brand-accent text-brand-bg font-semibold" : "text-brand-ink-dim hover:text-brand-ink"
      }`
    : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-brand-accent/12 font-semibold text-brand-accent" : "text-brand-ink-dim hover:bg-brand-surface-2 hover:text-brand-ink"
      }`;
  const content = (
    <>
      <PanelIconSvg name={item.icon} className={compact ? "h-4 w-4" : undefined} />
      <span className={compact ? "" : "flex-1"}>{item.label}</span>
      {item.external && !compact && <span className="text-xs opacity-60">↗</span>}
      {item.count ? (
        <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-brand-bg">{item.count}</span>
      ) : null}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={base}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={base} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

function PositionSwitch({
  position,
  onChange,
  labels,
}: {
  position: MenuPosition;
  onChange: (p: MenuPosition) => void;
  labels: { title: string; left: string; top: string; right: string };
}) {
  const options: { value: MenuPosition; icon: PanelIcon; label: string }[] = [
    { value: "left", icon: "layoutLeft", label: labels.left },
    { value: "top", icon: "layoutTop", label: labels.top },
    { value: "right", icon: "layoutRight", label: labels.right },
  ];
  return (
    <div className="flex items-center gap-1" role="group" aria-label={labels.title} title={labels.title}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={position === o.value}
          title={o.label}
          className={`rounded-lg p-1.5 transition-colors ${
            position === o.value ? "bg-brand-accent/15 text-brand-accent" : "text-brand-ink-dim hover:text-brand-ink"
          }`}
        >
          <PanelIconSvg name={o.icon} className="h-4 w-4" />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PanelShell({
  brand,
  items,
  initialPosition,
  sideFooter,
  topRight,
  switchLabels,
  children,
}: {
  brand: React.ReactNode;
  items: PanelNavItem[];
  initialPosition: MenuPosition;
  // Rodapé do menu lateral (usuário, sair...) e a versão compacta usada no topo/celular.
  sideFooter: React.ReactNode;
  topRight: React.ReactNode;
  switchLabels: { title: string; left: string; top: string; right: string };
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState<MenuPosition>(initialPosition);
  const isActive = useActive();

  function choose(p: MenuPosition) {
    setPosition(p);
    document.cookie = `${MENU_COOKIE}=${p}; path=/; max-age=31536000; samesite=lax`;
  }

  const side = position !== "top";
  return (
    <div className="min-h-screen">
      {/* Celular/tablet: barra fixa no topo com o menu rolando de lado. */}
      <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/95 px-4 pt-3 backdrop-blur lg:hidden">
        <div className="mb-2 flex items-center justify-between gap-3">
          {brand}
          <div className="flex items-center gap-3">{topRight}</div>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} compact />
          ))}
        </nav>
      </header>

      {/* Computador: menu no topo. */}
      {!side && (
        <header className="sticky top-0 z-50 hidden border-b border-brand-hairline bg-brand-bg/95 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-8 py-3">
            {brand}
            <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item)} compact />
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-4">
              {topRight}
              <PositionSwitch position={position} onChange={choose} labels={switchLabels} />
            </div>
          </div>
        </header>
      )}

      <div className={`flex ${position === "right" ? "lg:flex-row-reverse" : ""}`}>
        {side && (
          <aside
            className={`sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-brand-hairline bg-brand-bg/60 px-4 py-6 lg:flex ${
              position === "right" ? "border-l" : "border-r"
            }`}
          >
            <div className="mb-8 px-3">{brand}</div>
            <nav className="flex flex-col gap-1 overflow-y-auto">
              {items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item)} />
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-brand-hairline px-3 pt-4">
              {sideFooter}
              <PositionSwitch position={position} onChange={choose} labels={switchLabels} />
            </div>
          </aside>
        )}
        <main className={`min-w-0 flex-1 px-4 py-8 lg:px-8 ${side ? "" : "mx-auto max-w-7xl"}`}>
          <div className={side ? "mx-auto max-w-6xl" : ""}>{children}</div>
        </main>
      </div>
    </div>
  );
}
