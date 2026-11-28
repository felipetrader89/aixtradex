import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const paths = [
  "/",
  "/products",
  "/how-it-works",
  "/results",
  "/about",
  "/faq",
  "/tools",
  "/tools/calculators",
  "/tools/calculators/lot",
  "/tools/calculators/simple-interest",
  "/tools/calculators/compound-interest",
  "/tools/calculators/loss-recovery",
  "/tools/market-sessions",
  "/tools/quotes",
  "/contact",
  "/terms",
  "/privacy",
  "/risk",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${baseUrl}${getPathname({ href: path, locale: routing.defaultLocale })}`,
    lastModified: new Date(),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [
          locale,
          `${baseUrl}${getPathname({ href: path, locale })}`,
        ])
      ),
    },
  }));
}
