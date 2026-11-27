"use client";

import { useRef, type ReactNode } from "react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { IconChartUp, IconCheck, IconTelegram } from "@/components/brand/icons";
import { Button } from "@/components/ui/Button";

// Topo da Home: texto à esquerda e um visual (ilustração do painel) à direita; no celular o visual vem depois do texto.
export function Hero({
  eyebrow,
  title,
  subtitle,
  ctaPrimary,
  ctaPrimaryHref,
  ctaSecondary,
  ctaSecondaryHref,
  ctaTertiary,
  ctaTertiaryHref,
  trust = [],
  visual,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
  ctaTertiary?: string;
  ctaTertiaryHref?: string;
  trust?: string[];
  visual?: ReactNode;
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
      className="hero-glow relative overflow-hidden border-b border-brand-hairline px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16"
    >
      <div className="hero-glow-layer pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <Eyebrow className="justify-center text-[10px] sm:text-xs lg:justify-start">{eyebrow ?? "AI POWERED FOREX TRADING"}</Eyebrow>
          <h1 className="text-balance font-display text-[2rem] font-extrabold uppercase leading-[1.08] tracking-tight text-chrome sm:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>
          <p className="max-w-xl text-pretty text-base text-brand-ink-dim sm:text-lg">{subtitle}</p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <Button href={ctaPrimaryHref} variant="primary">
              <IconChartUp className="!h-5 !w-5" />
              {ctaPrimary}
            </Button>
            <Button href={ctaSecondaryHref} variant="neon">
              {ctaSecondary}
            </Button>
          </div>
          {ctaTertiary && ctaTertiaryHref && (
            <a
              href={ctaTertiaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-ink-dim transition-colors hover:text-brand-accent"
            >
              <IconTelegram className="!h-4 !w-4" />
              {ctaTertiary}
            </a>
          )}
          {trust.length > 0 && (
            <ul className="mt-1 grid w-full max-w-xl grid-cols-1 gap-2 text-left text-sm text-brand-ink sm:grid-cols-2 sm:gap-x-6">
              {trust.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 shrink-0 text-brand-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {visual && <div className="w-full">{visual}</div>}
      </div>
    </section>
  );
}
