"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconRocket } from "@/components/brand/icons";

export function ScrollToTopButton() {
  const t = useTranslations("Common");
  const [visible, setVisible] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => setLaunching(false), 700);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("backToTop")}
      title={t("backToTop")}
      className={`cta-neon !fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface text-brand-accent transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <IconRocket
        className={`h-6 w-6 rocket-float ${launching ? "rocket-launch" : ""}`}
      />
    </button>
  );
}
