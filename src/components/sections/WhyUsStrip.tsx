import Image from "next/image";
import { IconLock, IconServer, IconChartUp, IconGlobe } from "@/components/brand/icons";
import { GlowCard } from "@/components/brand/GlowCard";
import { BrandMark } from "@/components/brand/BrandMark";

const ICONS = [IconLock, IconServer, IconChartUp, IconGlobe];

export function WhyUsStrip({
  heading,
  items,
  hasLogo = false,
}: {
  heading: string;
  items: { title: string; body: string }[];
  hasLogo?: boolean;
}) {
  return (
    <div className="text-center">
      <h2 className="mb-8 flex flex-wrap items-center justify-center gap-2 font-display text-2xl font-bold uppercase text-chrome">
        <span>{heading}</span>
        {hasLogo ? (
          <Image
            src="/identidade/logo.png"
            alt="Ai X TradeX"
            width={2100}
            height={400}
            className="h-6 w-auto sm:h-8"
          />
        ) : (
          <BrandMark />
        )}
        <span className="inline-block -ml-[5px] -translate-y-[7px]">?</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {items.map((item, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <GlowCard key={item.title} className="flex items-start gap-4 text-left">
              <Icon className="h-9 w-9 shrink-0 text-brand-accent" />
              <div>
                <h3 className="text-base font-bold text-brand-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-brand-ink-dim">{item.body}</p>
              </div>
            </GlowCard>
          );
        })}
      </div>
    </div>
  );
}
