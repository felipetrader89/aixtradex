import Image from "next/image";
import { BrandMark } from "@/components/brand/BrandMark";

const sizes = {
  header: {
    className: "h-8 w-auto md:h-5 lg:h-11",
    text: "text-2xl md:text-lg lg:text-4xl",
  },
  hero: {
    className: "h-20 w-auto sm:h-28",
    text: "text-3xl sm:text-4xl",
  },
} as const;

// Intrinsic size of public/identidade/logo.png (2100x400) — used only for
// aspect-ratio math; actual rendered size is controlled by className above.
const LOGO_WIDTH = 2100;
const LOGO_HEIGHT = 400;

// Intrinsic size of the 2x header logo (976x298) — same idea, header only.
const HEADER_LOGO_WIDTH = 976;
const HEADER_LOGO_HEIGHT = 298;
// Sized independently from sizes.header (which also drives the text
// fallback). At each breakpoint, paired with the Header link's reduced
// vertical padding — the logo grows into the padding that py-4 used to
// waste, so the row's total height (logo + padding) stays the same and
// the nav/CTA don't shift. md keeps the original py-4 + h-5 pairing.
const HEADER_LOGO_CLASS = "h-14 w-auto md:h-5 lg:h-[68px]";

export function LogoMark({
  variant = "header",
  hasLogo,
}: {
  variant?: keyof typeof sizes;
  hasLogo: boolean;
}) {
  const { className, text } = sizes[variant];

  if (hasLogo) {
    if (variant === "header") {
      return (
        <Image
          src="/identidade/ai_x_tradex_logo_transparente_2x.png"
          alt="Ai X TradeX"
          width={HEADER_LOGO_WIDTH}
          height={HEADER_LOGO_HEIGHT}
          className={HEADER_LOGO_CLASS}
          priority
        />
      );
    }

    return (
      <Image
        src="/identidade/logo.png"
        alt="Ai X TradeX"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={className}
        priority={variant === "hero"}
      />
    );
  }

  return (
    <BrandMark
      className={`font-display ${text} font-extrabold uppercase tracking-tight`}
    />
  );
}
