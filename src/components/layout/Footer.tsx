import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  IconTelegram,
  IconYoutube,
  IconInstagram,
  IconTiktok,
  IconFacebook,
  IconX,
  IconWhatsapp,
} from "@/components/brand/socialIcons";
import { siteConfig } from "@/lib/site-config";

const SOCIALS = [
  { name: "YouTube", Icon: IconYoutube, url: siteConfig.youtubeUrl },
  { name: "Instagram", Icon: IconInstagram, url: siteConfig.instagramUrl },
  { name: "TikTok", Icon: IconTiktok, url: siteConfig.tiktokUrl },
  { name: "Facebook", Icon: IconFacebook, url: siteConfig.facebookUrl },
  { name: "X", Icon: IconX, url: null },
  { name: "WhatsApp", Icon: IconWhatsapp, url: null },
] as const;

const pillClass =
  "rounded-md border border-brand-hairline px-3 py-1.5 text-center text-xs font-semibold text-brand-ink-dim transition-colors hover:border-brand-accent hover:text-brand-accent";
const socialPillClass =
  "flex h-9 w-9 items-center justify-center rounded-md border border-brand-hairline text-brand-ink-dim transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent";

export function Footer() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="px-6 py-12 text-sm text-brand-ink-dim">
      <div className="footer-divider mb-10" />

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-8">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {t("usefulHeading")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.analysis")}
              </span>
              <Link href="/blog" className={pillClass}>
                {nav("blog")}
              </Link>
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.calendar")}
              </span>
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.brokers")}
              </span>
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.tools")}
              </span>
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.markets")}
              </span>
              <span className={`cursor-default opacity-60 ${pillClass}`} title={t("comingSoon")}>
                {t("usefulLinks.news")}
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {t("socialHeading")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <a
                href={siteConfig.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className={socialPillClass}
              >
                <IconTelegram />
              </a>
              {SOCIALS.map(({ name, Icon, url }) =>
                url ? (
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
                ) : (
                  <span
                    key={name}
                    title={t("comingSoon")}
                    aria-label={name}
                    className={`cursor-default opacity-60 ${socialPillClass}`}
                  >
                    <Icon />
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-brand-hairline pt-8">
          <p className="mb-4">{t("disclaimer")}</p>
          <p>
            {t("rightsPrefix", { year })} <BrandMark className="font-display text-sm font-extrabold" />
            {t("rightsSuffix")}
          </p>
        </div>
      </div>
    </footer>
  );
}
