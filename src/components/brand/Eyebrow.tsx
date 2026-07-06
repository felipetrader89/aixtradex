import { ReactNode } from "react";

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent ${className}`}
    >
      <span className="h-px w-8 bg-brand-accent/50" />
      <span>{children}</span>
      <span className="h-px w-8 bg-brand-accent/50" />
    </div>
  );
}
