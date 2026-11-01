import fs from "node:fs";
import path from "node:path";
import { partnerBrokers } from "@/lib/site-config";

export const PARTNER_LOGOS = partnerBrokers;

export function hasPartnerLogo(slug: string): boolean {
  return fs.existsSync(path.join(process.cwd(), `public/brokers/${slug}.png`));
}
