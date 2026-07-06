import Image from "next/image";
import { BrandMark } from "@/components/brand/BrandMark";

const sizes = {
  header: { image: 40, text: "text-lg" },
  hero: { image: 120, text: "text-3xl sm:text-4xl" },
} as const;

export function LogoMark({
  variant = "header",
  hasLogo,
}: {
  variant?: keyof typeof sizes;
  hasLogo: boolean;
}) {
  const { image, text } = sizes[variant];

  if (hasLogo) {
    return (
      <Image
        src="/identidade/logo.png"
        alt="Ai X TradeX"
        width={image}
        height={image}
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
