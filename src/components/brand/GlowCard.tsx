import { ReactNode } from "react";

export function GlowCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glow-border hover-card rounded-2xl bg-brand-surface p-6 ${className}`}>
      {children}
    </div>
  );
}
