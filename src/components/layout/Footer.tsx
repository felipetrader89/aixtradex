import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  IconTelegram,
  IconYoutube,
  IconInstagram,
  IconTiktok,
  IconFacebook,
} from "@/components/brand/socialIcons";
import { siteConfig } from "@/lib/site-config";
import { TOOLS } from "@/lib/tools";

const SOCIALS = [
  { name: "Telegram", Icon: IconTelegram, url: siteConfig.telegramUrl },
  { name: "YouTube", Icon: IconYoutube, url: siteConfig.youtubeUrl },
  { name: "Instagram", Icon: IconInstagram, url: siteConfig.instagramUrl },
  { name: "TikTok", Icon: IconTiktok, url: siteConfig.tiktokUrl },
  { name: "Facebook", Icon: IconFacebook, url: siteConfig.facebookUrl },
] as const;

const SUPPORT_EMAIL = "support@aixtradex.com";

const headingClass = "mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent";
const linkClass = "transition-colors hover:text-brand-accent";
const socialPillClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-brand-hairline text-brand-ink-dim transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent";

export function Footer() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  const menu = [
    { href: "/", label: nav("home") },
    { href: "/how-it-works", label: nav("howItWorks") },
    { href: "/results", label: nav("results") },
    { href: "/products", label: nav("products") },
    { href: "/about", label: nav("about") },
    { href: "/faq", label: nav("faq") },
    { href: "/blog", label: nav("blog") },
    { href: "/account", label: nav("account") },
  ];

  return (
    <footer className="px-4 py-12 text-sm text-brand-ink-dim sm:px-6">
      <div className="footer-divider mb-10" />

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.3fr_0.8fr_1.1fr_1.1fr]">
          <div className="col-span-2 lg:col-span-1">
            <BrandMark className="font-display text-xl font-extrabold uppercase" />
            <p className="mt-3 max-w-xs leading-relaxed">{t("tagline")}</p>
            <h3 className={`${headingClass} mt-6`}>{t("socialHeading")}</h3>
            <div className="flex flex-wrap gap-2">
              {SOCIALS.map(({ name, Icon, url }) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className={socialPillClass}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label={t("menuHeading")}>
            <h3 className={headingClass}>{t("menuHeading")}</h3>
            <ul className="grid gap-2">
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Ferramentas: link pras que já existem, "em breve" (sem link) pro resto */}
          <nav aria-label={t("toolsHeading")}>
            <h3 className={headingClass}>
              <Link href="/tools" className="hover:underline">
                {t("toolsHeading")}
              </Link>
            </h3>
            <ul className="grid gap-2">
              {TOOLS.map((tool) => (
                <li key={tool.key}>
                  {tool.href ? (
                    <Link href={tool.href} className={linkClass}>
                      {t(`toolsLinks.${tool.key}`)}
                    </Link>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2 opacity-70">
                      {t(`toolsLinks.${tool.key}`)}
                      <span className="rounded-full border border-brand-hairline px-1.5 py-px text-[10px] uppercase tracking-wide">
                        {t("comingSoon")}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className={headingClass}>{t("contactHeading")}</h3>
            <ul className="grid gap-2">
              <li>
                <a href={siteConfig.telegramUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {t("telegramGroup")}
                </a>
              </li>
              <li>
                <a href={siteConfig.telegramDmUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {t("telegramDm")}
                </a>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className={`${linkClass} break-all`}>
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-brand-hairline pt-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-ink">{t("riskTitle")}</p>
          <p className="mb-6 max-w-3xl text-xs leading-relaxed">{t("disclaimer")}</p>
          <p className="text-xs">
            {t("rightsPrefix", { year })} <BrandMark className="font-display text-xs font-extrabold" />
            {t("rightsSuffix")}
          </p>
        </div>
      </div>
    </footer>
  );
}
