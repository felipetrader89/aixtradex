// Ferramentas públicas pro trader. href = null → ainda não existe (aparece como "em breve", sem link).
// Calendário econômico: o feed do ForexFactory/faireconomy proíbe republicar (forexfactory.com/notices), então fica "em breve".
export const TOOLS = [
  { key: "calculator", href: "/tools/lot-calculator" },
  { key: "sessions", href: "/tools/market-sessions" },
  { key: "quotes", href: "/tools/quotes" },
  { key: "calendar", href: null },
  { key: "analysis", href: null },
  { key: "news", href: null },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];
export const LIVE_TOOL_PATHS = TOOLS.flatMap((t) => (t.href ? [t.href] : []));
