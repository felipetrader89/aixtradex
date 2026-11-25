import NextLink from "next/link";

// Abas da conta MT4: Configurar robô | Ai X Intelligence.
export function RobotTabs({ base, active, labels }: { base: string; active: "config" | "intel"; labels: { config: string; intel: string } }) {
  const tab = (on: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-brand-accent text-brand-bg" : "border border-brand-hairline text-brand-ink-dim hover:text-brand-ink"}`;
  return (
    <nav className="flex flex-wrap gap-2" aria-label={labels.config}>
      <NextLink href={base} className={tab(active === "config")} aria-current={active === "config" ? "page" : undefined}>
        {labels.config}
      </NextLink>
      <NextLink href={`${base}/intelligence`} className={tab(active === "intel")} aria-current={active === "intel" ? "page" : undefined}>
        {labels.intel}
      </NextLink>
    </nav>
  );
}
