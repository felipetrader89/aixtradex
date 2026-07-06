import { GlowCard } from "@/components/brand/GlowCard";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";

export function TelegramCta({
  title,
  body,
  cta,
  href = siteConfig.telegramUrl,
}: {
  title?: string;
  body: string;
  cta: string;
  href?: string;
}) {
  return (
    <GlowCard className="flex flex-col items-center gap-4 text-center">
      {title && (
        <h3 className="font-display text-2xl font-bold uppercase text-chrome">
          {title}
        </h3>
      )}
      <p className="max-w-md text-brand-ink-dim">{body}</p>
      <Button href={href}>{cta}</Button>
    </GlowCard>
  );
}
