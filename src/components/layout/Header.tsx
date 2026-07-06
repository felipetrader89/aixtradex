"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { siteConfig } from "@/lib/site-config";

export function Header({ logoExists }: { logoExists: boolean }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/about", label: t("about") },
    { href: "/faq", label: t("faq") },
    { href: "/blog", label: t("blog") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-brand-hairline bg-brand-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center py-4"
          onClick={() => setOpen(false)}
        >
          <LogoMark variant="header" hasLogo={logoExists} />
        </Link>

        <nav className="hidden items-stretch gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-pill text-sm font-medium text-brand-ink-dim ${
                pathname === link.href ? "nav-pill-active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 py-4 md:flex">
          <Suspense fallback={<div className="h-6 w-[88px]" />}>
            <LanguageSwitcher />
          </Suspense>
          <Button href={siteConfig.telegramUrl} className="!px-4 !py-2 text-xs">
            {t("cta")}
          </Button>
        </div>

        <div className="flex items-center gap-4 py-4 md:hidden">
          <Suspense fallback={<div className="h-6 w-[88px]" />}>
            <LanguageSwitcher />
          </Suspense>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-col gap-1.5"
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="h-0.5 w-6 bg-brand-ink" />
            <span className="h-0.5 w-6 bg-brand-ink" />
            <span className="h-0.5 w-6 bg-brand-ink" />
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-brand-hairline px-6 py-6 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`nav-pill w-fit text-sm font-medium text-brand-ink-dim ${
                pathname === link.href ? "nav-pill-active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Button href={siteConfig.telegramUrl}>{t("cta")}</Button>
        </div>
      )}
    </header>
  );
}
