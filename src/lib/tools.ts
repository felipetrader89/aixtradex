// Ferramentas públicas pro trader. href = null → ainda não existe (aparece como "em breve", sem link).
// Calendário econômico: o feed do ForexFactory/faireconomy proíbe republicar (forexfactory.com/notices), então fica "em breve".
export const TOOLS = [
  { key: "calculators", href: "/tools/calculators" },
  { key: "sessions", href: "/tools/market-sessions" },
  { key: "quotes", href: "/tools/quotes" },
  { key: "calendar", href: null },
  { key: "analysis", href: null },
  { key: "news", href: null },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];
export const LIVE_TOOL_PATHS = TOOLS.flatMap((t) => (t.href ? [t.href] : []));

// Página Calculadoras (desde 2026-11-27): cada calculadora tem a sua página, com abas pra trocar entre elas.
// A antiga /tools/lot-calculator redireciona pra /tools/calculators/lot.
export const CALCULATORS = [
  { key: "lot", href: "/tools/calculators/lot" },
  { key: "simple", href: "/tools/calculators/simple-interest" },
  { key: "compound", href: "/tools/calculators/compound-interest" },
  { key: "recovery", href: "/tools/calculators/loss-recovery" },
] as const;

export type CalculatorKey = (typeof CALCULATORS)[number]["key"];
