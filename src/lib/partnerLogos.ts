import fs from "node:fs";
import path from "node:path";

export const PARTNER_LOGOS = [
  { slug: "fpmarkets", name: "FPMarkets" },
  { slug: "tickmill", name: "Tickmill" },
  { slug: "vantage", name: "Vantage" },
  { slug: "exness", name: "Exness" },
] as const;

export function hasPartnerLogo(slug: string): boolean {
  return fs.existsSync(path.join(process.cwd(), `public/brokers/${slug}.png`));
}
