"use client";

import { useRef } from "react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MarketChart } from "@/components/brand/MarketChart";
import { IconChartUp, IconTelegram } from "@/components/brand/icons";
import { Button } from "@/components/ui/Button";

export function Hero({
  title,
  subtitle,
  ctaPrimary,
  ctaPrimaryHref,
  ctaSecondary,
  ctaSecondaryHref,
}: {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="hero-glow relative overflow-hidden border-b border-brand-hairline px-6 pb-16 pt-20"
    >
      <div className="hero-glow-layer pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_minmax(0,640px)_1fr]">
        <div className="hidden h-56 lg:block">
          <MarketChart />
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
          <Eyebrow className="justify-center">
            AI POWERED FOREX TRADING ROBOTS
          </Eyebrow>
          <h1 className="text-balance font-display text-4xl font-extrabold uppercase tracking-tight text-chrome sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-md text-lg text-brand-ink-dim">{subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button href={ctaPrimaryHref} variant="neon">
              <IconChartUp className="h-5 w-5" />
              {ctaPrimary}
            </Button>
            <Button href={ctaSecondaryHref} variant="secondary">
              <IconTelegram className="h-5 w-5" />
              {ctaSecondary}
            </Button>
          </div>
        </div>

        <div className="hidden h-56 lg:block">
          <MarketChart />
        </div>
      </div>
    </section>
  );
}
