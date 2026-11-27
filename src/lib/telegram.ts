import "server-only";
import { siteConfig } from "@/lib/site-config";

// Número de membros do grupo do Telegram, lido da página pública t.me/AiXTradeX ("4 326 members, 150 online").
// Sem chave nem bot: é a mesma página que qualquer pessoa vê. As páginas que usam isto se atualizam a cada 30 min.
export const TELEGRAM_REVALIDATE = 1800;
const FALLBACK = 4326; // última leitura conhecida (2026-11-27) - vale se o Telegram não responder

let last: number | null = null;

export async function telegramMembers(): Promise<number> {
  try {
    const res = await fetch(siteConfig.telegramUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AiXTradeX site)" },
      next: { revalidate: TELEGRAM_REVALIDATE },
    });
    if (!res.ok) return last ?? FALLBACK;
    const html = await res.text();
    const m = html.match(/tgme_page_extra">\s*([\d\s.,  ]+?)\s*(?:members|subscribers)/i);
    const n = m ? Number(m[1].replace(/\D/g, "")) : NaN;
    if (!Number.isFinite(n) || n < 100) return last ?? FALLBACK;
    last = n;
    return n;
  } catch {
    return last ?? FALLBACK;
  }
}

// Troca {members} no texto pelo número formatado no idioma da página (4.326 / 4,326).
export async function withMembers<T>(value: T, locale: string): Promise<T> {
  const text = new Intl.NumberFormat(locale, { useGrouping: "always" } as Intl.NumberFormatOptions).format(await telegramMembers());
  return JSON.parse(JSON.stringify(value).replaceAll("{members}", text)) as T;
}
