import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  IconYoutube,
  IconInstagram,
  IconTiktok,
  IconFacebook,
  IconX,
  IconWhatsapp,
} from "@/components/brand/socialIcons";

const SOCIALS = [
  { name: "YouTube", Icon: IconYoutube },
  { name: "Instagram", Icon: IconInstagram },
  { name: "TikTok", Icon: IconTiktok },
  { name: "Facebook", Icon: IconFacebook },
  { name: "X", Icon: IconX },
  { name: "WhatsApp", Icon: IconWhatsapp },
] as const;

export function Footer() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="px-6 py-12 text-sm text-brand-ink-dim">
      <div className="footer-divider mb-10" />

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {t("menuHeading")}
            </h3>
            <nav className="flex flex-col gap-2.5">
              <Link href="/" className="nav-link w-fit hover:text-brand-accent">
                {nav("home")}
              </Link>
              <Link href="/products" className="nav-link w-fit hover:text-brand-accent">
                {nav("products")}
              </Link>
              <Link href="/about" className="nav-link w-fit hover:text-brand-accent">
                {nav("about")}
              </Link>
              <Link href="/faq" className="nav-link w-fit hover:text-brand-accent">
                {nav("faq")}
              </Link>
              <Link href="/blog" className="nav-link w-fit hover:text-brand-accent">
                {nav("blog")}
              </Link>
              <Link href="/contact" className="nav-link w-fit hover:text-brand-accent">
                {nav("contact")}
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {t("usefulHeading")}
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <span className="cursor-default opacity-60" title={t("comingSoon")}>
                  {t("usefulLinks.markets")}
                </span>
              </li>
              <li>
                <span className="cursor-default opacity-60" title={t("comingSoon")}>
                  {t("usefulLinks.tools")}
                </span>
              </li>
              <li>
                <span className="cursor-default opacity-60" title={t("comingSoon")}>
                  {t("usefulLinks.news")}
                </span>
              </li>
              <li>
                <span className="cursor-default opacity-60" title={t("comingSoon")}>
                  {t("usefulLinks.analysis")}
                </span>
              </li>
              <li>
                <Link href="/about" className="nav-link w-fit hover:text-brand-accent">
                  {t("usefulLinks.brokers")}
                </Link>
              </li>
              <li>
                <span className="cursor-default opacity-60" title={t("comingSoon")}>
                  {t("usefulLinks.calendar")}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {t("socialHeading")}
            </h3>
            <div className="flex flex-wrap gap-3">
              {SOCIALS.map(({ name, Icon }) => (
                <span
                  key={name}
                  title={t("comingSoon")}
                  aria-label={name}
                  className="flex h-9 w-9 cursor-default items-center justify-center rounded-full border border-brand-hairline text-brand-ink-dim opacity-60 transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent"
                >
                  <Icon />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-brand-hairline pt-8">
          <p className="mb-4 max-w-2xl">{t("disclaimer")}</p>
          <p>
            {t("rightsPrefix", { year })} <BrandMark className="font-display text-sm font-extrabold" />
            {t("rightsSuffix")}
          </p>
        </div>
      </div>
    </footer>
  );
}
