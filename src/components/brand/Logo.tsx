import { hasLogo } from "@/lib/logo";
import { LogoMark } from "@/components/brand/LogoMark";

export function Logo({ variant = "header" }: { variant?: "header" | "hero" }) {
  return <LogoMark variant={variant} hasLogo={hasLogo()} />;
}
