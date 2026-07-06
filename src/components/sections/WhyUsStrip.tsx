import { IconLock, IconServer, IconChartUp, IconGlobe } from "@/components/brand/icons";
import { GlowCard } from "@/components/brand/GlowCard";
import { BrandMark } from "@/components/brand/BrandMark";

const ICONS = [IconLock, IconServer, IconChartUp, IconGlobe];

export function WhyUsStrip({
  heading,
  items,
}: {
  heading: string;
  items: { title: string; body: string }[];
}) {
  return (
    <div className="text-center">
      <h2 className="mb-8 font-display text-2xl font-bold uppercase text-chrome">
        {heading} <BrandMark />?
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <GlowCard key={item.title} className="flex flex-col items-center text-center">
              <Icon className="h-12 w-12 text-brand-accent" />
              <h3 className="mt-4 text-base font-bold text-brand-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-brand-ink-dim">{item.body}</p>
            </GlowCard>
          );
        })}
      </div>
    </div>
  );
}
