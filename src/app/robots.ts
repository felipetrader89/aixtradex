import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    // Painel do admin, API e área do cliente não entram na busca.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/*/account"] },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
