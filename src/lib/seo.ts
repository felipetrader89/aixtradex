import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site-config";

const OG_LOCALE: Record<string, string> = { pt: "pt_BR", en: "en_US", es: "es_ES" };

type Href = Parameters<typeof getPathname>[0]["href"];

// Metadados das páginas públicas: título e descrição do idioma, canonical, hreflang (+ x-default) e Open Graph.
// keys = onde estão título e descrição nas mensagens (ex.: "Metadata.faq" ou "Tools.calculator" com metaTitle/metaDescription).
export async function pageMetadata(opts: {
  locale: string;
  href: Href;
  namespace: string;
  titleKey?: string;
  descriptionKey?: string;
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const { locale, href, namespace, titleKey = "title", descriptionKey = "description", absoluteTitle = false } = opts;
  const t = await getTranslations({ locale, namespace });
  const title = t(titleKey);
  const description = t(descriptionKey);
  const url = getPathname({ href, locale });
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [l, getPathname({ href, locale: l })]));
  languages["x-default"] = getPathname({ href, locale: routing.defaultLocale });
  const fullTitle = absoluteTitle ? title : `${siteConfig.name} - ${title}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}
