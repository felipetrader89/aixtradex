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

export function LogoMark({
  variant = "header",
  hasLogo,
}: {
  variant?: keyof typeof sizes;
  hasLogo: boolean;
}) {
  const { className, text } = sizes[variant];

  if (hasLogo) {
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
