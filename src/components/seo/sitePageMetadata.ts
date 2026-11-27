import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type Opts = Parameters<typeof pageMetadata>[0] & { noindex?: boolean };

// Metadados das páginas públicas: o pageMetadata (título, descrição, canonical, hreflang, Open Graph)
// + a imagem de compartilhamento. Quando a página define o próprio openGraph, a imagem do
// [locale]/opengraph-image.tsx não é herdada; por isso ela vai explícita aqui.
export async function sitePageMetadata({ noindex = false, ...opts }: Opts): Promise<Metadata> {
  const meta = await pageMetadata(opts);
  const images = [{ url: `/${opts.locale}/opengraph-image`, width: 1200, height: 630, alt: siteConfig.name }];
  return {
    ...meta,
    openGraph: { ...meta.openGraph, images },
    twitter: { ...meta.twitter, images },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
