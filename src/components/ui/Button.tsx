import { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "neon";
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[transform,filter,border-color,color] duration-200 hover:scale-[1.03] active:scale-[0.98]";

const variants = {
  primary:
    "bg-gradient-to-b from-brand-accent to-brand-accent-dark text-brand-bg hover:brightness-110",
  secondary:
    "border border-brand-accent/40 text-brand-ink hover:border-brand-accent hover:text-brand-accent",
  neon: "cta-neon bg-brand-surface text-brand-ink hover:text-brand-accent",
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
